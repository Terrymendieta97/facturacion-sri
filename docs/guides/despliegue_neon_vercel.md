# Guía de Despliegue: Vercel + Neon PostgreSQL

## 1. Variables de Entorno Requeridas en Vercel

En el panel de **Vercel** $\rightarrow$ **Settings** $\rightarrow$ **Environment Variables**, configura:

| Variable | Valor / Ejemplo | Descripción |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://neondb_owner:pass@ep-xyz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require` | Conexión con Connection Pooling a Neon |
| `DIRECT_URL` | `postgresql://neondb_owner:pass@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require` | Conexión directa para migraciones |
| `SMTP_HOST` | `smtp.gmail.com` | Servidor SMTP de Gmail |
| `SMTP_PORT` | `465` | Puerto SSL SMTP |
| `SMTP_SECURE` | `true` | Habilita SSL |
| `SMTP_USER` | `lojafacec@gmail.com` | Correo remitente |
| `SMTP_PASS` | `tu_password_de_aplicacion` | Contraseña de aplicación de Google |
| `GOOGLE_REFRESH_TOKEN` | `1//...` | Token OAuth para fallback por API REST HTTPS |

---

## 2. Migración Futura a Servidor VPS Propio

Cuando decidas mover la base de datos a tu propio VPS (Ubuntu):

1. **Exportar datos de Neon:**
   ```bash
   pg_dump "postgresql://neondb_owner:pass@ep-xyz.aws.neon.tech/neondb?sslmode=require" > respaldo_neon.sql
   ```

2. **Restaurar en tu VPS:**
   ```bash
   psql -h localhost -U usuario_vps -d facturacion_db < respaldo_neon.sql
   ```

3. **Actualizar `.env`:**
   ```env
   DATABASE_URL="postgresql://usuario_vps:password@IP_DE_TU_VPS:5432/facturacion_db"
   ```
