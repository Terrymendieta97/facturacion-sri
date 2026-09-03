import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

/**
 * GET /api/issuer/api-key
 * Obtiene la API Key activa de la empresa actual
 */
export async function GET(request: Request) {
  try {
    const issuerHeader = request.headers.get("x-issuer-id");
    const issuerId = issuerHeader ? parseInt(issuerHeader, 10) : null;

    let issuer = null;
    if (issuerId && !isNaN(issuerId)) {
      issuer = await db.issuer.findUnique({ where: { id: issuerId } });
    } else {
      issuer = await db.issuer.findFirst();
    }

    if (!issuer) {
      return NextResponse.json({ error: "Emisor no encontrado." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      apiKey: issuer.apiKey || null,
      apiKeyCreatedAt: issuer.apiKeyCreatedAt || null,
      ambiente: issuer.ambiente === 2 ? "PRODUCCION" : "PRUEBAS",
      nombreEmpresa: issuer.nombreEmpresa,
      ruc: issuer.ruc,
    });
  } catch (error: any) {
    console.error("GET /api/issuer/api-key error:", error);
    return NextResponse.json({ error: "Fallo al consultar la API Key." }, { status: 500 });
  }
}

/**
 * POST /api/issuer/api-key
 * Genera o regenera una API Key única para la empresa actual
 */
export async function POST(request: Request) {
  try {
    const issuerHeader = request.headers.get("x-issuer-id");
    const issuerId = issuerHeader ? parseInt(issuerHeader, 10) : null;

    let issuer = null;
    if (issuerId && !isNaN(issuerId)) {
      issuer = await db.issuer.findUnique({ where: { id: issuerId } });
    } else {
      issuer = await db.issuer.findFirst();
    }

    if (!issuer) {
      return NextResponse.json({ error: "Emisor no encontrado." }, { status: 404 });
    }

    // Generar un token criptográfico seguro
    const prefix = issuer.ambiente === 2 ? "sri_live_" : "sri_test_";
    const randomSecret = crypto.randomBytes(24).toString("hex");
    const newApiKey = `${prefix}${randomSecret}`;

    const updated = await db.issuer.update({
      where: { id: issuer.id },
      data: {
        apiKey: newApiKey,
        apiKeyCreatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      apiKey: updated.apiKey,
      apiKeyCreatedAt: updated.apiKeyCreatedAt,
      message: "API Key generada correctamente.",
    });
  } catch (error: any) {
    console.error("POST /api/issuer/api-key error:", error);
    return NextResponse.json({ error: "Fallo al generar la API Key." }, { status: 500 });
  }
}

/**
 * DELETE /api/issuer/api-key
 * Revoca y elimina la API Key activa
 */
export async function DELETE(request: Request) {
  try {
    const issuerHeader = request.headers.get("x-issuer-id");
    const issuerId = issuerHeader ? parseInt(issuerHeader, 10) : null;

    let issuer = null;
    if (issuerId && !isNaN(issuerId)) {
      issuer = await db.issuer.findUnique({ where: { id: issuerId } });
    } else {
      issuer = await db.issuer.findFirst();
    }

    if (!issuer) {
      return NextResponse.json({ error: "Emisor no encontrado." }, { status: 404 });
    }

    await db.issuer.update({
      where: { id: issuer.id },
      data: {
        apiKey: null,
        apiKeyCreatedAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "API Key revocada correctamente. Los sistemas externos ya no podrán emitir facturas con esa clave.",
    });
  } catch (error: any) {
    console.error("DELETE /api/issuer/api-key error:", error);
    return NextResponse.json({ error: "Fallo al revocar la API Key." }, { status: 500 });
  }
}
