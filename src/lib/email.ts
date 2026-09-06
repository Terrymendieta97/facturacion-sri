import nodemailer from "nodemailer";
import { db } from "@/lib/db";

interface SendInvoiceEmailParams {
  to: string;
  issuerEmail?: string;
  ruc?: string;
  claveAcceso?: string;
  invoiceNumber: string;
  xmlContent: string;
  pdfBuffer: Buffer;
  businessName: string;
  customerName: string;
}

// Credenciales por defecto para Lojafac Gmail API
const DEFAULT_GOOGLE_CLIENT_ID = "136860143059-h5hihc8ra61p2ldcol6qhammkunjatjc.apps.googleusercontent.com";
const DEFAULT_GOOGLE_CLIENT_SECRET = "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";
const DEFAULT_GOOGLE_REFRESH_TOKEN = "1//04-Z9wm4KZwO1CgYIARAAGAQSNwF-L9Irouz3WxyRghM_X1BboPYGSl4Xl-GFItx6pFgg4FEe1u6nImudkqdgZKvmYe7XZ_xcHBw";
const DEFAULT_GOOGLE_USER_EMAIL = "lojafacec@gmail.com";

/**
 * Obtiene un Access Token fresco desde Google OAuth2 usando el Refresh Token.
 */
export async function getGoogleAccessToken(): Promise<string | null> {
  let clientId = process.env.GOOGLE_CLIENT_ID;
  let clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  let refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    try {
      const config: any = await db.systemConfig.findFirst();
      clientId = clientId || config?.googleClientId || DEFAULT_GOOGLE_CLIENT_ID;
      clientSecret = clientSecret || config?.googleClientSecret || DEFAULT_GOOGLE_CLIENT_SECRET;
      refreshToken = refreshToken || config?.googleRefreshToken || DEFAULT_GOOGLE_REFRESH_TOKEN;
    } catch {
      clientId = clientId || DEFAULT_GOOGLE_CLIENT_ID;
      clientSecret = clientSecret || DEFAULT_GOOGLE_CLIENT_SECRET;
      refreshToken = refreshToken || DEFAULT_GOOGLE_REFRESH_TOKEN;
    }
  }

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.access_token) {
      console.error("Error al refrescar Google Access Token:", data);
      return null;
    }

    return data.access_token;
  } catch (error) {
    console.error("Excepción al obtener Google Access Token:", error);
    return null;
  }
}

/**
 * Envía un correo vía Google Gmail REST API por HTTPS (Puerto 443).
 * Inmune a bloqueos de puertos SMTP (25, 465, 587).
 */
export async function sendEmailViaGmailApi(mailOptions: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const accessToken = await getGoogleAccessToken();
    if (!accessToken) {
      throw new Error("No se pudo obtener el token de acceso de Google Gmail API. Verifique GOOGLE_REFRESH_TOKEN en variables de entorno.");
    }

    // Utiliza nodemailer stream transport para generar el MIME estándar RFC 2822 con adjuntos
    const transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: "windows",
      buffer: true,
    } as any);

    const info: any = await transporter.sendMail(mailOptions);
    const rawBuffer = info.message;
    const base64EncodedEmail = Buffer.from(rawBuffer)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        raw: base64EncodedEmail,
      }),
    });

    const sendData = await sendRes.json();
    if (!sendRes.ok) {
      console.error("Error en respuesta de Gmail REST API:", sendData);
      throw new Error(sendData.error?.message || "Error al enviar mensaje mediante Gmail REST API");
    }

    return {
      success: true,
      messageId: sendData.id,
    };
  } catch (err: any) {
    console.error("Error en sendEmailViaGmailApi:", err);
    return {
      success: false,
      error: err.message || String(err),
    };
  }
}

/**
 * Envía un correo electrónico al cliente con la factura (PDF RIDE y XML Autorizado) adjuntos.
 * Envía automáticamente copia al emisor de la factura y copia oculta (BCC) de respaldo.
 * Utiliza Google Gmail API (HTTPS 443) si está configurado, o SMTP tradicional como alternativa.
 */
