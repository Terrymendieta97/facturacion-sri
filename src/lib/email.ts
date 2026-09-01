import nodemailer from "nodemailer";

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

/**
 * Envía un correo electrónico al cliente con la factura (PDF RIDE y XML Autorizado) adjuntos.
 * Envía automáticamente copia al emisor de la factura y copia oculta (BCC) de respaldo.
 */
export async function sendInvoiceEmail(params: SendInvoiceEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Configuración SMTP desde variables de entorno con valores predeterminados de Gmail (Google)
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const secure = process.env.SMTP_SECURE !== "false"; // Default true (SSL)
  const user = process.env.SMTP_USER || "";
  const rawPass = process.env.SMTP_PASS || "";
  const pass = rawPass.replace(/\s+/g, ""); // Limpiar espacios de la clave de aplicación
  const fromName = process.env.SMTP_FROM_NAME || params.businessName;

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      family: 4, // Forzar uso de IPv4 para evitar timeouts de red IPv6
    } as any);

    const ccList: string[] = [];
    if (params.issuerEmail && params.issuerEmail.trim() && params.issuerEmail.trim().toLowerCase() !== params.to.trim().toLowerCase()) {
      ccList.push(params.issuerEmail.trim());
    }

    const mailOptions: any = {
      from: `"${fromName}" <${user}>`,
      to: params.to,
      bcc: process.env.SYSTEM_BCC_EMAIL || process.env.SMTP_USER || undefined,
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

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("Error al enviar correo de factura:", error);
    return { success: false, error: error.message || error };
  }
}
