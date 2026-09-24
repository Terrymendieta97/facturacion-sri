import { Request, Response } from "express";
import { db } from "../db.js";
import { AuthenticatedRequest } from "../middlewares/auth.middleware.js";

export async function getClients(req: AuthenticatedRequest, res: Response) {
  try {
    const clients = await db.client.findMany({
      orderBy: { nombres: "asc" },
    });
    return res.json(clients);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function lookupClient(req: Request, res: Response) {
  try {
    const identificacion = (req.query.identificacion || req.params.identificacion) as string;
    if (!identificacion) {
      return res.status(400).json({ error: "Identificación requerida." });
    }

    const client = await db.client.findUnique({
      where: { identificacion: identificacion.trim() },
    });

    if (client) {
      return res.json({ found: true, client });
    }

    return res.json({ found: false });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createOrUpdateClient(req: AuthenticatedRequest, res: Response) {
  try {
    const { identificacion, nombres, tipoIdentificacion, direccion, mail, celular, telefono } = req.body;

    if (!identificacion || !nombres) {
      return res.status(400).json({ error: "Identificación y nombres son requeridos." });
    }

    const client = await db.client.upsert({
      where: { identificacion: identificacion.trim() },
      update: {
        nombres: nombres.trim().toUpperCase(),
        tipoIdentificacion: tipoIdentificacion || "07",
        direccion: direccion?.trim() || "S/N",
        mail: mail?.trim() || "cliente@email.com",
        celular: celular?.trim() || "0999999999",
        telefono: telefono?.trim() || "",
      },
      create: {
        identificacion: identificacion.trim(),
        nombres: nombres.trim().toUpperCase(),
        tipoIdentificacion: tipoIdentificacion || "07",
        direccion: direccion?.trim() || "S/N",
        mail: mail?.trim() || "cliente@email.com",
        celular: celular?.trim() || "0999999999",
        telefono: telefono?.trim() || "",
      },
    });

    if (req.issuer) {
      await db.issuerClient.upsert({
        where: {
          issuerId_clientId: {
            issuerId: req.issuer.id,
            clientId: client.id,
          },
        },
        update: {},
        create: {
          issuerId: req.issuer.id,
          clientId: client.id,
        },
      });
    }

    return res.json({ success: true, client });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteClient(req: Request, res: Response) {
  try {
    const id = parseInt((req.query.id || req.params.id) as string, 10);
    if (!id) return res.status(400).json({ error: "ID inválido." });

    await db.client.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
