import nodemailer from "nodemailer";
import { db } from "../db.js";
import { config } from "../config/index.js";

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

let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

export async function getGoogleAccessToken(): Promise<string | null> {
  if (cachedAccessToken && Date.now() < tokenExpiresAt) {
    return cachedAccessToken;
  }

  const clientId = config.googleClientId;
  const clientSecret = config.googleClientSecret;
  const refreshToken = config.googleRefreshToken;

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
      signal: AbortSignal.timeout(10000),
    });

    const data: any = await response.json();
    if (!response.ok || !data.access_token) {
      console.error("Error al refrescar Google Access Token:", data);
      return null;
    }

    cachedAccessToken = data.access_token;
    const expiresInSec = data.expires_in || 3600;
    tokenExpiresAt = Date.now() + (expiresInSec - 300) * 1000;

    return cachedAccessToken;
  } catch (error) {
    console.error("Excepción al obtener Google Access Token:", error);
    return null;
  }
}

export async function sendEmailViaGmailApi(mailOptions: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const accessToken = await getGoogleAccessToken();
    if (!accessToken) {
      throw new Error("No se pudo obtener el token de acceso de Google Gmail API.");
    }

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
      signal: AbortSignal.timeout(15000),
    });

    const sendData: any = await sendRes.json();
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

export async function sendInvoiceEmail(params: SendInvoiceEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const user = config.googleUserEmail || config.smtpUser;
  const fromName = config.smtpFromName || params.businessName;

  const ccList: string[] = [];
  if (params.issuerEmail && params.issuerEmail.trim() && params.issuerEmail.trim().toLowerCase() !== params.to.trim().toLowerCase()) {
    ccList.push(params.issuerEmail.trim());
  }

  const mailOptions: any = {
    from: `"${fromName}" <${user}>`,
    to: params.to,
    bcc: user || undefined,
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

  const apiResult = await sendEmailViaGmailApi(mailOptions);
  if (apiResult.success) {
    return apiResult;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: {
        user,
        pass: config.smtpPass,
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
