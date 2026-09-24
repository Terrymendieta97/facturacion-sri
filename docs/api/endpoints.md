# Catálogo de Endpoints de la API REST

## 1. Endpoints Públicos / Integración con Ecommerce (`/api/v1`)

### `POST /api/v1/invoices`
Emite una factura electrónica autorizada ante el SRI mediante API Key.

**Encabezados:**
```http
Content-Type: application/json
x-api-key: TU_API_KEY_AQUI
```

**Ejemplo de Cuerpo (JSON):**
```json
{
  "comprador": {
    "tipoIdentificacion": "05",
    "identificacion": "1104759574",
    "razonSocial": "JUAN PEREZ",
    "direccion": "Loja, Ecuador",
    "email": "juan@ejemplo.com",
    "telefono": "0999999999"
  },
  "items": [
    {
      "codigoPrincipal": "SERV-001",
      "descripcion": "Servicio de Consultoría Informática",
      "cantidad": 1,
      "precioUnitario": 100.00,
      "descuento": 0.00,
      "ivaPercentage": 15.0
    }
  ],
  "formaPago": "01",
  "observaciones": "Factura emitida vía API"
}
```

**Respuesta Exitosa (200 OK):**
```json
{
  "success": true,
  "invoiceId": 12,
  "secuencial": "000000007",
  "estado": "AUTORIZADA",
  "claveAcceso": "2409202601110516468300120010010000000071234567812",
  "numeroAutorizacion": "2409202601110516468300120010010000000071234567812",
  "pdfUrl": "/api/invoices/download-pdf?id=12",
  "xmlUrl": "/api/invoices/download-xml?id=12"
}
```

---

### `GET /api/v1/invoices/:claveAcceso`
Consulta el estado, XML y PDF de una factura por su clave de acceso de 49 dígitos.

### `GET /api/v1/clients/lookup?identificacion=1104759574`
Consulta rápida de clientes registrados por Cédula o RUC.
