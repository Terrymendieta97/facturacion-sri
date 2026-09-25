# 🚀 Guía Maestra de Despliegue en VPS (Ubuntu / Debian) - LojaFac SRI

Esta guía explica paso a paso cómo desplegar la plataforma completa de Facturación Electrónica SRI en cualquier servidor VPS (DigitalOcean, AWS EC2, Linode, Contabo, Hetzner o servidor propio).

---

## 🏗️ Arquitectura en el VPS

* **Frontend**: Next.js 16 en puerto `3000`
* **Backend**: Express REST API en puerto `4000`
* **Base de Datos**: PostgreSQL en la nube (Neon) o local
* **Gestor de Procesos**: PM2 con reinicio automático 24/7
* **Reverse Proxy**: Nginx (gestiona tráfico HTTP/HTTPS en puertos 80 y 443)

---

## 📋 Método 1: Despliegue Rápido con PM2 (Recomendado)

### 1. Conectarse al VPS y Clonar el Repositorio

```bash
# Actualizar el servidor
sudo apt update && sudo apt upgrade -y

# Clonar el proyecto
git clone https://github.com/Terrymendieta97/facturacion-sri.git /var/www/facturacion-sri
cd /var/www/facturacion-sri
```

### 2. Configurar Variables de Entorno

```bash
# Crear archivo .env en la raíz (Frontend)
cp .env.production.example .env
nano .env

# Crear archivo .env en el backend
cp backend/.env.production.example backend/.env
nano backend/.env
```

### 3. Ejecutar el Script Automatizado de Despliegue

```bash
chmod +x deploy.sh
./deploy.sh
```

El script se encargará automáticamente de:
- Instalar Node.js 20 LTS y PM2.
- Configurar la zona horaria del sistema a `America/Guayaquil` (Ecuador UTC-5).
- Compilar el Frontend Next.js y el Backend Express.
- Sincronizar el esquema de Prisma con PostgreSQL.
- Iniciar ambos servicios en PM2 y guardarlos para inicio automático al reiniciar el servidor.

---

## 🔒 Método 2: Configurar Nginx y Certificado SSL Gratuito (HTTPS)

### 1. Copiar y Activar la Configuración de Nginx

```bash
# Instalar Nginx si aún no está instalado
sudo apt install -y nginx

# Copiar el archivo de configuración
sudo cp nginx/lojafac.conf /etc/nginx/sites-available/lojafac.conf

# Editar el archivo y poner tu dominio real o IP
sudo nano /etc/nginx/sites-available/lojafac.conf

# Habilitar el sitio en Nginx
sudo ln -s /etc/nginx/sites-available/lojafac.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 2. Instalar Certificado SSL con Certbot (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tudominio.com -d www.tudominio.com
```

---

## 🐳 Método 3: Despliegue Alternativo con Docker Compose

Si prefieres usar contenedores Docker:

```bash
# Instalar Docker y Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo apt install -y docker-compose

# Iniciar la plataforma en segundo plano
docker-compose up -d --build

# Ver estado de los contenedores
docker-compose ps
docker-compose logs -f
```

---

## 🛠️ Comandos de Mantenimiento Útiles

```bash
# Ver estado de los servicios en PM2
pm2 status

# Ver logs en tiempo real
pm2 logs

# Reiniciar servicios tras actualizar código
git pull origin main
./deploy.sh
```
