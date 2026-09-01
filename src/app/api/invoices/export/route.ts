import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import PDFDocument from "pdfkit";

/**
 * GET /api/invoices/export?format=pdf|xlsx&search=...&startDate=...&endDate=...&status=...
 * Genera reportes contables oficiales en formato PDF o Excel (.xlsx/.csv)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get("format") || "xlsx").toLowerCase();
    const search = searchParams.get("search") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const status = searchParams.get("status") || "";
    const issuerIdHeader = request.headers.get("x-issuer-id");

    const where: any = {};

    if (issuerIdHeader && issuerIdHeader !== "default" && issuerIdHeader !== "null" && issuerIdHeader !== "undefined") {
      where.issuerId = parseInt(issuerIdHeader, 10);
    }

    if (status && status !== "ALL") {
      where.estado = status;
    }

    if (startDate || endDate) {
      where.fechaEmision = {};
      if (startDate) {
        where.fechaEmision.gte = new Date(`${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        where.fechaEmision.lte = new Date(`${endDate}T23:59:59.999Z`);
      }
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { secuencial: { contains: q } },
        { claveAcceso: { contains: q } },
        { client: { identificacion: { contains: q } } },
        { client: { nombres: { contains: q } } },
        { client: { mail: { contains: q } } },
      ];
    }

    const invoices = await db.invoice.findMany({
      where,
      include: {
        client: true,
        issuer: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const issuerObj = invoices[0]?.issuer || (await db.issuer.findFirst());
    const businessName = issuerObj?.nombreEmpresa || issuerObj?.razonSocial || "FácilSRI Emisor";
    const rucEmisor = issuerObj?.ruc || "SRI";

    // --- EXPORTACIÓN A EXCEL (.xlsx / .csv compatible) ---
    if (format === "xlsx" || format === "excel" || format === "csv") {
      const headers = [
        "Establecimiento-PuntoEmisión-Secuencial",
        "Fecha de Emisión",
        "Tipo Identificación",
        "Identificación Cliente",
        "Cliente / Razón Social",
        "Correo Electrónico",
        "Estado SRI",
        "Clave de Acceso",
        "Subtotal 0%",
        "Subtotal IVA",
        "Valor IVA",
        "Total Facturado",
        "Forma de Pago",
      ];

      const rows = invoices.map((inv) => {
        const d = new Date(inv.fechaEmision);
        const fechaStr = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
        const secStr = `${inv.issuer?.establecimiento || "001"}-${inv.issuer?.puntoEmision || "001"}-${inv.secuencial}`;
        const tipoIdMap: { [key: string]: string } = { "04": "RUC", "05": "CEDULA", "06": "PASAPORTE", "07": "CONSUMIDOR FINAL" };
        const tipoIdStr = tipoIdMap[inv.client?.tipoIdentificacion] || inv.client?.tipoIdentificacion || "CÉDULA/RUC";

        return [
          secStr,
          fechaStr,
          tipoIdStr,
          `="${inv.client?.identificacion || ""}"`, // Prevenir pérdida de ceros a la izquierda en Excel
          `"${(inv.client?.nombres || "").replace(/"/g, '""')}"`,
          inv.client?.mail || "",
          inv.estado,
          `="${inv.claveAcceso || ""}"`,
          inv.subtotal0.toFixed(2),
          inv.subtotalIva.toFixed(2),
          inv.valorIva.toFixed(2),
          inv.total.toFixed(2),
          inv.formaPago === "01" ? "SIN UTILIZACION SISTEMA FINANCIERO" : "OTRO CON SISTEMA FINANCIERO",
        ].join(";");
      });

      const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\r\n");
      const filename = `Reporte_Contable_${rucEmisor}_${startDate || "Inicio"}_a_${endDate || "Hoy"}.csv`;

      return new Response(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // --- EXPORTACIÓN A PDF (REPORTE CONTABLE CORPORATIVO) ---
    return new Promise<Response>((resolve) => {
      const doc = new PDFDocument({ margin: 30, size: "A4", layout: "landscape" });
      const buffers: Buffer[] = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => {
        const pdfData = Buffer.concat(buffers);
        const filename = `Reporte_Contable_${rucEmisor}_${startDate || "Inicio"}_a_${endDate || "Hoy"}.pdf`;
        resolve(
          new Response(new Uint8Array(pdfData), {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="${filename}"`,
            },
          })
        );
      });

      // Encabezado Corporativo
      doc.rect(30, 20, 782, 50).fill("#1e293b");
      doc.fillColor("#ffffff").fontSize(14).font("Helvetica-Bold").text("REPORTE TRIBUTARIO DE FACTURACIÓN ELECTRÓNICA", 45, 30);
      doc.fontSize(9).font("Helvetica").text(`Emisor: ${businessName} | RUC: ${rucEmisor}`, 45, 48);

      const hoyStr = new Date().toLocaleDateString("es-EC");
      const rangoStr = startDate && endDate ? `${startDate} al ${endDate}` : startDate ? `Desde ${startDate}` : endDate ? `Hasta ${endDate}` : "Todas las fechas";
      doc.text(`Período Consultando: ${rangoStr} | Fecha Generación: ${hoyStr}`, 450, 48, { align: "right" });

      // Resumen de Totales Contables
      const totalSub0 = invoices.reduce((acc, inv) => acc + inv.subtotal0, 0);
      const totalSubIva = invoices.reduce((acc, inv) => acc + inv.subtotalIva, 0);
      const totalIva = invoices.reduce((acc, inv) => acc + inv.valorIva, 0);
      const totalGral = invoices.reduce((acc, inv) => acc + inv.total, 0);

      doc.fillColor("#0f172a");
      doc.rect(30, 80, 782, 35).fill("#f8fafc");
      doc.strokeColor("#e2e8f0").rect(30, 80, 782, 35).stroke();

      doc.fontSize(8).font("Helvetica-Bold").fillColor("#334155");
      doc.text(`CANTIDAD FACTURAS: ${invoices.length}`, 45, 92);
      doc.text(`TOTAL SUB 0%: $${totalSub0.toFixed(2)}`, 200, 92);
      doc.text(`TOTAL SUB IVA: $${totalSubIva.toFixed(2)}`, 350, 92);
      doc.text(`TOTAL IVA (12/15%): $${totalIva.toFixed(2)}`, 520, 92);
      doc.fillColor("#1e3a8a").text(`TOTAL GENERAL: $${totalGral.toFixed(2)}`, 680, 92);

      // Tabla Detallada
      let y = 130;
      doc.rect(30, y, 782, 20).fill("#e2e8f0");
      doc.fillColor("#1e293b").fontSize(8).font("Helvetica-Bold");
      doc.text("SECUENCIAL", 35, y + 6, { width: 90 });
      doc.text("FECHA", 130, y + 6, { width: 60 });
      doc.text("IDENTIFICACIÓN", 195, y + 6, { width: 85 });
      doc.text("CLIENTE", 285, y + 6, { width: 170 });
      doc.text("ESTADO SRI", 460, y + 6, { width: 75 });
      doc.text("SUB 0%", 540, y + 6, { width: 60, align: "right" });
      doc.text("SUB IVA", 605, y + 6, { width: 60, align: "right" });
      doc.text("IVA", 670, y + 6, { width: 55, align: "right" });
      doc.text("TOTAL", 730, y + 6, { width: 75, align: "right" });

      y += 20;
      doc.font("Helvetica").fontSize(7.5);

      invoices.forEach((inv, index) => {
        if (y > 540) {
          doc.addPage({ margin: 30, size: "A4", layout: "landscape" });
          y = 30;
          doc.rect(30, y, 782, 20).fill("#e2e8f0");
          doc.fillColor("#1e293b").fontSize(8).font("Helvetica-Bold");
          doc.text("SECUENCIAL", 35, y + 6, { width: 90 });
          doc.text("FECHA", 130, y + 6, { width: 60 });
          doc.text("IDENTIFICACIÓN", 195, y + 6, { width: 85 });
          doc.text("CLIENTE", 285, y + 6, { width: 170 });
          doc.text("ESTADO SRI", 460, y + 6, { width: 75 });
          doc.text("SUB 0%", 540, y + 6, { width: 60, align: "right" });
          doc.text("SUB IVA", 605, y + 6, { width: 60, align: "right" });
          doc.text("IVA", 670, y + 6, { width: 55, align: "right" });
          doc.text("TOTAL", 730, y + 6, { width: 75, align: "right" });
          y += 20;
          doc.font("Helvetica").fontSize(7.5);
        }

        if (index % 2 === 1) {
          doc.rect(30, y, 782, 18).fill("#f8fafc");
        }

        const d = new Date(inv.fechaEmision);
        const fechaStr = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
        const secStr = `${inv.issuer?.establecimiento || "001"}-${inv.issuer?.puntoEmision || "001"}-${inv.secuencial}`;

        doc.fillColor("#0f172a");
        doc.text(secStr, 35, y + 5, { width: 90 });
        doc.text(fechaStr, 130, y + 5, { width: 60 });
        doc.text(inv.client?.identificacion || "", 195, y + 5, { width: 85 });
        doc.text(inv.client?.nombres || "", 285, y + 5, { width: 170, height: 12, ellipsis: true });
        
        const isAuth = inv.estado === "AUTORIZADA";
        doc.fillColor(isAuth ? "#15803d" : "#b91c1c").text(inv.estado, 460, y + 5, { width: 75 });

        doc.fillColor("#0f172a");
        doc.text(`$${inv.subtotal0.toFixed(2)}`, 540, y + 5, { width: 60, align: "right" });
        doc.text(`$${inv.subtotalIva.toFixed(2)}`, 605, y + 5, { width: 60, align: "right" });
        doc.text(`$${inv.valorIva.toFixed(2)}`, 670, y + 5, { width: 55, align: "right" });
        doc.font("Helvetica-Bold").text(`$${inv.total.toFixed(2)}`, 730, y + 5, { width: 75, align: "right" }).font("Helvetica");

        y += 18;
      });

      doc.end();
    });
  } catch (error: any) {
    console.error("GET /api/invoices/export error:", error);
    return NextResponse.json({ error: "Fallo al generar la exportación contable." }, { status: 500 });
  }
}
