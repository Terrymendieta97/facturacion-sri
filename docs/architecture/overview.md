# Arquitectura del Sistema: Lojafac Facturación SRI

## 1. Visión General y Flujo de Emisión

```mermaid
sequenceDiagram
    autonumber
    actor Cliente as Usuario / Sistema Externo
    participant Frontend as Frontend Web
    participant Backend as Backend API (Node.js)
    participant DB as PostgreSQL (Neon / VPS)
    participant SRI_Rec as SRI Recepción (SOAP)
    participant SRI_Aut as SRI Autorización (SOAP)
    participant Email as Google Gmail API

    Cliente->>Frontend: Ingresa datos de factura y cliente
    Frontend->>Backend: POST /api/invoices
    Backend->>DB: Obtiene datos del Emisor y Firma .p12
    Backend->>Backend: Genera XML estándar v1.1.0 y Clave de Acceso (49 dígitos)
    Backend->>Backend: Firma digitalmente el XML con XAdES-BES
    Backend->>SRI_Rec: Envía XML firmado (validarComprobante)
    SRI_Rec-->>Backend: Respuesta: RECIBIDA / DEVUELTA
    alt Comprobante RECIBIDO
        Backend->>SRI_Aut: Consulta estado (autorizacionComprobante)
        SRI_Aut-->>Backend: Respuesta: AUTORIZADO + Fecha + XML Autorizado
        Backend->>DB: Guarda Factura en PostgreSQL (Estado: AUTORIZADA)
        Backend->>Backend: Genera RIDE PDF con Code128
        Backend->>Email: Envía PDF y XML al cliente por correo
        Backend-->>Frontend: Factura Autorizada exitosamente
    else Comprobante DEVUELTO
        Backend->>DB: Guarda registro con errores del SRI (Estado: DEVUELTA)
        Backend-->>Frontend: Mensaje detallado del error del SRI
    end
```

---

## 2. Componentes Desacoplados

1. **Frontend (`/apps/frontend` o UI):**
   * Puntos de Venta (POS rápido), catálogos de clientes, inventarios y reportes.
   * Totalmente agnóstico del servidor; solo consume endpoints REST.

2. **Backend API (`/apps/backend` o API REST):**
   * Manejo de la lógica tributaria ecuatoriana y comunicación con el SRI.
   * Endpoints protegidos para integraciones con Ecommerce (WooCommerce, Shopify) o ERPs.

3. **Base de Datos (PostgreSQL):**
   * Almacén centralizado de alta concurrencia en **Neon** (o en tu VPS propio).
   * Almacena XMLs autorizados, PDFs RIDE, historial de clientes y firmas electrónicas cifradas.
