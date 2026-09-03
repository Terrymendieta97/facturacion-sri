"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  CheckCircle2,
  Zap,
  ShieldCheck,
  ShoppingBag,
  Cpu,
  ArrowRight,
  FileText,
  Clock,
  Send,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Receipt,
  Download,
  QrCode,
  Globe,
  CreditCard,
  MessageCircle,
  Users,
  Check,
  Code2,
  Lock,
  Layers,
  Smartphone
} from "lucide-react";

interface LandingPageProps {
  systemConfig: {
    id: number;
    adminWhatsapp: string;
    bankAccounts: string;
    defaultBalance: number;
    systemName?: string;
    pageTitle?: string;
    systemLogo?: string | null;
    systemFavicon?: string | null;
    loginTitle?: string;
    loginSubtitle?: string;
    metaDescription?: string | null;
    metaKeywords?: string | null;
    pricePerInvoice?: number;
    monthlyPlanFee?: number;
  } | null;
  onOpenAuth?: (tab: "login" | "register" | "admin") => void;
}

export default function LandingPage({ systemConfig, onOpenAuth }: LandingPageProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const brandName = systemConfig?.systemName || "Lojafac";
  const monthlyFee = systemConfig?.monthlyPlanFee ?? 15.0;
  const pricePerInvoice = systemConfig?.pricePerInvoice ?? 0.10;
  const defaultBalance = typeof systemConfig?.defaultBalance === "number" ? systemConfig.defaultBalance : 1.0;
  const whatsappNumber = systemConfig?.adminWhatsapp || "593999999999";

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      
      {/* 1. NAVBAR FLOTANTE GLASSMORPHISM */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo y Nombre de Marca */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            {systemConfig?.systemLogo ? (
              <img
                src={systemConfig.systemLogo}
                alt={`Logo ${brandName}`}
                className="h-10 w-auto max-w-[140px] object-contain rounded-xl"
              />
            ) : (
              <div className="h-10 w-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-md shadow-blue-600/20">
                {brandName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-slate-900">{brandName}</span>
              <span className="text-[10px] font-bold text-blue-600 tracking-wider uppercase -mt-1">Facturación SRI</span>
            </div>
          </div>

          {/* Menú de Navegación Rápida */}
          <nav className="hidden md:flex items-center space-x-8 text-xs font-bold text-slate-600">
            <a href="#caracteristicas" className="hover:text-blue-600 transition-colors">Características</a>
            <a href="#pos" className="hover:text-blue-600 transition-colors">Punto de Venta POS</a>
            <a href="#api" className="hover:text-blue-600 transition-colors">API & Ecommerce</a>
            <a href="#precios" className="hover:text-blue-600 transition-colors">Planes y Precios</a>
            <a href="#faqs" className="hover:text-blue-600 transition-colors">Preguntas Frecuentes</a>
          </nav>

          {/* Acciones de Login / Registro */}
          <div className="flex items-center space-x-3">
            <Link
              href="/auth?tab=login"
              className="px-4 py-2.5 text-xs font-bold text-slate-700 hover:text-blue-600 transition-colors cursor-pointer"
            >
              Iniciar Sesión
            </Link>
            <Link
              href="/auth?tab=register"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-2xl shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center space-x-1.5"
            >
              <span>Comenzar Gratis</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION COMERCIAL Y MINIMALISTA */}
      <section className="relative pt-12 pb-20 sm:pt-16 sm:pb-28 overflow-hidden bg-gradient-to-b from-slate-50/70 via-white to-white border-b border-slate-100">
        
        {/* Luces sutiles de fondo */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-blue-100/40 via-indigo-50/40 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-6">
            
            {/* Badge Animado */}
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold shadow-xs animate-pulse">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
              </span>
              <span>Facturación Electrónica SRI 100% Autorizada • Tarifa IVA 15% Vigente</span>
            </div>

            {/* H1 SEO de Alto Impacto */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.12]">
              Emite Facturas al SRI <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 bg-clip-text text-transparent">
                en Segundos y Sin Complicaciones
              </span>
            </h1>

            {/* Subtítulo Comercial */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal max-w-2xl mx-auto">
              La plataforma de facturación electrónica más rápida, elegante y económica de Ecuador. Diseñada para profesionales independientes, negocios comerciales, puntos de venta y tiendas online.
            </p>

            {/* Botones de Conversión */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link
                href="/auth?tab=register"
                className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-blue-600/25 hover:shadow-2xl hover:shadow-blue-600/35 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center space-x-2"
              >
                <span>🚀 Crear Cuenta Gratis (${defaultBalance.toFixed(2)} de Saldo)</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/auth?tab=login"
                className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all cursor-pointer flex items-center justify-center space-x-2"
              >
                <Lock className="h-4 w-4 text-slate-400" />
                <span>Ingresar al Sistema</span>
              </Link>
            </div>

            {/* Micro-garantías */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs font-semibold text-slate-500">
              <span className="flex items-center space-x-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Sin contratos ni letras pequeñas</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Saldo de cortesía incluido</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Firma electrónica .p12 100% segura</span>
              </span>
            </div>
          </div>

          {/* MOCKUP INTERACTIVO EN VIVO: FACTURA SRI 3D GLASSMORPHISM */}
          <div className="mt-14 max-w-4xl mx-auto relative">
            
            {/* Tarjeta Flotante Izquierda: Velocidad SRI */}
            <div className="hidden lg:flex absolute -left-10 top-12 z-20 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xl items-center space-x-3 animate-bounce" style={{ animationDuration: "4s" }}>
              <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tiempo de Respuesta</span>
                <span className="text-xs font-black text-slate-800">0.8s Autorización SRI</span>
              </div>
            </div>

            {/* Tarjeta Flotante Derecha: Integración Ecommerce */}
            <div className="hidden lg:flex absolute -right-10 bottom-12 z-20 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xl items-center space-x-3 animate-bounce" style={{ animationDuration: "5s" }}>
              <div className="h-10 w-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Conexión Automática</span>
                <span className="text-xs font-black text-slate-800">WooCommerce & Shopify</span>
              </div>
            </div>

            {/* Mockup Central de Factura Electrónica */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
              
              {/* Barra superior de estado */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="h-9 w-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">FACTURA ELECTRÓNICA N° 001-001-000000124</h3>
                    <p className="text-[11px] text-slate-500 font-mono">Clave Acceso: 0309202601110475957400110010010000001241234567819</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                    AUTORIZADA POR EL SRI
                  </span>
                </div>
              </div>

              {/* Datos de Emisor y Cliente */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Emisor (Tu Empresa)</span>
                  <p className="font-extrabold text-slate-800">COMERCIAL ECUADOR S.A.S.</p>
                  <p className="text-slate-500 font-mono text-[11px]">RUC: 1104759574001 • Matriz: Loja, Ecuador</p>
                </div>

                <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Comprador</span>
                  <p className="font-extrabold text-slate-800">ESTEFANÍA LOAIZA (CLIENTE)</p>
                  <p className="text-slate-500 font-mono text-[11px]">Cédula: 1105164683 • cliente@email.com</p>
                </div>
              </div>

              {/* Detalle de Productos */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden text-xs">
                <div className="grid grid-cols-12 bg-slate-50 px-4 py-2.5 font-bold text-slate-500 text-[11px] uppercase tracking-wider">
                  <span className="col-span-6">Descripción del Producto / Servicio</span>
                  <span className="col-span-2 text-center">Cant.</span>
                  <span className="col-span-2 text-right">Precio</span>
                  <span className="col-span-2 text-right">Total</span>
                </div>
                <div className="grid grid-cols-12 px-4 py-3 border-t border-slate-100 items-center font-medium text-slate-800">
                  <span className="col-span-6 font-bold">Servicio Profesional / Producto Físico</span>
                  <span className="col-span-2 text-center">1.00</span>
                  <span className="col-span-2 text-right font-mono">$25.00</span>
                  <span className="col-span-2 text-right font-mono font-bold">$25.00</span>
                </div>
              </div>

              {/* Totales y Botones de Descarga */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <div className="flex items-center space-x-2 text-xs">
                  <Link href="/auth?tab=register" className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center space-x-1.5 cursor-pointer transition-colors">
                    <Download className="h-3.5 w-3.5 text-blue-600" />
                    <span>Descargar PDF RIDE</span>
                  </Link>
                  <Link href="/auth?tab=register" className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center space-x-1.5 cursor-pointer transition-colors">
                    <Code2 className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Descargar XML</span>
                  </Link>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 min-w-[200px] text-right space-y-1 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal 15%:</span>
                    <span className="font-mono font-bold">$25.00</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>IVA 15%:</span>
                    <span className="font-mono font-bold">$3.75</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-black text-sm border-t border-slate-200 pt-1">
                    <span>VALOR TOTAL:</span>
                    <span className="font-mono text-blue-600">$28.75</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 3. CINTA DE COMPATIBILIDAD & CONFIANZA */}
      <section className="py-10 bg-slate-50/80 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">
            Tecnología y Compatibilidad 100% Homologada con el SRI en Ecuador
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 opacity-80 text-xs font-extrabold text-slate-700">
            <span className="flex items-center space-x-2">🏛️ <span>SRI WebServices SOAP</span></span>
            <span className="flex items-center space-x-2">🟣 <span>WordPress & WooCommerce</span></span>
            <span className="flex items-center space-x-2">🟢 <span>Shopify Webhooks</span></span>
            <span className="flex items-center space-x-2">📱 <span>WhatsApp Business</span></span>
            <span className="flex items-center space-x-2">🖨️ <span>Tickets POS Térmicos</span></span>
            <span className="flex items-center space-x-2">💳 <span>Tarjetas, Deuna & Transferencias</span></span>
          </div>
        </div>
      </section>

      {/* 4. SECCIÓN BENTO GRID: FUNCIONALIDADES ESTRELLA */}
      <section id="caracteristicas" className="py-20 sm:py-28 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-extrabold text-blue-600 uppercase tracking-widest">Todo en Una Sola Plataforma</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Diseñado para Acelerar la Facturación de tu Negocio
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Olvídate de sistemas lentos y complejos. {brandName} te entrega una experiencia minimalista, intuitiva y ultrarrápida.
            </p>
          </div>

          {/* Grid de 6 Tarjetas Estilo Bento */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Card 1: Punto de Venta POS */}
            <div id="pos" className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-blue-200 transition-all space-y-4 group">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Receipt className="h-6 w-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">Punto de Venta POS Ultrarrápido</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Diseñado para mostradores, tiendas físicas y farmacias. Busca productos por código de barras o nombre y emite facturas en 1 segundo con tickets térmicos de 80mm o 58mm.
              </p>
            </div>

            {/* Card 2: API REST & Ecommerce */}
            <div id="api" className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-purple-200 transition-all space-y-4 group">
              <div className="h-12 w-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Code2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">API REST Pública para E-commerce</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Conecta WooCommerce, Shopify, apps móviles o ERPs mediante una simple petición HTTP. Incluye snippets de código listos para copiar en PHP, Node.js, Python y cURL.
              </p>
            </div>

            {/* Card 3: Autocompletado de Clientes */}
            <div className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-emerald-200 transition-all space-y-4 group">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">Autocompletado de Cédulas y RUCs</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Escribe la cédula o RUC del comprador y {brandName} autocompleta automáticamente los nombres, correo y dirección si ya fue registrado previamente en la red nacional.
              </p>
            </div>

            {/* Card 4: Firma Electrónica Segura */}
            <div className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-amber-200 transition-all space-y-4 group">
              <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">Firma Digital .p12 Blindada</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Almacenamiento seguro de tu archivo de firma electrónica `.p12`. El sistema firma y valida cada comprobante XML respetando la normativa estricta del SRI.
              </p>
            </div>

            {/* Card 5: Despacho Automático */}
            <div className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-indigo-200 transition-all space-y-4 group">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Send className="h-6 w-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">Envío Inmediato de RIDE y XML</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tus clientes reciben en tiempo real el PDF RIDE y el archivo XML autorizado en su bandeja de correo electrónico, con copias de respaldo para tu tranquilidad.
              </p>
            </div>

            {/* Card 6: Reportes y Auditoría */}
            <div className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-rose-200 transition-all space-y-4 group">
              <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">Reportes para tu Contador</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Exporta tus ventas del mes en Excel y PDF con un solo clic. Visualiza gráficas de ingresos, productos más vendidos y control de saldos diarios.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 5. PASO A PASO: EMISIÓN EN 3 PASOS */}
      <section className="py-20 sm:py-24 bg-slate-50/60 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-extrabold text-blue-600 uppercase tracking-widest">Simplicidad Absoluta</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              ¿Cómo Funciona la Facturación en {brandName}?
            </h2>
            <p className="text-slate-600 text-xs">Tres simples pasos para emitir tu comprobante autorizado ante el SRI.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center relative">
            
            {/* Paso 1 */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white font-black text-lg flex items-center justify-center mx-auto shadow-md shadow-blue-600/20">
                1
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">Identifica al Comprador</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Ingresa la cédula o RUC. Si no tiene datos, factura con un clic a <strong>Consumidor Final</strong>.
              </p>
            </div>

            {/* Paso 2 */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center mx-auto shadow-md shadow-indigo-600/20">
                2
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">Agrega Productos / Servicios</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                El sistema calcula automáticamente el desglose de <strong>IVA 15%, 0% o exento</strong> y descuentos.
              </p>
            </div>

            {/* Paso 3 */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-600 text-white font-black text-lg flex items-center justify-center mx-auto shadow-md shadow-emerald-600/20">
                3
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">¡Factura Autorizada!</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                En menos de un segundo tu comprobante se firma, autoriza en el SRI y se despacha por correo y WhatsApp.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 6. PLANES Y PRECIOS TRANSPARENTES */}
      <section id="precios" className="py-20 sm:py-28 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-extrabold text-blue-600 uppercase tracking-widest">Tarifas Claras y Económicas</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Paga Solo por lo que Usas o Elige Emisiones Ilimitadas
            </h2>
            <p className="text-slate-600 text-sm">
              Sin contratos de permanencia. Empieza hoy con ${defaultBalance.toFixed(2)} de saldo de regalo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
            
            {/* PLAN PREPAGO (PAGO POR FACTURA) */}
            <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xs flex flex-col justify-between space-y-8 hover:border-slate-300 transition-all">
              <div className="space-y-4">
                <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 text-[10px] font-black rounded-full uppercase tracking-wider">
                  Plan Prepago Flexible
                </span>
                <h3 className="text-xl font-black text-slate-900">Pago por Factura</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Ideal para profesionales y pequeños negocios que emiten pocas facturas al mes y no desean mensualidades fijas.
                </p>

                <div className="pt-2 flex items-baseline space-x-1">
                  <span className="text-4xl font-black text-slate-900 font-mono">${pricePerInvoice.toFixed(2)}</span>
                  <span className="text-xs text-slate-500 font-bold">/ por factura emitida con éxito</span>
                </div>

                <ul className="pt-4 space-y-3 text-xs text-slate-700">
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Sin costo mensual de mantenimiento</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Recargas desde $5 mediante transferencia bancaria</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>El saldo nunca caduca</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Punto de Venta POS y API REST incluidos</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/auth?tab=register"
                className="w-full block text-center py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-2xl transition-all cursor-pointer"
              >
                Comenzar con Pago por Factura
              </Link>
            </div>

            {/* PLAN MENSUAL ILIMITADO (POPULAR) */}
            <div className="bg-white rounded-3xl p-8 sm:p-10 border-2 border-blue-600 shadow-xl flex flex-col justify-between space-y-8 relative overflow-hidden">
              
              <div className="absolute top-5 right-5">
                <span className="inline-block px-3 py-1 bg-blue-600 text-white text-[10px] font-black rounded-full uppercase tracking-wider shadow-sm">
                  ⭐ Más Popular
                </span>
              </div>

              <div className="space-y-4">
                <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-black rounded-full uppercase tracking-wider">
                  Plan Ilimitado Total
                </span>
                <h3 className="text-xl font-black text-slate-900">Mensual Ilimitado</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Para comercios, distribuidores, tiendas online y negocios que facturan constantemente y buscan ahorro total.
                </p>

                <div className="pt-2 flex items-baseline space-x-1">
                  <span className="text-4xl font-black text-blue-600 font-mono">${monthlyFee.toFixed(2)}</span>
                  <span className="text-xs text-slate-500 font-bold">/ mes (facturación ilimitada)</span>
                </div>

                <ul className="pt-4 space-y-3 text-xs text-slate-700">
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-bold text-slate-900">Emisión ilimitada de facturas al SRI</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Envío ilimitado por correo y WhatsApp</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Conexión con WooCommerce & Shopify</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Soporte prioritario por WhatsApp</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/auth?tab=register"
                className="w-full block text-center py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
              >
                Activar Plan Mensual Ilimitado
              </Link>
            </div>

          </div>

        </div>
      </section>

      {/* 7. PREGUNTAS FRECUENTES (FAQS) PARA SEO */}
      <section id="faqs" className="py-20 sm:py-24 bg-slate-50/60 border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-3">
            <span className="text-xs font-extrabold text-blue-600 uppercase tracking-widest">Resolvemos tus Dudas</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Preguntas Frecuentes sobre Facturación SRI
            </h2>
            <p className="text-slate-600 text-xs">Todo lo que necesitas saber antes de empezar a facturar con {brandName}.</p>
          </div>

          <div className="space-y-3">
            
            {/* FAQ 1 */}
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden transition-all shadow-2xs">
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === 1 ? null : 1)}
                className="w-full p-5 text-left flex items-center justify-between font-bold text-sm text-slate-800 hover:bg-slate-50/80 cursor-pointer"
              >
                <span>¿Qué necesito para empezar a facturar electrónicamente?</span>
                {openFaq === 1 ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </button>
              {openFaq === 1 && (
                <div className="p-5 pt-0 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/40 space-y-2">
                  <p>Solo necesitas tres cosas:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Tu número de <strong>RUC activo</strong> en el SRI.</li>
                    <li>Tu <strong>Firma Electrónica en archivo (.p12)</strong> emitida por cualquier entidad certificadora en Ecuador (ej. BCE, Security Data, ANF, Uanataca).</li>
                    <li>Crear tu cuenta en {brandName} y subir tu firma en la sección de Configuración.</li>
                  </ol>
                </div>
              )}
            </div>

            {/* FAQ 2 */}
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden transition-all shadow-2xs">
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === 2 ? null : 2)}
                className="w-full p-5 text-left flex items-center justify-between font-bold text-sm text-slate-800 hover:bg-slate-50/80 cursor-pointer"
              >
                <span>¿Cómo funciona el saldo de cortesía de ${defaultBalance.toFixed(2)}?</span>
                {openFaq === 2 ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </button>
              {openFaq === 2 && (
                <div className="p-5 pt-0 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/40">
                  <p>
                    Al registrar tu empresa en {brandName}, se abona automáticamente ${defaultBalance.toFixed(2)} a tu billetera para que puedas realizar pruebas en el ambiente del SRI o emitir tus primeras facturas reales sin pagar nada por adelantado.
                  </p>
                </div>
              )}
            </div>

            {/* FAQ 3 */}
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden transition-all shadow-2xs">
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === 3 ? null : 3)}
                className="w-full p-5 text-left flex items-center justify-between font-bold text-sm text-slate-800 hover:bg-slate-50/80 cursor-pointer"
              >
                <span>¿Puedo conectar mi tienda WooCommerce o Shopify?</span>
                {openFaq === 3 ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </button>
              {openFaq === 3 && (
                <div className="p-5 pt-0 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/40 space-y-2">
                  <p>
                    ¡Sí! {brandName} cuenta con una <strong>API REST Pública</strong> y snippets de código listos para pegar en WooCommerce (hook de pago completado) y webhooks de Shopify, permitiendo que tus ventas online se facturen y autoricen en el SRI de forma 100% automática.
                  </p>
                </div>
              )}
            </div>

            {/* FAQ 4 */}
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden transition-all shadow-2xs">
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === 4 ? null : 4)}
                className="w-full p-5 text-left flex items-center justify-between font-bold text-sm text-slate-800 hover:bg-slate-50/80 cursor-pointer"
              >
                <span>¿Está actualizado con la tarifa vigente del IVA al 15%?</span>
                {openFaq === 4 ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </button>
              {openFaq === 4 && (
                <div className="p-5 pt-0 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/40">
                  <p>
                    Sí, {brandName} está totalmente actualizado con la legislación tributaria ecuatoriana vigente (IVA 15%, 12%, 8% y 0%), calculando de forma exacta los casilleros del XML exigidos por el SRI.
                  </p>
                </div>
              )}
            </div>

          </div>

        </div>
      </section>

      {/* 8. BANNER CTA FINAL */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 sm:p-14 text-white text-center space-y-6 shadow-2xl relative overflow-hidden">
            
            <div className="space-y-3 max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
                Empieza a Facturar Electrónicamente Hoy Mismo
              </h2>
              <p className="text-indigo-200 text-xs sm:text-sm leading-relaxed">
                Únete a cientos de profesionales y empresas en Ecuador que ahorran tiempo y dinero con {brandName}.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/auth?tab=register"
                className="w-full sm:w-auto block text-center px-8 py-4 bg-white text-slate-900 hover:bg-slate-100 font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-xl transition-all hover:scale-105 cursor-pointer"
              >
                Crear Cuenta Gratis en 1 Minuto
              </Link>
              <a
                href={`https://wa.me/${whatsappNumber}?text=Hola,%20deseo%20más%20información%20sobre%20el%20sistema%20de%20facturación%20electrónica%20${brandName}`}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center space-x-2"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Contactar por WhatsApp</span>
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* 9. FOOTER INSTITUCIONAL */}
      <footer className="bg-white border-t border-slate-100 py-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center space-x-3">
            {systemConfig?.systemLogo ? (
              <img
                src={systemConfig.systemLogo}
                alt={`Logo ${brandName}`}
                className="h-8 w-auto max-w-[120px] object-contain rounded-lg"
              />
            ) : (
              <div className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm">
                {brandName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <span className="font-black text-slate-800">{brandName}</span>
              <span className="block text-[10px] text-slate-400">© {new Date().getFullYear()} Todos los derechos reservados. Facturación SRI Ecuador.</span>
            </div>
          </div>

          <div className="flex items-center space-x-6 text-[11px] font-bold">
            <a href="#caracteristicas" className="hover:text-blue-600 transition-colors">Características</a>
            <a href="#precios" className="hover:text-blue-600 transition-colors">Tarifas</a>
            <Link
              href="/auth?tab=admin"
              className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              Acceso Supervisor
            </Link>
          </div>

        </div>
      </footer>

    </div>
  );
}
