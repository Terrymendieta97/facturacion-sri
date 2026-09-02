import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateCreditNoteXml } from "@/lib/sri/xml-generator";
import { signDocument } from "@/lib/sri/sri-signer";
import { SriClient } from "@/lib/sri/sri-client";

const sriClient = new SriClient();

/**
 * POST /api/invoices/cancel
 * Procesa las 3 modalidades de anulación:
 * 1. action = "cancel_system": Marca la factura como ANULADA_SISTEMA en DB local
 * 2. action = "cancel_sri": Marca la factura como ANULADA_SRI tras registrar solicitud en portal SRI
 * 3. action = "issue_credit_note": Genera XML Nota de Crédito (04), firma .p12 y transmite al SRI
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { invoiceId, action, motivo } = body;

    if (!invoiceId || !action) {
      return NextResponse.json({ error: "Faltan parámetros requeridos (invoiceId, action)." }, { status: 400 });
    }

    const invoice = await db.invoice.findUnique({
      where: { id: parseInt(String(invoiceId), 10) },
      include: {
        client: true,
        issuer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Factura no encontrada." }, { status: 404 });
    }

    // --- OPCIÓN 1: ANULAR SOLO EN EL SISTEMA (LOCAL) ---
    if (action === "cancel_system") {
      const updatedObs = `[ANULADA EN SISTEMA - ${new Date().toLocaleDateString("es-EC")}]: ${motivo || "Sin motivo especificado"}\n${invoice.observaciones || ""}`;
      const updatedInvoice = await db.invoice.update({
        where: { id: invoice.id },
        data: {
          estado: "ANULADA_SISTEMA",
          observaciones: updatedObs.trim(),
        },
      });

      return NextResponse.json({
        success: true,
        message: "La factura ha sido anulada únicamente dentro del sistema local.",
        invoice: updatedInvoice,
      });
    }

    // --- OPCIÓN 2: ANULAR EN EL PORTAL DEL SRI ---
    if (action === "cancel_sri") {
      const updatedObs = `[REGISTRADA ANULACIÓN EN PORTAL SRI - ${new Date().toLocaleDateString("es-EC")}]: ${motivo || "Solicitada anulación en portal SRI en línea"}\n${invoice.observaciones || ""}`;
      const updatedInvoice = await db.invoice.update({
        where: { id: invoice.id },
        data: {
          estado: "ANULADA_SRI",
          observaciones: updatedObs.trim(),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Se ha registrado la confirmación de anulación oficial en el portal del SRI.",
        invoice: updatedInvoice,
      });
    }

    // --- OPCIÓN 3: EMITIR NOTA DE CRÉDITO ELECTRÓNICA ANTE EL SRI (COMPROBANTE 04) ---
    if (action === "issue_credit_note") {
      if (!invoice.issuer.firmaElectronica || !invoice.issuer.codigoSri) {
        return NextResponse.json({ error: "El emisor no tiene configurada una firma electrónica .p12 válida." }, { status: 400 });
      }

      // Obtener el siguiente secuencial de Nota de Crédito o usar correlativo
      const lastCreditNotesCount = await db.invoice.count({
        where: {
          issuerId: invoice.issuerId,
          observaciones: { contains: "NOTA DE CRÉDITO" },
        },
      });
      const ncSecuencialNum = lastCreditNotesCount + 1;
      const ncSecuencial = String(ncSecuencialNum).padStart(9, "0");
      const numDocModificado = `${invoice.issuer.establecimiento || "001"}-${invoice.issuer.puntoEmision || "001"}-${invoice.secuencial}`;

      // 1. Generar XML de Nota de Crédito
      const ncItems = invoice.items.map((item) => ({
        nombre: item.product?.nombre || "Producto / Servicio",
        codigoPrincipal: item.product?.codigoPrincipal || "ITEM-001",
        precioUnitario: item.precioUnitario,
        cantidad: item.cantidad,
        descuento: item.descuento,
        ivaPercentage: item.product?.iva || 15,
      }));

      const ncData = {
        secuencial: ncSecuencial,
        ambiente: invoice.tipoAmbiente || 1,
        establecimiento: invoice.issuer.establecimiento || "001",
        puntoEmision: invoice.issuer.puntoEmision || "001",
        fechaEmision: new Date(),
        numDocModificado,
        fechaEmisionDocSustento: new Date(invoice.fechaEmision),
        motivo: motivo || "Anulación de factura por nota de crédito",
        emisor: {
          ruc: invoice.issuer.ruc,
          razonSocial: invoice.issuer.razonSocial,
          nombreComercial: invoice.issuer.nombreEmpresa || invoice.issuer.razonSocial,
          direccionMatriz: invoice.issuer.direccion || "Ecuador",
          direccionEstablecimiento: invoice.issuer.direccion || "Ecuador",
          obligadoContabilidad: invoice.issuer.obligadoContabilidad,
        },
        comprador: {
          nombres: invoice.client.nombres,
          tipoIdentificacion: invoice.client.tipoIdentificacion,
          identificacion: invoice.client.identificacion,
          direccion: invoice.client.direccion,
          email: invoice.client.mail,
        },
        items: ncItems,
      };

      const { xml: xmlNcNoFirmado, claveAcceso: ncClaveAcceso } = generateCreditNoteXml(ncData);

      // 2. Firmar el XML de la Nota de Crédito
      const signRes = signDocument(xmlNcNoFirmado, invoice.issuer.firmaElectronica, invoice.issuer.codigoSri);
      if (!signRes.success || !signRes.xmlSigned) {
        return NextResponse.json({ error: "Fallo al firmar digitalmente la Nota de Crédito: " + (signRes.error || "Error de certificado .p12") }, { status: 400 });
      }
      const xmlNcFirmado = signRes.xmlSigned;

      // 3. Transmitir al SRI
      const recepRes = await sriClient.validarComprobante(xmlNcFirmado, invoice.tipoAmbiente || 1);

      if (recepRes.estado !== "DEVUELTA") {
        // Consultar Autorización
        const autoRes = await sriClient.autorizacionComprobante(ncClaveAcceso, invoice.tipoAmbiente || 1);

        const isAuth = autoRes.estado === "AUTORIZADO";
        const updatedObs = `[NOTA DE CRÉDITO ${isAuth ? "AUTORIZADA" : autoRes.estado} SRI - ${new Date().toLocaleDateString("es-EC")}]: Clave NC: ${ncClaveAcceso} | Motivo: ${motivo || "Anulación"}\n${invoice.observaciones || ""}`;

        const updatedInvoice = await db.invoice.update({
          where: { id: invoice.id },
          data: {
            estado: isAuth ? "ANULADA_NC" : "DEVUELTA",
            observaciones: updatedObs.trim(),
          },
        });

        return NextResponse.json({
          success: isAuth,
          message: isAuth
            ? `Nota de Crédito autorizada con éxito en el SRI. Clave Acceso NC: ${ncClaveAcceso}`
            : `El SRI respondió: ${autoRes.estado}. ${autoRes.mensajes?.join("; ") || ""}`,
          ncClaveAcceso,
          sriResponse: autoRes,
          invoice: updatedInvoice,
        });
      } else {
        return NextResponse.json({
          success: false,
          error: `Nota de Crédito devuelta por el SRI: ${recepRes.mensajes?.join("; ") || "Error de recepción."}`,
          recepRes,
        });
      }
    }

    return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/invoices/cancel error:", error);
    return NextResponse.json({ error: "Fallo al procesar la anulación / Nota de Crédito: " + error.message }, { status: 500 });
  }
}
