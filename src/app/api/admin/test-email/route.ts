import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, subject, message } = body;

    if (!to || !to.trim()) {
      return NextResponse.json(
        { error: "Debe ingresar un correo electrónico de destino para la prueba." },
        { status: 400 }
      );
    }

    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = parseInt(process.env.SMTP_PORT || "465", 10);
    const secure = process.env.SMTP_SECURE !== "false";
    const user = process.env.SMTP_USER || "";
    const rawPass = process.env.SMTP_PASS || "";
    const pass = rawPass.replace(/\s+/g, "");
    const fromName = process.env.SMTP_FROM_NAME || "FácilSRI Administración";

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

    const mailOptions = {
      from: `"${fromName}" <${user}>`,
      to: to.trim(),
      bcc: process.env.SYSTEM_BCC_EMAIL || process.env.SMTP_USER || undefined,
      subject: subject || "[Prueba de Sistema] Verificación de Envío de Correo - FácilSRI",
      html: `
        <body style="margin: 20px; padding: 20px; background-color: #f8fafc; font-family: sans-serif;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <div style="text-align: center; border-bottom: 2px solid #6366f1; padding-bottom: 15px; margin-bottom: 20px;">
              <h2 style="color: #4f46e5; margin: 0; font-size: 22px;">FácilSRI - Panel de Administración</h2>
              <p style="color: #64748b; font-size: 13px; margin-top: 5px;">Notificación de Prueba del Servidor SMTP</p>
            </div>
            
            <div style="color: #334155; line-height: 1.6; font-size: 14px;">
              <p style="font-weight: bold; color: #1e293b;">¡Prueba de Envío Exitosa! ✉️✨</p>
              <p>${message || "Este es un mensaje automático de diagnóstico enviado desde el Panel de Administración SaaS para confirmar que las credenciales de Gmail SMTP están operando correctamente."}</p>
              
              <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4f46e5;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                  <tr>
                    <td style="padding: 4px 0; color: #64748b;">Servidor SMTP:</td>
                    <td style="padding: 4px 0; font-weight: bold; color: #0f172a;">${host}:${port}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #64748b;">Cuenta Emisora:</td>
                    <td style="padding: 4px 0; font-weight: bold; color: #0f172a;">${user}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #64748b;">Fecha y Hora:</td>
                    <td style="padding: 4px 0; font-weight: bold; color: #0f172a;">${new Date().toLocaleString("es-EC")}</td>
                  </tr>
                </table>
              </div>
            </div>
            
            <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 11px;">
              <p>FácilSRI SaaS - Sistema de Facturación Electrónica Ecuatoriana.</p>
            </div>
          </div>
        </body>
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      message: `Correo de prueba enviado exitosamente a ${to}`,
      messageId: info.messageId,
      accepted: info.accepted,
    });
  } catch (error: any) {
    console.error("POST /api/admin/test-email error:", error);
    return NextResponse.json(
      { success: false, error: `Error en la conexión o envío SMTP: ${error.message || error}` },
      { status: 200 }
    );
  }
}
