# Documentación Técnica - Lojafac Facturación SRI

Bienvenido a la documentación técnica y arquitectónica del sistema **Lojafac Facturación SRI**.

---

## 📁 Índice de Documentación

| Sección | Descripción | Archivo |
| :--- | :--- | :--- |
| **Arquitectura** | Visión general del sistema, flujo de emisión y desacoplamiento modular. | [`architecture/overview.md`](./architecture/overview.md) |
| **Especificaciones SRI** | Normativa técnica del SRI, algoritmo Módulo 11, endpoints SOAP y firma digital. | [`sri/especificaciones_tecnicas.md`](./sri/especificaciones_tecnicas.md) |
| **Base de Datos** | Diccionario de datos de PostgreSQL (Neon / VPS), modelos Prisma e índices. | [`database/schema_postgres.md`](./database/schema_postgres.md) |
| **API REST** | Catálogo de endpoints para emisión de facturas, clientes, productos y reportes. | [`api/endpoints.md`](./api/endpoints.md) |
| **Guías de Despliegue** | Paso a paso para desplegar en Vercel con Neon PostgreSQL y migración a VPS. | [`guides/despliegue_neon_vercel.md`](./guides/despliegue_neon_vercel.md) |

---

## 🚀 Tecnologías Principales

* **Base de Datos:** PostgreSQL 16 (Alojada en Neon Serverless / Compatible con VPS propio).
* **ORM:** Prisma ORM con Connection Pooling.
* **Firmado Digital:** Firma electrónica `.p12` compatible con estándar XAdES-BES (PKCS#12).
* **Integración SRI:** Web Services SOAP de Recepción y Autorización en línea (Ambiente 1 Pruebas y 2 Producción).
* **Motor de RIDE:** Generación de PDF vectorial con código de barras Code128 de 49 dígitos.
