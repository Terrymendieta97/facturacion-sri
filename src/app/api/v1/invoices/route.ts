import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateApiKey } from "@/lib/api-auth";
import { generateInvoiceXml } from "@/lib/sri/xml-generator";
import { signDocument } from "@/lib/sri/sri-signer";
import { SriClient } from "@/lib/sri/sri-client";
import { generateRidePdf } from "@/lib/sri/ride-generator";
import { sendInvoiceEmail } from "@/lib/email";

const sriClient = new SriClient();

// Helper para validar cédula ecuatoriana (Módulo 10)
function validarCedulaEcuatoriana(cedula: string): boolean {
  const clean = cedula.trim();
  if (clean.length !== 10 || !/^\d{10}$/.test(clean)) return false;
  const prov = parseInt(clean.substring(0, 2), 10);
  if ((prov < 1 || prov > 24) && prov !== 30) return false;
  const tercerDigito = parseInt(clean.substring(2, 3), 10);
  if (tercerDigito >= 6) return false;
  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let valor = parseInt(clean.charAt(i), 10) * coeficientes[i];
    if (valor >= 10) valor -= 9;
    suma += valor;
  }
  const digitoVerificador = parseInt(clean.charAt(9), 10);
  const residuo = suma % 10;
  const resultado = residuo === 0 ? 0 : 10 - residuo;
  return resultado === digitoVerificador;
}

// Helper para validar RUC ecuatoriano
function validarRucEcuatoriano(ruc: string): boolean {
  const clean = ruc.trim();
  if (clean.length !== 13 || !/^\d{13}$/.test(clean)) return false;
  const prov = parseInt(clean.substring(0, 2), 10);
  if ((prov < 1 || prov > 24) && prov !== 30) return false;
  return clean.endsWith("001") || clean.endsWith("002") || clean.endsWith("003");
}

/**
 * POST /api/v1/invoices
 * Emite una factura electrónica autorizada por el SRI desde sistemas externos / e-commerce
 */
