import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/clients
 * Retorna los clientes de la cartera de la empresa activa (o todos si es admin global)
 */
export async function GET(request: Request) {
  try {
    const issuerHeader = request.headers.get("x-issuer-id");
    const issuerId = issuerHeader ? parseInt(issuerHeader, 10) : null;

    let whereClause = {};
    if (issuerId && !isNaN(issuerId)) {
      whereClause = {
        OR: [
          { issuers: { some: { issuerId } } },
          { invoices: { some: { issuerId } } },
        ],
      };
    }

    const clients = await db.client.findMany({
      where: whereClause,
      orderBy: { nombres: "asc" },
    });
    return NextResponse.json(clients);
  } catch (error: any) {
    console.error("GET /api/clients error:", error);
    return NextResponse.json({ error: "Fallo al cargar los clientes." }, { status: 500 });
  }
}

/**
 * POST /api/clients
 * Crea o actualiza un cliente y lo vincula a la cartera de la empresa actual
 */
export async function POST(request: Request) {
  try {
    const issuerHeader = request.headers.get("x-issuer-id");
    const issuerId = issuerHeader ? parseInt(issuerHeader, 10) : null;

    const body = await request.json();
    const { id, nombres, tipoIdentificacion, identificacion, direccion, mail, celular } = body;

    if (!nombres || !tipoIdentificacion || !identificacion || !mail) {
      return NextResponse.json({ error: "Faltan campos obligatorios para registrar al cliente." }, { status: 400 });
    }

    const data = {
      nombres: String(nombres).toUpperCase(),
      tipoIdentificacion: String(tipoIdentificacion),
      identificacion: String(identificacion).trim(),
      direccion: (direccion || "S/N").toUpperCase(),
      mail: String(mail).toLowerCase().trim(),
      celular: (celular || "").trim(),
    };

    if (id) {
      // Editar cliente existente
      const updated = await db.client.update({
        where: { id: parseInt(id, 10) },
        data,
      });

      if (issuerId && !isNaN(issuerId)) {
        await db.issuerClient.upsert({
          where: {
            issuerId_clientId: {
              issuerId,
              clientId: updated.id,
            },
          },
          create: {
            issuerId,
            clientId: updated.id,
          },
          update: {},
        });
      }

      return NextResponse.json({ success: true, client: updated });
    } else {
      // Verificar si ya existe un cliente con la misma identificación en la base global
      const existing = await db.client.findUnique({
        where: { identificacion: data.identificacion },
      });

      if (existing) {
        // Actualizar datos de contacto y vincularlo a la empresa actual
        const updated = await db.client.update({
          where: { id: existing.id },
          data,
        });

        if (issuerId && !isNaN(issuerId)) {
          await db.issuerClient.upsert({
            where: {
              issuerId_clientId: {
                issuerId,
                clientId: updated.id,
              },
            },
            create: {
              issuerId,
              clientId: updated.id,
            },
            update: {},
          });
        }

        return NextResponse.json({ success: true, client: updated, isExistingGlobal: true });
      }

      // Crear nuevo cliente y vincularlo a la empresa actual
      const created = await db.client.create({
        data: {
          ...data,
          ...(issuerId && !isNaN(issuerId)
            ? {
                issuers: {
                  create: {
                    issuerId,
                  },
                },
              }
            : {}),
        },
      });

      return NextResponse.json({ success: true, client: created });
    }
  } catch (error: any) {
    console.error("POST /api/clients error:", error);
    return NextResponse.json({ error: `Fallo al guardar el cliente: ${error.message || error}` }, { status: 500 });
  }
}

/**
 * DELETE /api/clients
 * Elimina un cliente de la cartera de la empresa
 */
export async function DELETE(request: Request) {
  try {
    const issuerHeader = request.headers.get("x-issuer-id");
    const issuerId = issuerHeader ? parseInt(issuerHeader, 10) : null;

    const { searchParams } = new URL(request.url);
    const idStr = searchParams.get("id");

    if (!idStr) {
      return NextResponse.json({ error: "Se requiere el ID del cliente para eliminar." }, { status: 400 });
    }

    const id = parseInt(idStr, 10);

    // Verificar si el cliente tiene facturas asociadas a esta empresa
    let invoiceCount = 0;
    if (issuerId && !isNaN(issuerId)) {
      invoiceCount = await db.invoice.count({
        where: { clientId: id, issuerId },
      });
    } else {
      invoiceCount = await db.invoice.count({
        where: { clientId: id },
      });
    }

    if (invoiceCount > 0) {
      return NextResponse.json({
        error: "No se puede eliminar el cliente porque tiene facturas emitidas por tu empresa. Puedes editar sus datos si lo requieres.",
      }, { status: 400 });
    }

    if (issuerId && !isNaN(issuerId)) {
      // Eliminar el vínculo de la empresa con este cliente
      await db.issuerClient.deleteMany({
        where: {
          issuerId,
          clientId: id,
        },
      });
    } else {
      await db.client.delete({
        where: { id },
      });
    }

    return NextResponse.json({ success: true, message: "Cliente eliminado correctamente de tu cartera." });
  } catch (error: any) {
    console.error("DELETE /api/clients error:", error);
    return NextResponse.json({ error: `Fallo al eliminar el cliente: ${error.message || error}` }, { status: 500 });
  }
}
