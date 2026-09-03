import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export type AuthResult = 
  | { authorized: true; issuer: any }
  | { authorized: false; response: NextResponse };

/**
 * Autentica una petición HTTP pública de la API v1 mediante API Key
 */
export async function authenticateApiKey(request: Request): Promise<AuthResult> {
  const authHeader = request.headers.get("authorization");
  const xApiKey = request.headers.get("x-api-key");
  const { searchParams } = new URL(request.url);
  const queryApiKey = searchParams.get("api_key");

  let apiKey: string | null = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    apiKey = authHeader.substring(7).trim();
  } else if (xApiKey) {
    apiKey = xApiKey.trim();
  } else if (queryApiKey) {
    apiKey = queryApiKey.trim();
  }

  if (!apiKey) {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          success: false,
          error: "No autorizado. Proporcione su API Key en el encabezado 'Authorization: Bearer <API_KEY>' o 'x-api-key: <API_KEY>'.",
          code: "AUTH_REQUIRED",
        },
        { status: 401 }
      ),
    };
  }

  const issuer = await db.issuer.findUnique({
    where: { apiKey },
  });

  if (!issuer) {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          success: false,
          error: "API Key inválida o inexistente. Verifique sus credenciales en el panel de su empresa.",
          code: "INVALID_API_KEY",
        },
        { status: 401 }
      ),
    };
  }

  if (issuer.status === "SUSPENDED") {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          success: false,
          error: "Su cuenta emisora se encuentra suspendida. Contacte al administrador o recargue saldo.",
          code: "ACCOUNT_SUSPENDED",
        },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, issuer };
}
