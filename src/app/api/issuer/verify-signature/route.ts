import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import forge from "node-forge";

/**
 * POST /api/issuer/verify-signature
 * Valida si la contraseña ingresada abre correctamente el archivo de firma digital (.p12).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { firmaElectronica, codigoSri } = body;
    const issuerIdHeader = request.headers.get("x-issuer-id");

    let p12Base64 = firmaElectronica;
    let p12SecretKey = codigoSri;

    // Buscar emisor activo si es necesario
    let activeId = issuerIdHeader && issuerIdHeader !== "default" && issuerIdHeader !== "null" && issuerIdHeader !== "undefined"
      ? parseInt(issuerIdHeader, 10)
      : null;

    let issuer = null;
    if (activeId) {
      issuer = await db.issuer.findUnique({ where: { id: activeId } });
    } else {
      issuer = await db.issuer.findFirst();
    }

    // Si la firma enviada es "CARGADA", usar la firma guardada en base de datos
    if ((!p12Base64 || p12Base64 === "CARGADA") && issuer?.firmaElectronica) {
      p12Base64 = issuer.firmaElectronica;
    }

    // Si la contraseña enviada es "****", usar la clave guardada en base de datos
    if ((!p12SecretKey || p12SecretKey === "****") && issuer?.codigoSri) {
      p12SecretKey = issuer.codigoSri;
    }

    if (!p12Base64 || p12Base64 === "CARGADA") {
      return NextResponse.json({
        valid: false,
        error: "No se ha seleccionado o cargado ningún archivo de firma .p12.",
      });
    }

    if (!p12SecretKey || p12SecretKey === "****") {
      return NextResponse.json({
        valid: false,
        error: "Revisa la contraseña de la firma. Ingrese la contraseña de la firma .p12.",
      });
    }

    // Probar la apertura del certificado PKCS#12 con node-forge
    try {
      const cleanBase64 = p12Base64.replace(/^data:.*?;base64,/, "").replace(/[\r\n\s]/g, "");
      const p12Der = forge.util.decode64(cleanBase64);
      const p12Asn1 = forge.asn1.fromDer(p12Der);
      
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, p12SecretKey);

      // Extraer datos opcionales de validez
      let validUntil = "";
      try {
        const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
        const certBag = bags[forge.pki.oids.certBag];
        if (certBag && certBag.length > 0 && certBag[0].cert) {
          const cert = certBag[0].cert;
          const d = cert.validity.notAfter;
          validUntil = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
        }
      } catch (e) {
        // Ignorar si no se puede leer fecha
      }

      return NextResponse.json({
        valid: true,
        message: `✓ Contraseña de la firma electrónica correcta y certificado válido.${validUntil ? ` (Válido hasta ${validUntil})` : ""}`,
      });
    } catch (parseErr: any) {
      console.error("Error al validar firma .p12 con forge:", parseErr);
      return NextResponse.json({
        valid: false,
        error: "Revisa la contraseña de la firma. La contraseña ingresada no es válida para este archivo .p12.",
      });
    }
  } catch (error: any) {
    console.error("POST /api/issuer/verify-signature error:", error);
    return NextResponse.json({
      valid: false,
      error: `Error al procesar la verificación: ${error.message || error}`,
    }, { status: 500 });
  }
}
