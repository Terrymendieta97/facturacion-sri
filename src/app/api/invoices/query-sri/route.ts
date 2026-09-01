import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SriClient } from "@/lib/sri/sri-client";
import { generateRidePdf } from "@/lib/sri/ride-generator";
import { sendInvoiceEmail } from "@/lib/email";

const sriClient = new SriClient();

/**
 * POST /api/invoices/query-sri
 * Consulta manualmente el estado de una factura en el SRI mediante su Clave de Acceso.
 * Si es AUTORIZADA, finaliza la transacción (PDF, Email, etc.).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { invoiceId } = body;

    if (!invoiceId) {
      return NextResponse.json({ error: "Falta el parámetro invoiceId." }, { status: 400 });
    }

    // 1. Obtener la factura
    let invoice = await db.invoice.findUnique({
      where: { id: parseInt(invoiceId, 10) },
      include: {
        client: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "La factura seleccionada no existe." }, { status: 404 });
    }

    if (invoice.estado === "AUTORIZADA") {
      return NextResponse.json({
        success: true,
        message: "Esta factura ya fue autorizada y enviada previamente.",
        estado: "AUTORIZADA",
      });
    }

    if (!invoice.claveAcceso) {
      return NextResponse.json({ error: "Esta factura no tiene una clave de acceso generada." }, { status: 400 });
    }

    // 2. Obtener Emisor
    const issuer = await db.issuer.findFirst();
    if (!issuer) {
      return NextResponse.json({ error: "No se encontró la configuración del emisor." }, { status: 400 });
    }

    // 3. Consultar al Web Service de Autorización del SRI
    const autorizacionResponse = await sriClient.autorizacionComprobante(invoice.claveAcceso, issuer.ambiente);

    if (autorizacionResponse.estado !== "AUTORIZADO") {
      const errorMsg = autorizacionResponse.mensajes
        .map((m) => `${m.mensaje}${m.informacionAdicional ? ` (${m.informacionAdicional})` : ""}`)
        .join(" | ") || "El documento sigue pendiente o no ha sido autorizado en el SRI.";

      return NextResponse.json({
        warning: `El SRI respondió: ${autorizacionResponse.estado}. Detalle: ${errorMsg}`,
        estado: autorizacionResponse.estado,
      });
    }

    // 4. Factura Autorizada con éxito!
    const xmlAutorizadoStr = autorizacionResponse.comprobanteXml || invoice.xmlNoFirmado || "";

    const formaPagoMap: { [key: string]: string } = {
      "01": "SIN UTILIZACION DEL SISTEMA FINANCIERO",
      "16": "TARJETA DE DEBITO",
      "17": "DINERO ELECTRONICO",
      "18": "TARJETA DE PREPAGO",
      "19": "TARJETA DE CREDITO",
      "20": "OTROS CON UTILIZACION DEL SISTEMA FINANCIERO",
    };

    const formattedItems = invoice.items.map((item) => {
      const product = item.product;
      const totalSinImp = product.precio * item.cantidad - item.descuento;
      const totalConImp = totalSinImp * (1 + product.iva / 100);
      return {
        codigoPrincipal: product.codigoPrincipal,
        nombre: product.nombre,
        cantidad: item.cantidad,
        precioUnitario: product.precio,
        descuento: item.descuento,
        total: totalConImp,
      };
    });

    const d = invoice.fechaEmision;
    const fechaEmisionFormatted = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

    // Generar PDF RIDE
    const pdfBuffer = await generateRidePdf({
      secuencial: invoice.secuencial,
      establecimiento: issuer.establecimiento,
      puntoEmision: issuer.puntoEmision,
      claveAcceso: invoice.claveAcceso,
      numeroAutorizacion: autorizacionResponse.numeroAutorizacion,
      fechaAutorizacion: autorizacionResponse.fechaAutorizacion,
      ambiente: issuer.ambiente,
      tipoEmision: "1",
      fechaEmision: fechaEmisionFormatted,
      formaPagoText: formaPagoMap[invoice.formaPago] || "OTROS CON UTILIZACION DEL SISTEMA FINANCIERO",
      subtotal0: invoice.subtotal0,
      subtotalIva: invoice.subtotalIva,
      valorIva: invoice.valorIva,
      ivaPercentage: invoice.items[0]?.product?.iva || 12,
      total: invoice.total,
      emisor: {
        ruc: issuer.ruc,
        razonSocial: issuer.razonSocial,
        nombreComercial: issuer.nombreEmpresa,
        direccionMatriz: issuer.direccion,
        direccionEstablecimiento: issuer.direccion,
        obligadoContabilidad: issuer.obligadoContabilidad,
        regimen: issuer.regimen,
      },
      comprador: {
        nombres: invoice.client.nombres,
        identificacion: invoice.client.identificacion,
        tipoIdentificacion: invoice.client.tipoIdentificacion,
        direccion: invoice.client.direccion,
        email: invoice.client.mail,
      },
      items: formattedItems,
    });

    const pdfBase64 = pdfBuffer.toString("base64");

    // Actualizar base de datos
    const updatedInvoice = await db.invoice.update({
      where: { id: invoice.id },
      data: {
        estado: "AUTORIZADA",
        xmlAutorizado: xmlAutorizadoStr,
        pdfRIDE: pdfBase64,
      },
      include: {
        client: true,
      },
    });

    // Enviar correo
    await sendInvoiceEmail({
      to: updatedInvoice.client.mail,
      invoiceNumber: `${issuer.establecimiento}-${issuer.puntoEmision}-${updatedInvoice.secuencial}`,
      xmlContent: xmlAutorizadoStr,
      pdfBuffer: pdfBuffer,
      businessName: issuer.nombreEmpresa || issuer.razonSocial,
      customerName: updatedInvoice.client.nombres,
    });

    return NextResponse.json({
      success: true,
      message: "Comprobante autorizado y correo enviado exitosamente.",
      estado: "AUTORIZADA",
      numeroAutorizacion: autorizacionResponse.numeroAutorizacion,
    });
  } catch (error: any) {
    console.error("POST /api/invoices/query-sri error:", error);
    return NextResponse.json({ error: `Fallo al re-consultar estado: ${error.message || error}` }, { status: 500 });
  }
}
