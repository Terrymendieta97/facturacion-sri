import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateRidePdf } from "@/lib/sri/ride-generator";

/**
 * GET /api/invoices/download-pdf?id=...&preview=true
 * Sirve o previsualiza el PDF RIDE guardado en base de datos.
 * Si el emisor posee logotipo comercial, regenera automáticamente el PDF RIDE
 * estampando el logo del emisor actualizado en el PDF.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idStr = searchParams.get("id");
    const isPreview = searchParams.get("preview") === "true";

    if (!idStr) {
      return new Response("Se requiere el ID de la factura.", { status: 400 });
    }

    const invoiceId = parseInt(idStr, 10);
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        issuer: true,
        client: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!invoice) {
      return new Response("La factura no existe.", { status: 404 });
    }

    let pdfBuffer: Buffer | null = null;

    // Si la factura tiene emisor y posee un logo activo, o si no tenía PDF generado, regenerar con el logo
    if (invoice.issuer && (invoice.issuer.logo || !invoice.pdfRIDE)) {
      try {
        const formaPagoMap: { [key: string]: string } = {
          "01": "SIN UTILIZACION DEL SISTEMA FINANCIERO",
          "15": "COMPENSACION DE DEUDAS",
          "16": "TARJETA DE DEBITO",
          "17": "DINERO ELECTRONICO",
          "18": "TARJETA PREPAGO",
          "19": "TARJETA DE CREDITO",
          "20": "OTROS CON UTILIZACION DEL SISTEMA FINANCIERO",
          "21": "ENDOSO DE TITULOS",
        };
        const formaPagoText = formaPagoMap[invoice.formaPago] || "SIN UTILIZACION DEL SISTEMA FINANCIERO";

        const formattedItems = invoice.items.map((item) => {
          const prodName = item.product?.nombre || "Producto";
          const prodCode = item.product?.codigoPrincipal || "ITEM";
          return {
            codigoPrincipal: prodCode,
            nombre: prodName,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            descuento: item.descuento,
            total: item.total,
          };
        });

        const d = new Date(invoice.fechaEmision);
        const fechaEmisionFormatted = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

        pdfBuffer = await generateRidePdf({
          secuencial: invoice.secuencial,
          establecimiento: invoice.issuer.establecimiento,
          puntoEmision: invoice.issuer.puntoEmision,
          claveAcceso: invoice.claveAcceso || "",
          numeroAutorizacion: invoice.claveAcceso || undefined,
          fechaAutorizacion: fechaEmisionFormatted,
          ambiente: invoice.tipoAmbiente,
          tipoEmision: "1",
          fechaEmision: fechaEmisionFormatted,
          formaPagoText,
          subtotal0: invoice.subtotal0,
          subtotalIva: invoice.subtotalIva,
          valorIva: invoice.valorIva,
          ivaPercentage: invoice.items[0]?.product?.iva || 15,
          total: invoice.total,
          emisor: {
            ruc: invoice.issuer.ruc,
            razonSocial: invoice.issuer.razonSocial,
            nombreComercial: invoice.issuer.nombreEmpresa,
            direccionMatriz: invoice.issuer.direccion,
            direccionEstablecimiento: issuerAddress(invoice.issuer),
            obligadoContabilidad: invoice.issuer.obligadoContabilidad,
            regimen: invoice.issuer.regimen,
            logo: invoice.issuer.logo,
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

        // Guardar el PDF regenerado con el logo en la base de datos
        const newPdfBase64 = pdfBuffer.toString("base64");
        await db.invoice.update({
          where: { id: invoice.id },
          data: { pdfRIDE: newPdfBase64 },
        });
      } catch (regenErr) {
        console.error("Error regenerando PDF con logo:", regenErr);
        if (invoice.pdfRIDE) {
          pdfBuffer = Buffer.from(invoice.pdfRIDE, "base64");
        } else {
          return new Response("Fallo al generar el PDF RIDE.", { status: 500 });
        }
      }
    } else if (invoice.pdfRIDE) {
      pdfBuffer = Buffer.from(invoice.pdfRIDE, "base64");
    } else {
      return new Response("La factura no tiene un PDF RIDE generado o no existe.", { status: 404 });
    }

    const ruc = invoice.issuer?.ruc || "SRI";
    const invoiceSec = `${invoice.issuer.establecimiento}-${invoice.issuer.puntoEmision}-${invoice.secuencial}`;
    const clave = invoice.claveAcceso || "DOCUMENTO";
    const pdfFilename = `${ruc}-Factura_${invoiceSec}-${clave}.pdf`;
    const dispositionType = isPreview ? "inline" : "attachment";

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${dispositionType}; filename=${pdfFilename}`,
      },
    });
  } catch (error: any) {
    console.error("GET /api/invoices/download-pdf error:", error);
    return new Response("Error al descargar el PDF.", { status: 500 });
  }
}

function issuerAddress(issuer: any): string {
  return issuer?.direccion || "Ecuador";
}
