import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Valida matemáticamente una cédula de identidad ecuatoriana (Algoritmo Módulo 10)
 */
function validarCedulaEcuatoriana(cedula: string): boolean {
  if (cedula.length !== 10) return false;

  // Verificar provincia (primeros dos dígitos entre 01 y 24, o 30)
  const provincia = parseInt(cedula.substring(0, 2), 10);
  if ((provincia < 1 || provincia > 24) && provincia !== 30) return false;

  // Tercer dígito debe ser menor a 6 (0, 1, 2, 3, 4, 5) para cédula de persona natural
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

/**
 * Valida un número de RUC en Ecuador
 */
function validarRucEcuatoriano(ruc: string): boolean {
  if (ruc.length !== 13) return false;
  if (!ruc.endsWith("001")) return false;

  // Los primeros 10 dígitos deben formar una cédula válida o un RUC de sociedad válido
  const cedulaPart = ruc.substring(0, 10);
  
  // Si el tercer dígito es 9 (sociedades privadas/extranjeros sin cédula) o 6 (entidades públicas)
  const tercerDigito = parseInt(ruc.substring(2, 3), 10);
  if (tercerDigito === 9) {
    // Validación RUC sociedades privadas (Módulo 11, coeficientes: 4,3,2,7,6,5,4,3,2 en 9 dígitos)
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
    // Validación RUC entidades públicas (Módulo 11, coeficientes: 3,2,7,6,5,4,3,2 en 8 dígitos)
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

  // De lo contrario, se asume persona natural (los primeros 10 dígitos deben ser una cédula válida)
  return validarCedulaEcuatoriana(cedulaPart);
}

/**
 * GET /api/clients/lookup?identificacion=...
 * Valida la identificación ecuatoriana y devuelve datos de autocompletado
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const identificacion = searchParams.get("identificacion");

    if (!identificacion) {
      return NextResponse.json({ error: "Identificación requerida." }, { status: 400 });
    }

    const isRuc = identificacion.length === 13;
    const isCedula = identificacion.length === 10;

    if (!isRuc && !isCedula) {
      return NextResponse.json({ 
        isValid: false, 
        error: "La identificación debe tener 10 dígitos (cédula) o 13 dígitos (RUC)." 
      });
    }

    // 1. Validar matemáticamente
    let isValid = false;
    if (isCedula) {
      isValid = validarCedulaEcuatoriana(identificacion);
    } else {
      isValid = validarRucEcuatoriano(identificacion);
    }

    if (!isValid) {
      return NextResponse.json({ 
        isValid: false, 
        error: `El número de ${isCedula ? "cédula" : "RUC"} ingresado es inválido en Ecuador.` 
      });
    }

    // 2. Buscar en la base de datos local primero
    const existingClient = await db.client.findUnique({
      where: { identificacion },
    });

    if (existingClient) {
      return NextResponse.json({
        isValid: true,
        isNew: false,
        client: existingClient
      });
    }

    // 3. Si no existe localmente, NO inventar datos. Retornar cliente como nulo para llenado manual.
    return NextResponse.json({
      isValid: true,
      isNew: true,
      tipoIdentificacion: isRuc ? "04" : "05",
      client: null
    });

  } catch (error: any) {
    console.error("GET /api/clients/lookup error:", error);
    return NextResponse.json({ error: "Error en el servidor al consultar." }, { status: 500 });
  }
}
