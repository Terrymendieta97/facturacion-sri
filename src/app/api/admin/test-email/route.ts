import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { sendEmailViaGmailApi } from "@/lib/email";
import { db } from "@/lib/db";

const DEFAULT_GOOGLE_USER_EMAIL = "lojafacec@gmail.com";

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

    let config: any = null;
    try {
      config = await db.systemConfig.findFirst();
    } catch (e) {
      console.warn("Could not read SystemConfig from db:", e);
    }

    let user = process.env.GOOGLE_USER_EMAIL || process.env.SMTP_USER;
    let fromName = process.env.SMTP_FROM_NAME;

    user = user || config?.googleUserEmail || config?.smtpUser || DEFAULT_GOOGLE_USER_EMAIL;
    fromName = fromName || config?.smtpFromName || "Lojafac Administración";

    const mailOptions = {
      from: `"${fromName}" <${user}>`,
      to: to.trim(),
      bcc: process.env.SYSTEM_BCC_EMAIL || process.env.GOOGLE_USER_EMAIL || process.env.SMTP_USER || undefined,
      subject: subject || "[Prueba de Sistema] Verificación de Envío de Correo - Lojafac",
      html: `
        <body style="margin: 20px; padding: 20px; background-color: #f8fafc; font-family: sans-serif;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <div style="text-align: center; border-bottom: 2px solid #6366f1; padding-bottom: 15px; margin-bottom: 20px;">
              <h2 style="color: #4f46e5; margin: 0; font-size: 22px;">Lojafac - Panel de Administración</h2>
              <p style="color: #64748b; font-size: 13px; margin-top: 5px;">Notificación de Diagnóstico de Envíos</p>
            </div>
            
            <div style="color: #334155; line-height: 1.6; font-size: 14px;">
              <p style="font-weight: bold; color: #1e293b;">¡Prueba de Envío Exitosa! ✉️✨</p>
              <p>${message || "Este es un mensaje automático de diagnóstico para confirmar que el envío de correos (facturas RIDE PDF y XML) está operando correctamente."}</p>
              
              <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4f46e5;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                  <tr>
                    <td style="padding: 4px 0; color: #64748b;">Método de Envío:</td>
                    <td style="padding: 4px 0; font-weight: bold; color: #0f172a;">Google Gmail REST API (HTTPS Puerto 443)</td>
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
              <p>Lojafac SaaS - Sistema de Facturación Electrónica Ecuatoriana.</p>
            </div>
          </div>
        </body>
      `,
    };

    // 1. Intentar por Google Gmail REST API (HTTPS Puerto 443)
    const apiResult = await sendEmailViaGmailApi(mailOptions);
    if (apiResult.success) {
      return NextResponse.json({
        success: true,
        message: `Correo de prueba enviado exitosamente a ${to} mediante Google Gmail REST API (HTTPS 443).`,
        messageId: apiResult.messageId,
        method: "Google Gmail API (HTTPS 443)",
      });
    }

    // 2. Fallback a SMTP
    const host = process.env.SMTP_HOST || config?.smtpHost || "smtp.gmail.com";
    const port = parseInt(process.env.SMTP_PORT || String(config?.smtpPort || "465"), 10);
    const secure = process.env.SMTP_SECURE !== "false";
    const pass = (process.env.SMTP_PASS || config?.smtpPass || "aboexutuolxlxnmb").replace(/\s+/g, "");

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

    return NextResponse.json({
      success: true,
      message: `Correo de prueba enviado exitosamente a ${to} vía SMTP.`,
      messageId: info.messageId,
      accepted: info.accepted,
      method: "SMTP",
    });
  } catch (error: any) {
    console.error("POST /api/admin/test-email error:", error);
    return NextResponse.json(
      { success: false, error: `Error en la conexión o envío: ${error.message || error}` },
      { status: 200 }
    );
  }
}
