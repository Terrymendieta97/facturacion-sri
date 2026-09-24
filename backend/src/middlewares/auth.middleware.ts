import { Request, Response, NextFunction } from "express";
import { db } from "../db.js";

export interface AuthenticatedRequest extends Request {
  issuer?: any;
  userRole?: string;
  emissionPointId?: number;
  puntoEmision?: string;
}

export async function extractIssuerContext(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const issuerIdHeader = req.headers["x-issuer-id"] as string;
    const userRoleHeader = req.headers["x-user-role"] as string;
    const epIdHeader = req.headers["x-emission-point-id"] as string;
    const peHeader = req.headers["x-punto-emision"] as string;

    req.userRole = userRoleHeader || "USER";
    if (epIdHeader && epIdHeader !== "null" && epIdHeader !== "undefined") {
      req.emissionPointId = parseInt(epIdHeader, 10);
    }
    if (peHeader && peHeader !== "ALL") {
      req.puntoEmision = peHeader;
    }

    if (issuerIdHeader && issuerIdHeader !== "default" && issuerIdHeader !== "null" && issuerIdHeader !== "undefined") {
      const issuer = await db.issuer.findUnique({
        where: { id: parseInt(issuerIdHeader, 10) },
      });
      if (issuer) {
        req.issuer = issuer;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}

export async function requireApiKey(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const apiKey = (req.headers["x-api-key"] || req.query.apiKey) as string;
    if (!apiKey) {
      return res.status(401).json({
        error: "No se proporcionó API Key. Envíe el encabezado 'x-api-key: TU_API_KEY'.",
      });
    }

    const issuer = await db.issuer.findFirst({
      where: { apiKey: apiKey.trim() },
    });

    if (!issuer) {
      return res.status(403).json({
        error: "API Key inválida o revocada.",
      });
    }

    if (issuer.status === "SUSPENDED") {
      return res.status(403).json({
        error: "La cuenta de la empresa emisora está suspendida.",
      });
    }

    req.issuer = issuer;
    next();
  } catch (error) {
    next(error);
  }
}
