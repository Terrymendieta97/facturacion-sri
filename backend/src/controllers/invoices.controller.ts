import { Request, Response } from "express";
import { db } from "../db.js";
import { generateInvoiceXml, generateCreditNoteXml } from "../services/sri/xml-generator.js";
import { signDocument } from "../services/sri/sri-signer.js";
import { SriClient } from "../services/sri/sri-client.js";
import { generateRidePdf } from "../services/sri/ride-generator.js";
import { sendInvoiceEmail } from "../services/email.service.js";
import { AuthenticatedRequest } from "../middlewares/auth.middleware.js";

const sriClient = new SriClient();

export async function getInvoices(req: AuthenticatedRequest, res: Response) {
  try {
    const { search, startDate, endDate, status, page, limit, all, puntoEmision, establecimiento } = req.query;

    const pageNum = Math.max(1, parseInt((page as string) || "1", 10));
    const limitNum = Math.max(1, parseInt((limit as string) || "30", 10));
    const isAll = all === "true";

    const where: any = {};

    if (req.issuer) {
      where.issuerId = req.issuer.id;
    }

    if (status && status !== "ALL") {
      where.estado = status;
    }

    if (req.userRole === "OPERATOR") {
      if (req.emissionPointId) {
        where.emissionPointId = req.emissionPointId;
      } else if (req.puntoEmision && req.puntoEmision !== "ALL") {
        where.puntoEmision = req.puntoEmision;
      }
    } else if (puntoEmision && puntoEmision !== "ALL") {
      where.puntoEmision = puntoEmision;
    }

    if (establecimiento && establecimiento !== "ALL") {
      where.establecimiento = establecimiento;
    }

    if (startDate || endDate) {
      where.fechaEmision = {};
      if (startDate) {
        where.fechaEmision.gte = new Date(`${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        where.fechaEmision.lte = new Date(`${endDate}T23:59:59.999Z`);
      }
    }

    if (search && String(search).trim()) {
      const q = String(search).trim();
      where.OR = [
        { secuencial: { contains: q } },
        { claveAcceso: { contains: q } },
        { client: { identificacion: { contains: q } } },
        { client: { nombres: { contains: q } } },
        { client: { mail: { contains: q } } },
      ];
    }

    const total = await db.invoice.count({ where });

    const invoices = await db.invoice.findMany({
      where,
      select: {
        id: true,
        secuencial: true,
        establecimiento: true,
        puntoEmision: true,
        claveAcceso: true,
        estado: true,
        fechaEmision: true,
        tipoAmbiente: true,
        subtotal0: true,
        subtotalIva: true,
        valorIva: true,
        total: true,
        formaPago: true,
        observaciones: true,
        createdAt: true,
        updatedAt: true,
        clientId: true,
        issuerId: true,
        emissionPointId: true,
        client: {
          select: {
            id: true,
            nombres: true,
            tipoIdentificacion: true,
            identificacion: true,
            direccion: true,
            mail: true,
            celular: true,
            telefono: true,
          },
        },
        issuer: {
          select: {
            id: true,
            ruc: true,
            razonSocial: true,
            nombreEmpresa: true,
            establecimiento: true,
            puntoEmision: true,
            email: true,
            celular: true,
            direccion: true,
            logo: true,
          },
        },
        emissionPoint: {
          select: {
            id: true,
            establecimiento: true,
            puntoEmision: true,
            nombre: true,
            username: true,
            activo: true,
          },
        },
        items: {
          select: {
            id: true,
            cantidad: true,
            precioUnitario: true,
            descuento: true,
            total: true,
            notaExtra1: true,
            notaExtra2: true,
            productId: true,
            product: {
              select: {
                id: true,
                nombre: true,
                codigoPrincipal: true,
                precio: true,
                iva: true,
              },
            },
          },
        },
      },
      orderBy: { id: "desc" },
      take: isAll ? undefined : limitNum,
      skip: isAll ? undefined : (pageNum - 1) * limitNum,
    });

    return res.json({
      invoices,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (error: any) {
    console.error("getInvoices error:", error);
    return res.status(500).json({ error: error.message || "Error al obtener facturas" });
  }
}

export async function createInvoice(req: AuthenticatedRequest, res: Response) {
  try {
    const {
      comprador,
      items,
      formaPago,
      pagos,
      observaciones,
      emissionPointId,
    } = req.body;

    if (!comprador || !items || !items.length) {
      return res.status(400).json({ error: "Faltan datos del comprador o ítems de la factura." });
    }

    const issuer = req.issuer || (await db.issuer.findFirst());
    if (!issuer) {
      return res.status(400).json({ error: "No se encontró ningún emisor configurado." });
    }

    if (!issuer.firmaElectronica || !issuer.codigoSri) {
      return res.status(400).json({ error: "El emisor no tiene configurada una firma electrónica .p12 válida." });
    }

    // 1. Resolver o registrar cliente
    let clientObj = await db.client.findUnique({
      where: { identificacion: comprador.identificacion.trim() },
    });

    if (!clientObj) {
      clientObj = await db.client.create({
        data: {
          nombres: comprador.nombres.trim().toUpperCase(),
          tipoIdentificacion: comprador.tipoIdentificacion || "07",
          identificacion: comprador.identificacion.trim(),
          direccion: comprador.direccion?.trim() || "S/N",
          mail: comprador.mail?.trim() || "cliente@email.com",
          celular: comprador.celular?.trim() || "0999999999",
          telefono: comprador.telefono?.trim() || "",
        },
      });
    }

    // 2. Resolver Punto de Emisión y Secuencial
    let activeEstablecimiento = issuer.establecimiento || "001";
    let activePuntoEmision = issuer.puntoEmision || "001";
    let startSec = issuer.startSecuencial || "000000001";

    let epObj = null;
    if (emissionPointId) {
      epObj = await db.emissionPoint.findUnique({ where: { id: parseInt(emissionPointId, 10) } });
      if (epObj) {
        activeEstablecimiento = epObj.establecimiento;
        activePuntoEmision = epObj.puntoEmision;
        startSec = epObj.secuencialInicio;
      }
    }

    const existingInvoices = await db.invoice.findMany({
      where: {
        issuerId: issuer.id,
        establecimiento: activeEstablecimiento,
        puntoEmision: activePuntoEmision,
      },
      select: { secuencial: true },
    });

    let maxSecInDb = 0;
    for (const inv of existingInvoices) {
      const num = parseInt(inv.secuencial, 10);
      if (!isNaN(num) && num > maxSecInDb) {
        maxSecInDb = num;
      }
    }

    const configuredStartSec = parseInt(startSec || "1", 10) || 1;
    const nextSecNum = Math.max(configuredStartSec, maxSecInDb + 1);
    const secuencial = String(nextSecNum).padStart(9, "0");

    // 3. Procesar Productos y Totales
    let subtotal0 = 0;
    let subtotalIva = 0;
    let valorIva = 0;
    let ivaPercentageMax = 15;
    const invoiceItemsData: any[] = [];
    const xmlItems: any[] = [];

    for (const item of items) {
      let product = await db.product.findFirst({
        where: {
          issuerId: issuer.id,
          codigoPrincipal: item.codigoPrincipal,
        },
      });

      if (!product) {
        product = await db.product.create({
          data: {
            issuerId: issuer.id,
            nombre: item.nombre,
            codigoPrincipal: item.codigoPrincipal,
            precio: parseFloat(item.precioUnitario),
            iva: item.iva !== undefined ? parseFloat(item.iva) : 15.0,
            descripcion: item.descripcion || null,
          },
        });
      }

      const cantidad = parseFloat(item.cantidad);
      const precioUnitario = parseFloat(item.precioUnitario);
      const descuento = item.descuento ? parseFloat(item.descuento) : 0;
      const iva = item.iva !== undefined ? parseFloat(item.iva) : (product.iva ?? 15.0);
      const totalItem = (precioUnitario * cantidad) - descuento;

      if (iva > 0) {
        subtotalIva += totalItem;
        valorIva += totalItem * (iva / 100);
        ivaPercentageMax = iva;
      } else {
        subtotal0 += totalItem;
      }

      invoiceItemsData.push({
        productId: product.id,
        cantidad,
        precioUnitario,
        descuento,
        total: totalItem + (iva > 0 ? totalItem * (iva / 100) : 0),
        notaExtra1: item.notaExtra1 || null,
        notaExtra2: item.notaExtra2 || null,
      });

      xmlItems.push({
        nombre: item.nombre,
        codigoPrincipal: item.codigoPrincipal,
        descripcion: item.descripcion || null,
        precioUnitario,
        cantidad,
        descuento,
        ivaPercentage: iva,
      });
    }

    const total = subtotal0 + subtotalIva + valorIva;

    // 4. Generar XML y Clave de Acceso
    const xmlData = {
      secuencial,
      ambiente: issuer.ambiente || 1,
      establecimiento: activeEstablecimiento,
      puntoEmision: activePuntoEmision,
      fechaEmision: new Date(),
      formaPago: formaPago || "01",
      emisor: {
        ruc: issuer.ruc,
        razonSocial: issuer.razonSocial,
        nombreComercial: issuer.nombreEmpresa || issuer.razonSocial,
        direccionMatriz: issuer.direccion || "Ecuador",
        direccionEstablecimiento: issuer.direccion || "Ecuador",
        obligadoContabilidad: issuer.obligadoContabilidad,
        regimen: issuer.regimen,
      },
      comprador: {
        nombres: clientObj.nombres,
        tipoIdentificacion: clientObj.tipoIdentificacion,
        identificacion: clientObj.identificacion,
        direccion: clientObj.direccion,
        email: clientObj.mail,
      },
      items: xmlItems,
      pagos: pagos && Array.isArray(pagos) ? pagos : undefined,
    };

    const { xml: xmlNoFirmado, claveAcceso } = generateInvoiceXml(xmlData);

    // 5. Firmar Documento .p12
    const signResult = signDocument(xmlNoFirmado, issuer.firmaElectronica, issuer.codigoSri);
    if (!signResult.success || !signResult.xmlSigned || !signResult.xmlSignedBase64) {
      return res.status(400).json({
        error: `Error al firmar la factura: ${signResult.error || "Fallo en certificado"}`,
      });
    }

    const xmlFirmado = signResult.xmlSigned;
    const xmlFirmadoBase64 = signResult.xmlSignedBase64;

    // 6. Transmitir al SRI
    const recepcionResponse = await sriClient.validarComprobante(xmlFirmadoBase64, issuer.ambiente || 1);

    if (recepcionResponse.estado === "DEVUELTA") {
      const msgs = recepcionResponse.mensajes.map((m) => `${m.mensaje} (${m.informacionAdicional || ""})`).join("; ");
      const savedInvoice = await db.invoice.create({
        data: {
          secuencial,
          establecimiento: activeEstablecimiento,
          puntoEmision: activePuntoEmision,
          claveAcceso,
          xmlNoFirmado,
          estado: "DEVUELTA",
          fechaEmision: new Date(),
          tipoAmbiente: issuer.ambiente || 1,
          subtotal0,
          subtotalIva,
          valorIva,
          total,
          formaPago: formaPago || "01",
          observaciones: `DEVUELTA POR SRI: ${msgs}`,
          clientId: clientObj.id,
          issuerId: issuer.id,
          emissionPointId: epObj?.id || null,
          items: { create: invoiceItemsData },
        },
      });

      return res.status(400).json({
        error: `El SRI devolvió el comprobante: ${msgs}`,
        invoiceId: savedInvoice.id,
        claveAcceso,
        mensajes: recepcionResponse.mensajes,
      });
    }

    // 7. Consultar Autorización
    let autorizacionResponse = await sriClient.autorizacionComprobante(claveAcceso, issuer.ambiente || 1);

    // Reintento breve si está en proceso
    if (autorizacionResponse.estado === "EN PROCESO" || autorizacionResponse.estado === "ERROR") {
      await new Promise((r) => setTimeout(r, 2000));
      autorizacionResponse = await sriClient.autorizacionComprobante(claveAcceso, issuer.ambiente || 1);
    }

    const estadoFinal = autorizacionResponse.estado === "AUTORIZADO" ? "AUTORIZADA" : (autorizacionResponse.estado || "RECIBIDA");
    const xmlAutorizadoStr = autorizacionResponse.comprobanteXml || xmlFirmado;

    // 8. Generar RIDE PDF
    const rideData = {
      secuencial,
      establecimiento: activeEstablecimiento,
      puntoEmision: activePuntoEmision,
      claveAcceso,
      numeroAutorizacion: autorizacionResponse.numeroAutorizacion,
      fechaAutorizacion: autorizacionResponse.fechaAutorizacion,
      ambiente: issuer.ambiente || 1,
      tipoEmision: "1",
      fechaEmision: new Date().toLocaleDateString("es-EC"),
      formaPagoText: formaPago === "01" ? "SIN UTILIZACION DEL SISTEMA FINANCIERO" : "OTROS CON UTILIZACION DEL SISTEMA FINANCIERO",
      subtotal0,
      subtotalIva,
      valorIva,
      ivaPercentage: ivaPercentageMax,
      total,
      emisor: {
        ruc: issuer.ruc,
        razonSocial: issuer.razonSocial,
        nombreComercial: issuer.nombreEmpresa || issuer.razonSocial,
        direccionMatriz: issuer.direccion || "Ecuador",
        direccionEstablecimiento: issuer.direccion || "Ecuador",
        obligadoContabilidad: issuer.obligadoContabilidad,
        regimen: issuer.regimen,
        logo: issuer.logo,
      },
      comprador: {
        nombres: clientObj.nombres,
        identificacion: clientObj.identificacion,
        tipoIdentificacion: clientObj.tipoIdentificacion,
        direccion: clientObj.direccion,
        email: clientObj.mail,
      },
      items: xmlItems.map((it) => ({
        codigoPrincipal: it.codigoPrincipal,
        nombre: it.nombre,
        cantidad: it.cantidad,
        precioUnitario: it.precioUnitario,
        descuento: it.descuento,
        total: (it.precioUnitario * it.cantidad) - it.descuento,
      })),
    };

    const pdfBuffer = await generateRidePdf(rideData);
    const pdfBase64 = pdfBuffer.toString("base64");

    // 9. Guardar en Base de Datos PostgreSQL
    const savedInvoice = await db.invoice.create({
      data: {
        secuencial,
        establecimiento: activeEstablecimiento,
        puntoEmision: activePuntoEmision,
        claveAcceso,
        xmlNoFirmado,
        xmlAutorizado: xmlAutorizadoStr,
        pdfRIDE: pdfBase64,
        estado: estadoFinal,
        fechaEmision: new Date(),
        tipoAmbiente: issuer.ambiente || 1,
        subtotal0,
        subtotalIva,
        valorIva,
        total,
        formaPago: formaPago || "01",
        observaciones: observaciones || null,
        clientId: clientObj.id,
        issuerId: issuer.id,
        emissionPointId: epObj?.id || null,
        items: { create: invoiceItemsData },
      },
    });

    // 10. Actualizar siguiente secuencial del emisor / punto de emisión
    const nextSeqFormatted = String(nextSecNum + 1).padStart(9, "0");
    if (epObj) {
      await db.emissionPoint.update({
        where: { id: epObj.id },
        data: { secuencialInicio: nextSeqFormatted },
      });
    } else {
      await db.issuer.update({
        where: { id: issuer.id },
        data: { startSecuencial: nextSeqFormatted },
      });
    }

    // 11. Enviar Correo en segundo plano no bloqueante
    sendInvoiceEmail({
      to: clientObj.mail,
      issuerEmail: issuer.email,
      ruc: issuer.ruc,
      claveAcceso,
      invoiceNumber: `${activeEstablecimiento}-${activePuntoEmision}-${secuencial}`,
      xmlContent: xmlAutorizadoStr,
      pdfBuffer,
      businessName: issuer.nombreEmpresa || issuer.razonSocial,
      customerName: clientObj.nombres,
    }).catch((emailErr) => {
      console.warn("Fallo al enviar correo de la factura en segundo plano:", emailErr);
    });

    return res.json({
      success: true,
      invoiceId: savedInvoice.id,
      secuencial,
      estado: estadoFinal,
      claveAcceso,
      numeroAutorizacion: autorizacionResponse.numeroAutorizacion,
      pdfUrl: `/api/invoices/download-pdf?id=${savedInvoice.id}`,
      xmlUrl: `/api/invoices/download-xml?id=${savedInvoice.id}`,
    });
  } catch (error: any) {
    console.error("createInvoice error:", error);
    return res.status(500).json({ error: error.message || "Error al crear la factura" });
  }
}

export async function downloadPdf(req: Request, res: Response) {
  try {
    const id = parseInt((req.query.id || req.params.id) as string, 10);
    if (!id) return res.status(400).send("ID de factura inválido.");

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: { client: true, issuer: true, items: { include: { product: true } } },
    });

    if (!invoice) return res.status(404).send("Factura no encontrada.");

    if (invoice.pdfRIDE) {
      const buffer = Buffer.from(invoice.pdfRIDE, "base64");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="Factura_${invoice.secuencial}.pdf"`);
      return res.send(buffer);
    }

    const pdfBuffer = await generateRidePdf({
      secuencial: invoice.secuencial,
      establecimiento: invoice.establecimiento,
      puntoEmision: invoice.puntoEmision,
      claveAcceso: invoice.claveAcceso || "PENDIENTE",
      numeroAutorizacion: invoice.claveAcceso || undefined,
      fechaAutorizacion: invoice.fechaEmision.toLocaleDateString("es-EC"),
      ambiente: invoice.tipoAmbiente,
      tipoEmision: "1",
      fechaEmision: invoice.fechaEmision.toLocaleDateString("es-EC"),
      formaPagoText: invoice.formaPago === "01" ? "SIN UTILIZACION DEL SISTEMA FINANCIERO" : "OTROS CON UTILIZACION DEL SISTEMA FINANCIERO",
      subtotal0: invoice.subtotal0,
      subtotalIva: invoice.subtotalIva,
      valorIva: invoice.valorIva,
      ivaPercentage: 15,
      total: invoice.total,
      emisor: {
        ruc: invoice.issuer.ruc,
        razonSocial: invoice.issuer.razonSocial,
        nombreComercial: invoice.issuer.nombreEmpresa || invoice.issuer.razonSocial,
        direccionMatriz: invoice.issuer.direccion || "Ecuador",
        direccionEstablecimiento: invoice.issuer.direccion || "Ecuador",
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
      items: invoice.items.map((it) => ({
        codigoPrincipal: it.product?.codigoPrincipal || "ITEM",
        nombre: it.product?.nombre || "Producto",
        cantidad: it.cantidad,
        precioUnitario: it.precioUnitario,
        descuento: it.descuento,
        total: it.total,
      })),
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="Factura_${invoice.secuencial}.pdf"`);
    return res.send(pdfBuffer);
  } catch (error: any) {
    return res.status(500).send("Error al generar PDF: " + error.message);
  }
}

export async function downloadXml(req: Request, res: Response) {
  try {
    const id = parseInt((req.query.id || req.params.id) as string, 10);
    if (!id) return res.status(400).send("ID de factura inválido.");

    const invoice = await db.invoice.findUnique({ where: { id } });
    if (!invoice) return res.status(404).send("Factura no encontrada.");

    const xmlContent = invoice.xmlAutorizado || invoice.xmlNoFirmado;
    if (!xmlContent) return res.status(404).send("XML no disponible.");

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="Factura_${invoice.secuencial}.xml"`);
    return res.send(xmlContent);
  } catch (error: any) {
    return res.status(500).send("Error al descargar XML: " + error.message);
  }
}

export async function querySri(req: Request, res: Response) {
  try {
    const { claveAcceso, ambiente } = req.body;
    if (!claveAcceso) return res.status(400).json({ error: "Clave de acceso requerida." });

    const result = await sriClient.autorizacionComprobante(claveAcceso, ambiente || 1);

    if (result.estado === "AUTORIZADO") {
      await db.invoice.updateMany({
        where: { claveAcceso },
        data: {
          estado: "AUTORIZADA",
          xmlAutorizado: result.comprobanteXml || undefined,
        },
      });
    }

    return res.json({ success: true, sriResponse: result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function resendEmail(req: Request, res: Response) {
  try {
    const { invoiceId, email } = req.body;
    const invoice = await db.invoice.findUnique({
      where: { id: parseInt(invoiceId, 10) },
      include: { client: true, issuer: true, items: { include: { product: true } } },
    });

    if (!invoice) return res.status(404).json({ error: "Factura no encontrada." });

    const targetEmail = email || invoice.client.mail;
    const pdfBuffer = invoice.pdfRIDE ? Buffer.from(invoice.pdfRIDE, "base64") : Buffer.from("");
    const xmlContent = invoice.xmlAutorizado || invoice.xmlNoFirmado || "";

    const emailRes = await sendInvoiceEmail({
      to: targetEmail,
      issuerEmail: invoice.issuer.email,
      ruc: invoice.issuer.ruc,
      claveAcceso: invoice.claveAcceso || undefined,
      invoiceNumber: `${invoice.establecimiento}-${invoice.puntoEmision}-${invoice.secuencial}`,
      xmlContent,
      pdfBuffer,
      businessName: invoice.issuer.nombreEmpresa || invoice.issuer.razonSocial,
      customerName: invoice.client.nombres,
    });

    return res.json(emailRes);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function cancelInvoice(req: Request, res: Response) {
  try {
    const { invoiceId, action, motivo } = req.body;
    const invoice = await db.invoice.findUnique({
      where: { id: parseInt(invoiceId, 10) },
      include: { client: true, issuer: true, items: { include: { product: true } } },
    });

    if (!invoice) return res.status(404).json({ error: "Factura no encontrada." });

    if (action === "cancel_system") {
      const updatedObs = `[ANULADA EN SISTEMA - ${new Date().toLocaleDateString("es-EC")}]: ${motivo || "Sin motivo"}\n${invoice.observaciones || ""}`;
      const updated = await db.invoice.update({
        where: { id: invoice.id },
        data: { estado: "ANULADA_SISTEMA", observaciones: updatedObs.trim() },
      });
      return res.json({ success: true, message: "Factura anulada en sistema local.", invoice: updated });
    }

    if (action === "cancel_sri") {
      const updatedObs = `[REGISTRADA ANULACIÓN EN PORTAL SRI - ${new Date().toLocaleDateString("es-EC")}]: ${motivo || "Solicitud en portal SRI"}\n${invoice.observaciones || ""}`;
      const updated = await db.invoice.update({
        where: { id: invoice.id },
        data: { estado: "ANULADA_SRI", observaciones: updatedObs.trim() },
      });
      return res.json({ success: true, message: "Anulación registrada en portal SRI.", invoice: updated });
    }

    return res.status(400).json({ error: "Acción no reconocida." });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
