import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateInvoiceXml } from "@/lib/sri/xml-generator";
import { signDocument } from "@/lib/sri/sri-signer";
import { SriClient } from "@/lib/sri/sri-client";
import { generateRidePdf } from "@/lib/sri/ride-generator";
import { sendInvoiceEmail } from "@/lib/email";

// Instancia del cliente SOAP del SRI
const sriClient = new SriClient();

/**
 * GET /api/invoices
 * Retorna todas las facturas registradas en el sistema del emisor activo o globalmente
 */
export async function GET(request: Request) {
  try {
    const issuerIdHeader = request.headers.get("x-issuer-id");
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const status = searchParams.get("status") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "30", 10));
    const isAll = searchParams.get("all") === "true";

    const where: any = {};

    if (issuerIdHeader && issuerIdHeader !== "default" && issuerIdHeader !== "null" && issuerIdHeader !== "undefined") {
      where.issuerId = parseInt(issuerIdHeader, 10);
    }

    if (status && status !== "ALL") {
      where.estado = status;
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

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { secuencial: { contains: q } },
        { claveAcceso: { contains: q } },
        { client: { identificacion: { contains: q } } },
        { client: { nombres: { contains: q } } },
        { client: { mail: { contains: q } } },
      ];
    }

    const total = await db.invoice.count({ where });

    const take = isAll ? undefined : limit;
    const skip = isAll ? undefined : (page - 1) * limit;

    const invoices = await db.invoice.findMany({
      where,
      include: {
        client: true,
        issuer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    });

    const totalPages = isAll ? 1 : Math.ceil(total / limit) || 1;

    return NextResponse.json({
      invoices,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error: any) {
    console.error("GET /api/invoices error:", error);
    return NextResponse.json({ error: "Fallo al obtener el listado de facturas." }, { status: 500 });
  }
}

/**
 * POST /api/invoices
 * Emite una nueva factura electrónica ejecutando todo el flujo del SRI:
 * Validación de Membresía/Saldo -> Generación XML -> Firma .p12 -> Recepción WS -> Autorización WS -> Cobro SaaS -> Generación RIDE -> Envío de Correo
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clientId, client, items, pagos, observaciones } = body;

    if (!clientId && !client) {
      return NextResponse.json({ error: "Parámetros inválidos. Se requiere clientId o los datos del client." }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Parámetros inválidos. Se requiere una lista de items." }, { status: 400 });
    }

    // 1. Obtener Emisor (Configuración) vía cabecera o primero disponible
    const issuerIdHeader = request.headers.get("x-issuer-id");
    let issuer = null;

    if (issuerIdHeader && issuerIdHeader !== "default" && issuerIdHeader !== "null" && issuerIdHeader !== "undefined") {
      issuer = await db.issuer.findUnique({
        where: { id: parseInt(issuerIdHeader, 10) },
      });
    } else {
      issuer = await db.issuer.findFirst();
    }

    if (!issuer || !issuer.firmaElectronica || !issuer.codigoSri) {
      return NextResponse.json({
        error: "Por favor configure primero los datos del Emisor, incluyendo su firma electrónica (.p12) y contraseña en la pestaña de Configuración.",
      }, { status: 400 });
    }

    // --- VALIDACIÓN TRIBUTARIA/MEMBRESÍA COMERCIAL ---
    if (issuer.status === "SUSPENDED") {
      return NextResponse.json({
        error: "Su cuenta se encuentra suspendida. Por favor, póngase en contacto con el administrador para activarla.",
      }, { status: 403 });
    }

    if (issuer.planType === "MONTHLY") {
      if (new Date(issuer.subscriptionEnds) < new Date()) {
        return NextResponse.json({
          error: "Su membresía mensual ha expirado. Por favor, renueve su plan o contacte al administrador.",
        }, { status: 403 });
      }
    } else if (issuer.planType === "PAY_PER_INVOICE") {
      if (issuer.balance < 0.20) {
        return NextResponse.json({
          error: "Saldo insuficiente en su billetera ($0.20 mínimo requerido por factura). Recargue saldo para seguir facturando.",
        }, { status: 403 });
      }
    }

    // 2. Obtener o Crear/Actualizar Cliente dinámicamente en caliente
    let clientObj = null;
    if (client) {
      const c = client;
      if (!c.identificacion || !c.nombres || !c.direccion) {
        return NextResponse.json({ error: "Datos del cliente incompletos (identificación, Razón Social o dirección faltante)." }, { status: 400 });
      }

      const existing = await db.client.findUnique({
        where: { identificacion: c.identificacion },
      });

      if (existing) {
        clientObj = await db.client.update({
          where: { id: existing.id },
          data: {
            nombres: c.nombres.toUpperCase(),
            tipoIdentificacion: c.tipoIdentificacion || "05",
            direccion: c.direccion,
            mail: c.mail || "cliente@email.com",
            celular: c.celular || "0999999999",
            telefono: c.telefono || null,
          },
        });
      } else {
        clientObj = await db.client.create({
          data: {
            identificacion: c.identificacion,
            nombres: c.nombres.toUpperCase(),
            tipoIdentificacion: c.tipoIdentificacion || "05",
            direccion: c.direccion,
            mail: c.mail || "cliente@email.com",
            celular: c.celular || "0999999999",
            telefono: c.telefono || null,
          },
        });
      }
    } else {
      clientObj = await db.client.findUnique({
        where: { id: parseInt(clientId, 10) },
      });
    }

    if (!clientObj) {
      return NextResponse.json({ error: "El cliente seleccionado o provisto no es válido." }, { status: 400 });
    }

    // 3. Registrar productos dinámicos (ítems rápidos sin registrar) en caliente
    const processedItems: any[] = [];
    for (const item of items) {
      if (item.isDynamic) {
        // Generar un código único
        const cleanName = item.nombre.toUpperCase();
        const isTemporary = !item.saveToCatalog;
        const codePrefix = isTemporary ? "TEMP-" : "PROD-";
        const randCode = codePrefix + Math.floor(1000 + Math.random() * 9000);
        
        // Crear producto dinámico en la base de datos para satisfacer la relación de clave foránea
        const tempProduct = await db.product.create({
          data: {
            nombre: cleanName,
            codigoPrincipal: item.codigoPrincipal || randCode,
            precio: parseFloat(item.precio),
            iva: parseFloat(item.iva !== undefined ? item.iva : "12"),
            descripcion: item.descripcion || (isTemporary ? "Producto temporal creado en factura" : "Producto manual guardado en catálogo"),
            imagen: item.imagen || null,
          },
        });

        processedItems.push({
          productId: tempProduct.id,
          cantidad: parseFloat(item.cantidad),
          descuento: parseFloat(item.descuento || "0"),
          notaExtra1: item.notaExtra1 || null,
          notaExtra2: item.notaExtra2 || null,
        });
      } else {
        processedItems.push({
          productId: parseInt(item.productId, 10),
          cantidad: parseFloat(item.cantidad),
          descuento: parseFloat(item.descuento || "0"),
          notaExtra1: item.notaExtra1 || null,
          notaExtra2: item.notaExtra2 || null,
        });
      }
    }

    // 4. Generar el Secuencial de la Factura (Autoincrementado por empresa)
    // El serial solo puede avanzar con facturas que fueron recibidas o autorizadas satisfactoriamente
    const lastInvoice = await db.invoice.findFirst({
      where: { 
        issuerId: issuer.id,
        estado: { in: ["AUTORIZADA", "RECIBIDA"] }
      },
      orderBy: { secuencial: "desc" },
    });
    
    let nextSecNum = parseInt(issuer.startSecuencial || "1", 10);
    if (lastInvoice) {
      const lastSecNum = parseInt(lastInvoice.secuencial, 10);
      nextSecNum = Math.max(lastSecNum + 1, nextSecNum);
    }
    const secuencial = String(nextSecNum).padStart(9, "0");

    // 5. Cargar productos procesados, calcular subtotales y totales
    const productIds = processedItems.map((i) => i.productId);
    const dbProducts = await db.product.findMany({
      where: { id: { in: productIds } },
    });

    const productsMap = new Map(dbProducts.map((p) => [p.id, p]));

    let subtotal0 = 0;
    let subtotalIva = 0;
    let totalDescuento = 0;
    let valorIva = 0;

    const xmlItems: any[] = [];
    const dbItemsData: any[] = [];

    for (const item of processedItems) {
      const product = productsMap.get(item.productId);
      if (!product) {
        return NextResponse.json({ error: `El producto con ID ${item.productId} no existe.` }, { status: 400 });
      }

      const cantidad = item.cantidad;
      const descuento = item.descuento;
      const subtotalItem = product.precio * cantidad;
      const baseImponible = subtotalItem - descuento;
      
      const itemIvaVal = baseImponible * (product.iva / 100);

      if (product.iva === 0) {
        subtotal0 += baseImponible;
      } else {
        subtotalIva += baseImponible;
        valorIva += itemIvaVal;
      }
      totalDescuento += descuento;

      // Guardar item en formato XML
      xmlItems.push({
        nombre: product.nombre,
        codigoPrincipal: product.codigoPrincipal,
        descripcion: product.descripcion,
        precioUnitario: product.precio,
        cantidad,
        descuento,
        ivaPercentage: product.iva,
      });

      // Guardar item para insertar en DB
      dbItemsData.push({
        productId: product.id,
        cantidad,
        precioUnitario: product.precio,
        descuento,
        total: baseImponible + itemIvaVal,
        notaExtra1: item.notaExtra1 || null,
        notaExtra2: item.notaExtra2 || null,
      });
    }

    const total = subtotal0 + subtotalIva + valorIva;
    const cleanFormaPago = pagos && pagos.length > 0 ? pagos[0].formaPago : (body.formaPago || "01");

    // 6. Guardar Factura en DB con estado CREADA
    let invoice = await db.invoice.create({
      data: {
        secuencial,
        fechaEmision: new Date(),
        tipoAmbiente: issuer.ambiente,
        subtotal0,
        subtotalIva,
        valorIva,
        total,
        formaPago: cleanFormaPago,
        observaciones: observaciones || null,
        clientId: clientObj.id,
        issuerId: issuer.id,
        estado: "CREADA",
        items: {
          create: dbItemsData,
        },
      },
    });

    // 7. Generar el XML de la factura y su Clave de Acceso
    const xmlGenResult = generateInvoiceXml({
      secuencial,
      ambiente: issuer.ambiente,
      establecimiento: issuer.establecimiento,
      puntoEmision: issuer.puntoEmision,
      fechaEmision: invoice.fechaEmision,
      formaPago: cleanFormaPago,
      pagos: pagos || undefined,
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
        nombres: clientObj.nombres,
        tipoIdentificacion: clientObj.tipoIdentificacion,
        identificacion: clientObj.identificacion,
        direccion: clientObj.direccion,
        email: clientObj.mail,
      },
      items: xmlGenResultItemsMapeo(xmlItems),
    });

    const { xml: xmlUnsigned, claveAcceso } = xmlGenResult;

    // Actualizar la factura con la clave de acceso generada
    invoice = await db.invoice.update({
      where: { id: invoice.id },
      data: {
        claveAcceso,
        xmlNoFirmado: xmlUnsigned,
      },
    });

    // 8. Firmar Digitalmente el XML
    const signResult = signDocument(xmlUnsigned, issuer.firmaElectronica, issuer.codigoSri);
    if (!signResult.success || !signResult.xmlSigned || !signResult.xmlSignedBase64) {
      await db.invoice.update({
        where: { id: invoice.id },
        data: { estado: "RECHAZADA" },
      });
      return NextResponse.json({
        error: `Error de firma digital: ${signResult.error || "No se pudo firmar el documento."}`,
        invoiceId: invoice.id,
        estado: "RECHAZADA",
      }, { status: 400 });
    }

    // Actualizar estado a FIRMADA
    invoice = await db.invoice.update({
      where: { id: invoice.id },
      data: {
        estado: "FIRMADA",
      },
    });

    // 9. Enviar Comprobante al Web Service de Recepción del SRI (SOAP)
    const recepcionResponse = await sriClient.validarComprobante(signResult.xmlSignedBase64, issuer.ambiente);
    
    if (recepcionResponse.estado === "DEVUELTA" || recepcionResponse.estado === "ERROR") {
      const errorMsg = recepcionResponse.mensajes
        .map((m) => `${m.mensaje}${m.informacionAdicional ? ` (${m.informacionAdicional})` : ""}`)
        .join(" | ");

      await db.invoice.update({
        where: { id: invoice.id },
        data: {
          estado: "DEVUELTA",
        },
      });

      return NextResponse.json({
        error: `El SRI rechazó la recepción del comprobante: ${errorMsg}`,
        mensajes: recepcionResponse.mensajes,
        invoiceId: invoice.id,
        estado: "DEVUELTA",
        claveAcceso,
      }, { status: 400 });
    }

    // Actualizar a estado RECIBIDA
    invoice = await db.invoice.update({
      where: { id: invoice.id },
      data: { estado: "RECIBIDA" },
    });

    // 10. Consultar Estado en el Web Service de Autorización del SRI (SOAP)
    let autorizacionResponse = null;
    for (let intento = 1; intento <= 3; intento++) {
      await new Promise((res) => setTimeout(res, 2000));
      
      autorizacionResponse = await sriClient.autorizacionComprobante(claveAcceso, issuer.ambiente);
      
      if (autorizacionResponse.estado === "AUTORIZADO") {
        break;
      }
      if (autorizacionResponse.estado === "NO AUTORIZADO") {
        break;
      }
    }

    if (!autorizacionResponse || autorizacionResponse.estado !== "AUTORIZADO") {
      const errorMsg = autorizacionResponse?.mensajes
        .map((m) => `${m.mensaje}${m.informacionAdicional ? ` (${m.informacionAdicional})` : ""}`)
        .join(" | ") || "Procesamiento demorado en el SRI.";

      // --- ACTUALIZAR EL SECUENCIAL DE INICIO DEL EMISOR EN LA DB ---
      const nextStartSecuencial = String(nextSecNum + 1).padStart(9, "0");
      await db.issuer.update({
        where: { id: issuer.id },
        data: { startSecuencial: nextStartSecuencial },
      });

      return NextResponse.json({
        warning: `Factura RECIBIDA por el SRI, pero la autorización está pendiente: ${errorMsg}`,
        invoiceId: invoice.id,
        estado: "RECIBIDA",
        claveAcceso,
      });
    }

    // 11. Factura Autorizada con Éxito! Guardar los datos de autorización
    const xmlAutorizadoStr = autorizacionResponse.comprobanteXml || signResult.xmlSigned;
    
    // Generar PDF RIDE
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
    
    let formaPagoText = "";
    if (pagos && Array.isArray(pagos) && pagos.length > 0) {
      formaPagoText = pagos
        .map((p) => `${formaPagoMap[p.formaPago] || "OTROS"} ($${parseFloat(p.total).toFixed(2)})`)
        .join(" | ");
    } else {
      formaPagoText = formaPagoMap[cleanFormaPago] || "SIN UTILIZACION DEL SISTEMA FINANCIERO";
    }

    const formattedItems = dbProducts.map((p) => {
      const reqItem = processedItems.find((i) => i.productId === p.id);
      const cant = reqItem.cantidad;
      const desc = reqItem.descuento;
      const totalSinImp = p.precio * cant - desc;
      const totalConImp = totalSinImp * (1 + p.iva / 100);
      return {
        codigoPrincipal: p.codigoPrincipal,
        nombre: p.nombre,
        cantidad: cant,
        precioUnitario: p.precio,
        descuento: desc,
        total: totalConImp,
      };
    });

    const d = invoice.fechaEmision;
    const fechaEmisionFormatted = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

    // Generar Buffer del PDF
    const pdfBuffer = await generateRidePdf({
      secuencial,
      establecimiento: issuer.establecimiento,
      puntoEmision: issuer.puntoEmision,
      claveAcceso,
      numeroAutorizacion: autorizacionResponse.numeroAutorizacion,
      fechaAutorizacion: autorizacionResponse.fechaAutorizacion,
      ambiente: issuer.ambiente,
      tipoEmision: "1",
      fechaEmision: fechaEmisionFormatted,
      formaPagoText,
      subtotal0,
      subtotalIva,
      valorIva,
      ivaPercentage: dbProducts[0]?.iva || 12,
      total,
      emisor: {
        ruc: issuer.ruc,
        razonSocial: issuer.razonSocial,
        nombreComercial: issuer.nombreEmpresa,
        direccionMatriz: issuer.direccion,
        direccionEstablecimiento: issuer.direccion,
        obligadoContabilidad: issuer.obligadoContabilidad,
        regimen: issuer.regimen,
        logo: issuer.logo, // Pasar el logo para el PDF
      },
      comprador: {
        nombres: clientObj.nombres,
        identificacion: clientObj.identificacion,
        tipoIdentificacion: clientObj.tipoIdentificacion,
        direccion: clientObj.direccion,
        email: clientObj.mail,
      },
      items: formattedItems,
    });

    const pdfBase64 = pdfBuffer.toString("base64");

    invoice = await db.invoice.update({
      where: { id: invoice.id },
      data: {
        estado: "AUTORIZADA",
        xmlAutorizado: xmlAutorizadoStr,
        pdfRIDE: pdfBase64,
      },
    });

    // --- ACTUALIZAR EL SECUENCIAL DE INICIO DEL EMISOR EN LA DB ---
    const nextStartSecuencial = String(nextSecNum + 1).padStart(9, "0");
    await db.issuer.update({
      where: { id: issuer.id },
      data: {
        startSecuencial: nextStartSecuencial,
      },
    });

    // --- COBRO SAAS: DEDUCIR $0.20 EN CASO DE PLAN POR FACTURA ---
    if (issuer.planType === "PAY_PER_INVOICE") {
      await db.issuer.update({
        where: { id: issuer.id },
        data: {
          balance: {
            decrement: 0.20,
          },
        },
      });
    }

    // 12. Enviar Factura por Correo Electrónico
    try {
      await sendInvoiceEmail({
        to: clientObj.mail,
        issuerEmail: issuer.email,
        ruc: issuer.ruc,
        claveAcceso: claveAcceso,
        invoiceNumber: `${issuer.establecimiento}-${issuer.puntoEmision}-${secuencial}`,
        xmlContent: xmlAutorizadoStr,
        pdfBuffer: pdfBuffer,
        businessName: issuer.nombreEmpresa || issuer.razonSocial,
        customerName: clientObj.nombres,
      });
    } catch (emailErr) {
      console.warn("Fallo al enviar correo de la factura:", emailErr);
    }

    return NextResponse.json({
      success: true,
      invoiceId: invoice.id,
      estado: "AUTORIZADA",
      claveAcceso,
      numeroAutorizacion: autorizacionResponse.numeroAutorizacion,
    });
  } catch (error: any) {
    console.error("POST /api/invoices error:", error);
    return NextResponse.json({ error: `Fallo interno del servidor en facturación: ${error.message || error}` }, { status: 500 });
  }
}

// Auxiliar para mapeo tipado
function xmlGenResultItemsMapeo(items: any[]): any[] {
  return items.map((item) => ({
    nombre: item.nombre,
    codigoPrincipal: item.codigoPrincipal,
    descripcion: item.descripcion,
    precioUnitario: item.precioUnitario,
    cantidad: item.cantidad,
    descuento: item.descuento,
    ivaPercentage: item.ivaPercentage,
  }));
}
