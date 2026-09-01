import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/products
 * Retorna todos los productos registrados
 */
export async function GET() {
  try {
    const products = await db.product.findMany({
      where: {
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
 * Crea o actualiza un producto
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, nombre, codigoPrincipal, descripcion, precio, iva, imagen } = body;

    if (!nombre || !codigoPrincipal || precio === undefined || iva === undefined) {
      return NextResponse.json({ error: "Faltan campos obligatorios para registrar al producto." }, { status: 400 });
    }

    const data = {
      nombre,
      codigoPrincipal,
      descripcion: descripcion || "",
      precio: parseFloat(precio),
      iva: parseFloat(iva),
      imagen: imagen || null,
    };

    if (id) {
      // Editar producto
      const updated = await db.product.update({
        where: { id: parseInt(id, 10) },
        data,
      });
      return NextResponse.json({ success: true, product: updated });
    } else {
      // Verificar si ya existe un producto con el mismo código principal
      const existing = await db.product.findUnique({
        where: { codigoPrincipal },
      });
      if (existing) {
        return NextResponse.json({ error: "Ya existe un producto registrado con este código principal." }, { status: 400 });
      }

      // Crear producto
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
 * Elimina un producto por su ID
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
