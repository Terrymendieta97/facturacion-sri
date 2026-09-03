import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateApiKey } from "@/lib/api-auth";

function validarCedulaEcuatoriana(cedula: string): boolean {
  if (cedula.length !== 10) return false;
  const provincia = parseInt(cedula.substring(0, 2), 10);
  if ((provincia < 1 || provincia > 24) && provincia !== 30) return false;
  const tercerDigito = parseInt(cedula.substring(2, 3), 10);
  if (tercerDigito >= 6) return false;
  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let valor = parseInt(cedula.charAt(i), 10) * coeficientes[i];
    if (valor > 9) valor -= 9;
    suma += valor;
  }
  const verificador = parseInt(cedula.charAt(9), 10);
  const decenaSuperior = Math.ceil(suma / 10) * 10;
  let digitoCalculado = decenaSuperior - suma;
  if (digitoCalculado === 10) digitoCalculado = 0;
  return digitoCalculado === verificador;
}

function validarRucEcuatoriano(ruc: string): boolean {
  if (ruc.length !== 13) return false;
  if (!ruc.endsWith("001")) return false;
  const cedulaPart = ruc.substring(0, 10);
  const tercerDigito = parseInt(ruc.substring(2, 3), 10);
  if (tercerDigito === 9) {
    const coeficientes = [4, 3, 2, 7, 6, 5, 4, 3, 2];
    let suma = 0;
    for (let i = 0; i < 9; i++) {
      suma += parseInt(ruc.charAt(i), 10) * coeficientes[i];
    }
    const verificador = parseInt(ruc.charAt(9), 10);
    let digitoCalculado = 11 - (suma % 11);
    if (digitoCalculado === 11) digitoCalculado = 0;
    if (digitoCalculado === 10) return false;
    return digitoCalculado === verificador;
  } else if (tercerDigito === 6) {
    const coeficientes = [3, 2, 7, 6, 5, 4, 3, 2];
    let suma = 0;
    for (let i = 0; i < 8; i++) {
      suma += parseInt(ruc.charAt(i), 10) * coeficientes[i];
    }
    const verificador = parseInt(ruc.charAt(8), 10);
    let digitoCalculado = 11 - (suma % 11);
    if (digitoCalculado === 11) digitoCalculado = 0;
    if (digitoCalculado === 10) return false;
    return digitoCalculado === verificador;
  }
  return validarCedulaEcuatoriana(cedulaPart);
}

/**
 * GET /api/v1/clients/lookup?identificacion=...
 * Consulta y valida una cédula o RUC en la base de datos nacional para checkouts ecommerce
 */
export async function GET(request: Request) {
  try {
    const auth = await authenticateApiKey(request);
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const identificacion = searchParams.get("identificacion");

    if (!identificacion) {
      return NextResponse.json(
        { success: false, error: "Parámetro 'identificacion' requerido.", code: "IDENTIFICATION_REQUIRED" },
        { status: 400 }
      );
    }

    const cleanIdent = identificacion.trim();
    const isRuc = cleanIdent.length === 13;
    const isCedula = cleanIdent.length === 10;

    if (!isRuc && !isCedula) {
      return NextResponse.json({
        success: false,
        isValid: false,
        error: "La identificación debe tener 10 dígitos (cédula) o 13 dígitos (RUC).",
        code: "INVALID_LENGTH",
      });
    }

    let isValid = false;
    if (isCedula) {
      isValid = validarCedulaEcuatoriana(cleanIdent);
    } else {
      isValid = validarRucEcuatoriano(cleanIdent);
    }

    if (!isValid) {
      return NextResponse.json({
        success: false,
        isValid: false,
        error: `El número de ${isCedula ? "cédula" : "RUC"} es matemáticamente inválido en Ecuador.`,
        code: "INVALID_DOCUMENT",
      });
    }

    const existingClient = await db.client.findUnique({
      where: { identificacion: cleanIdent },
    });

    if (existingClient) {
      return NextResponse.json({
        success: true,
        isValid: true,
        isRegistered: true,
        client: {
          tipoIdentificacion: existingClient.tipoIdentificacion,
          identificacion: existingClient.identificacion,
          nombres: existingClient.nombres,
          direccion: existingClient.direccion,
          mail: existingClient.mail,
          celular: existingClient.celular,
        },
      });
    }

    return NextResponse.json({
      success: true,
      isValid: true,
      isRegistered: false,
      tipoIdentificacion: isRuc ? "04" : "05",
      client: null,
      message: "Documento válido. Cliente no registrado previamente.",
    });
  } catch (error: any) {
    console.error("GET /api/v1/clients/lookup error:", error);
    return NextResponse.json(
      { success: false, error: "Fallo al consultar identificación.", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
