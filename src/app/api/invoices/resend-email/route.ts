import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendInvoiceEmail } from "@/lib/email";

/**
 * POST /api/invoices/resend-email
 * Re-envía el correo electrónico de una factura ya autorizada con su PDF y XML adjuntos
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { invoiceId } = body;

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Se requiere el ID de la factura para re-enviar el correo." },
        { status: 400 }
      );
    }

    // Buscar factura en la base de datos con los datos de emisor y cliente
    const invoice = await db.invoice.findUnique({
      where: { id: parseInt(invoiceId, 10) },
      include: {
        client: true,
        issuer: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "El comprobante no existe en la base de datos." },
        { status: 404 }
      );
    }

    if (invoice.estado !== "AUTORIZADA") {
      return NextResponse.json(
        { error: "Solo se pueden enviar por correo comprobantes en estado AUTORIZADA." },
        { status: 400 }
      );
    }

    if (!invoice.pdfRIDE || !invoice.xmlAutorizado) {
      return NextResponse.json(
        { error: "La factura no cuenta con archivos PDF RIDE o XML autorizados válidos." },
        { status: 400 }
      );
    }

    // Convertir el PDF base64 guardado en DB de vuelta a buffer
    const pdfBuffer = Buffer.from(invoice.pdfRIDE, "base64");
    const invoiceNumber = `${invoice.issuer.establecimiento}-${invoice.issuer.puntoEmision}-${invoice.secuencial}`;

    // Ejecutar envío
    await sendInvoiceEmail({
      to: invoice.client.mail,
      issuerEmail: invoice.issuer.email,
      ruc: invoice.issuer.ruc,
      claveAcceso: invoice.claveAcceso || undefined,
      invoiceNumber,
      xmlContent: invoice.xmlAutorizado,
      pdfBuffer: pdfBuffer,
      businessName: invoice.issuer.nombreEmpresa || invoice.issuer.razonSocial,
      customerName: invoice.client.nombres,
    });

    return NextResponse.json({
      success: true,
      message: "Correo re-enviado exitosamente al cliente.",
    });
  } catch (error: any) {
    console.error("POST /api/invoices/resend-email error:", error);
    return NextResponse.json(
      { error: `Fallo al re-enviar correo electrónico: ${error.message || error}` },
      { status: 500 }
    );
  }
}
