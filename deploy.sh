#!/bin/bash
# ==============================================================================
# Script de Despliegue Automatizado para VPS (Ubuntu / Debian) - LojaFac SRI
# ==============================================================================
set -e

echo "🚀 Iniciando despliegue de Facturación SRI en VPS..."

# 1. Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "📦 Instalando Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 2. Verificar PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 Instalando PM2 globalmente..."
    sudo npm install -g pm2
fi

# 3. Configurar Zona Horaria del Sistema a Ecuador
echo "🕒 Configurando zona horaria del sistema a America/Guayaquil..."
sudo timedatectl set-timezone America/Guayaquil

# 4. Instalar dependencias y compilar Frontend
echo "📦 Instalando dependencias y compilando Frontend (Next.js)..."
npm install
npx prisma generate
npx prisma db push
npm run build

# 5. Instalar dependencias y compilar Backend
echo "📦 Instalando dependencias y compilando Backend (Express API)..."
cd backend
npm install
npx prisma generate
npm run build
cd ..

# 6. Iniciar o recargar servicios con PM2
echo "⚡ Lanzando servicios con PM2..."
pm2 startOrReload ecosystem.config.cjs
pm2 save

echo "========================================================"
echo "✅ ¡Despliegue completado exitosamente!"
echo "📡 Backend API corriendo en: http://localhost:4000"
echo "🌐 Frontend Web corriendo en: http://localhost:3000"
echo "========================================================"