export async function sendInvoiceEmail(params: SendInvoiceEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  let user = process.env.GOOGLE_USER_EMAIL || process.env.SMTP_USER;
  let fromName = process.env.SMTP_FROM_NAME || params.businessName;

  try {
    const config: any = await db.systemConfig.findFirst();
    user = user || config?.googleUserEmail || config?.smtpUser || DEFAULT_GOOGLE_USER_EMAIL;
    fromName = fromName || config?.smtpFromName || params.businessName;
  } catch {
    user = user || DEFAULT_GOOGLE_USER_EMAIL;
  }

  const ccList: string[] = [];
  if (params.issuerEmail && params.issuerEmail.trim() && params.issuerEmail.trim().toLowerCase() !== params.to.trim().toLowerCase()) {
    ccList.push(params.issuerEmail.trim());
  }

  const mailOptions: any = {
    from: `"${fromName}" <${user}>`,
    to: params.to,
    bcc: process.env.SYSTEM_BCC_EMAIL || process.env.GOOGLE_USER_EMAIL || process.env.SMTP_USER || undefined,
    subject: `Comprobante Electrónico Autorizado - Factura ${params.invoiceNumber}`,
    html: `
      <body style="margin: 20px; padding: 20px; background-color: #f3f4f6; font-family: sans-serif;">
        <div style="background-color: #ffffff; padding: 25px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin: 0;">${params.businessName}</h2>
            <p style="color: #6b7280; font-size: 14px; margin: 5px 0 0 0;">Comprobante de Venta Electrónico</p>
          </div>
          
          <div style="color: #374151; line-height: 1.6; font-size: 14px;">
            <p>Estimado/a <strong>${params.customerName}</strong>,</p>
            <p>Le informamos que se ha generado y autorizado un comprobante de venta electrónico a su nombre.</p>
            
            <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #f3f4f6;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                  <td style="padding: 4px 0; color: #6b7280;">Documento:</td>
                  <td style="padding: 4px 0; font-weight: bold; color: #1f2937;">FACTURA</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #6b7280;">Número:</td>
                  <td style="padding: 4px 0; font-weight: bold; color: #1f2937;">${params.invoiceNumber}</td>
                </tr>
              </table>
            </div>
            
            <p>Adjunto a este correo encontrará los archivos oficiales de su comprobante:</p>
            <ul style="padding-left: 20px; margin: 10px 0; color: #4b5563;">
              <li><strong>Archivo PDF (RIDE):</strong> Representación impresa y visual de la factura.</li>
              <li><strong>Archivo XML:</strong> Documento tributario electrónico firmado y autorizado por el SRI.</li>
            </ul>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 11px;">
            <p>Este es un correo generado automáticamente por nuestro sistema de facturación. Por favor, no responda a este mensaje.</p>
          </div>
        </div>
      </body>
    `,
    attachments: [
      {
        filename: `${params.ruc ? `${params.ruc}-` : ""}Factura_${params.invoiceNumber}${params.claveAcceso ? `-${params.claveAcceso}` : ""}.pdf`,
        content: params.pdfBuffer,
      },
      {
        filename: `${params.ruc ? `${params.ruc}-` : ""}Factura_${params.invoiceNumber}${params.claveAcceso ? `-${params.claveAcceso}` : ""}.xml`,
        content: params.xmlContent,
        contentType: "text/xml",
      },
    ],
  };

  if (ccList.length > 0) {
    mailOptions.cc = ccList.join(",");
  }

  // 1. Intentar siempre primero mediante Google Gmail API (HTTPS Puerto 443)
  const apiResult = await sendEmailViaGmailApi(mailOptions);
  if (apiResult.success) {
    return apiResult;
  }

  // 2. Si falla Gmail API o no está disponible, intentar por SMTP tradicional
  try {
    let host = process.env.SMTP_HOST;
    let port = parseInt(process.env.SMTP_PORT || "465", 10);
    let secure = process.env.SMTP_SECURE !== "false";
    let pass = (process.env.SMTP_PASS || "").replace(/\s+/g, "");

    try {
      const config: any = await db.systemConfig.findFirst();
      host = host || config?.smtpHost || "smtp.gmail.com";
      port = port || config?.smtpPort || 465;
      pass = pass || (config?.smtpPass || "aboexutuolxlxnmb").replace(/\s+/g, "");
    } catch {
      host = host || "smtp.gmail.com";
      pass = pass || "aboexutuolxlxnmb";
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      family: 4,
    } as any);

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("Error al enviar correo de factura vía SMTP:", error);
    return { success: false, error: error.message || error };
  }
}
