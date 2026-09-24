import { Request, Response } from "express";
import crypto from "crypto";
import { db } from "../db.js";
import { AuthenticatedRequest } from "../middlewares/auth.middleware.js";

export async function getIssuer(req: AuthenticatedRequest, res: Response) {
  try {
    const issuer = req.issuer || (await db.issuer.findFirst());
    if (!issuer) {
      return res.status(404).json({ error: "No hay emisor registrado." });
    }
    return res.json(issuer);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateIssuer(req: AuthenticatedRequest, res: Response) {
  try {
    const data = req.body;
    let issuer = req.issuer || (await db.issuer.findFirst());

    if (!issuer) {
      issuer = await db.issuer.create({
        data: {
          ruc: data.ruc || "1104759574001",
          nombres: data.nombres || "",
          apellidos: data.apellidos || "",
          nombreEmpresa: data.nombreEmpresa || "",
          razonSocial: data.razonSocial || "",
          direccion: data.direccion || "Loja, Ecuador",
          email: data.email || "",
          celular: data.celular || "",
          ambiente: data.ambiente ? parseInt(data.ambiente, 10) : 1,
          establecimiento: data.establecimiento || "001",
          puntoEmision: data.puntoEmision || "001",
          startSecuencial: data.startSecuencial || "000000001",
          firmaElectronica: data.firmaElectronica || null,
          codigoSri: data.codigoSri || null,
          logo: data.logo || null,
        },
      });
    } else {
      issuer = await db.issuer.update({
        where: { id: issuer.id },
        data: {
          nombres: data.nombres !== undefined ? data.nombres : issuer.nombres,
          apellidos: data.apellidos !== undefined ? data.apellidos : issuer.apellidos,
          nombreEmpresa: data.nombreEmpresa !== undefined ? data.nombreEmpresa : issuer.nombreEmpresa,
          razonSocial: data.razonSocial !== undefined ? data.razonSocial : issuer.razonSocial,
          direccion: data.direccion !== undefined ? data.direccion : issuer.direccion,
          email: data.email !== undefined ? data.email : issuer.email,
          celular: data.celular !== undefined ? data.celular : issuer.celular,
          ambiente: data.ambiente !== undefined ? parseInt(data.ambiente, 10) : issuer.ambiente,
          establecimiento: data.establecimiento !== undefined ? data.establecimiento : issuer.establecimiento,
          puntoEmision: data.puntoEmision !== undefined ? data.puntoEmision : issuer.puntoEmision,
          startSecuencial: data.startSecuencial !== undefined ? data.startSecuencial : issuer.startSecuencial,
          firmaElectronica: data.firmaElectronica !== undefined ? data.firmaElectronica : issuer.firmaElectronica,
          codigoSri: data.codigoSri !== undefined ? data.codigoSri : issuer.codigoSri,
          logo: data.logo !== undefined ? data.logo : issuer.logo,
        },
      });
    }

    return res.json({ success: true, issuer });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getApiKey(req: AuthenticatedRequest, res: Response) {
  try {
    const issuer = req.issuer || (await db.issuer.findFirst());
    if (!issuer) return res.status(404).json({ error: "Emisor no encontrado." });

    return res.json({
      apiKey: issuer.apiKey,
      createdAt: issuer.apiKeyCreatedAt,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function generateApiKey(req: AuthenticatedRequest, res: Response) {
  try {
    const issuer = req.issuer || (await db.issuer.findFirst());
    if (!issuer) return res.status(404).json({ error: "Emisor no encontrado." });

    const newKey = `facilsri_live_${crypto.randomBytes(24).toString("hex")}`;
    const updated = await db.issuer.update({
      where: { id: issuer.id },
      data: {
        apiKey: newKey,
        apiKeyCreatedAt: new Date(),
      },
    });

    return res.json({ success: true, apiKey: updated.apiKey });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function revokeApiKey(req: AuthenticatedRequest, res: Response) {
  try {
    const issuer = req.issuer || (await db.issuer.findFirst());
    if (!issuer) return res.status(404).json({ error: "Emisor no encontrado." });

    await db.issuer.update({
      where: { id: issuer.id },
      data: {
        apiKey: null,
        apiKeyCreatedAt: null,
      },
    });

    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getEmissionPoints(req: AuthenticatedRequest, res: Response) {
  try {
    const issuer = req.issuer || (await db.issuer.findFirst());
    if (!issuer) return res.json([]);

    const points = await db.emissionPoint.findMany({
      where: { issuerId: issuer.id },
      orderBy: { puntoEmision: "asc" },
    });

    return res.json(points);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createOrUpdateEmissionPoint(req: AuthenticatedRequest, res: Response) {
  try {
    const { id, establecimiento, puntoEmision, nombre, username, password, secuencialInicio, activo } = req.body;
    const issuer = req.issuer || (await db.issuer.findFirst());
    if (!issuer) return res.status(400).json({ error: "Emisor no encontrado." });

    let point;
    if (id) {
      point = await db.emissionPoint.update({
        where: { id: parseInt(id, 10) },
        data: {
          establecimiento: establecimiento || "001",
          puntoEmision: puntoEmision || "001",
          nombre: nombre || "Punto de Venta",
          username: username || null,
          password: password || null,
          secuencialInicio: secuencialInicio || "000000001",
          activo: activo !== undefined ? activo : true,
        },
      });
    } else {
      point = await db.emissionPoint.create({
        data: {
          issuerId: issuer.id,
          establecimiento: establecimiento || "001",
          puntoEmision: puntoEmision || "001",
          nombre: nombre || "Punto de Venta",
          username: username || null,
          password: password || null,
          secuencialInicio: secuencialInicio || "000000001",
          activo: activo !== undefined ? activo : true,
        },
      });
    }

    return res.json({ success: true, emissionPoint: point });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
