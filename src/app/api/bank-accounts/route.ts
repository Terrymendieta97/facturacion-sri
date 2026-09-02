import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/bank-accounts
 * Retorna la lista de cuentas bancarias (activas o todas)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "true";

    const where = all ? {} : { activo: true };

    const accounts = await db.bankAccount.findMany({
      where,
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(accounts);
  } catch (error: any) {
    console.error("GET /api/bank-accounts error:", error);
    return NextResponse.json({ error: "Fallo al obtener las cuentas bancarias." }, { status: 500 });
  }
}

/**
 * POST /api/bank-accounts
 * Crea o actualiza una cuenta bancaria con código QR de pago
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      banco,
      tipoCuenta,
      numeroCuenta,
      titular,
      identificacionTitular,
      qrCode,
      activo,
    } = body;

    if (!banco || !numeroCuenta || !titular) {
      return NextResponse.json({ error: "Por favor complete Banco, Número de Cuenta y Titular." }, { status: 400 });
    }

    let account;
    if (id) {
      account = await db.bankAccount.update({
        where: { id: parseInt(String(id), 10) },
        data: {
          banco,
          tipoCuenta: tipoCuenta || "Ahorros",
          numeroCuenta,
          titular,
          identificacionTitular: identificacionTitular || null,
          qrCode: qrCode !== undefined ? qrCode : undefined,
          activo: activo !== undefined ? Boolean(activo) : true,
        },
      });
    } else {
      account = await db.bankAccount.create({
        data: {
          banco,
          tipoCuenta: tipoCuenta || "Ahorros",
          numeroCuenta,
          titular,
          identificacionTitular: identificacionTitular || null,
          qrCode: qrCode || null,
          activo: activo !== undefined ? Boolean(activo) : true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: id ? "Cuenta bancaria actualizada." : "Cuenta bancaria creada.",
      account,
    });
  } catch (error: any) {
    console.error("POST /api/bank-accounts error:", error);
    return NextResponse.json({ error: `Fallo al guardar la cuenta bancaria: ${error.message || error}` }, { status: 500 });
  }
}

/**
 * DELETE /api/bank-accounts?id=...
 * Elimina una cuenta bancaria por su ID
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Se requiere el ID de la cuenta bancaria." }, { status: 400 });
    }

    await db.bankAccount.delete({
      where: { id: parseInt(id, 10) },
    });

    return NextResponse.json({ success: true, message: "Cuenta bancaria eliminada." });
  } catch (error: any) {
    console.error("DELETE /api/bank-accounts error:", error);
    return NextResponse.json({ error: "Fallo al eliminar la cuenta bancaria." }, { status: 500 });
  }
}
