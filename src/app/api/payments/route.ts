import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/payments
 * Obtiene el listado de solicitudes de pago.
 * Si es el administrador (cabecera x-admin-auth === "true"), retorna todas.
 * Si es un emisor, retorna solo las suyas.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isAdmin = request.headers.get("x-admin-auth") === "true";
    const issuerIdHeader = request.headers.get("x-issuer-id");

    if (isAdmin) {
      const requests = await db.paymentRequest.findMany({
        orderBy: { fechaSolicitud: "desc" },
      });
      return NextResponse.json(requests);
    }

    if (!issuerIdHeader || issuerIdHeader === "default" || issuerIdHeader === "null") {
      return NextResponse.json([]);
    }

    const requests = await db.paymentRequest.findMany({
      where: { issuerId: parseInt(issuerIdHeader, 10) },
      orderBy: { fechaSolicitud: "desc" },
    });

    return NextResponse.json(requests);
  } catch (error: any) {
    console.error("GET /api/payments error:", error);
    return NextResponse.json({ error: "Fallo al obtener solicitudes de pago." }, { status: 500 });
  }
}

/**
 * POST /api/payments
 * Procesa acciones de solicitudes de pago y aprobaciones:
 * - request-payment: Emisor registra un pago realizado
 * - approve-payment: Administrador aprueba y recarga/renueva
 * - reject-payment: Administrador rechaza la solicitud
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    const issuerIdHeader = request.headers.get("x-issuer-id");
    const isAdmin = request.headers.get("x-admin-auth") === "true";

    // --- ACCIÓN: REGISTRAR SOLICITUD DE PAGO (EMISOR) ---
    if (action === "request-payment") {
      const { monto, tipo, referencia, bancoDestino } = body;

      if (!monto || !tipo || !referencia || !bancoDestino) {
        return NextResponse.json({ error: "Faltan campos obligatorios para registrar la solicitud de pago." }, { status: 400 });
      }

      if (!issuerIdHeader || issuerIdHeader === "default" || issuerIdHeader === "null") {
        return NextResponse.json({ error: "Acceso no autorizado o emisor no identificado." }, { status: 401 });
      }

      const issuerId = parseInt(issuerIdHeader, 10);
      const issuer = await db.issuer.findUnique({ where: { id: issuerId } });
      if (!issuer) {
        return NextResponse.json({ error: "Emisor no encontrado." }, { status: 404 });
      }

      // Validar monto mínimo de recarga de billetera ($5.00)
      const parsedMonto = parseFloat(monto);
      if (tipo === "TOPUP" && parsedMonto < 5.0) {
        return NextResponse.json({ error: "El monto mínimo para recargar la billetera es de $5.00." }, { status: 400 });
      }

      // Crear solicitud en estado PENDIENTE
      const req = await db.paymentRequest.create({
        data: {
          ruc: issuer.ruc,
          razonSocial: issuer.razonSocial,
          monto: parsedMonto,
          tipo,
          referencia,
          bancoDestino,
          estado: "PENDIENTE",
          issuerId,
        },
      });

      return NextResponse.json({ success: true, request: req });
    }

    // --- ACCIÓN: APROBAR PAGO (ADMIN) ---
    if (action === "approve-payment") {
      if (!isAdmin) {
        return NextResponse.json({ error: "No autorizado. Solo el administrador puede aprobar solicitudes de pago." }, { status: 403 });
      }

      const { requestId } = body;
      if (!requestId) {
        return NextResponse.json({ error: "Se requiere el ID de la solicitud para procesar." }, { status: 400 });
      }

      const req = await db.paymentRequest.findUnique({
        where: { id: parseInt(requestId, 10) },
      });

      if (!req || req.estado !== "PENDIENTE") {
        return NextResponse.json({ error: "La solicitud no existe o ya ha sido procesada." }, { status: 400 });
      }

      const issuerId = req.issuerId;
      const issuer = await db.issuer.findUnique({ where: { id: issuerId } });
      if (!issuer) {
        return NextResponse.json({ error: "La empresa asociada a este pago ya no existe." }, { status: 404 });
      }

      if (req.tipo === "TOPUP") {
        // Aumentar saldo de la billetera del emisor
        await db.issuer.update({
          where: { id: issuerId },
          data: {
            balance: {
              increment: req.monto,
            },
          },
        });
      } else if (req.tipo === "MEMBERSHIP") {
        // Renovar suscripción por 30 días
        const currentEnds = new Date(issuer.subscriptionEnds);
        const baseDate = currentEnds > new Date() ? currentEnds : new Date();
        baseDate.setDate(baseDate.getDate() + 30);

        await db.issuer.update({
          where: { id: issuerId },
          data: {
            subscriptionEnds: baseDate,
            status: "ACTIVE", // Forzar activación por si estaba suspendido
          },
        });
      }

      // Marcar solicitud como APROBADO
      const updatedReq = await db.paymentRequest.update({
        where: { id: req.id },
        data: {
          estado: "APROBADO",
          fechaProcesado: new Date(),
        },
      });

      return NextResponse.json({ success: true, request: updatedReq });
    }

    // --- ACCIÓN: RECHAZAR PAGO (ADMIN) ---
    if (action === "reject-payment") {
      if (!isAdmin) {
        return NextResponse.json({ error: "No autorizado. Solo el administrador puede rechazar solicitudes de pago." }, { status: 403 });
      }

      const { requestId } = body;
      if (!requestId) {
        return NextResponse.json({ error: "Se requiere el ID de la solicitud para procesar." }, { status: 400 });
      }

      const req = await db.paymentRequest.findUnique({
        where: { id: parseInt(requestId, 10) },
      });

      if (!req || req.estado !== "PENDIENTE") {
        return NextResponse.json({ error: "La solicitud no existe o ya ha sido procesada." }, { status: 400 });
      }

      // Marcar solicitud como RECHAZADO
      const updatedReq = await db.paymentRequest.update({
        where: { id: req.id },
        data: {
          estado: "RECHAZADO",
          fechaProcesado: new Date(),
        },
      });

      return NextResponse.json({ success: true, request: updatedReq });
    }

    return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/payments error:", error);
    return NextResponse.json({ error: `Fallo al procesar pago: ${error.message || error}` }, { status: 500 });
  }
}
