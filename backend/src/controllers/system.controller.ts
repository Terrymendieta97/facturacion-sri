import { Request, Response } from "express";
import { db } from "../db.js";
import { sendInvoiceEmail } from "../services/email.service.js";

export async function getSystemConfig(req: Request, res: Response) {
  try {
    let config = await db.systemConfig.findFirst();
    if (!config) {
      config = await db.systemConfig.create({
        data: { id: 1 },
      });
    }
    return res.json(config);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateSystemConfig(req: Request, res: Response) {
  try {
    const data = req.body;
    const config = await db.systemConfig.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data },
    });
    return res.json({ success: true, config });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getBankAccounts(req: Request, res: Response) {
  try {
    const accounts = await db.bankAccount.findMany({
      where: { activo: true },
      orderBy: { id: "asc" },
    });
    return res.json(accounts);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function testEmail(req: Request, res: Response) {
  try {
    const { to, subject, message } = req.body;
    if (!to) return res.status(400).json({ error: "Destinatario 'to' es requerido." });

    const result = await sendInvoiceEmail({
      to,
      invoiceNumber: "TEST-001",
      businessName: "Lojafac Facturación",
      customerName: "Usuario de Prueba",
      xmlContent: `<?xml version="1.0" encoding="UTF-8"?><test>Prueba</test>`,
      pdfBuffer: Buffer.from("PDF de prueba"),
    });

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
