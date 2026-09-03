"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Building,
  Mail,
  Phone,
  MapPin,
  User,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  MessageSquare,
  HelpCircle,
  Receipt
} from "lucide-react";

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") as "login" | "register" | "admin" || "login";

  const [activeTab, setActiveTab] = useState<"login" | "register" | "admin">(
    ["login", "register", "admin"].includes(initialTab) ? initialTab : "login"
  );

  const [systemConfig, setSystemConfig] = useState<{
    systemName?: string;
    systemLogo?: string | null;
    loginTitle?: string;
    loginSubtitle?: string;
    defaultBalance?: number;
    adminWhatsapp?: string;
    bankAccounts?: string;
  } | null>(null);

  const [loadingConfig, setLoadingConfig] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados de formularios
  const [loginForm, setLoginForm] = useState({ identifier: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    ruc: "",
    nombres: "",
    apellidos: "",
    nombreEmpresa: "",
    razonSocial: "",
    direccion: "",
    email: "",
    celular: "",
    password: "",
  });
  const [adminPassword, setAdminPassword] = useState("");

  // Visibilidad de contraseñas
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [showRegPass, setShowRegPass] = useState(false);
  const [showAdminPass, setShowAdminPass] = useState(false);

  const [showBankInfo, setShowBankInfo] = useState(false);

  // Sincronizar tab con URL si cambia
  useEffect(() => {
    const tab = searchParams.get("tab") as "login" | "register" | "admin";
    if (tab && ["login", "register", "admin"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Cargar configuración del sistema
  useEffect(() => {
    fetch("/api/system-config")
      .then((res) => res.json())
      .then((res) => {
        if (res.ok && res.data) {
          setSystemConfig(res.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingConfig(false));

    // Si ya tiene sesión activa, redirigir a dashboard
    const activeId = localStorage.getItem("activeIssuerId");
    const isAdmin = localStorage.getItem("isAdminLoggedIn") === "true";
    if (activeId || isAdmin) {
      router.push("/");
    }
  }, [router]);

  const brandName = systemConfig?.systemName || "Lojafac";
  const defaultBalance = typeof systemConfig?.defaultBalance === "number" ? systemConfig.defaultBalance : 1.0;

  // 1. Manejar Inicio de Sesión
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.identifier.trim() || !loginForm.password) {
      alert("Por favor ingrese su RUC o Correo Electrónico y su contraseña.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/issuer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          identifier: loginForm.identifier.trim(),
          ruc: loginForm.identifier.trim(),
          password: loginForm.password,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem("activeIssuerId", String(data.issuer.id));
        localStorage.removeItem("isAdminLoggedIn");
        window.location.href = "/";
      } else {
        alert(data.error || "RUC / Correo Electrónico o contraseña incorrectos.");
      }
    } catch (err: any) {
      alert("Error al conectar con el servidor: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Manejar Registro de Empresa
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const f = registerForm;
    if (!f.ruc || !f.nombres || !f.apellidos || !f.nombreEmpresa || !f.razonSocial || !f.direccion || !f.email || !f.password) {
      alert("Por favor complete todos los campos obligatorios del registro.");
      return;
    }

    if (f.ruc.length !== 13) {
      alert("El RUC en Ecuador debe tener exactamente 13 dígitos numéricos.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/issuer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          ...f,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        alert(`¡Empresa registrada con éxito! Te hemos acreditado $${defaultBalance.toFixed(2)} USD de saldo de cortesía. ¡Bienvenido!`);
        localStorage.setItem("activeIssuerId", String(data.issuer.id));
        localStorage.removeItem("isAdminLoggedIn");
        window.location.href = "/";
      } else {
        alert(data.error || "Error al registrar la empresa. Verifica que el RUC no esté ya registrado.");
      }
    } catch (err: any) {
      alert("Error al registrar: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Manejar Acceso de Supervisor
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword.trim()) {
      alert("Ingrese la contraseña de administración.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/issuer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin-login",
          adminPassword: adminPassword.trim(),
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem("isAdminLoggedIn", "true");
        localStorage.setItem("adminPassword", adminPassword.trim());
        localStorage.removeItem("activeIssuerId");
        window.location.href = "/";
      } else {
        alert(data.error || "Contraseña de supervisor incorrecta.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans antialiased text-slate-900 selection:bg-blue-600 selection:text-white">
      
      {/* Botón Superior: Volver al Inicio */}
      <div className="max-w-xl w-full mx-auto mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver a la página principal</span>
        </Link>

        <span className="text-[11px] font-extrabold text-blue-600 uppercase tracking-wider bg-blue-50 border border-blue-200/60 px-3 py-1 rounded-full">
          SRI Ecuador • Tarifa IVA 15%
        </span>
      </div>

      {/* Tarjeta Principal de Autenticación */}
      <div className="max-w-xl w-full mx-auto bg-white rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/50 p-8 sm:p-10 space-y-8">
        
        {/* Cabecera con Logo y Marca */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            {systemConfig?.systemLogo ? (
              <img
                src={systemConfig.systemLogo}
                alt={`Logo ${brandName}`}
                className="h-14 w-auto max-w-[150px] object-contain rounded-2xl"
              />
            ) : (
              <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-blue-600/20">
                {brandName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {systemConfig?.loginTitle || `${brandName} Ecuador`}
            </h1>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed mt-1">
              {systemConfig?.loginSubtitle || "Plataforma robusta, comercial y minimalista de facturación electrónica."}
            </p>
          </div>
        </div>

        {/* Selector de Pestañas */}
        <div className="flex border-b border-slate-100">
          <button
            type="button"
            onClick={() => setActiveTab("login")}
            className={`flex-1 pb-3 text-xs font-bold border-b-2 text-center transition-all cursor-pointer ${
              activeTab === "login"
                ? "border-blue-600 text-blue-600 font-black text-[13px]"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("register")}
            className={`flex-1 pb-3 text-xs font-bold border-b-2 text-center transition-all cursor-pointer ${
              activeTab === "register"
                ? "border-blue-600 text-blue-600 font-black text-[13px]"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            Registrarse
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("admin")}
            className={`flex-1 pb-3 text-xs font-bold border-b-2 text-center transition-all cursor-pointer ${
              activeTab === "admin"
                ? "border-blue-600 text-blue-600 font-black text-[13px]"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            Supervisor
          </button>
        </div>

        {/* 1. FORMULARIO DE INICIO DE SESIÓN */}
        {activeTab === "login" && (
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                RUC o Correo Electrónico
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="ej. 1104759574001 o micorreo@empresa.com"
                  value={loginForm.identifier}
                  onChange={(e) => setLoginForm({ ...loginForm, identifier: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Contraseña de Acceso
                </label>
              </div>
              <div className="relative">
                <input
                  type={showLoginPass ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-blue-600 transition-colors pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPass(!showLoginPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showLoginPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/35 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "Ingresando..." : "Ingresar a Facturación"}
            </button>

            <div className="text-center pt-2">
              <p className="text-xs text-slate-500">
                ¿Aún no tienes cuenta?{" "}
                <button
                  type="button"
                  onClick={() => setActiveTab("register")}
                  className="text-blue-600 font-bold hover:underline cursor-pointer"
                >
                  Regístrate aquí gratis
                </button>
              </p>
            </div>
          </form>
        )}

        {/* 2. FORMULARIO DE REGISTRO DE EMPRESA */}
        {activeTab === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            
            {/* Banner de Saldo de Bienvenida */}
            <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-xs text-blue-900 font-medium text-center">
              ¡Recibe <strong className="font-bold text-blue-700 font-mono">${defaultBalance.toFixed(2)} USD de saldo de bienvenida</strong> gratis para emitir tus primeras facturas al SRI!
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Número de RUC (13 Dígitos) *
              </label>
              <input
                type="text"
                required
                maxLength={13}
                placeholder="ej. 1104759574001"
                value={registerForm.ruc}
                onChange={(e) => setRegisterForm({ ...registerForm, ruc: e.target.value.replace(/\D/g, "") })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Nombres del Titular *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Juan Carlos"
                  value={registerForm.nombres}
                  onChange={(e) => setRegisterForm({ ...registerForm, nombres: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Apellidos del Titular *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Pérez Celi"
                  value={registerForm.apellidos}
                  onChange={(e) => setRegisterForm({ ...registerForm, apellidos: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Nombre Comercial *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Ferretería El Sol"
                  value={registerForm.nombreEmpresa}
                  onChange={(e) => setRegisterForm({ ...registerForm, nombreEmpresa: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Razón Social (según RUC) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. PÉREZ CELI JUAN CARLOS"
                  value={registerForm.razonSocial}
                  onChange={(e) => setRegisterForm({ ...registerForm, razonSocial: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Dirección del Establecimiento *
              </label>
              <input
                type="text"
                required
                placeholder="ej. Av. 10 de Agosto y Colón, Loja"
                value={registerForm.direccion}
                onChange={(e) => setRegisterForm({ ...registerForm, direccion: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  required
                  placeholder="ej. contacto@empresa.com"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Teléfono / Celular *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="ej. 0991234567"
                  value={registerForm.celular}
                  onChange={(e) => setRegisterForm({ ...registerForm, celular: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Crear Contraseña *
              </label>
              <div className="relative">
                <input
                  type={showRegPass ? "text" : "password"}
                  required
                  placeholder="Crea una contraseña segura"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-blue-600 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPass(!showRegPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showRegPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/35 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-50 mt-2"
            >
              {isSubmitting ? "Registrando Empresa..." : "Crear Cuenta & Recibir Saldo Gratis"}
            </button>

            <div className="text-center pt-1">
              <p className="text-xs text-slate-500">
                ¿Ya tienes cuenta creada?{" "}
                <button
                  type="button"
                  onClick={() => setActiveTab("login")}
                  className="text-blue-600 font-bold hover:underline cursor-pointer"
                >
                  Inicia sesión aquí
                </button>
              </p>
            </div>
          </form>
        )}

        {/* 3. FORMULARIO DE ACCESO DE SUPERVISOR */}
        {activeTab === "admin" && (
          <form onSubmit={handleAdminLogin} className="space-y-5">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center space-x-3 text-xs text-slate-600">
              <ShieldCheck className="h-5 w-5 text-indigo-600 shrink-0" />
              <span>
                Panel de control global, gestión de planes, aprobación de depósitos bancarios y configuración de marca.
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Contraseña Maestra de Supervisor
              </label>
              <div className="relative">
                <input
                  type={showAdminPass ? "text" : "password"}
                  required
                  placeholder="Ingrese contraseña de administrador"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-indigo-600 transition-colors pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPass(!showAdminPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showAdminPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-600/25 hover:shadow-xl hover:shadow-indigo-600/35 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "Verificando..." : "Ingresar como Supervisor"}
            </button>
          </form>
        )}

      </div>

      {/* Footer discreto */}
      <div className="text-center mt-8 text-xs text-slate-400">
        <p>© {new Date().getFullYear()} {brandName} • Sistema de Facturación Electrónica Ecuatoriana SRI</p>
      </div>

    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-400">Cargando acceso a {`Lojafac`}...</div>}>
      <AuthForm />
    </Suspense>
  );
}
