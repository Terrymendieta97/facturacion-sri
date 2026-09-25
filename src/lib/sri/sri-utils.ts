/**
 * Calcula el dígito verificador usando el algoritmo de Módulo 11
 * requerido por el SRI para las claves de acceso de 48 dígitos.
 */
export function getMod11Dv(num: string): number {
  let sum = 0;
  let factor = 2;

  // Recorrer el número al revés
  for (let i = num.length - 1; i >= 0; i--) {
    const digit = parseInt(num.charAt(i), 10);
    if (isNaN(digit)) continue;

    sum += digit * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }

  const dv = 11 - (sum % 11);
  if (dv === 10) return 1;
  if (dv === 11) return 0;
  return dv;
}

/**
 * Retorna las partes de fecha formateadas en la zona horaria oficial del Ecuador (America/Guayaquil, UTC-5).
 * Esto garantiza que en servidores con zona horaria UTC (como Vercel, AWS o Docker) no se genere
 * una fecha del día siguiente entre las 19:00 y 23:59, lo cual causa el rechazo del SRI:
 * "FECHA EMISIÓN EXTEMPORANEA (es mayor a la fecha del servidor)".
 */
export function getEcuadorDateParts(d: Date = new Date()): {
  day: string;
  month: string;
  year: string;
  fechaStr: string;     // DDMMAAAA ej: 24092026
  fechaSlash: string;   // DD/MM/AAAA ej: 24/09/2026
} {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(d);
  const day = parts.find((p) => p.type === "day")?.value || "01";
  const month = parts.find((p) => p.type === "month")?.value || "01";
  const year = parts.find((p) => p.type === "year")?.value || "2026";
  return {
    day,
    month,
    year,
    fechaStr: `${day}${month}${year}`,
    fechaSlash: `${day}/${month}/${year}`,
  };
}

/**
 * Genera la clave de acceso de 49 dígitos para comprobantes electrónicos
 * 
 * @param fecha - Fecha de emisión del documento
 * @param tipoComprobante - Código de tipo de documento (Factura = '01')
 * @param ruc - RUC del emisor (13 dígitos)
 * @param ambiente - Código de ambiente: '1' (Pruebas), '2' (Producción)
 * @param establecimiento - Código de establecimiento (3 dígitos, ej: '001')
 * @param puntoEmision - Código de punto de emisión (3 dígitos, ej: '001')
 * @param secuencial - Secuencial del comprobante (9 dígitos, ej: '000000001')
 * @param codigoNumerico - Código numérico aleatorio (8 dígitos, ej: '12345678')
 * @param tipoEmision - Tipo de emisión (1 dígito, siempre '1' para emisión normal)
 */
export function generateClaveAcceso(params: {
  fecha: Date;
  tipoComprobante: string;
  ruc: string;
  ambiente: number; // 1 o 2
  establecimiento: string;
  puntoEmision: string;
  secuencial: string;
  codigoNumerico?: string;
  tipoEmision?: string;
}): string {
  // 1. Formatear la fecha como DDMMAAAA en zona horaria de Ecuador (America/Guayaquil)
  const { fechaStr } = getEcuadorDateParts(params.fecha);

  // 2. Limpiar y rellenar parámetros
  const cleanRuc = params.ruc.replace(/\D/g, "").slice(0, 13).padStart(13, "0");
  const cleanAmbiente = String(params.ambiente); // '1' o '2'
  const cleanEst = params.establecimiento.replace(/\D/g, "").slice(0, 3).padStart(3, "0");
  const cleanPto = params.puntoEmision.replace(/\D/g, "").slice(0, 3).padStart(3, "0");
  const cleanSec = params.secuencial.replace(/\D/g, "").slice(0, 9).padStart(9, "0");
  const cleanCodNum = (params.codigoNumerico || "12345678").replace(/\D/g, "").slice(0, 8).padStart(8, "0");
  const cleanTipoEmi = params.tipoEmision || "1"; // '1' para normal

  // 3. Concatenar los 48 dígitos iniciales
  // Estructura: Fecha (8) + TipoComprobante (2) + RUC (13) + Ambiente (1) + Serie (6) + Secuencial (9) + Código Numérico (8) + Tipo Emisión (1)
  const baseClave = `${fechaStr}${params.tipoComprobante}${cleanRuc}${cleanAmbiente}${cleanEst}${cleanPto}${cleanSec}${cleanCodNum}${cleanTipoEmi}`;

  // 4. Calcular dígito verificador e incorporarlo al final (49 dígitos totales)
  const dv = getMod11Dv(baseClave);
  return `${baseClave}${dv}`;
}
