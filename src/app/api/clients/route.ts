import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/clients
 * Retorna todos los clientes registrados
 */
export async function GET() {
  try {
    const clients = await db.client.findMany({
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
 * Crea o actualiza un cliente
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, nombres, tipoIdentificacion, identificacion, direccion, mail, celular } = body;

    if (!nombres || !tipoIdentificacion || !identificacion || !mail) {
      return NextResponse.json({ error: "Faltan campos obligatorios para registrar al cliente." }, { status: 400 });
    }

    const data = {
      nombres,
      tipoIdentificacion,
      identificacion,
      direccion: direccion || "S/N",
      mail,
      celular: celular || "",
    };

    if (id) {
      // Editar cliente
      const updated = await db.client.update({
        where: { id: parseInt(id, 10) },
        data,
      });
      return NextResponse.json({ success: true, client: updated });
    } else {
      // Verificar si ya existe un cliente con la misma identificación
      const existing = await db.client.findUnique({
        where: { identificacion },
      });
      if (existing) {
        return NextResponse.json({ error: "Ya existe un cliente registrado con esta identificación (Cédula/RUC)." }, { status: 400 });
      }

      // Crear cliente
      const created = await db.client.create({
        data,
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
 * Elimina un cliente por su ID
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idStr = searchParams.get("id");

    if (!idStr) {
      return NextResponse.json({ error: "Se requiere el ID del cliente para eliminar." }, { status: 400 });
    }

    const id = parseInt(idStr, 10);

    // Verificar si el cliente tiene facturas asociadas antes de eliminarlo
    const invoiceCount = await db.invoice.count({
      where: { clientId: id },
    });

    if (invoiceCount > 0) {
      return NextResponse.json({
        error: "No se puede eliminar el cliente porque tiene facturas asociadas en el sistema. Puedes editar sus datos si lo requieres.",
      }, { status: 400 });
    }

    await db.client.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Cliente eliminado correctamente." });
  } catch (error: any) {
    console.error("DELETE /api/clients error:", error);
    return NextResponse.json({ error: `Fallo al eliminar el cliente: ${error.message || error}` }, { status: 500 });
  }
}
