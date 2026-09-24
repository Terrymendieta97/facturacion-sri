import { Router } from "express";
import * as InvoicesController from "../controllers/invoices.controller.js";
import * as ClientsController from "../controllers/clients.controller.js";
import * as ProductsController from "../controllers/products.controller.js";
import * as IssuersController from "../controllers/issuers.controller.js";
import * as SystemController from "../controllers/system.controller.js";
import { extractIssuerContext, requireApiKey } from "../middlewares/auth.middleware.js";

export const router = Router();

// Health Check
router.get("/health", (req, res) => {
  res.json({ status: "ok", service: "Lojafac SRI Backend API", time: new Date() });
});

// --- FACTURAS ---
router.get("/invoices", extractIssuerContext, InvoicesController.getInvoices);
router.post("/invoices", extractIssuerContext, InvoicesController.createInvoice);
router.get("/invoices/download-pdf", InvoicesController.downloadPdf);
router.get("/invoices/download-xml", InvoicesController.downloadXml);
router.post("/invoices/query-sri", InvoicesController.querySri);
router.post("/invoices/resend-email", InvoicesController.resendEmail);
router.post("/invoices/cancel", InvoicesController.cancelInvoice);

// --- CLIENTES ---
router.get("/clients", extractIssuerContext, ClientsController.getClients);
router.get("/clients/lookup", ClientsController.lookupClient);
router.post("/clients", extractIssuerContext, ClientsController.createOrUpdateClient);
router.delete("/clients", ClientsController.deleteClient);

// --- PRODUCTOS ---
router.get("/products", extractIssuerContext, ProductsController.getProducts);
router.post("/products", extractIssuerContext, ProductsController.createOrUpdateProduct);
router.delete("/products", ProductsController.deleteProduct);

// --- EMISOR Y PUNTOS DE EMISIÓN ---
router.get("/issuer", extractIssuerContext, IssuersController.getIssuer);
router.post("/issuer", extractIssuerContext, IssuersController.updateIssuer);
router.get("/issuer/api-key", extractIssuerContext, IssuersController.getApiKey);
router.post("/issuer/api-key", extractIssuerContext, IssuersController.generateApiKey);
router.delete("/issuer/api-key", extractIssuerContext, IssuersController.revokeApiKey);
router.get("/emission-points", extractIssuerContext, IssuersController.getEmissionPoints);
router.post("/emission-points", extractIssuerContext, IssuersController.createOrUpdateEmissionPoint);

// --- CONFIGURACIÓN DEL SISTEMA Y CORREO ---
router.get("/system-config", SystemController.getSystemConfig);
router.post("/system-config", SystemController.updateSystemConfig);
router.get("/bank-accounts", SystemController.getBankAccounts);
router.post("/admin/test-email", SystemController.testEmail);

// --- API PÚBLICA ECOMMERCE (v1) ---
router.post("/v1/invoices", requireApiKey, InvoicesController.createInvoice);
router.get("/v1/invoices/download-pdf", InvoicesController.downloadPdf);
router.get("/v1/invoices/download-xml", InvoicesController.downloadXml);
router.get("/v1/clients/lookup", requireApiKey, ClientsController.lookupClient);
router.get("/v1/emission-points", requireApiKey, IssuersController.getEmissionPoints);