export async function POST(request: Request) {
  try {
    // 1. Autenticar mediante API Key
    const auth = await authenticateApiKey(request);
    if (!auth.authorized) {
      return auth.response;
    }
    const issuer = auth.issuer;

    if (!issuer.firmaElectronica || !issuer.codigoSri) {
      return NextResponse.json(
        {
          success: false,
          error: "La empresa emisora no ha configurado su firma electrónica (.p12) o contraseña.",
          code: "SIGNATURE_NOT_CONFIGURED",
        },
        { status: 400 }
      );
    }

    // 2. Parsear el cuerpo de la petición
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Cuerpo de petición JSON inválido o malformado.", code: "INVALID_JSON" },
        { status: 400 }
      );
    }

    const { client, items, formaPago, observaciones } = body;

    // Resolver y validar Establecimiento y Punto de Emisión
    const establecimiento = String(body.establecimiento || issuer.establecimiento || "001").padStart(3, "0");
    const puntoEmision = String(body.puntoEmision || issuer.puntoEmision || "001").padStart(3, "0");

    let emissionPointObj = await db.emissionPoint.findUnique({
      where: {
        issuerId_establecimiento_puntoEmision: {
          issuerId: issuer.id,
          establecimiento,
          puntoEmision,
        },
      },
    });

    if (body.puntoEmision && !emissionPointObj) {
      return NextResponse.json(
        {
          success: false,
          error: `El punto de emisión '${establecimiento}-${puntoEmision}' no existe configurado para esta empresa.`,
          code: "EMISSION_POINT_NOT_FOUND",
        },
        { status: 400 }
      );
    }

    if (emissionPointObj && !emissionPointObj.activo) {
      return NextResponse.json(
        {
          success: false,
          error: `El punto de emisión '${establecimiento}-${puntoEmision}' se encuentra desactivado.`,
          code: "EMISSION_POINT_INACTIVE",
        },
        { status: 400 }
      );
    }

    if (!client || !client.identificacion || !client.nombres) {
      return NextResponse.json(
        {
          success: false,
          error: "Datos del cliente incompletos. Se requiere 'identificacion' y 'nombres'.",
          code: "CLIENT_REQUIRED",
        },
        { status: 400 }
      );
    }

    const clientIdent = String(client.identificacion).trim();
    const isConsumidorFinal = clientIdent === "9999999999999" || client.tipoIdentificacion === "07";

    // Validaciones preventivas anti-bloqueo SRI
    if (!isConsumidorFinal) {
      if (clientIdent.length === 10 && !validarCedulaEcuatoriana(clientIdent)) {
        return NextResponse.json(
          {
            success: false,
            error: `La cédula '${clientIdent}' no es válida según el algoritmo de verificación del SRI. Corríjala antes de emitir.`,
            code: "INVALID_CEDULA",
          },
          { status: 400 }
        );
      }
      if (clientIdent.length === 13 && !validarRucEcuatoriano(clientIdent)) {
        return NextResponse.json(
          {
            success: false,
            error: `El RUC '${clientIdent}' no es válido (debe tener 13 dígitos numéricos y sufijo válido ej: 001).`,
            code: "INVALID_RUC",
          },
          { status: 400 }
        );
      }
    }

    if (client.mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(client.mail).trim())) {
      return NextResponse.json(
        {
          success: false,
          error: `El correo electrónico '${client.mail}' tiene un formato inválido.`,
          code: "INVALID_EMAIL",
        },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "La lista de 'items' (productos o servicios) es obligatoria y debe contener al menos un producto.",
          code: "ITEMS_REQUIRED",
        },
        { status: 400 }
      );
    }

    // 3. Validar estado comercial / saldo
    const sysConfig = await db.systemConfig.findFirst();
    const pricePerInvoice = sysConfig?.pricePerInvoice ?? 0.10;

    if (issuer.planType === "MONTHLY") {
      const now = new Date();
      const subEnds = new Date(issuer.subscriptionEnds);
      if (now > subEnds) {
        return NextResponse.json(
          {
            success: false,
            error: "La suscripción mensual del emisor ha expirado. Por favor renueve su plan.",
            code: "SUBSCRIPTION_EXPIRED",
          },
          { status: 402 }
        );
      }
    } else if (issuer.planType === "PAY_PER_INVOICE") {
      if (issuer.balance < pricePerInvoice) {
        return NextResponse.json(
          {
            success: false,
            error: `Saldo insuficiente para emitir comprobantes. Saldo actual: $${issuer.balance.toFixed(2)}. Costo por factura: $${pricePerInvoice.toFixed(2)}.`,
            code: "INSUFFICIENT_BALANCE",
          },
          { status: 402 }
        );
      }
    }

    // 4. Crear o Resolver Cliente en la base de datos y vincularlo
    let clientObj = await db.client.findUnique({
      where: { identificacion: clientIdent },
    });

    const clientPayload = {
      nombres: String(client.nombres).toUpperCase(),
      tipoIdentificacion: String(
        client.tipoIdentificacion || (isConsumidorFinal ? "07" : clientIdent.length === 13 ? "04" : "05")
      ),
      direccion: String(client.direccion || "S/N").toUpperCase(),
      mail: String(client.mail || "cliente@email.com").toLowerCase().trim(),
      celular: String(client.celular || "0999999999").trim(),
      telefono: client.telefono ? String(client.telefono).trim() : null,
    };

    if (clientObj) {
      clientObj = await db.client.update({
        where: { id: clientObj.id },
        data: clientPayload,
      });
    } else {
      clientObj = await db.client.create({
        data: {
          identificacion: clientIdent,
          ...clientPayload,
        },
      });
    }

    // Vincular cliente a la cartera de la empresa
    await db.issuerClient.upsert({
      where: {
        issuerId_clientId: {
          issuerId: issuer.id,
          clientId: clientObj.id,
        },
      },
      create: {
        issuerId: issuer.id,
        clientId: clientObj.id,
      },
      update: {},
    });

    // 5. Procesar Ítems y Calcular Totales
    let subtotal0 = 0;
    let subtotalIva = 0;
    let totalDescuento = 0;
    let valorIva = 0;

    const xmlItems: any[] = [];
    const dbItemsData: any[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const cantidad = parseFloat(item.cantidad) || 1;
      const precioUnitario = parseFloat(item.precioUnitario) || 0;
      const descuento = parseFloat(item.descuento) || 0;
      const ivaPct = parseFloat(item.iva !== undefined ? item.iva : 15.0);
      const codigoPrincipal = String(item.codigoPrincipal || `PROD-${100 + i}`).toUpperCase();
      const nombreProd = String(item.nombre || item.descripcion || "PRODUCTO").toUpperCase();

      const subtotalItem = Math.max(0, cantidad * precioUnitario - descuento);
      const itemIvaVal = subtotalItem * (ivaPct / 100);

      if (ivaPct === 0) {
        subtotal0 += subtotalItem;
      } else {
        subtotalIva += subtotalItem;
        valorIva += itemIvaVal;
      }
      totalDescuento += descuento;

      // Buscar o registrar producto en el catálogo de esta empresa
      let prodObj = await db.product.findFirst({
        where: {
          issuerId: issuer.id,
          codigoPrincipal,
        },
      });

      if (!prodObj) {
        prodObj = await db.product.create({
          data: {
            codigoPrincipal,
            nombre: nombreProd,
            precio: precioUnitario,
            iva: ivaPct,
            descripcion: item.descripcion || "Registrado vía API Ecommerce",
            issuerId: issuer.id,
          },
        });
      }

      xmlItems.push({
        nombre: prodObj.nombre,
        codigoPrincipal: prodObj.codigoPrincipal,
        descripcion: prodObj.descripcion,
        precioUnitario,
        cantidad,
        descuento,
        ivaPercentage: ivaPct,
      });

      dbItemsData.push({
        productId: prodObj.id,
        cantidad,
        precioUnitario,
        descuento,
        total: subtotalItem + itemIvaVal,
        notaExtra1: item.notaExtra1 || null,
        notaExtra2: item.notaExtra2 || null,
      });
    }

    subtotal0 = Math.round(subtotal0 * 100) / 100;
    subtotalIva = Math.round(subtotalIva * 100) / 100;
    valorIva = Math.round(valorIva * 100) / 100;
    const total = Math.round((subtotal0 + subtotalIva + valorIva) * 100) / 100;

    // Validar límite legal de Consumidor Final ($50 USD)
    if (isConsumidorFinal && total > 50.00) {
      return NextResponse.json(
        {
          success: false,
          error: `Por disposición legal del SRI, las facturas a Consumidor Final (9999999999999) no pueden superar los $50.00 USD (Monto total: $${total.toFixed(2)}). Se requieren los datos del cliente (Cédula/RUC y nombres).`,
          code: "CONSUMIDOR_FINAL_LIMIT_EXCEEDED",
        },
        { status: 400 }
      );
    }

    // 6. Generar Secuencial para ESTE punto de emisión específico
    const lastInvoice = await db.invoice.findFirst({
      where: {
        issuerId: issuer.id,
        establecimiento,
        puntoEmision,
      },
      orderBy: { secuencial: "desc" },
    });

    let nextSecNum = parseInt(emissionPointObj?.secuencialInicio || issuer.startSecuencial || "1", 10);
    if (lastInvoice) {
      const lastSecNum = parseInt(lastInvoice.secuencial, 10);
      nextSecNum = Math.max(lastSecNum + 1, nextSecNum);
    }
    const secuencial = String(nextSecNum).padStart(9, "0");

    const cleanFormaPago = formaPago || "01";

    // 7. Crear Factura en Base de Datos con estado CREADA
    let invoice = await db.invoice.create({
      data: {
        secuencial,
        establecimiento,
        puntoEmision,
        fechaEmision: new Date(),
        tipoAmbiente: issuer.ambiente,
        subtotal0,
        subtotalIva,
        valorIva,
        total,
        formaPago: cleanFormaPago,
        observaciones: observaciones || "Factura emitida vía API Ecommerce",
        clientId: clientObj.id,
        issuerId: issuer.id,
        emissionPointId: emissionPointObj ? emissionPointObj.id : null,
        estado: "CREADA",
        items: {
          create: dbItemsData,
        },
      },
    });

    // 8. Generar XML y Clave de Acceso
    const xmlGenResult = generateInvoiceXml({
      secuencial,
      ambiente: issuer.ambiente,
      establecimiento,
      puntoEmision,
      fechaEmision: invoice.fechaEmision,
      formaPago: cleanFormaPago,
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
      items: xmlItems,
    });

    const { xml: xmlUnsigned, claveAcceso } = xmlGenResult;

    await db.invoice.update({
      where: { id: invoice.id },
      data: {
        claveAcceso,
        xmlNoFirmado: xmlUnsigned,
      },
    });

    // 9. Firmar Digitalmente con .p12
    const signResult = signDocument(xmlUnsigned, issuer.firmaElectronica, issuer.codigoSri);
    if (!signResult.success || !signResult.xmlSigned || !signResult.xmlSignedBase64) {
      await db.invoice.update({
        where: { id: invoice.id },
        data: { estado: "RECHAZADA" },
      });
      return NextResponse.json(
        {
          success: false,
          error: `Error de firma digital: ${signResult.error || "No se pudo firmar el documento."}`,
          code: "SIGNATURE_ERROR",
        },
        { status: 400 }
      );
    }

    // 10. Enviar al WebService de Recepción del SRI (SOAP)
    const recepcionResponse = await sriClient.validarComprobante(signResult.xmlSignedBase64, issuer.ambiente);

    if (recepcionResponse.estado === "DEVUELTA" || recepcionResponse.estado === "ERROR") {
      const errorMsg = recepcionResponse.mensajes
        .map((m) => `${m.mensaje}${m.informacionAdicional ? ` (${m.informacionAdicional})` : ""}`)
        .join(" | ");

      await db.invoice.update({
        where: { id: invoice.id },
        data: { estado: "DEVUELTA" },
      });

      return NextResponse.json(
        {
          success: false,
          error: `El SRI rechazó la recepción: ${errorMsg}`,
          mensajes: recepcionResponse.mensajes,
          estado: "DEVUELTA",
          claveAcceso,
        },
        { status: 400 }
      );
    }

    // 11. Consultar Autorización en el SRI
    let autorizacionResponse = null;
    for (let intento = 1; intento <= 3; intento++) {
      await new Promise((res) => setTimeout(res, 1500));
      autorizacionResponse = await sriClient.autorizacionComprobante(claveAcceso, issuer.ambiente);
      if (autorizacionResponse.estado === "AUTORIZADO" || autorizacionResponse.estado === "NO AUTORIZADO") {
        break;
      }
    }

    const estadoFinalSRI = autorizacionResponse?.estado === "AUTORIZADO" ? "AUTORIZADA" : "RECIBIDA";
    const xmlFinalAutorizado = autorizacionResponse?.comprobanteXml || signResult.xmlSigned;

    // Actualizar secuencial en el punto de emisión si existe, o en el emisor
    const nextStartSecuencial = String(nextSecNum + 1).padStart(9, "0");
    if (emissionPointObj) {
      await db.emissionPoint.update({
        where: { id: emissionPointObj.id },
        data: { secuencialInicio: nextStartSecuencial },
      });
    } else {
      await db.issuer.update({
        where: { id: issuer.id },
        data: { startSecuencial: nextStartSecuencial },
      });
    }

    // 12. Descontar Saldo si es Pago por Factura
    if (issuer.planType === "PAY_PER_INVOICE" && (estadoFinalSRI === "AUTORIZADA" || estadoFinalSRI === "RECIBIDA")) {
      await db.issuer.update({
        where: { id: issuer.id },
        data: { balance: { decrement: pricePerInvoice } },
      });
    }

    // 13. Generar RIDE PDF
    const formaPagoMap: { [key: string]: string } = {
      "01": "SIN UTILIZACION DEL SISTEMA FINANCIERO",
      "16": "TARJETA DE DEBITO",
      "19": "TARJETA DE CREDITO",
      "20": "OTROS CON UTILIZACION DEL SISTEMA FINANCIERO",
    };
    const formaPagoText = formaPagoMap[cleanFormaPago] || "SIN UTILIZACION DEL SISTEMA FINANCIERO";

    let pdfBase64: string | null = null;
    let pdfBuffer: Buffer | null = null;
    try {
      const d = invoice.fechaEmision;
      const fechaEmisionFormatted = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

      pdfBuffer = await generateRidePdf({
        secuencial,
        establecimiento,
        puntoEmision,
        claveAcceso,
        numeroAutorizacion: autorizacionResponse?.numeroAutorizacion || claveAcceso,
        fechaAutorizacion: autorizacionResponse?.fechaAutorizacion || new Date().toISOString(),
        ambiente: issuer.ambiente,
        tipoEmision: "1",
        fechaEmision: fechaEmisionFormatted,
        formaPagoText,
        subtotal0,
        subtotalIva,
        valorIva,
        ivaPercentage: xmlItems[0]?.ivaPercentage || 15,
        total,
        emisor: {
          ruc: issuer.ruc,
          razonSocial: issuer.razonSocial,
          nombreComercial: issuer.nombreEmpresa,
          direccionMatriz: issuer.direccion,
          direccionEstablecimiento: issuer.direccion,
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
          total: (it.precioUnitario * it.cantidad - it.descuento) * (1 + it.ivaPercentage / 100),
          iva: it.ivaPercentage,
        })),
      });

      pdfBase64 = pdfBuffer.toString("base64");
    } catch (pdfErr) {
      console.error("Error al generar RIDE PDF:", pdfErr);
    }

    // Actualizar factura en base de datos con XML y RIDE
    await db.invoice.update({
      where: { id: invoice.id },
      data: {
        estado: estadoFinalSRI,
        xmlAutorizado: xmlFinalAutorizado,
        pdfRIDE: pdfBase64,
      },
    });

    // 14. Enviar Correo Electrónico al Cliente (En segundo plano no bloqueante para respuesta ultrarrápida en API e-commerce)
    if (pdfBuffer && clientObj.mail) {
      sendInvoiceEmail({
        to: clientObj.mail,
        issuerEmail: issuer.email,
        ruc: issuer.ruc,
        claveAcceso,
        invoiceNumber: `${establecimiento}-${puntoEmision}-${secuencial}`,
        xmlContent: xmlFinalAutorizado,
        pdfBuffer,
        businessName: issuer.razonSocial || issuer.nombreEmpresa,
        customerName: clientObj.nombres,
      }).catch((mailErr) => {
        console.error("Error al enviar email en segundo plano:", mailErr);
      });
    }

    // 15. Construir URLs públicas de descarga
    const urlObj = new URL(request.url);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    const rideUrl = `${baseUrl}/api/invoices/download-pdf?id=${invoice.id}`;
    const xmlUrl = `${baseUrl}/api/invoices/download-xml?id=${invoice.id}`;

    return NextResponse.json(
      {
        success: true,
        id: invoice.id,
        estado: estadoFinalSRI,
        secuencial: `${establecimiento}-${puntoEmision}-${secuencial}`,
        secuencialNumero: secuencial,
        establecimiento,
        puntoEmision,
        claveAcceso,
        fechaEmision: invoice.fechaEmision.toISOString(),
        totales: {
          subtotal0,
          subtotalIva,
          valorIva,
          total,
        },
        documentos: {
          rideUrl,
          xmlUrl,
        },
        cliente: {
          identificacion: clientObj.identificacion,
          nombres: clientObj.nombres,
          mail: clientObj.mail,
          direccion: clientObj.direccion,
        },
        mensajesSri: autorizacionResponse?.mensajes || [],
        message:
          estadoFinalSRI === "AUTORIZADA"
            ? "Factura autorizada exitosamente por el SRI y enviada al cliente."
            : "Factura recibida en proceso de autorización en el SRI.",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/v1/invoices error:", error);
    return NextResponse.json(
      {
        success: false,
        error: `Error interno al procesar la factura: ${error.message || error}`,
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
