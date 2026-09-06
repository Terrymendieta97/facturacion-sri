import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/products
 * Retorna todos los productos registrados exclusivamente para la empresa emisora activa
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const issuerIdHeader = request.headers.get("x-issuer-id");
    const issuerIdParam = searchParams.get("issuerId");
    const effectiveIssuerId = issuerIdHeader || issuerIdParam;

    let targetIssuerId: number | null = null;
    if (effectiveIssuerId && effectiveIssuerId !== "default" && effectiveIssuerId !== "null" && effectiveIssuerId !== "undefined") {
      targetIssuerId = parseInt(effectiveIssuerId, 10);
    }

    if (!targetIssuerId) {
      // Si no se especifica empresa activa, intentar obtener el primer emisor registrado
      const firstIssuer = await db.issuer.findFirst();
      if (firstIssuer) {
        targetIssuerId = firstIssuer.id;
      }
    }

    if (!targetIssuerId) {
      return NextResponse.json([]);
    }

    const products = await db.product.findMany({
      where: {
        issuerId: targetIssuerId,
        NOT: {
          codigoPrincipal: {
            startsWith: "TEMP-",
          },
        },
      },
      orderBy: { nombre: "asc" },
    });

    return NextResponse.json(products);
  } catch (error: any) {
    console.error("GET /api/products error:", error);
    return NextResponse.json({ error: "Fallo al cargar los productos." }, { status: 500 });
  }
}

/**
 * POST /api/products
 * Crea o actualiza un producto exclusivo para la empresa emisora activa
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, nombre, codigoPrincipal, descripcion, precio, iva, imagen } = body;
    const { searchParams } = new URL(request.url);

    const issuerIdHeader = request.headers.get("x-issuer-id");
    const issuerIdParam = searchParams.get("issuerId") || body.issuerId;
    const effectiveIssuerId = issuerIdHeader || issuerIdParam;

    let targetIssuerId: number | null = null;
    if (effectiveIssuerId && effectiveIssuerId !== "default" && effectiveIssuerId !== "null" && effectiveIssuerId !== "undefined") {
      targetIssuerId = parseInt(String(effectiveIssuerId), 10);
    }

    if (!targetIssuerId) {
      const firstIssuer = await db.issuer.findFirst();
      if (firstIssuer) {
        targetIssuerId = firstIssuer.id;
      }
    }

    if (!targetIssuerId) {
      return NextResponse.json({ error: "Empresa no identificada para guardar el producto." }, { status: 400 });
    }

    if (!nombre || !codigoPrincipal || precio === undefined || iva === undefined) {
      return NextResponse.json({ error: "Faltan campos obligatorios para registrar el producto." }, { status: 400 });
    }

    const cleanCodigo = String(codigoPrincipal).trim().toUpperCase();
    const data = {
      nombre: String(nombre).trim().toUpperCase(),
      codigoPrincipal: cleanCodigo,
      descripcion: descripcion || "",
      precio: parseFloat(precio),
      iva: parseFloat(iva),
      imagen: imagen || null,
      issuerId: targetIssuerId,
    };

    if (id) {
      const prodId = parseInt(id, 10);
      
      // Verificar si otro producto de la misma empresa ya usa ese código
      const duplicate = await db.product.findFirst({
        where: {
          issuerId: targetIssuerId,
          codigoPrincipal: cleanCodigo,
          NOT: { id: prodId },
        },
      });

      if (duplicate) {
        return NextResponse.json({ error: `Ya existe otro producto con el código '${cleanCodigo}' en tu empresa.` }, { status: 400 });
      }

      // Editar producto
      const updated = await db.product.update({
        where: { id: prodId },
        data,
      });
      return NextResponse.json({ success: true, product: updated });
    } else {
      // Verificar si ya existe un producto con el mismo código principal en esta empresa
      const existing = await db.product.findFirst({
        where: {
          issuerId: targetIssuerId,
          codigoPrincipal: cleanCodigo,
        },
      });

      if (existing) {
        return NextResponse.json({ error: `Ya existe un producto registrado con el código '${cleanCodigo}' en tu empresa.` }, { status: 400 });
      }

      // Crear producto para esta empresa
      const created = await db.product.create({
        data,
      });
      return NextResponse.json({ success: true, product: created });
    }
  } catch (error: any) {
    console.error("POST /api/products error:", error);
    return NextResponse.json({ error: `Fallo al guardar el producto: ${error.message || error}` }, { status: 500 });
  }
}

/**
 * DELETE /api/products
 * Elimina un producto por su ID asegurando que pertenezca a la empresa
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idStr = searchParams.get("id");

    if (!idStr) {
      return NextResponse.json({ error: "Se requiere el ID del producto para eliminar." }, { status: 400 });
    }

    const id = parseInt(idStr, 10);

    // Verificar si el producto está en alguna factura emitida
    const itemRefCount = await db.invoiceItem.count({
      where: { productId: id },
    });

    if (itemRefCount > 0) {
      return NextResponse.json({
        error: "No se puede eliminar el producto porque está incluido en facturas existentes. Puedes editar sus datos si lo requieres.",
      }, { status: 400 });
    }

    await db.product.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Producto eliminado correctamente." });
  } catch (error: any) {
    console.error("DELETE /api/products error:", error);
    return NextResponse.json({ error: `Fallo al eliminar el producto: ${error.message || error}` }, { status: 500 });
  }
}
