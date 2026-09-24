import { Request, Response } from "express";
import { db } from "../db.js";
import { AuthenticatedRequest } from "../middlewares/auth.middleware.js";

export async function getProducts(req: AuthenticatedRequest, res: Response) {
  try {
    const where: any = {};
    if (req.issuer) {
      where.issuerId = req.issuer.id;
    }

    const products = await db.product.findMany({
      where,
      orderBy: { nombre: "asc" },
    });
    return res.json(products);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createOrUpdateProduct(req: AuthenticatedRequest, res: Response) {
  try {
    const { id, nombre, codigoPrincipal, precio, iva, descripcion, imagen } = req.body;
    const issuer = req.issuer || (await db.issuer.findFirst());

    if (!issuer) {
      return res.status(400).json({ error: "Emisor no encontrado." });
    }

    if (!nombre || !codigoPrincipal || precio === undefined) {
      return res.status(400).json({ error: "Nombre, código principal y precio son requeridos." });
    }

    let product;
    if (id) {
      product = await db.product.update({
        where: { id: parseInt(id, 10) },
        data: {
          nombre,
          codigoPrincipal,
          precio: parseFloat(precio),
          iva: iva !== undefined ? parseFloat(iva) : 15.0,
          descripcion: descripcion || null,
          imagen: imagen || null,
        },
      });
    } else {
      product = await db.product.upsert({
        where: {
          issuerId_codigoPrincipal: {
            issuerId: issuer.id,
            codigoPrincipal,
          },
        },
        update: {
          nombre,
          precio: parseFloat(precio),
          iva: iva !== undefined ? parseFloat(iva) : 15.0,
          descripcion: descripcion || null,
          imagen: imagen || null,
        },
        create: {
          issuerId: issuer.id,
          nombre,
          codigoPrincipal,
          precio: parseFloat(precio),
          iva: iva !== undefined ? parseFloat(iva) : 15.0,
          descripcion: descripcion || null,
          imagen: imagen || null,
        },
      });
    }

    return res.json({ success: true, product });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteProduct(req: Request, res: Response) {
  try {
    const id = parseInt((req.query.id || req.params.id) as string, 10);
    if (!id) return res.status(400).json({ error: "ID inválido." });

    await db.product.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
