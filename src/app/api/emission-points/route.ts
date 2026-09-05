import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Helper para obtener el emisor autenticado por cookie o header
async function getAuthenticatedIssuer(request: Request) {
  const issuerIdHeader = request.headers.get("x-issuer-id");
  if (issuerIdHeader) {
    const issuer = await db.issuer.findUnique({
      where: { id: parseInt(issuerIdHeader, 10) },
    });
    if (issuer) return issuer;
  }

  // Fallback al primer emisor activo si no se envió header
  return await db.issuer.findFirst({
    orderBy: { id: "asc" },
  });
}

/**
 * GET /api/emission-points
 * Lista todos los puntos de emisión del emisor activo con conteo de facturas
 */
export async function GET(request: Request) {
  try {
    const issuer = await getAuthenticatedIssuer(request);
    if (!issuer) {
      return NextResponse.json({ error: "No se encontró un emisor autenticado." }, { status: 404 });
    }

    let points = await db.emissionPoint.findMany({
      where: { issuerId: issuer.id },
      include: {
        _count: {
          select: { invoices: true }
        }
      },
      orderBy: [
        { establecimiento: "asc" },
        { puntoEmision: "asc" }
      ]
    });

    // Si la empresa aún no tiene ningún punto de emisión, aseguramos crear el 001-001 por defecto
    if (points.length === 0) {
      const defaultPoint = await db.emissionPoint.create({
        data: {
          issuerId: issuer.id,
          establecimiento: issuer.establecimiento || "001",
          puntoEmision: issuer.puntoEmision || "001",
          nombre: "Punto de Venta Principal",
          secuencialInicio: issuer.startSecuencial || "000000001",
          activo: true
        },
        include: {
          _count: {
            select: { invoices: true }
          }
        }
      });
      points = [defaultPoint];
    }

    // Calcular el siguiente secuencial en tiempo real para cada caja / punto de emisión
    const pointsWithNextSec = await Promise.all(
      points.map(async (pt) => {
        const lastInvoice = await db.invoice.findFirst({
          where: {
            issuerId: issuer.id,
            establecimiento: pt.establecimiento,
            puntoEmision: pt.puntoEmision,
            estado: { in: ["AUTORIZADA", "RECIBIDA"] }
          },
          orderBy: { secuencial: "desc" }
        });

        let nextSecNum = parseInt(pt.secuencialInicio || "1", 10);
        if (lastInvoice) {
          const lastSecNum = parseInt(lastInvoice.secuencial, 10);
          nextSecNum = Math.max(lastSecNum + 1, nextSecNum);
        }
        const siguienteSecuencial = String(nextSecNum).padStart(9, "0");

        return {
          ...pt,
          siguienteSecuencial,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: pointsWithNextSec,
      issuer: {
        id: issuer.id,
        ruc: issuer.ruc,
        nombreEmpresa: issuer.nombreEmpresa,
        razonSocial: issuer.razonSocial,
      }
    });
  } catch (error: any) {
    console.error("GET /api/emission-points error:", error);
    return NextResponse.json({ error: "Error al obtener puntos de emisión." }, { status: 500 });
  }
}

/**
 * POST /api/emission-points
 * Crea un nuevo punto de emisión para la empresa
 */
export async function POST(request: Request) {
  try {
    const issuer = await getAuthenticatedIssuer(request);
    if (!issuer) {
      return NextResponse.json({ error: "No se encontró un emisor autenticado." }, { status: 404 });
    }

    const body = await request.json();

    // ACCIÓN ESPECIAL: Modificación o Salto de Secuencial (+1 de emergencia SRI)
    if (body.action === "set-sequential" || body.action === "advance-sequential") {
      const { emissionPointId, puntoEmision: peParam, establecimiento: estParam, nextSequential } = body;
      
      let point = null;
      if (emissionPointId) {
        point = await db.emissionPoint.findFirst({
          where: { id: parseInt(emissionPointId, 10), issuerId: issuer.id }
        });
      } else if (peParam) {
        point = await db.emissionPoint.findFirst({
          where: {
            issuerId: issuer.id,
            puntoEmision: String(peParam).padStart(3, "0"),
            establecimiento: String(estParam || issuer.establecimiento || "001").padStart(3, "0")
          }
        });
      } else {
        point = await db.emissionPoint.findFirst({
          where: { issuerId: issuer.id }
        });
      }

      if (!point) {
        return NextResponse.json({ error: "Punto de emisión no encontrado." }, { status: 404 });
      }

      let newSeqStr = "";
      if (body.action === "advance-sequential") {
        // Calcular el actual más 1
        const lastInvoice = await db.invoice.findFirst({
          where: {
            issuerId: issuer.id,
            establecimiento: point.establecimiento,
            puntoEmision: point.puntoEmision,
            estado: { in: ["AUTORIZADA", "RECIBIDA"] }
          },
          orderBy: { secuencial: "desc" }
        });

        let currentSecNum = parseInt(point.secuencialInicio || "1", 10);
        if (lastInvoice) {
          const lastSecNum = parseInt(lastInvoice.secuencial, 10);
          currentSecNum = Math.max(lastSecNum + 1, currentSecNum);
        }
        newSeqStr = String(currentSecNum + 1).padStart(9, "0");
      } else {
        const parsed = parseInt(String(nextSequential || "1"), 10);
        if (isNaN(parsed) || parsed < 1) {
          return NextResponse.json({ error: "El secuencial debe ser un número entero positivo mayor a 0." }, { status: 400 });
        }
        newSeqStr = String(parsed).padStart(9, "0");
      }

      const updated = await db.emissionPoint.update({
        where: { id: point.id },
        data: { secuencialInicio: newSeqStr }
      });

      if (point.puntoEmision === (issuer.puntoEmision || "001")) {
        await db.issuer.update({
          where: { id: issuer.id },
          data: { startSecuencial: newSeqStr }
        });
      }

      return NextResponse.json({
        success: true,
        message: `Secuencial de la caja ${point.establecimiento}-${point.puntoEmision} actualizado con éxito a ${newSeqStr}.`,
        data: updated,
        newSequential: newSeqStr
      });
    }

    let { establecimiento, puntoEmision, nombre, username, password, secuencialInicio, activo } = body;

    if (!puntoEmision || !nombre) {
      return NextResponse.json({ error: "El código de punto de emisión y el nombre son obligatorios." }, { status: 400 });
    }

    establecimiento = String(establecimiento || issuer.establecimiento || "001").padStart(3, "0");
    puntoEmision = String(puntoEmision).padStart(3, "0");
    secuencialInicio = String(secuencialInicio || "1").padStart(9, "0");

    if (establecimiento.length !== 3 || puntoEmision.length !== 3) {
      return NextResponse.json({ error: "El establecimiento y el punto de emisión deben tener exactamente 3 dígitos (ej. 001, 002)." }, { status: 400 });
    }

    // Verificar si ya existe este punto de emisión para la empresa
    const existing = await db.emissionPoint.findFirst({
      where: {
        issuerId: issuer.id,
        establecimiento,
        puntoEmision,
      }
    });

    if (existing) {
      return NextResponse.json({ error: `El punto de emisión ${establecimiento}-${puntoEmision} ya existe para esta empresa.` }, { status: 400 });
    }

    // Si se especificó username para cajero, verificar unicidad
    if (username && username.trim()) {
      username = username.trim().toLowerCase();
      const existingUser = await db.emissionPoint.findUnique({
        where: { username }
      });
      if (existingUser) {
        return NextResponse.json({ error: `El nombre de usuario '${username}' ya está en uso. Elige otro.` }, { status: 400 });
      }
    } else {
      username = null;
    }

    const newPoint = await db.emissionPoint.create({
      data: {
        issuerId: issuer.id,
        establecimiento,
        puntoEmision,
        nombre: nombre.trim(),
        username,
        password: password ? String(password) : null,
        secuencialInicio,
        activo: activo !== undefined ? Boolean(activo) : true,
      },
      include: {
        _count: {
          select: { invoices: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Punto de emisión ${establecimiento}-${puntoEmision} creado con éxito.`,
      data: newPoint,
    });
  } catch (error: any) {
    console.error("POST /api/emission-points error:", error);
    return NextResponse.json({ error: error.message || "Error al crear punto de emisión." }, { status: 500 });
  }
}

/**
 * PUT /api/emission-points
 * Actualiza un punto de emisión existente
 */
export async function PUT(request: Request) {
  try {
    const issuer = await getAuthenticatedIssuer(request);
    if (!issuer) {
      return NextResponse.json({ error: "No se encontró un emisor autenticado." }, { status: 404 });
    }

    const body = await request.json();
    const { id, nombre, username, password, secuencialInicio, activo, puntoEmision, establecimiento } = body;

    if (!id) {
      return NextResponse.json({ error: "El ID del punto de emisión es obligatorio." }, { status: 400 });
    }

    const point = await db.emissionPoint.findFirst({
      where: { id: parseInt(id, 10), issuerId: issuer.id }
    });

    if (!point) {
      return NextResponse.json({ error: "Punto de emisión no encontrado o no pertenece a esta empresa." }, { status: 404 });
    }

    const updateData: any = {};
    if (nombre !== undefined) updateData.nombre = String(nombre).trim();
    if (activo !== undefined) updateData.activo = Boolean(activo);
    if (secuencialInicio !== undefined) updateData.secuencialInicio = String(secuencialInicio).padStart(9, "0");
    if (password !== undefined && password !== "") updateData.password = String(password);

    if (username !== undefined) {
      const cleanUser = username.trim().toLowerCase();
      if (cleanUser && cleanUser !== point.username) {
        const existingUser = await db.emissionPoint.findUnique({
          where: { username: cleanUser }
        });
        if (existingUser && existingUser.id !== point.id) {
          return NextResponse.json({ error: `El nombre de usuario '${cleanUser}' ya está en uso.` }, { status: 400 });
        }
        updateData.username = cleanUser;
      } else if (!cleanUser) {
        updateData.username = null;
      }
    }

    if (puntoEmision !== undefined) {
      const cleanPE = String(puntoEmision).padStart(3, "0");
      const cleanEst = String(establecimiento || point.establecimiento).padStart(3, "0");
      
      const duplicate = await db.emissionPoint.findFirst({
        where: {
          issuerId: issuer.id,
          establecimiento: cleanEst,
          puntoEmision: cleanPE,
          id: { not: point.id }
        }
      });
      if (duplicate) {
        return NextResponse.json({ error: `Ya existe otro punto de emisión ${cleanEst}-${cleanPE}.` }, { status: 400 });
      }
      updateData.puntoEmision = cleanPE;
      updateData.establecimiento = cleanEst;
    }

    const updated = await db.emissionPoint.update({
      where: { id: point.id },
      data: updateData,
      include: {
        _count: {
          select: { invoices: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: "Punto de emisión actualizado con éxito.",
      data: updated
    });
  } catch (error: any) {
    console.error("PUT /api/emission-points error:", error);
    return NextResponse.json({ error: error.message || "Error al actualizar punto de emisión." }, { status: 500 });
  }
}

/**
 * DELETE /api/emission-points
 * Elimina o desactiva un punto de emisión
 */
export async function DELETE(request: Request) {
  try {
    const issuer = await getAuthenticatedIssuer(request);
    if (!issuer) {
      return NextResponse.json({ error: "No se encontró un emisor autenticado." }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");
    if (!idParam) {
      return NextResponse.json({ error: "Debe especificar el ID del punto de emisión." }, { status: 400 });
    }

    const id = parseInt(idParam, 10);
    const point = await db.emissionPoint.findFirst({
      where: { id, issuerId: issuer.id },
      include: { _count: { select: { invoices: true } } }
    });

    if (!point) {
      return NextResponse.json({ error: "Punto de emisión no encontrado." }, { status: 404 });
    }

    // Si es el único punto de emisión, no permitir borrarlo
    const totalPoints = await db.emissionPoint.count({ where: { issuerId: issuer.id } });
    if (totalPoints <= 1) {
      return NextResponse.json({ error: "No puedes eliminar el único punto de emisión de la empresa." }, { status: 400 });
    }

    // Si ya tiene facturas emitidas, se desactiva para mantener la integridad histórica
    if (point._count.invoices > 0) {
      await db.emissionPoint.update({
        where: { id: point.id },
        data: { activo: false }
      });
      return NextResponse.json({
        success: true,
        message: `El punto de emisión tiene ${point._count.invoices} facturas emitidas y ha sido desactivado para proteger el historial tributario.`,
        deactivated: true
      });
    }

    await db.emissionPoint.delete({
      where: { id: point.id }
    });

    return NextResponse.json({
      success: true,
      message: "Punto de emisión eliminado exitosamente.",
      deleted: true
    });
  } catch (error: any) {
    console.error("DELETE /api/emission-points error:", error);
    return NextResponse.json({ error: error.message || "Error al eliminar punto de emisión." }, { status: 500 });
  }
}
