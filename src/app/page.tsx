"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Users,
  Settings,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Mail,
  Download,
  Trash2,
  Plus,
  Minus,
  Search,
  ShoppingCart,
  Barcode,
  Sparkles,
  Play,
  Lock,
  LogOut,
  HelpCircle,
  Upload,
  ImageIcon,
  MessageSquare,
  Building,
  User,
  CreditCard,
  Wallet,
  Bell,
  Menu,
  X,
  Check,
  Eye,
  EyeOff,
  ShieldCheck,
  Tag,
  Receipt,
  QrCode
} from "lucide-react";

// --- INTERFACES ---
interface Issuer {
  id: number;
  ruc: string;
  nombres: string;
  apellidos: string;
  nombreEmpresa: string;
  razonSocial: string;
  direccion: string;
  email: string;
  celular: string;
  establecimiento: string;
  puntoEmision: string;
  obligadoContabilidad: boolean;
  regimen: string;
  ambiente: number;
  firmaElectronica: string | null;
  codigoSri: string | null;
  startSecuencial: string;
  logo: string | null;
  
  // Campos SaaS
  status: string;
  planType: string; // MONTHLY, PAY_PER_INVOICE
  monthlyFee: number;
  balance: number;
  subscriptionEnds: string;
}

interface Client {
  id: number;
  nombres: string;
  tipoIdentificacion: string;
  identificacion: string;
  direccion: string;
  mail: string;
  celular: string;
  telefono?: string;
}

interface Product {
  id: number;
  nombre: string;
  codigoPrincipal: string;
  descripcion: string | null;
  precio: number;
  iva: number;
  imagen?: string | null;
}

interface Invoice {
  id: number;
  secuencial: string;
  claveAcceso: string | null;
  estado: string;
  fechaEmision: string;
  total: number;
  subtotal0: number;
  subtotalIva: number;
  valorIva: number;
  formaPago: string;
  client: Client;
  items: Array<{
    id: number;
    cantidad: number;
    precioUnitario: number;
    descuento: number;
    total: number;
    product: Product;
  }>;
}

type Tab = "dashboard" | "pos" | "billing" | "history" | "clients" | "products" | "settings" | "guia" | "admin" | "admin_approvals" | "admin_companies" | "admin_branding" | "admin_email_test";

export default function Home() {
  // --- ESTADOS DE SESIÓN Y SAAS ---
  const [activeIssuerId, setActiveIssuerId] = useState<string | null>(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  
  const [systemConfig, setSystemConfig] = useState<{
    id: number;
    adminWhatsapp: string;
    bankAccounts: string;
    defaultBalance: number;
    systemName?: string;
    systemLogo?: string | null;
    systemFavicon?: string | null;
    loginTitle?: string;
    loginSubtitle?: string;
    metaDescription?: string | null;
    metaKeywords?: string | null;
    pricePerInvoice?: number;
    monthlyPlanFee?: number;
  } | null>(null);

  // --- ESTADOS DE CARGA Y DATOS ---
  const [issuer, setIssuer] = useState<Issuer | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  
  const [companies, setCompanies] = useState<Issuer[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  const [loadingIssuer, setLoadingIssuer] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [activeAuthTab, setActiveAuthTab] = useState<"login" | "register" | "admin">("login");
  
  // --- ESTADOS PARA CONTRASEÑAS VISIBLES ---
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showAdminLoginPassword, setShowAdminLoginPassword] = useState(false);
  const [showSignaturePassword, setShowSignaturePassword] = useState(false);
  const [showNewAdminPassword, setShowNewAdminPassword] = useState(false);

  // --- ESTADOS PARA BÚSQUEDA Y NOTIFICACIONES PREMIUM ---
  const [showNotifications, setShowNotifications] = useState(false);
  const [customNotifications, setCustomNotifications] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [signatureStatus, setSignatureStatus] = useState<{
    checked: boolean;
    valid: boolean;
    message: string;
    loading: boolean;
  }>({
    checked: false,
    valid: false,
    message: "",
    loading: false,
  });

  // --- ESTADOS PARA GESTIÓN DE MEMBRESÍA Y BILLETERA ---
  const [showMembershipModal, setShowMembershipModal] = useState(false);
  const [membershipRequests, setMembershipRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [topupAmount, setTopupAmount] = useState("5.00");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentBank, setPaymentBank] = useState("");
  const [selectedRequestType, setSelectedRequestType] = useState<"TOPUP" | "MEMBERSHIP">("TOPUP");

  // --- ESTADOS DE APORTES ADMINISTRATIVOS SAAS ---
  const [adminPaymentRequests, setAdminPaymentRequests] = useState<any[]>([]);
  const [loadingAdminRequests, setLoadingAdminRequests] = useState(false);
  const [statsPeriodFilter, setStatsPeriodFilter] = useState<"HOY" | "ESTE_MES" | "ESTE_ANO" | "TODO">("ESTE_MES");

  const addNotification = (title: string, description: string, type: "success" | "warning" | "info") => {
    const newNotif = {
      id: `notif-${Date.now()}`,
      title,
      description,
      type,
      date: "Ahora mismo",
      read: false
    };
    setCustomNotifications(prev => [newNotif, ...prev]);
  };

  // --- FORMULARIOS DE REGISTRO E INICIO DE SESIÓN ---
  const [loginForm, setLoginForm] = useState({ ruc: "", password: "" });
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
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

  // --- PRUEBAS DE CORREO ELECTRONICO ---
  const [testEmailForm, setTestEmailForm] = useState({
    to: "",
    subject: "[Prueba de Sistema] Verificación de Envío de Correo - FácilSRI",
    message: "Hola, este es un correo de prueba enviado desde el Panel de Administración de FácilSRI para verificar la conectividad del servidor SMTP de Gmail."
  });
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string; messageId?: string } | null>(null);

  // --- FILTROS Y PAGINACIÓN DEL HISTORIAL SRI ---
  const [historySearch, setHistorySearch] = useState("");
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [historyEndDate, setHistoryEndDate] = useState("");
  const [historyStatus, setHistoryStatus] = useState("ALL");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPagination, setHistoryPagination] = useState({
    total: 0,
    page: 1,
    limit: 30,
    totalPages: 1,
  });

  // --- ESTADOS DEL MODAL DE ANULACIÓN / NOTAS DE CRÉDITO ---
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelModalInvoice, setCancelModalInvoice] = useState<any | null>(null);
  const [cancelTab, setCancelTab] = useState<"SYSTEM" | "SRI" | "NC">("SRI");
  const [cancelMotivo, setCancelMotivo] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const handleCopyText = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopyFeedback(`¡${label} copiado al portapapeles!`);
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  const handleExecuteCancel = async (actionType: "cancel_system" | "cancel_sri" | "issue_credit_note") => {
    if (!cancelModalInvoice) return;
    if (actionType !== "cancel_sri" && !cancelMotivo.trim()) {
      alert("Por favor ingrese el motivo de la anulación o Nota de Crédito.");
      return;
    }

    if (actionType === "cancel_system" && !window.confirm("¿Está seguro de anular esta factura ÚNICAMENTE en el sistema local?")) return;
    if (actionType === "cancel_sri" && !window.confirm("¿Confirma que ya ha registrado la solicitud de anulación en el portal web del SRI?")) return;
    if (actionType === "issue_credit_note" && !window.confirm("¿Está seguro de emitir la Nota de Crédito Electrónica (Comprobante 04) ante el SRI?")) return;

    try {
      setCancelLoading(true);
      const result = await safeFetch("/api/invoices/cancel", {
        method: "POST",
        body: JSON.stringify({
          invoiceId: cancelModalInvoice.id,
          action: actionType,
          motivo: cancelMotivo,
        }),
      });

      if (result.ok) {
        alert(result.data.message || "Procesado con éxito.");
        setShowCancelModal(false);
        setCancelModalInvoice(null);
        setCancelMotivo("");
        fetchInvoices();
      } else {
        alert(result.error || "Fallo al procesar la acción.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setCancelLoading(false);
    }
  };

  // --- ESTADOS DEL PANEL ADMIN (MARCA, PARÁMETROS, PLANES Y BANCOS) ---
  const [adminSubTab, setAdminSubTab] = useState<"BRANDING" | "GLOBAL" | "PLANS">("BRANDING");
  
  const [brandForm, setBrandForm] = useState({
    systemName: "FácilSRI",
    systemLogo: "",
    systemFavicon: "",
    loginTitle: "FácilSRI",
    loginSubtitle: "Sistema de Facturación Electrónica Ecuatoriana. Emite facturas, retenciones y guías autorizadas por el SRI al instante.",
    metaDescription: "Sistema de Facturación Electrónica en Ecuador para personas naturales y empresas autorizadas por el SRI.",
    metaKeywords: "facturacion sri, ecuador, facturas electronicas, comprobantes sri, retenciones, guias de remision",
  });

  const [globalParamsForm, setGlobalParamsForm] = useState({
    adminWhatsapp: "593999999999",
    defaultBalance: "5.00",
    adminCurrentPassword: "",
    adminNewPassword: "",
    adminConfirmNewPassword: "",
  });

  const [plansTariffForm, setPlansTariffForm] = useState({
    pricePerInvoice: "0.10",
    monthlyPlanFee: "15.00",
  });

  const [bankAccountsList, setBankAccountsList] = useState<any[]>([]);
  const [loadingBankAccounts, setLoadingBankAccounts] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankForm, setBankForm] = useState({
    id: "",
    banco: "",
    tipoCuenta: "Ahorros",
    numeroCuenta: "",
    titular: "",
    identificacionTitular: "",
    qrCode: "",
    activo: true,
  });
  const [previewQrModal, setPreviewQrModal] = useState<{ isOpen: boolean; banco: string; qrCode: string; titular: string; numeroCuenta: string; tipoCuenta: string } | null>(null);

  const fetchBankAccounts = async (all = true) => {
    try {
      setLoadingBankAccounts(true);
      const result = await safeFetch(`/api/bank-accounts?all=${all}`);
      if (result.ok) {
        setBankAccountsList(result.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBankAccounts(false);
    }
  };

  const handleSaveBankForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankForm.banco || !bankForm.numeroCuenta || !bankForm.titular) {
      alert("Por favor complete Banco, Número de Cuenta y Titular.");
      return;
    }
    try {
      const result = await safeFetch("/api/bank-accounts", {
        method: "POST",
        body: JSON.stringify(bankForm),
      });
      if (result.ok) {
        alert(result.data.message || "Cuenta bancaria guardada con éxito.");
        setShowBankModal(false);
        fetchBankAccounts(true);
      } else {
        alert(result.error || "Fallo al guardar la cuenta bancaria.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleDeleteBankAccount = async (id: number) => {
    if (!window.confirm("¿Está seguro de eliminar esta cuenta bancaria?")) return;
    try {
      const result = await safeFetch(`/api/bank-accounts?id=${id}`, { method: "DELETE" });
      if (result.ok) {
        fetchBankAccounts(true);
      } else {
        alert(result.error || "Fallo al eliminar.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleSystemFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("El ícono/favicon debe pesar menos de 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setBrandForm((prev) => ({ ...prev, systemFavicon: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBankQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("La imagen del código QR debe pesar menos de 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setBankForm((prev) => ({ ...prev, qrCode: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await safeFetch("/api/system-config", {
        method: "POST",
        body: JSON.stringify({
          adminPassword: adminPasswordInput || "1104759574.1998",
          ...brandForm,
        }),
      });
      if (result.ok) {
        alert("¡Configuración de Marca & SEO guardada con éxito!");
        fetchSystemConfig();
      } else {
        alert(result.error || "Fallo al guardar la configuración de marca.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleSaveGlobalParams = async (e: React.FormEvent) => {
    e.preventDefault();
    if (globalParamsForm.adminNewPassword && globalParamsForm.adminNewPassword !== globalParamsForm.adminConfirmNewPassword) {
      alert("La nueva contraseña y su confirmación no coinciden.");
      return;
    }

    try {
      const result = await safeFetch("/api/system-config", {
        method: "POST",
        body: JSON.stringify({
          adminPassword: adminPasswordInput || "1104759574.1998",
          adminWhatsapp: globalParamsForm.adminWhatsapp,
          defaultBalance: globalParamsForm.defaultBalance,
          newAdminPassword: globalParamsForm.adminNewPassword || undefined,
        }),
      });
      if (result.ok) {
        alert("¡Parámetros globales y contraseña de administración guardados con éxito!");
        setGlobalParamsForm((prev) => ({ ...prev, adminNewPassword: "", adminConfirmNewPassword: "" }));
        fetchSystemConfig();
      } else {
        alert(result.error || "Fallo al guardar parámetros globales.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleSavePlansTariff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await safeFetch("/api/system-config", {
        method: "POST",
        body: JSON.stringify({
          adminPassword: adminPasswordInput || "1104759574.1998",
          pricePerInvoice: plansTariffForm.pricePerInvoice,
          monthlyPlanFee: plansTariffForm.monthlyPlanFee,
        }),
      });
      if (result.ok) {
        alert("¡Configuración de Tarifas y Planes SaaS guardada con éxito!");
        fetchSystemConfig();
      } else {
        alert(result.error || "Fallo al guardar la configuración de planes.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailForm.to || !testEmailForm.to.trim()) {
      alert("Por favor ingrese un correo electrónico de destino para la prueba.");
      return;
    }
    setSendingTestEmail(true);
    setTestEmailResult(null);

    const res = await safeFetch("/api/admin/test-email", {
      method: "POST",
      body: JSON.stringify(testEmailForm),
    });

    setSendingTestEmail(false);
    if (res.ok && res.data.success) {
      setTestEmailResult({
        success: true,
        message: res.data.message,
        messageId: res.data.messageId,
      });
    } else {
      setTestEmailResult({
        success: false,
        message: res.error || res.data?.error || "Fallo en el despacho del correo de prueba.",
      });
    }
  };

  // --- PROVEEDOR SEGURO DE FETCH (EVITA SYNTAXERROR JSON) ---
  const safeFetch = async (url: string, options?: RequestInit) => {
    try {
      const headers = new Headers(options?.headers || {});
      const activeId = localStorage.getItem("activeIssuerId");
      if (activeId) {
        headers.set("x-issuer-id", activeId);
      }

      const res = await fetch(url, {
        ...options,
        headers,
      });

      if (!res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errData = await res.json();
          return { ok: false, error: errData.error || `Error ${res.status}`, status: res.status };
        }
        return { ok: false, error: `Error del servidor (${res.status})`, status: res.status };
      }

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        return { ok: false, error: "Respuesta no válida del servidor (HTML recibido).", status: 200 };
      }

      const data = await res.json();
      return { ok: true, data };
    } catch (err: any) {
      console.error("safeFetch error:", err);
      return { ok: false, error: "Error de red: No se pudo conectar con el servidor." };
    }
  };

  // --- CARGA DE SESIÓN ---
  useEffect(() => {
    const cachedId = localStorage.getItem("activeIssuerId");
    const cachedAdmin = localStorage.getItem("isAdminLoggedIn") === "true";
    
    if (cachedId) {
      setActiveIssuerId(cachedId);
    }
    if (cachedAdmin) {
      setIsAdminLoggedIn(true);
      setActiveTab("admin_approvals");
    }
    setSessionChecked(true);
    
    // Obtener la configuración general global de depósitos y WhatsApp
    fetchSystemConfig();
  }, []);

  useEffect(() => {
    if (sessionChecked) {
      if (activeIssuerId) {
        fetchIssuer();
        fetchClients();
        fetchProducts();
        fetchInvoices();
        fetchMembershipRequests();
      } else if (isAdminLoggedIn) {
        fetchCompanies();
        fetchAdminPaymentRequests();
      }
    }
  }, [activeIssuerId, isAdminLoggedIn, sessionChecked]);

  // --- SINCRONIZADOR DE NOTIFICACIONES Y ALERTAS DE SUSCRIPCIÓN ---
  useEffect(() => {
    const list: any[] = [];
    if (issuer && issuer.subscriptionEnds) {
      const ends = new Date(issuer.subscriptionEnds);
      const now = new Date();
      const diffTime = ends.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 15 && diffDays > 0) {
        list.push({
          id: "sub-warning",
          title: "Suscripción por Vencer",
          description: `⚠️ Tu suscripción de FácilSRI vence en ${diffDays} días (el ${String(ends.getDate()).padStart(2, "0")}/${String(ends.getMonth()+1).padStart(2, "0")}/${ends.getFullYear()}). Recuerda regularizar tu cuenta a tiempo para evitar bloqueos del SRI.`,
          type: "warning",
          date: "Sistema",
          read: false
        });
      } else if (diffDays <= 0) {
        list.push({
          id: "sub-expired",
          title: "Suscripción Vencida",
          description: `⚠️ Tu suscripción mensual de FácilSRI ha vencido. Regulariza tu cuenta poniéndote en contacto con tu proveedor para reactivar la emisión de facturas.`,
          type: "warning",
          date: "Sistema",
          read: false
        });
      }
    }
    
    // Alerta de primer uso
    if (issuer) {
      list.push({
        id: "welcome-sr",
        title: "¡Bienvenido a FácilSRI!",
        description: `🎉 Has configurado exitosamente el emisor tributario para ${issuer.nombreEmpresa}. Ya puedes emitir comprobantes autorizados de prueba o producción.`,
        type: "success",
        date: "Sistema",
        read: true
      });
    }

    setNotifications([...list, ...customNotifications]);
  }, [issuer, customNotifications]);

  const fetchSystemConfig = async () => {
    const result = await safeFetch("/api/system-config");
    if (result.ok) {
      setSystemConfig(result.data);
      if (result.data) {
        setBrandForm({
          systemName: result.data.systemName || "FácilSRI",
          systemLogo: result.data.systemLogo || "",
          systemFavicon: result.data.systemFavicon || "",
          loginTitle: result.data.loginTitle || "FácilSRI",
          loginSubtitle: result.data.loginSubtitle || "Sistema de Facturación Electrónica Ecuatoriana. Emite facturas, retenciones y guías autorizadas por el SRI al instante.",
          metaDescription: result.data.metaDescription || "Sistema de Facturación Electrónica en Ecuador para personas naturales y empresas autorizadas por el SRI.",
          metaKeywords: result.data.metaKeywords || "facturacion sri, ecuador, facturas electronicas, comprobantes sri, retenciones, guias de remision",
        });
        setGlobalParamsForm((prev) => ({
          ...prev,
          adminWhatsapp: result.data.adminWhatsapp || "593999999999",
          defaultBalance: result.data.defaultBalance ? String(result.data.defaultBalance) : "5.00",
        }));
        setPlansTariffForm({
          pricePerInvoice: result.data.pricePerInvoice ? String(result.data.pricePerInvoice) : "0.10",
          monthlyPlanFee: result.data.monthlyPlanFee ? String(result.data.monthlyPlanFee) : "15.00",
        });
      }
    }
    // Cargar también las cuentas bancarias activas/globales
    fetchBankAccounts(true);
  };

  // --- FETCH DE DATOS INDIVIDUALES ---
  const fetchIssuer = async () => {
    try {
      setLoadingIssuer(true);
      const result = await safeFetch("/api/issuer");
      if (result.ok) {
        setIssuer(result.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingIssuer(false);
    }
  };

  const fetchClients = async () => {
    try {
      setLoadingClients(true);
      const result = await safeFetch("/api/clients");
      if (result.ok) {
        setClients(result.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingClients(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const result = await safeFetch("/api/products");
      if (result.ok) {
        setProducts(result.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchInvoices = async (
    page = historyPage,
    search = historySearch,
    startDate = historyStartDate,
    endDate = historyEndDate,
    status = historyStatus
  ) => {
    try {
      setLoadingInvoices(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "30");
      if (search) params.set("search", search);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (status && status !== "ALL") params.set("status", status);

      const result = await safeFetch(`/api/invoices?${params.toString()}`);
      if (result.ok) {
        if (Array.isArray(result.data)) {
          setInvoices(result.data);
          setHistoryPagination({ total: result.data.length, page: 1, limit: 30, totalPages: 1 });
        } else {
          setInvoices(result.data.invoices || []);
          setHistoryPagination({
            total: result.data.total || 0,
            page: result.data.page || 1,
            limit: result.data.limit || 30,
            totalPages: result.data.totalPages || 1,
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleApplyDatePreset = (preset: "MONTH" | "SEMESTER" | "YEAR" | "CLEAR") => {
    const now = new Date();
    let start = "";
    let end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    if (preset === "MONTH") {
      start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    } else if (preset === "SEMESTER") {
      const currentMonth = now.getMonth();
      const startMonth = currentMonth < 6 ? 1 : 7;
      start = `${now.getFullYear()}-${String(startMonth).padStart(2, "0")}-01`;
    } else if (preset === "YEAR") {
      start = `${now.getFullYear()}-01-01`;
    } else if (preset === "CLEAR") {
      start = "";
      end = "";
      setHistorySearch("");
      setHistoryStatus("ALL");
    }

    setHistoryStartDate(start);
    setHistoryEndDate(end);
    setHistoryPage(1);
    fetchInvoices(1, preset === "CLEAR" ? "" : historySearch, start, end, preset === "CLEAR" ? "ALL" : historyStatus);
  };

  const handleExportHistory = (format: "pdf" | "xlsx") => {
    const params = new URLSearchParams();
    params.set("format", format);
    if (historySearch) params.set("search", historySearch);
    if (historyStartDate) params.set("startDate", historyStartDate);
    if (historyEndDate) params.set("endDate", historyEndDate);
    if (historyStatus && historyStatus !== "ALL") params.set("status", historyStatus);

    window.open(`/api/invoices/export?${params.toString()}`, "_blank");
  };

  const fetchCompanies = async () => {
    if (!isAdminLoggedIn) return;
    try {
      setLoadingCompanies(true);
      const adminPass = localStorage.getItem("adminPassword") || "";
      const result = await safeFetch("/api/issuer", {
        method: "POST",
        body: JSON.stringify({ action: "list", adminPassword: adminPass }),
      });
      if (result.ok) {
        setCompanies(result.data.companies || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCompanies(false);
    }
  };

  // --- FETCH DE SOLICITUDES DE PAGO Y MEMBRESÍAS ---
  const fetchMembershipRequests = async () => {
    if (!issuer) return;
    try {
      setLoadingRequests(true);
      const result = await safeFetch("/api/payments");
      if (result.ok) {
        setMembershipRequests(result.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchAdminPaymentRequests = async () => {
    if (!isAdminLoggedIn) return;
    try {
      setLoadingAdminRequests(true);
      const result = await safeFetch("/api/payments", {
        headers: {
          "x-admin-auth": "true",
        },
      });
      if (result.ok) {
        setAdminPaymentRequests(result.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAdminRequests(false);
    }
  };

  const handleRequestPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentReference || !paymentBank) {
      alert("Por favor proporcione el número de referencia y el banco de destino de la transferencia.");
      return;
    }

    const fixedMonthlyFee = systemConfig?.monthlyPlanFee ? String(systemConfig.monthlyPlanFee) : "15.00";
    const amountVal = parseFloat(selectedRequestType === "TOPUP" ? topupAmount : fixedMonthlyFee);
    if (selectedRequestType === "TOPUP" && (isNaN(amountVal) || amountVal < 5.0)) {
      alert("El monto mínimo de recarga es de $5.00.");
      return;
    }

    try {
      const result = await safeFetch("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          action: "request-payment",
          monto: amountVal,
          tipo: selectedRequestType,
          referencia: paymentReference,
          bancoDestino: paymentBank,
        }),
      });

      if (result.ok) {
        alert("¡Solicitud registrada con éxito! El administrador verificará tu transferencia y activará tu recarga/renovación.");
        setPaymentReference("");
        setPaymentBank("");
        fetchMembershipRequests();
        setShowMembershipModal(false);
      } else {
        alert(result.error || "Error al procesar la solicitud.");
      }
    } catch (e: any) {
      alert("Error de conexión: " + e.message);
    }
  };

  const handleApprovePayment = async (requestId: number) => {
    if (!window.confirm("¿Está seguro de aprobar este pago? Se recargará el saldo o activará la membresía del cliente de inmediato.")) return;
    try {
      const result = await safeFetch("/api/payments", {
        method: "POST",
        headers: {
          "x-admin-auth": "true",
        },
        body: JSON.stringify({
          action: "approve-payment",
          requestId,
        }),
      });

      if (result.ok) {
        alert("Solicitud aprobada y saldo/membresía aplicada con éxito.");
        fetchAdminPaymentRequests();
        fetchCompanies(); // Recargar balances de empresas
      } else {
        alert(result.error || "Error al aprobar.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleRejectPayment = async (requestId: number) => {
    if (!window.confirm("¿Está seguro de rechazar este pago?")) return;
    try {
      const result = await safeFetch("/api/payments", {
        method: "POST",
        headers: {
          "x-admin-auth": "true",
        },
        body: JSON.stringify({
          action: "reject-payment",
          requestId,
        }),
      });

      if (result.ok) {
        alert("Solicitud de pago rechazada.");
        fetchAdminPaymentRequests();
      } else {
        alert(result.error || "Error al rechazar.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  // --- ACCIONES DE PLANES Y SIMULADOR INMEDIATO ---
  const handleSwitchPlanType = async () => {
    try {
      const result = await safeFetch("/api/issuer", {
        method: "POST",
        body: JSON.stringify({ action: "switch-plan" }),
      });
      if (result.ok) {
        alert("Modalidad de plan modificada con éxito.");
        fetchIssuer();
      } else {
        alert(result.error || "Error al cambiar de plan.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleSimulateTopup = async () => {
    const val = parseFloat(topupAmount);
    if (isNaN(val) || val < 5.0) {
      alert("El monto mínimo de recarga para simular es de $5.00.");
      return;
    }
    try {
      const result = await safeFetch("/api/issuer", {
        method: "POST",
        body: JSON.stringify({ action: "topup-balance", monto: val }),
      });
      if (result.ok) {
        addNotification(
          "Recarga Simulada",
          `Se ha cargado con éxito un saldo simulado de $${val.toFixed(2)} a tu billetera virtual (Entorno de Pruebas).`,
          "success"
        );
        fetchIssuer();
        alert(`Simulación exitosa: Se agregaron $${val.toFixed(2)} a tu billetera.`);
      } else {
        alert(result.error || "Error al simular.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleSimulateRenew = async () => {
    try {
      const result = await safeFetch("/api/issuer", {
        method: "POST",
        body: JSON.stringify({ action: "renew-subscription" }),
      });
      if (result.ok) {
        addNotification(
          "Renovación Simulada",
          `Membresía mensual renovada con éxito por 30 días adicionales (Entorno de Pruebas).`,
          "success"
        );
        fetchIssuer();
        alert("Simulación exitosa: Tu membresía mensual se renovó por 30 días.");
      } else {
        alert(result.error || "Error al simular.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.ruc || !loginForm.password) {
      alert("Por favor ingrese su RUC o Correo Electrónico y su contraseña.");
      return;
    }

    const result = await safeFetch("/api/issuer", {
      method: "POST",
      body: JSON.stringify({
        action: "login",
        identifier: loginForm.ruc,
        ruc: loginForm.ruc,
        password: loginForm.password,
      }),
    });

    if (result.ok && result.data.success) {
      const targetId = String(result.data.issuer.id);
      localStorage.setItem("activeIssuerId", targetId);
      setActiveIssuerId(targetId);
      setIsAdminLoggedIn(false);
      setActiveTab("dashboard");
    } else {
      alert(result.error || "RUC / Correo Electrónico o contraseña incorrectos.");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const f = registerForm;
    if (!f.ruc || !f.nombres || !f.apellidos || !f.nombreEmpresa || !f.razonSocial || !f.direccion || !f.email || !f.password) {
      alert("Por favor rellene todos los campos del registro.");
      return;
    }

    if (f.ruc.length !== 13) {
      alert("El RUC debe tener exactamente 13 dígitos.");
      return;
    }

    const result = await safeFetch("/api/issuer", {
      method: "POST",
      body: JSON.stringify({
        action: "register",
        ...f,
      }),
    });

    if (result.ok && result.data.success) {
      alert("Empresa registrada con éxito. ¡Bienvenido!");
      const targetId = String(result.data.issuer.id);
      localStorage.setItem("activeIssuerId", targetId);
      setActiveIssuerId(targetId);
      setIsAdminLoggedIn(false);
      setActiveTab("dashboard");
    } else {
      alert(result.error || "Error al registrar la empresa.");
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPasswordInput) {
      alert("Ingrese la contraseña de administración.");
      return;
    }

    const result = await safeFetch("/api/issuer", {
      method: "POST",
      body: JSON.stringify({
        action: "admin-login",
        adminPassword: adminPasswordInput,
      }),
    });

    if (result.ok && result.data.success) {
      localStorage.setItem("isAdminLoggedIn", "true");
      localStorage.setItem("adminPassword", adminPasswordInput);
      setIsAdminLoggedIn(true);
      setActiveIssuerId(null);
      setActiveTab("admin_approvals");
    } else {
      alert(result.error || "Contraseña de administrador incorrecta.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("activeIssuerId");
    localStorage.removeItem("isAdminLoggedIn");
    localStorage.removeItem("adminPassword");
    setActiveIssuerId(null);
    setIsAdminLoggedIn(false);
    setIssuer(null);
    setInvoices([]);
    setActiveTab("dashboard");
  };

  // --- OPERACIONES DE ADMIN SUPERVISOR SAAS ---
  const [editingCompany, setEditingCompany] = useState<Issuer | null>(null);
  const [balanceChangeVal, setBalanceChangeVal] = useState("0");
  const [adminConfigForm, setAdminConfigForm] = useState({
    adminWhatsapp: "",
    bankAccounts: "",
    defaultBalance: "5.0",
    newAdminPassword: "",
    systemName: "FácilSRI",
    systemLogo: "",
    loginTitle: "FácilSRI",
    loginSubtitle: "",
  });

  useEffect(() => {
    if (systemConfig) {
      setAdminConfigForm({
        adminWhatsapp: systemConfig.adminWhatsapp,
        bankAccounts: systemConfig.bankAccounts,
        defaultBalance: String(systemConfig.defaultBalance),
        newAdminPassword: "",
        systemName: systemConfig.systemName || "FácilSRI",
        systemLogo: systemConfig.systemLogo || "",
        loginTitle: systemConfig.loginTitle || "FácilSRI",
        loginSubtitle: systemConfig.loginSubtitle || "",
      });
    }
  }, [systemConfig]);

  const handleSystemLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      alert("La imagen es demasiado grande. El límite recomendado es de 800KB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAdminConfigForm(prev => ({
        ...prev,
        systemLogo: reader.result as string,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAdminConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const adminPass = localStorage.getItem("adminPassword") || "";
    
    const result = await safeFetch("/api/system-config", {
      method: "POST",
      body: JSON.stringify({
        adminPassword: adminPass,
        adminWhatsapp: adminConfigForm.adminWhatsapp,
        bankAccounts: adminConfigForm.bankAccounts,
        defaultBalance: parseFloat(adminConfigForm.defaultBalance),
        newAdminPassword: adminConfigForm.newAdminPassword || undefined,
        systemName: adminConfigForm.systemName,
        systemLogo: adminConfigForm.systemLogo || null,
        loginTitle: adminConfigForm.loginTitle,
        loginSubtitle: adminConfigForm.loginSubtitle,
      }),
    });

    if (result.ok && result.data.success) {
      alert("Configuración del sistema guardada exitosamente.");
      if (adminConfigForm.newAdminPassword) {
        localStorage.setItem("adminPassword", adminConfigForm.newAdminPassword);
      }
      fetchSystemConfig();
    } else {
      alert(result.error || "No se pudo guardar la configuración.");
    }
  };

  const handleUpdateCompanyMembership = async (targetId: number, fields: any) => {
    const adminPass = localStorage.getItem("adminPassword") || "";
    
    const result = await safeFetch("/api/issuer", {
      method: "POST",
      body: JSON.stringify({
        action: "update-status",
        adminPassword: adminPass,
        targetIssuerId: targetId,
        ...fields,
      }),
    });

    if (result.ok && result.data.success) {
      fetchCompanies();
      if (editingCompany && editingCompany.id === targetId) {
        setEditingCompany(result.data.company);
      }
    } else {
      alert(result.error || "Error al actualizar membresía.");
    }
  };

  const handleWalletRecharge = async (targetId: number) => {
    const val = parseFloat(balanceChangeVal);
    if (isNaN(val) || val === 0) {
      alert("Ingrese un valor de recarga válido diferente de cero.");
      return;
    }

    await handleUpdateCompanyMembership(targetId, { balanceChange: val });
    setBalanceChangeVal("0");
    alert("Saldo de la billetera actualizado correctamente.");
  };

  // --- CARGA DE LOGOTIPO COMERCIAL EN BASE64 NORMALIZADO ---
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("La imagen es demasiado grande. Por favor seleccione una imagen de máximo 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxW = 500;
        const maxH = 250;
        let width = img.width;
        let height = img.height;

        if (width > maxW || height > maxH) {
          const ratio = Math.min(maxW / width, maxH / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const normalizedPng = canvas.toDataURL("image/png");
          if (issuer) {
            setIssuer({
              ...issuer,
              logo: normalizedPng,
            });
          }
        }
      };
      img.onerror = () => {
        alert("El archivo seleccionado no es una imagen válida.");
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // --- DETERMINAR ESTADO DE SUSPENSIÓN ---
  const isSuspended = issuer && (
    issuer.status === "SUSPENDED" ||
    (issuer.planType === "MONTHLY" && new Date(issuer.subscriptionEnds) < new Date()) ||
    (issuer.planType === "PAY_PER_INVOICE" && issuer.balance < 0.20)
  );

  const getSuspensionReason = () => {
    if (!issuer) return "";
    if (issuer.status === "SUSPENDED") {
      return "Su cuenta se encuentra inhabilitada administrativamente por el supervisor.";
    }
    if (issuer.planType === "MONTHLY") {
      const d = new Date(issuer.subscriptionEnds);
      return `Su suscripción mensual de $${issuer.monthlyFee.toFixed(2)} expiró el ${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}. Por favor realice el pago para re-activarla.`;
    }
    if (issuer.planType === "PAY_PER_INVOICE") {
      return `Su billetera recargable tiene saldo insuficiente ($${issuer.balance.toFixed(2)} de saldo actual, mínimo requerido $0.20 por factura). Cargue saldo para seguir facturando.`;
    }
    return "";
  };

  // --- VARIABLES DE BÚSQUEDA ---
  const [adminSearch, setAdminSearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");

  // --- LÓGICA DE AGREGAR ITEM LIBRE O DINÁMICO EN FACTURACIÓN ---
  const addFreeItemToInvoice = () => {
    const randomTempId = "temp-" + Date.now();
    setInvoiceForm({
      ...invoiceForm,
      items: [
        ...invoiceForm.items,
        {
          productId: randomTempId,
          cantidad: "1",
          descuento: "0",
          // Campos dinámicos
          isDynamic: true,
          nombre: "",
          precio: "0.00",
          iva: "12",
        }
      ]
    });
  };

  // --- MODAL DE PRODUCTO RÁPIDO EN POS ---
  const [showPOSFreeProductModal, setShowPOSFreeProductModal] = useState(false);
  const [posFreeProduct, setPOSFreeProduct] = useState({
    nombre: "",
    precio: "",
    iva: "12",
    saveToCatalog: false,
    imagen: "",
  });

  const handleAddPOSFreeProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const { nombre, precio, iva, saveToCatalog, imagen } = posFreeProduct;
    if (!nombre || !precio) {
      alert("Por favor rellene el nombre y precio del producto rápido.");
      return;
    }

    const priceVal = parseFloat(precio);
    if (isNaN(priceVal) || priceVal < 0) {
      alert("Precio no válido.");
      return;
    }

    if (saveToCatalog) {
      // Guardar permanentemente en base de datos
      const result = await safeFetch("/api/products", {
        method: "POST",
        body: JSON.stringify({
          nombre: nombre.toUpperCase(),
          codigoPrincipal: "GEN-" + Date.now(),
          precio: priceVal,
          iva: parseFloat(iva),
          descripcion: "Creado desde POS rápido libre",
          imagen: imagen || null,
        }),
      });

      if (result.ok) {
        const newProd = result.data.product;
        // Recargar productos en el frontend
        fetchProducts();
        // Agregar al carrito POS
        addToPOSCart(newProd);
      } else {
        alert("Fallo al guardar producto en catálogo: " + result.error);
      }
    } else {
      // Insertar dinámicamente solo en este checkout activo
      const dynamicProd: Product = {
        id: ("temp-" + Date.now()) as any,
        nombre: nombre.toUpperCase(),
        codigoPrincipal: "TEMP-" + Math.floor(Math.random() * 1000),
        precio: priceVal,
        iva: parseFloat(iva),
        descripcion: "Ítem dinámico",
        imagen: imagen || null,
      };

      // Simular agregar con flag especial
      const existing = posCart.find((item) => item.product.nombre === dynamicProd.nombre);
      if (existing) {
        setPOSCart(
          posCart.map((item) =>
            item.product.nombre === dynamicProd.nombre
              ? { ...item, cantidad: item.cantidad + 1 }
              : item
          )
        );
      } else {
        setPOSCart([...posCart, { product: dynamicProd, cantidad: 1, isDynamic: true }]);
      }
    }

    // Resetear formulario
    setPOSFreeProduct({ nombre: "", precio: "", iva: "12", saveToCatalog: false, imagen: "" });
    setShowPOSFreeProductModal(false);
  };

  // --- VERIFICACIÓN DE CONTRASEÑA DE FIRMA DIGITAL (.P12) ---
  const handleVerifySignature = async () => {
    if (!issuer) return;
    setSignatureStatus({ checked: false, valid: false, message: "", loading: true });
    try {
      const result = await safeFetch("/api/issuer/verify-signature", {
        method: "POST",
        body: JSON.stringify({
          firmaElectronica: issuer.firmaElectronica,
          codigoSri: issuer.codigoSri,
        }),
      });

      if (result.ok && result.data.valid) {
        setSignatureStatus({
          checked: true,
          valid: true,
          message: result.data.message || "✓ Contraseña de la firma electrónica correcta y certificado válido.",
          loading: false,
        });
      } else {
        setSignatureStatus({
          checked: true,
          valid: false,
          message: result.data?.error || "Revisa la contraseña de la firma. La contraseña ingresada no es válida.",
          loading: false,
        });
      }
    } catch (e: any) {
      console.error(e);
      setSignatureStatus({
        checked: true,
        valid: false,
        message: "Revisa la contraseña de la firma. Fallo de conexión.",
        loading: false,
      });
    }
  };

  // --- CONFIGURACIÓN DE EMISOR ORIGINAL ---
  const handleSaveIssuer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issuer) return;

    // Asegurar que el secuencial de inicio tenga 9 dígitos con ceros a la izquierda por defecto
    const parsedSec = parseInt(issuer.startSecuencial || "1", 10);
    const cleanSecuencial = isNaN(parsedSec) ? "000000001" : String(parsedSec).padStart(9, "0");
    const updatedIssuer = { ...issuer, startSecuencial: cleanSecuencial };

    setLoadingIssuer(true);
    const result = await safeFetch("/api/issuer", {
      method: "POST",
      body: JSON.stringify(updatedIssuer),
    });

    if (result.ok) {
      alert("Configuración de emisor y firma digital actualizada con éxito.");
      fetchIssuer();
    } else {
      alert(result.error || "Error al guardar el emisor.");
    }
    setLoadingIssuer(false);
  };

  // --- CLIENTES ORIGINALES ---
  const [clientForm, setClientForm] = useState({
    id: "",
    nombres: "",
    tipoIdentificacion: "05", // 05 = Cédula por defecto
    identificacion: "",
    direccion: "",
    mail: "",
    celular: "",
  });
  const [showClientModal, setShowClientModal] = useState(false);

  const handleLookupClient = async () => {
    const ident = clientForm.identificacion.trim();
    if (!ident) {
      alert("Por favor ingrese un número de cédula o RUC para consultar.");
      return;
    }

    setLookingUpClient(true);
    const result = await safeFetch(`/api/clients/lookup?identificacion=${ident}`);
    setLookingUpClient(false);

    if (result.ok) {
      const data = result.data;
      if (data.isValid) {
        if (data.client && !data.isNew) {
          setClientForm({
            ...clientForm,
            nombres: data.client.nombres,
            tipoIdentificacion: data.client.tipoIdentificacion,
            direccion: data.client.direccion,
            mail: data.client.mail || "",
            celular: data.client.celular || "",
          });
          alert("✓ Cliente registrado encontrado. Datos autocompletados desde la base de datos.");
        } else if (data.isNew) {
          setClientForm({
            ...clientForm,
            nombres: "",
            tipoIdentificacion: data.tipoIdentificacion || (ident.length === 13 ? "04" : "05"),
            direccion: "",
            mail: "",
            celular: "",
          });
          alert("Documento válido en Ecuador. Cliente no registrado previamente, por favor ingrese sus datos.");
        }
      } else {
        alert(data.error || "No se pudieron obtener los datos de la cédula/RUC.");
      }
    } else {
      alert(result.error || "Error de red al consultar el documento.");
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const f = clientForm;
    if (!f.nombres || !f.identificacion || !f.direccion || !f.mail) {
      alert("Por favor rellene los campos obligatorios.");
      return;
    }

    const result = await safeFetch("/api/clients", {
      method: "POST",
      body: JSON.stringify(f),
    });

    if (result.ok) {
      fetchClients();
      setShowClientModal(false);
      setClientForm({ id: "", nombres: "", tipoIdentificacion: "05", identificacion: "", direccion: "", mail: "", celular: "" });
    } else {
      alert(result.error || "No se pudo guardar el cliente.");
    }
  };

  const handleDeleteClient = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar este cliente?")) return;
    const result = await safeFetch(`/api/clients?id=${id}`, { method: "DELETE" });
    if (result.ok) {
      fetchClients();
    } else {
      alert(result.error);
    }
  };

  // --- PRODUCTOS ORIGINALES ---
  const [productForm, setProductForm] = useState({
    id: "",
    nombre: "",
    codigoPrincipal: "",
    descripcion: "",
    precio: "",
    iva: "12.0",
    imagen: "",
  });
  const [showProductModal, setShowProductModal] = useState(false);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const f = productForm;
    if (!f.nombre || !f.codigoPrincipal || !f.precio) {
      alert("Por favor rellene todos los campos.");
      return;
    }

    const result = await safeFetch("/api/products", {
      method: "POST",
      body: JSON.stringify({
        ...f,
        precio: parseFloat(f.precio),
        iva: parseFloat(f.iva),
      }),
    });

    if (result.ok) {
      fetchProducts();
      setShowProductModal(false);
      setProductForm({ id: "", nombre: "", codigoPrincipal: "", descripcion: "", precio: "", iva: "12.0", imagen: "" });
    } else {
      alert(result.error || "Fallo al guardar el producto.");
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar este producto?")) return;
    const result = await safeFetch(`/api/products?id=${id}`, { method: "DELETE" });
    if (result.ok) {
      fetchProducts();
    } else {
      alert(result.error);
    }
  };

  // --- NUEVA CONFIGURACIÓN DE FACTURACIÓN INTEGRAL (HIGH FIDELITY) ---
  const [billingClient, setBillingClient] = useState<{
    id: number;
    nombres: string;
    tipoIdentificacion: string;
    identificacion: string;
    direccion: string;
    mail: string;
    celular: string;
    telefono: string;
  }>({
    id: 0,
    nombres: "CONSUMIDOR FINAL",
    tipoIdentificacion: "07",
    identificacion: "9999999999999",
    direccion: "S/N",
    mail: "cliente@email.com",
    celular: "0999999999",
    telefono: "029999999",
  });

  const [activeItem, setActiveItem] = useState<{
    productId: string;
    nombre: string;
    precio: string;
    iva: string;
    cantidad: string;
    descuento: string;
    notaExtra1: string;
    notaExtra2: string;
    isDynamic?: boolean;
  }>({
    productId: "",
    nombre: "",
    precio: "0",
    iva: "15",
    cantidad: "1",
    descuento: "0",
    notaExtra1: "",
    notaExtra2: "",
  });

  const [addedItems, setAddedItems] = useState<Array<{
    productId: string;
    nombre: string;
    precio: string;
    iva: string;
    cantidad: string;
    descuento: string;
    notaExtra1: string;
    notaExtra2: string;
    isDynamic?: boolean;
    codigoPrincipal?: string;
    descripcion?: string;
  }>>([]);

  const [billingPayments, setBillingPayments] = useState<Array<{
    formaPago: string;
    total: string;
  }>>([{ formaPago: "01", total: "0" }]);

  const [billingObservaciones, setBillingObservaciones] = useState("");
  const [showManualProductModal, setShowManualProductModal] = useState(false);
  const [manualProductForm, setManualProductForm] = useState({
    nombre: "",
    descripcion: "",
    cantidad: "1",
    iva: "15",
    precioSinIva: "0",
    precioConIva: "0",
    descuento: "0",
    notaExtra1: "",
    notaExtra2: "",
    imagen: "",
    saveToCatalog: false,
  });

  const [billingCashReceived, setBillingCashReceived] = useState("0");
  const [lookingUpBillingClient, setLookingUpBillingClient] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showExtraNotes, setShowExtraNotes] = useState(false);
  const [showTicketPreviewModal, setShowTicketPreviewModal] = useState(false);

  const calculateChange = () => {
    const cash = parseFloat(billingCashReceived) || 0;
    const totals = calculateNewInvoiceTotals();
    const change = cash - totals.total;
    return change > 0 ? change : 0;
  };

  // --- MANTENER ESTADO ORIGINAL PARA COMPATIBILIDAD CON POS ---
  const [invoiceForm, setInvoiceForm] = useState<{
    clientId: string;
    formaPago: string;
    items: Array<{
      productId: string;
      cantidad: string;
      descuento: string;
      isDynamic?: boolean;
      nombre?: string;
      precio?: string;
      iva?: string;
    }>;
  }>({
    clientId: "",
    formaPago: "01",
    items: [{ productId: "", cantidad: "1", descuento: "0" }],
  });

  const getClientPurchaseHistory = (identificacion: string) => {
    if (!identificacion) return { count: 0, total: 0 };
    const clientInvoices = invoices.filter(
      (inv) => inv.client && inv.client.identificacion === identificacion
    );
    const count = clientInvoices.length;
    const total = clientInvoices.reduce((acc, inv) => acc + (inv.total || 0), 0);
    return { count, total };
  };

  const handleLookupBillingClient = async (ident: string) => {
    if (!ident || ident.trim().length < 10) return;
    setLookingUpBillingClient(true);
    const result = await safeFetch(`/api/clients/lookup?identificacion=${ident.trim()}`);
    setLookingUpBillingClient(false);

    if (result.ok) {
      const data = result.data;
      if (data.isValid) {
        if (data.client && !data.isNew) {
          // Cliente registrado en base de datos: autocompletar con sus datos reales
          setBillingClient(prev => ({
            ...prev,
            nombres: data.client.nombres,
            tipoIdentificacion: data.client.tipoIdentificacion,
            direccion: data.client.direccion,
            mail: data.client.mail || "",
            celular: data.client.celular || "",
            telefono: data.client.telefono || "",
          }));
        } else if (data.isNew) {
          // Cliente NUEVO (no registrado): NO inventar datos. Mantener campos limpios para llenado manual
          setBillingClient(prev => ({
            ...prev,
            nombres: "",
            tipoIdentificacion: data.tipoIdentificacion || (ident.trim().length === 13 ? "04" : "05"),
            direccion: "",
            mail: "",
            celular: "",
            telefono: "",
          }));
        }
      }
    }
  };

  const handleManualProductUnitChange = (valStr: string, ivaVal: string) => {
    const unitPrice = parseFloat(valStr) || 0;
    const ivaPct = parseFloat(ivaVal) || 0;
    const finalPrice = unitPrice * (1 + ivaPct / 100);
    setManualProductForm(prev => ({
      ...prev,
      precioSinIva: valStr,
      precioConIva: finalPrice.toFixed(2)
    }));
  };

  const handleManualProductFinalChange = (valStr: string, ivaVal: string) => {
    const finalPrice = parseFloat(valStr) || 0;
    const ivaPct = parseFloat(ivaVal) || 0;
    const unitPrice = finalPrice / (1 + ivaPct / 100);
    setManualProductForm(prev => ({
      ...prev,
      precioConIva: valStr,
      precioSinIva: unitPrice.toFixed(2)
    }));
  };

  const handleManualProductIvaChange = (newIva: string) => {
    const unitPrice = parseFloat(manualProductForm.precioSinIva) || 0;
    const ivaPct = parseFloat(newIva) || 0;
    const finalPrice = unitPrice * (1 + ivaPct / 100);
    setManualProductForm(prev => ({
      ...prev,
      iva: newIva,
      precioConIva: finalPrice.toFixed(2)
    }));
  };

  const handleAddManualProductToList = () => {
    if (!manualProductForm.nombre.trim()) {
      alert("Por favor ingrese el nombre del producto.");
      return;
    }
    const newItem = {
      productId: "TEMP-" + Math.floor(1000 + Math.random() * 9000),
      isDynamic: true,
      saveToCatalog: manualProductForm.saveToCatalog,
      nombre: manualProductForm.nombre,
      precio: manualProductForm.precioSinIva,
      iva: manualProductForm.iva,
      cantidad: manualProductForm.cantidad,
      descuento: manualProductForm.descuento,
      notaExtra1: manualProductForm.notaExtra1,
      notaExtra2: manualProductForm.notaExtra2,
      descripcion: manualProductForm.descripcion,
      imagen: manualProductForm.imagen || null,
    };
    setAddedItems(prev => [...prev, newItem]);
    setShowManualProductModal(false);
    // Reset manual form
    setManualProductForm({
      nombre: "",
      descripcion: "",
      cantidad: "1",
      iva: "15",
      precioSinIva: "0",
      precioConIva: "0",
      descuento: "0",
      notaExtra1: "",
      notaExtra2: "",
      imagen: "",
      saveToCatalog: false,
    });
  };

  const handleClearBillingForm = () => {
    setBillingClient({
      id: 0,
      nombres: "CONSUMIDOR FINAL",
      tipoIdentificacion: "07",
      identificacion: "9999999999999",
      direccion: "S/N",
      mail: "cliente@email.com",
      celular: "0999999999",
      telefono: "029999999",
    });
    setAddedItems([]);
    setBillingPayments([{ formaPago: "01", total: "0" }]);
    setBillingObservaciones("");
    setBillingCashReceived("0");
    setClientSearch("");
    setProductSearch("");
  };

  const handleSaveBillingDraft = () => {
    const draft = {
      client: billingClient,
      items: addedItems,
      payments: billingPayments,
      observaciones: billingObservaciones
    };
    localStorage.setItem("billing_draft", JSON.stringify(draft));
    alert("Borrador de factura guardado localmente.");
  };

  const handleLoadBillingDraft = () => {
    const draftStr = localStorage.getItem("billing_draft");
    if (!draftStr) {
      alert("No hay ningún borrador guardado.");
      return;
    }
    try {
      const draft = JSON.parse(draftStr);
      if (draft.client) setBillingClient(draft.client);
      if (draft.items) setAddedItems(draft.items);
      if (draft.payments) setBillingPayments(draft.payments);
      if (draft.observaciones !== undefined) setBillingObservaciones(draft.observaciones);
      alert("Borrador cargado con éxito.");
    } catch (e) {
      alert("Error al cargar el borrador.");
    }
  };

  const calculateNewInvoiceTotals = () => {
    let sub0 = 0;
    let subIva = 0;
    let descTotal = 0;
    let valIva = 0;

    addedItems.forEach((item) => {
      const cant = parseFloat(item.cantidad) || 0;
      const desc = parseFloat(item.descuento) || 0;
      const price = parseFloat(item.precio) || 0;
      const ivaPct = parseFloat(item.iva) || 0;

      const itemSubtotal = price * cant;
      const base = itemSubtotal - desc;

      if (ivaPct === 0) {
        sub0 += base;
      } else {
        subIva += base;
        valIva += base * (ivaPct / 100);
      }
      descTotal += desc;
    });

    const tot = sub0 + subIva + valIva;
    return { subtotal0: sub0, subtotalIva: subIva, descuento: descTotal, valorIva: valIva, total: tot };
  };

  const handleNewSubmitInvoice = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!billingClient.nombres || !billingClient.identificacion || !billingClient.direccion) {
      alert("Por favor rellene los datos obligatorios del cliente (Identificación, Razón Social y Dirección).");
      return;
    }

    if (addedItems.length === 0) {
      alert("Por favor añada al menos un producto o servicio.");
      return;
    }

    const totals = calculateNewInvoiceTotals();

    // Auto-completar el pago único si es cero para evitar fricción innecesaria
    let finalPayments = [...billingPayments];
    if (billingPayments.length === 1 && (parseFloat(billingPayments[0].total) === 0 || !billingPayments[0].total)) {
      finalPayments[0] = { ...finalPayments[0], total: totals.total.toFixed(2) };
    }

    const finalPaymentsSum = finalPayments.reduce((acc, p) => acc + (parseFloat(p.total) || 0), 0);
    if (Math.abs(finalPaymentsSum - totals.total) > 0.01) {
      alert(`El valor total especificado en los métodos de pago ($${finalPaymentsSum.toFixed(2)}) no coincide con el total de la factura ($${totals.total.toFixed(2)}). Por favor rectifique el valor antes de continuar.`);
      return;
    }

    setSriStatusModal({ show: true, step: "signing", message: "Firmando digitalmente el comprobante XML (XAdES-BES)..." });

    const updatedPayments = finalPayments;

    const payload = {
      client: {
        nombres: billingClient.nombres,
        tipoIdentificacion: billingClient.tipoIdentificacion,
        identificacion: billingClient.identificacion,
        direccion: billingClient.direccion,
        mail: billingClient.mail,
        celular: billingClient.celular,
        telefono: billingClient.telefono,
      },
      items: addedItems.map(item => ({
        productId: item.productId,
        isDynamic: item.isDynamic,
        nombre: item.nombre,
        precio: item.precio,
        iva: item.iva,
        cantidad: item.cantidad,
        descuento: item.descuento,
        notaExtra1: item.notaExtra1,
        notaExtra2: item.notaExtra2,
        codigoPrincipal: item.codigoPrincipal,
        descripcion: item.descripcion
      })),
      pagos: updatedPayments.map(p => ({
        formaPago: p.formaPago,
        total: p.total
      })),
      observaciones: billingObservaciones,
    };

    const result = await safeFetch("/api/invoices", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!result.ok) {
      setSriStatusModal({
        show: true,
        step: "error",
        message: result.error || "Ocurrió un error inesperado al procesar la factura electrónica.",
        mensajes: result.data?.mensajes || [],
      });
      fetchInvoices();
      return;
    }

    const data = result.data;
    if (data.warning) {
      setSriStatusModal({
        show: true,
        step: "warning",
        message: data.warning,
        claveAcceso: data.claveAcceso,
      });
      addNotification(
        "Emisión con Alerta",
        `Comprobante emitido con advertencias. Clave de acceso: ${data.claveAcceso || "No asignada"}.`,
        "warning"
      );
    } else {
      setSriStatusModal({
        show: true,
        step: "authorized",
        message: "¡Comprobante autorizado por el SRI y RIDE emitido exitosamente!",
        claveAcceso: data.claveAcceso,
        numeroAutorizacion: data.numeroAutorizacion,
      });
      addNotification(
        "Factura Autorizada",
        `La factura No. ${issuer?.establecimiento}-${issuer?.puntoEmision}-${issuer?.startSecuencial} fue firmada y autorizada con éxito por el SRI.`,
        "success"
      );
    }

    // Resetear formulario y recargar datos
    setBillingClient({
      id: 0,
      nombres: "CONSUMIDOR FINAL",
      tipoIdentificacion: "07",
      identificacion: "9999999999999",
      direccion: "S/N",
      mail: "cliente@email.com",
      celular: "0999999999",
      telefono: "029999999",
    });
    setAddedItems([]);
    setBillingPayments([{ formaPago: "01", total: "0" }]);
    setBillingObservaciones("");
    setBillingCashReceived("0");
    setClientSearch("");
    setProductSearch("");
    fetchInvoices();
    fetchIssuer(); // Recargar billetera/saldo
    fetchClients(); // Refrescar catálogo de clientes autocompletables
  };

  const [sriStatusModal, setSriStatusModal] = useState<{
    show: boolean;
    step: "init" | "signing" | "sending" | "authorizing" | "authorized" | "error" | "warning";
    message: string;
    claveAcceso?: string;
    numeroAutorizacion?: string;
    mensajes?: any[];
  }>({ show: false, step: "init", message: "" });

  const calculateInvoiceTotals = () => {
    let sub0 = 0;
    let subIva = 0;
    let descTotal = 0;
    let valIva = 0;
    
    invoiceForm.items.forEach((item) => {
      const cant = parseFloat(item.cantidad) || 0;
      const desc = parseFloat(item.descuento) || 0;
      
      let price = 0;
      let ivaPct = 12.0;

      if (item.isDynamic) {
        price = parseFloat(item.precio || "0");
        ivaPct = parseFloat(item.iva || "12");
      } else {
        const prod = products.find((p) => p.id === parseInt(item.productId, 10));
        if (prod) {
          price = prod.precio;
          ivaPct = prod.iva;
        }
      }

      const itemSubtotal = price * cant;
      const base = itemSubtotal - desc;
      
      if (ivaPct === 0) {
        sub0 += base;
      } else {
        subIva += base;
        valIva += base * (ivaPct / 100);
      }
      descTotal += desc;
    });

    const tot = sub0 + subIva + valIva;
    return { subtotal0: sub0, subtotalIva: subIva, descuento: descTotal, valorIva: valIva, total: tot };
  };

  const handleAddInvoiceItem = () => {
    setInvoiceForm({
      ...invoiceForm,
      items: [...invoiceForm.items, { productId: "", cantidad: "1", descuento: "0" }],
    });
  };

  const handleRemoveInvoiceItem = (index: number) => {
    if (invoiceForm.items.length <= 1) return;
    setInvoiceForm({
      ...invoiceForm,
      items: invoiceForm.items.filter((_, i) => i !== index),
    });
  };

  const handleSubmitInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.clientId) {
      alert("Por favor seleccione un cliente.");
      return;
    }

    const hasEmptyItem = invoiceForm.items.some((item) => !item.productId && !item.isDynamic);
    if (hasEmptyItem) {
      alert("Por favor seleccione un producto para todas las filas o ingrese ítems libres.");
      return;
    }

    setSriStatusModal({ show: true, step: "signing", message: "Firmando digitalmente el comprobante XML (XAdES-BES)..." });

    const result = await safeFetch("/api/invoices", {
      method: "POST",
      body: JSON.stringify(invoiceForm),
    });

    if (!result.ok) {
      setSriStatusModal({
        show: true,
        step: "error",
        message: result.error || "Ocurrió un error inesperado al procesar la factura electrónica.",
        mensajes: result.data?.mensajes || [],
      });
      fetchInvoices();
      return;
    }

    const data = result.data;
    if (data.warning) {
      setSriStatusModal({
        show: true,
        step: "warning",
        message: data.warning,
        claveAcceso: data.claveAcceso,
      });
    } else {
      setSriStatusModal({
        show: true,
        step: "authorized",
        message: "¡Comprobante autorizado por el SRI y RIDE emitido exitosamente!",
        claveAcceso: data.claveAcceso,
        numeroAutorizacion: data.numeroAutorizacion,
      });
    }

    // Limpiar formulario y refrescar datos
    setInvoiceForm({ clientId: "", formaPago: "01", items: [{ productId: "", cantidad: "1", descuento: "0" }] });
    fetchInvoices();
    fetchIssuer(); // Recargar billetera/saldo
  };

  // --- RE-CONSULTAR SRI MANUALMENTE ---
  const [queryingInvoiceId, setQueryingInvoiceId] = useState<number | null>(null);
  
  const handleQuerySri = async (invoiceId: number) => {
    try {
      setQueryingInvoiceId(invoiceId);
      const result = await safeFetch("/api/invoices/query-sri", {
        method: "POST",
        body: JSON.stringify({ invoiceId }),
      });

      if (result.ok) {
        alert(result.data.message || "Estado actualizado con éxito.");
        fetchInvoices();
      } else {
        alert(result.error || "Fallo en la re-consulta.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setQueryingInvoiceId(null);
    }
  };

  // --- RE-ENVIAR CORREO DE FACTURA ---
  const [resendingId, setResendingId] = useState<number | null>(null);

  const handleResendEmail = async (invoiceId: number) => {
    try {
      setResendingId(invoiceId);
      const result = await safeFetch("/api/invoices/resend-email", {
        method: "POST",
        body: JSON.stringify({ invoiceId }),
      });

      if (result.ok) {
        alert("El RIDE (PDF) y XML autorizado han sido re-enviados con éxito al cliente.");
      } else {
        alert(result.error || "No se pudo re-enviar la factura.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setResendingId(null);
    }
  };

  // --- PUNTO DE VENTA (POS) ORIGINAL ---
  const [posCart, setPOSCart] = useState<Array<{ product: Product; cantidad: number; isDynamic?: boolean }>>([]);
  const [posCategory, setPosCategory] = useState<string>("TODOS");
  const [barcodeQuery, setBarcodeQuery] = useState("");
  const [posCashReceived, setPosCashReceived] = useState("");
  const [lookingUpClient, setLookingUpClient] = useState(false);

  const addToPOSCart = (product: Product) => {
    const existing = posCart.find((item) => item.product.id === product.id);
    if (existing) {
      setPOSCart(
        posCart.map((item) =>
          item.product.id === product.id ? { ...item, cantidad: item.cantidad + 1 } : item
        )
      );
    } else {
      setPOSCart([...posCart, { product, cantidad: 1 }]);
    }
  };

  const updateCartQty = (pId: number, change: number) => {
    setPOSCart(
      posCart
        .map((item) => {
          if (item.product.id === pId) {
            const newQty = item.cantidad + change;
            return { ...item, cantidad: newQty };
          }
          return item;
        })
        .filter((item) => item.cantidad > 0)
    );
  };

  const calculatePOSTotals = () => {
    let sub0 = 0;
    let subIva = 0;
    let valIva = 0;
    posCart.forEach((item) => {
      const base = item.product.precio * item.cantidad;
      if (item.product.iva === 0) {
        sub0 += base;
      } else {
        subIva += base;
        valIva += base * (item.product.iva / 100);
      }
    });
    return { subtotal0: sub0, subtotalIva: subIva, valorIva: valIva, total: sub0 + subIva + valIva };
  };

  const handlePOSCheckout = async (quickClientRuc?: string) => {
    let targetClientId: number | null = null;
    
    if (quickClientRuc) {
      // ⚡ Rápido: Consumidor Final o similar
      let clientObj = clients.find((c) => c.identificacion === quickClientRuc);
      if (!clientObj) {
        // Crear consumidor final dinámicamente si no existe
        const result = await safeFetch("/api/clients", {
          method: "POST",
          body: JSON.stringify({
            nombres: "CONSUMIDOR FINAL",
            tipoIdentificacion: "07",
            identificacion: quickClientRuc,
            direccion: "S/N, ECUADOR",
            mail: "consumidor@final.com",
            celular: "0999999999",
          }),
        });
        if (result.ok) {
          clientObj = result.data.client;
          fetchClients();
        } else {
          alert("Fallo al crear Consumidor Final: " + result.error);
          return;
        }
      }
      targetClientId = clientObj!.id;
    } else {
      if (!invoiceForm.clientId) {
        alert("Por favor seleccione un cliente de la lista para proceder.");
        return;
      }
      targetClientId = parseInt(invoiceForm.clientId, 10);
    }

    if (posCart.length === 0) {
      alert("El carrito POS está vacío.");
      return;
    }

    setSriStatusModal({ show: true, step: "sending", message: "Enviando transacción a la cola del SRI..." });

    // Adaptar para productos dinámicos o estáticos
    const itemsPayload = posCart.map((item) => {
      if (item.isDynamic) {
        return {
          productId: "dynamic",
          isDynamic: true,
          nombre: item.product.nombre,
          precio: item.product.precio,
          iva: item.product.iva,
          cantidad: String(item.cantidad),
          descuento: "0",
        };
      }
      return {
        productId: String(item.product.id),
        cantidad: String(item.cantidad),
        descuento: "0",
      };
    });

    const result = await safeFetch("/api/invoices", {
      method: "POST",
      body: JSON.stringify({
        clientId: String(targetClientId),
        formaPago: "01",
        items: itemsPayload,
      }),
    });

    if (!result.ok) {
      setSriStatusModal({
        show: true,
        step: "error",
        message: result.error || "Fallo en la emisión express del punto de venta.",
        mensajes: result.data?.mensajes || [],
      });
      fetchInvoices();
      return;
    }

    const data = result.data;
    if (data.warning) {
      setSriStatusModal({ show: true, step: "warning", message: data.warning, claveAcceso: data.claveAcceso });
      addNotification(
        "Venta POS con Alerta",
        `Venta express emitida con alertas. Clave de acceso: ${data.claveAcceso || "No asignada"}.`,
        "warning"
      );
    } else {
      setSriStatusModal({
        show: true,
        step: "authorized",
        message: "Venta autorizada con éxito. Copia del ticket de caja y RIDE enviados por correo.",
        claveAcceso: data.claveAcceso,
        numeroAutorizacion: data.numeroAutorizacion,
      });
      addNotification(
        "Venta POS Autorizada",
        `Venta express autorizada con éxito por el SRI. Comprobante SRI emitido y copias de respaldo enviadas.`,
        "success"
      );
    }

    // Limpiar caja
    setPOSCart([]);
    setPosCashReceived("");
    fetchInvoices();
    fetchIssuer(); // Recargar billetera/saldo
  };

  const handleBarcodeSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeQuery) return;
    const prod = products.find((p) => p.codigoPrincipal === barcodeQuery.trim());
    if (prod) {
      addToPOSCart(prod);
      setBarcodeQuery("");
    } else {
      alert(`Producto con código de barras "${barcodeQuery}" no encontrado.`);
    }
  };

  // --- OBTENER CATEGORÍAS DISPONIBLES EN POS ---
  const getProductCategories = () => {
    const categories = new Set<string>();
    products.forEach((p) => {
      if (p.descripcion && p.descripcion.startsWith("CAT:")) {
        categories.add(p.descripcion.replace("CAT:", "").trim().toUpperCase());
      }
    });
    return ["TODOS", ...Array.from(categories)];
  };

  const getFilteredPOSProducts = () => {
    if (posCategory === "TODOS") return products;
    return products.filter(
      (p) =>
        p.descripcion &&
        p.descripcion.replace("CAT:", "").trim().toUpperCase() === posCategory
    );
  };

  // --- CÁLCULO DE FILTRADO TEMPORAL ---
  const getFilteredInvoices = () => {
    const now = new Date();
    const today = now.getDate();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    return invoices.filter((inv) => {
      const invDate = new Date(inv.fechaEmision);
      if (statsPeriodFilter === "HOY") {
        return (
          invDate.getDate() === today &&
          invDate.getMonth() === thisMonth &&
          invDate.getFullYear() === thisYear
        );
      }
      if (statsPeriodFilter === "ESTE_MES") {
        return (
          invDate.getMonth() === thisMonth &&
          invDate.getFullYear() === thisYear
        );
      }
      if (statsPeriodFilter === "ESTE_ANO") {
        return invDate.getFullYear() === thisYear;
      }
      // "TODO"
      return true;
    });
  };

  // --- CÁLCULO DE MÉTRICAS PARA DASHBOARD ---
  const getDashboardStats = () => {
    const filtered = getFilteredInvoices();
    const authorized = filtered.filter(inv => inv.estado === "AUTORIZADA");

    const totalSales = authorized.reduce((acc, inv) => acc + inv.total, 0);
    const subtotalIvaVal = authorized.reduce((acc, inv) => acc + inv.subtotalIva, 0);
    const subtotal0Val = authorized.reduce((acc, inv) => acc + inv.subtotal0, 0);
    const taxCollected = authorized.reduce((acc, inv) => acc + inv.valorIva, 0);

    const counts = { AUTORIZADA: 0, DEVUELTA: 0, RECIBIDA: 0, FIRMADA: 0 };
    filtered.forEach((inv) => {
      if (inv.estado in counts) {
        counts[inv.estado as keyof typeof counts]++;
      }
    });

    const ticketPromedio = counts.AUTORIZADA > 0 ? totalSales / counts.AUTORIZADA : 0;
    const uniqueClients = new Set(authorized.map(inv => inv.client?.id));
    const clientesActivos = uniqueClients.size;

    return { totalSales, subtotalIvaVal, subtotal0Val, taxCollected, counts, ticketPromedio, clientesActivos };
  };

  const dashboardStats = getDashboardStats();

  // --- RANKING DE PRODUCTOS MÁS VENDIDOS ---
  const getTopProducts = () => {
    const filtered = getFilteredInvoices().filter(inv => inv.estado === "AUTORIZADA");
    const productMap: { [key: string]: { codigo: string; nombre: string; cantidad: number; total: number } } = {};

    filtered.forEach(inv => {
      inv.items?.forEach((item: any) => {
        const prod = item.product;
        if (!prod) return;
        const key = prod.codigoPrincipal || `PROD-${prod.id}`;
        if (!productMap[key]) {
          productMap[key] = {
            codigo: key,
            nombre: prod.nombre,
            cantidad: 0,
            total: 0
          };
        }
        productMap[key].cantidad += item.cantidad;
        productMap[key].total += item.total;
      });
    });

    return Object.values(productMap)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
  };

  const topProducts = getTopProducts();

  // --- RANKING DE CLIENTES MÁS VALIOSOS ---
  const getTopClients = () => {
    const filtered = getFilteredInvoices().filter(inv => inv.estado === "AUTORIZADA");
    const clientMap: { [key: string]: { nombres: string; identificacion: string; compras: number; total: number } } = {};

    filtered.forEach(inv => {
      const client = inv.client;
      if (!client) return;
      const key = client.identificacion;
      if (!clientMap[key]) {
        clientMap[key] = {
          nombres: client.nombres,
          identificacion: client.identificacion,
          compras: 0,
          total: 0
        };
      }
      clientMap[key].compras += 1;
      clientMap[key].total += inv.total;
    });

    return Object.values(clientMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  };

  const topClients = getTopClients();

  // --- DESGLOSE POR FORMA DE PAGO ---
  const getPaymentMethodStats = () => {
    const filtered = getFilteredInvoices().filter(inv => inv.estado === "AUTORIZADA");
    let totalCash = 0;
    let totalFinanciero = 0;

    filtered.forEach(inv => {
      if (inv.formaPago === "01") {
        totalCash += inv.total;
      } else {
        totalFinanciero += inv.total;
      }
    });

    const grandTotal = totalCash + totalFinanciero;
    return {
      cash: totalCash,
      cashPct: grandTotal > 0 ? (totalCash / grandTotal) * 100 : 0,
      financial: totalFinanciero,
      financialPct: grandTotal > 0 ? (totalFinanciero / grandTotal) * 100 : 0
    };
  };

  const paymentStats = getPaymentMethodStats();

  // --- OBTENER DATOS DE GRÁFICO SEGÚN FILTRO ---
  const getFilteredSalesChartData = () => {
    const now = new Date();
    const filtered = getFilteredInvoices().filter(inv => inv.estado === "AUTORIZADA");

    if (statsPeriodFilter === "HOY") {
      const hours = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];
      const hourlyVals = Array(7).fill(0);

      filtered.forEach(inv => {
        const d = new Date(inv.fechaEmision);
        const h = d.getHours();
        if (h < 10) hourlyVals[0] += inv.total;
        else if (h < 12) hourlyVals[1] += inv.total;
        else if (h < 14) hourlyVals[2] += inv.total;
        else if (h < 16) hourlyVals[3] += inv.total;
        else if (h < 18) hourlyVals[4] += inv.total;
        else if (h < 20) hourlyVals[5] += inv.total;
        else hourlyVals[6] += inv.total;
      });

      return hours.map((h, index) => ({
        name: h,
        value: hourlyVals[index]
      }));
    }

    if (statsPeriodFilter === "ESTE_MES") {
      const weeks = ["Semana 1", "Semana 2", "Semana 3", "Semana 4", "Semana 5"];
      const weeklyVals = Array(5).fill(0);

      filtered.forEach(inv => {
        const d = new Date(inv.fechaEmision);
        const day = d.getDate();
        if (day <= 7) weeklyVals[0] += inv.total;
        else if (day <= 14) weeklyVals[1] += inv.total;
        else if (day <= 21) weeklyVals[2] += inv.total;
        else if (day <= 28) weeklyVals[3] += inv.total;
        else weeklyVals[4] += inv.total;
      });

      return weeks.map((w, index) => ({
        name: w,
        value: weeklyVals[index]
      }));
    }

    if (statsPeriodFilter === "ESTE_ANO") {
      const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
      const monthlyVals = Array(12).fill(0);

      filtered.forEach(inv => {
        const d = new Date(inv.fechaEmision);
        monthlyVals[d.getMonth()] += inv.total;
      });

      return months.map((m, index) => ({
        name: m,
        value: monthlyVals[index]
      }));
    }

    const currentYear = now.getFullYear();
    const years = [
      String(currentYear - 4),
      String(currentYear - 3),
      String(currentYear - 2),
      String(currentYear - 1),
      String(currentYear)
    ];
    const yearlyVals = Array(5).fill(0);

    filtered.forEach(inv => {
      const d = new Date(inv.fechaEmision);
      const y = d.getFullYear();
      const index = years.indexOf(String(y));
      if (index !== -1) {
        yearlyVals[index] += inv.total;
      }
    });

    return years.map((y, index) => ({
      name: y,
      value: yearlyVals[index]
    }));
  };

  const chartSalesData = getFilteredSalesChartData();
  const maxChartSaleVal = Math.max(...chartSalesData.map((w) => w.value), 10);

  // --- SI NO SE HA INICIADO SESIÓN (PANTALLA DE BIENVENIDA) ---
  if (!activeIssuerId && !isAdminLoggedIn) {
    return (
      <div className="min-h-screen bg-[#f8f9fe] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-md w-full bg-white rounded-[32px] border border-[#e8ebf7] shadow-[0_16px_48px_rgba(26,54,124,0.06)] p-10">
          
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              {systemConfig?.systemLogo ? (
                <img 
                  src={systemConfig.systemLogo} 
                  alt="Logo Sistema" 
                  className="h-16 w-auto max-w-[150px] object-contain rounded-xl"
                />
              ) : (
                <div className="h-16 w-16 rounded-[22px] bg-blue-600 flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-blue-600/15">
                  {systemConfig?.systemName ? systemConfig.systemName.charAt(0).toUpperCase() : "F"}
                </div>
              )}
            </div>
            <h2 className="text-[26px] font-black text-[#0f172a] tracking-tight">
              {systemConfig?.loginTitle || "FácilSRI Ecuador"}
            </h2>
            <p className="text-sm text-[#64748b] mt-2 max-w-xs mx-auto leading-relaxed">
              {systemConfig?.loginSubtitle || "Plataforma robusta, comercial y minimalista de facturación electrónica."}
            </p>
          </div>

          {/* Tabs Selector */}
          <div className="flex border-b border-[#e8ebf7] mb-8">
            <button
              onClick={() => setActiveAuthTab("login")}
              className={`flex-1 pb-3 text-sm font-bold border-b-[3px] text-center transition-all duration-300 ${
                activeAuthTab === "login"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-[#94a3b8] hover:text-[#475569]"
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => setActiveAuthTab("register")}
              className={`flex-1 pb-3 text-sm font-bold border-b-[3px] text-center transition-all duration-300 ${
                activeAuthTab === "register"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-[#94a3b8] hover:text-[#475569]"
              }`}
            >
              Registrarse
            </button>
            <button
              onClick={() => setActiveAuthTab("admin")}
              className={`flex-1 pb-3 text-sm font-bold border-b-[3px] text-center transition-all duration-300 ${
                activeAuthTab === "admin"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-[#94a3b8] hover:text-[#475569]"
              }`}
            >
              Supervisor
            </button>
          </div>

          {activeAuthTab === "login" && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-[#475569] uppercase tracking-wider mb-2">
                  RUC o Correo Electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Building className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="ej. 1792384756001 o emisor@ejemplo.com"
                    value={loginForm.ruc}
                    onChange={(e) => setLoginForm({ ...loginForm, ruc: e.target.value })}
                    className="block w-full pl-12 pr-4 py-3.5 border border-[#e2e8f0] focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none text-sm transition-all bg-[#fbfcfd] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#475569] uppercase tracking-wider mb-2">
                  Contraseña de Acceso
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    required
                    placeholder="Contraseña asignada"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="block w-full pl-12 pr-12 py-3.5 border border-[#e2e8f0] focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none text-sm transition-all bg-[#fbfcfd] focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 px-6 rounded-2xl shadow-lg shadow-blue-600/10 hover:shadow-xl transition-all duration-200 text-sm tracking-wide mt-3 active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-blue-500/20"
              >
                Ingresar al Sistema
              </button>
            </form>
          )}

          {activeAuthTab === "register" && (
            <form onSubmit={handleRegister} className="space-y-4 max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar">
              <div>
                <label className="block text-xs font-bold text-[#475569] uppercase tracking-wider mb-1">
                  Número de RUC (13 dígitos)
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. 1716943834001"
                  value={registerForm.ruc}
                  onChange={(e) => setRegisterForm({ ...registerForm, ruc: e.target.value })}
                  className="block w-full px-4 py-2.5 border border-[#e2e8f0] focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none text-sm transition-all bg-[#fbfcfd] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#475569] uppercase tracking-wider mb-1">
                    Nombres
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Juan Carlos"
                    value={registerForm.nombres}
                    onChange={(e) => setRegisterForm({ ...registerForm, nombres: e.target.value })}
                    className="block w-full px-4 py-2.5 border border-[#e2e8f0] focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none text-sm transition-all bg-[#fbfcfd] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#475569] uppercase tracking-wider mb-1">
                    Apellidos
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Pérez Andrade"
                    value={registerForm.apellidos}
                    onChange={(e) => setRegisterForm({ ...registerForm, apellidos: e.target.value })}
                    className="block w-full px-4 py-2.5 border border-[#e2e8f0] focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none text-sm transition-all bg-[#fbfcfd] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#475569] uppercase tracking-wider mb-1">
                  Nombre Comercial (Empresa)
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Distribuidora del Norte"
                  value={registerForm.nombreEmpresa}
                  onChange={(e) => setRegisterForm({ ...registerForm, nombreEmpresa: e.target.value })}
                  className="block w-full px-4 py-2.5 border border-[#e2e8f0] focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none text-sm transition-all bg-[#fbfcfd] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#475569] uppercase tracking-wider mb-1">
                  Razón Social
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. DistribuidoraNorte S.A."
                  value={registerForm.razonSocial}
                  onChange={(e) => setRegisterForm({ ...registerForm, razonSocial: e.target.value })}
                  className="block w-full px-4 py-2.5 border border-[#e2e8f0] focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none text-sm transition-all bg-[#fbfcfd] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#475569] uppercase tracking-wider mb-1">
                  Dirección Matriz
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Av. 10 de Agosto N45, Quito"
                  value={registerForm.direccion}
                  onChange={(e) => setRegisterForm({ ...registerForm, direccion: e.target.value })}
                  className="block w-full px-4 py-2.5 border border-[#e2e8f0] focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none text-sm transition-all bg-[#fbfcfd] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#475569] uppercase tracking-wider mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="ej. perez@mail.com"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                    className="block w-full px-4 py-2.5 border border-[#e2e8f0] focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none text-sm transition-all bg-[#fbfcfd] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#475569] uppercase tracking-wider mb-1">
                    Celular
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej. 0998765432"
                    value={registerForm.celular}
                    onChange={(e) => setRegisterForm({ ...registerForm, celular: e.target.value })}
                    className="block w-full px-4 py-2.5 border border-[#e2e8f0] focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none text-sm transition-all bg-[#fbfcfd] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#475569] uppercase tracking-wider mb-1">
                  Cree una Contraseña de Acceso
                </label>
                <div className="relative">
                  <input
                    type={showRegisterPassword ? "text" : "password"}
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    className="block w-full pl-4 pr-12 py-2.5 border border-[#e2e8f0] focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none text-sm transition-all bg-[#fbfcfd] focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"
                  >
                    {showRegisterPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-[#64748b] mt-2 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                * Al registrarse recibirá automáticamente {systemConfig ? `$${systemConfig.defaultBalance.toFixed(2)}` : "$5.00"} de saldo inicial de cortesía para pruebas del SRI en Ecuador.
              </p>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 px-4 rounded-2xl shadow-lg shadow-blue-600/10 hover:shadow-xl transition-all duration-200 text-sm tracking-wide mt-2 active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-blue-500/20"
              >
                Crear Empresa y Empezar
              </button>
            </form>
          )}

          {activeAuthTab === "admin" && (
            <form onSubmit={handleAdminLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-[#475569] uppercase tracking-wider mb-2">
                  Contraseña del Super Supervisor SaaS
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type={showAdminLoginPassword ? "text" : "password"}
                    required
                    placeholder="Ingrese contraseña de admin"
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    className="block w-full pl-12 pr-12 py-3.5 border border-[#e2e8f0] focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none text-sm transition-all bg-[#fbfcfd] focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminLoginPassword(!showAdminLoginPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"
                  >
                    {showAdminLoginPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 px-6 rounded-2xl shadow-lg shadow-blue-600/10 hover:shadow-xl transition-all duration-200 text-sm tracking-wide mt-3 active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-blue-500/20"
              >
                Entrar al Panel de Supervisor
              </button>
            </form>
          )}

        </div>
      </div>
    );
  }

  // --- SI LA CUENTA SE ENCUENTRA SUSPENDIDA ---
  if (isSuspended && !isAdminLoggedIn) {
    const ruc = issuer?.ruc || "";
    const name = issuer?.nombreEmpresa || "";
    const waText = encodeURIComponent(`Hola, acabo de realizar la transferencia de pago. Por favor active mi cuenta de facturación FácilSRI para la empresa ${name} con RUC ${ruc}. Adjunto comprobante.`);
    const waLink = `https://wa.me/${systemConfig?.adminWhatsapp}?text=${waText}`;

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-xl w-full bg-white rounded-xl shadow-sm border border-red-100 p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-14 w-14 rounded-full bg-red-50 flex items-center justify-center text-red-500">
              <AlertTriangle className="h-8 w-8" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Cuenta Temporalmente Suspendida</h2>
          
          <div className="mt-4 p-4 bg-red-50/50 border border-red-100 rounded-lg text-sm text-red-700 text-left">
            <strong>Motivo de Suspensión:</strong>
            <p className="mt-1 text-slate-600 leading-relaxed">
              {getSuspensionReason()}
            </p>
          </div>

          <div className="mt-6 text-left">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
              <CreditCard className="h-4 w-4 mr-1 text-blue-500" /> Cuentas para Transferencia / Depósito Bancario
            </h3>
            {bankAccountsList && bankAccountsList.filter((b) => b.activo !== false).length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {bankAccountsList
                  .filter((b) => b.activo !== false)
                  .map((acc) => (
                    <div
                      key={acc.id}
                      className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between shadow-2xs"
                    >
                      <div className="space-y-0.5 text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-slate-800">{acc.banco}</span>
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                            {acc.tipoCuenta}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 font-mono text-slate-800">
                          <span className="font-black text-slate-900">{acc.numeroCuenta}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(acc.numeroCuenta, `Número de cuenta ${acc.banco}`)}
                            className="text-[10px] text-blue-600 hover:text-blue-800 font-sans font-bold hover:underline ml-1 cursor-pointer"
                          >
                            📋 Copiar
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          <span>Titular:</span> {acc.titular} {acc.identificacionTitular && `(${acc.identificacionTitular})`}
                        </div>
                      </div>

                      {acc.qrCode && (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewQrModal({
                              isOpen: true,
                              banco: acc.banco,
                              qrCode: acc.qrCode,
                              titular: acc.titular,
                              numeroCuenta: acc.numeroCuenta,
                              tipoCuenta: acc.tipoCuenta,
                            })
                          }
                          className="shrink-0 p-1.5 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-xl text-emerald-700 text-[10px] font-bold flex flex-col items-center justify-center transition-colors cursor-pointer"
                        >
                          <QrCode className="h-5 w-5 text-emerald-600 mb-0.5" />
                          <span>Ver QR</span>
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 font-mono text-xs text-slate-600 whitespace-pre-wrap leading-normal">
                {systemConfig?.bankAccounts || "Cargando cuentas..."}
              </div>
            )}
          </div>

          <div className="mt-8 space-y-3">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg shadow-sm text-sm transition-transform hover:scale-[1.01] duration-150"
            >
              <MessageSquare className="h-5 w-5 mr-2" /> Enviar Comprobante por WhatsApp
            </a>
            
            <button
              onClick={handleLogout}
              className="w-full border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- APLICACIÓN COMPLETA (EMISOR O SUPERVISOR) ---
  return (
    <div className="min-h-screen bg-[#f8f9fe] flex font-sans text-slate-800 antialiased">
      
      {/* SIDEBAR SIDE BAR */}
      <aside className={`w-64 bg-[#f3f4fd]/95 md:bg-[#f3f4fd]/40 border-r border-[#e8ebf7] flex flex-col justify-between shrink-0 fixed md:static inset-y-0 left-0 z-40 transform transition-transform duration-300 ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}>
        <div>
          {/* Logo Header */}
          <div className="h-20 px-6 border-b border-[#e8ebf7]/60 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              {systemConfig?.systemLogo ? (
                <img 
                  src={systemConfig.systemLogo} 
                  alt="Logo" 
                  className="h-9 w-auto max-w-[60px] object-contain rounded-lg shadow-3xs"
                />
              ) : (
                <div className="h-9 w-9 rounded-xl bg-violet-600 flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-violet-600/10">
                  {systemConfig?.systemName ? systemConfig.systemName.charAt(0).toUpperCase() : "F"}
                </div>
              )}
              <span className="font-extrabold text-slate-900 text-lg tracking-tight">
                {isAdminLoggedIn ? "Admin Panel" : (systemConfig?.systemName || "FácilSRI")}
              </span>
            </div>
            {isAdminLoggedIn && (
              <span className="text-[9px] bg-slate-200 border border-slate-300 rounded-lg px-2 py-0.5 text-slate-600 font-extrabold uppercase tracking-wider">
                Admin
              </span>
            )}
          </div>

          {/* Issuer Micro-Profile */}
          {!isAdminLoggedIn && issuer && (
            <div className="p-4 border-b border-[#e8ebf7]/60 flex items-center space-x-3 bg-[#e8ebf7]/20">
              <div className="h-10 w-10 rounded-2xl border border-[#e8ebf7] bg-white overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                {issuer.logo ? (
                  <img src={issuer.logo} alt="Logo" className="h-full w-full object-contain p-1" />
                ) : (
                  <Building className="h-5 w-5 text-slate-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-slate-800 truncate uppercase tracking-tight">{issuer.nombreEmpresa}</p>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <div className={`h-1.5 w-1.5 rounded-full ${issuer.ambiente === 2 ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}></div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                    {issuer.ambiente === 2 ? "Producción" : "Pruebas"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {!isAdminLoggedIn ? (
              <>
                <button
                  onClick={() => { setActiveTab("dashboard"); setIsMobileSidebarOpen(false); }}
                  className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 ${
                    activeTab === "dashboard"
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-600/10"
                      : "text-slate-500 hover:bg-[#e8ebf7]/40 hover:text-slate-800"
                  }`}
                >
                  <TrendingUp className="h-4.5 w-4.5" />
                  <span>Dashboard</span>
                </button>

                <button
                  onClick={() => { setActiveTab("pos"); setIsMobileSidebarOpen(false); }}
                  className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 ${
                    activeTab === "pos"
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-600/10"
                      : "text-slate-500 hover:bg-[#e8ebf7]/40 hover:text-slate-800"
                  }`}
                >
                  <ShoppingCart className="h-4.5 w-4.5" />
                  <span>Punto de Venta (POS)</span>
                </button>

                <button
                  onClick={() => { setActiveTab("billing"); setIsMobileSidebarOpen(false); }}
                  className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 ${
                    activeTab === "billing"
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-600/10"
                      : "text-slate-500 hover:bg-[#e8ebf7]/40 hover:text-slate-800"
                  }`}
                >
                  <FileText className="h-4.5 w-4.5" />
                  <span>Emitir Factura</span>
                </button>

                <button
                  onClick={() => { setActiveTab("history"); setIsMobileSidebarOpen(false); }}
                  className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 ${
                    activeTab === "history"
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-600/10"
                      : "text-slate-500 hover:bg-[#e8ebf7]/40 hover:text-slate-800"
                  }`}
                >
                  <Clock className="h-4.5 w-4.5" />
                  <span>Historial SRI</span>
                </button>

                <button
                  onClick={() => { setActiveTab("clients"); setIsMobileSidebarOpen(false); }}
                  className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 ${
                    activeTab === "clients"
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-600/10"
                      : "text-slate-500 hover:bg-[#e8ebf7]/40 hover:text-slate-800"
                  }`}
                >
                  <Users className="h-4.5 w-4.5" />
                  <span>Clientes</span>
                </button>

                <button
                  onClick={() => { setActiveTab("products"); setIsMobileSidebarOpen(false); }}
                  className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 ${
                    activeTab === "products"
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-600/10"
                      : "text-slate-500 hover:bg-[#e8ebf7]/40 hover:text-slate-800"
                  }`}
                >
                  <Sparkles className="h-4.5 w-4.5" />
                  <span>Productos</span>
                </button>

                <button
                  onClick={() => { setActiveTab("settings"); setIsMobileSidebarOpen(false); }}
                  className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 ${
                    activeTab === "settings"
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-600/10"
                      : "text-slate-500 hover:bg-[#e8ebf7]/40 hover:text-slate-800"
                  }`}
                >
                  <Settings className="h-4.5 w-4.5" />
                  <span>Configuración Emisor</span>
                </button>

                <button
                  onClick={() => { setActiveTab("guia"); setIsMobileSidebarOpen(false); }}
                  className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 ${
                    activeTab === "guia"
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-600/10"
                      : "text-slate-500 hover:bg-[#e8ebf7]/40 hover:text-slate-800"
                  }`}
                >
                  <HelpCircle className="h-4.5 w-4.5" />
                  <span>Guía de Inicio Rápido</span>
                </button>
              </>
            ) : (
              <div className="space-y-2 mt-2 border-t border-[#e8ebf7]/60 pt-4">
                <p className="px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 select-none">
                  Administración SaaS
                </p>

                <button
                  onClick={() => { setActiveTab("admin_approvals"); setIsMobileSidebarOpen(false); }}
                  className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 ${
                    activeTab === "admin_approvals"
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-600/10"
                      : "text-slate-500 hover:bg-[#e8ebf7]/40 hover:text-slate-800"
                  }`}
                >
                  <CheckCircle className="h-4.5 w-4.5" />
                  <span>Aprobaciones Pagos</span>
                </button>

                <button
                  onClick={() => { setActiveTab("admin_companies"); setIsMobileSidebarOpen(false); }}
                  className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 ${
                    activeTab === "admin_companies"
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-600/10"
                      : "text-slate-500 hover:bg-[#e8ebf7]/40 hover:text-slate-800"
                  }`}
                >
                  <Building className="h-4.5 w-4.5" />
                  <span>Empresas Registradas</span>
                </button>

                <button
                  onClick={() => { setActiveTab("admin_branding"); setIsMobileSidebarOpen(false); }}
                  className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 ${
                    activeTab === "admin_branding"
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-600/10"
                      : "text-slate-500 hover:bg-[#e8ebf7]/40 hover:text-slate-800"
                  }`}
                >
                  <Settings className="h-4.5 w-4.5" />
                  <span>Configuración Marca</span>
                </button>

                <button
                  onClick={() => { setActiveTab("admin_email_test"); setIsMobileSidebarOpen(false); }}
                  className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 ${
                    activeTab === "admin_email_test"
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-600/10"
                      : "text-slate-500 hover:bg-[#e8ebf7]/40 hover:text-slate-800"
                  }`}
                >
                  <Mail className="h-4.5 w-4.5" />
                  <span>Pruebas de Correo</span>
                </button>
              </div>
            )}
          </nav>
        </div>

        {/* User / Issuer Settings Box */}
        <div className="p-4 border-t border-[#e8ebf7]/60">
          {!isAdminLoggedIn && issuer && (
            <div 
              onClick={() => {
                setShowMembershipModal(true);
                fetchMembershipRequests();
                fetchBankAccounts(true);
              }}
              className="bg-white border border-[#e8ebf7] hover:border-violet-300 hover:shadow-xs rounded-3xl p-4 mb-3 shadow-2xs relative overflow-hidden cursor-pointer transition-all duration-200 group active:scale-[0.98] select-none"
            >
              <div className="flex items-center justify-between text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">
                <div className="flex items-center space-x-2">
                  {issuer.planType === "MONTHLY" ? (
                    <><CreditCard className="h-3.5 w-3.5 text-violet-600 group-hover:scale-110 transition-transform" /> <span>Plan Mensual</span></>
                  ) : (
                    <><Wallet className="h-3.5 w-3.5 text-violet-600 group-hover:scale-110 transition-transform" /> <span>Billetera</span></>
                  )}
                </div>
                <span className="text-[8px] text-violet-500 font-extrabold normal-case opacity-0 group-hover:opacity-100 transition-opacity">Gestionar ➔</span>
              </div>
              <div className="flex justify-between items-baseline">
                {issuer.planType === "MONTHLY" ? (
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Vence el:</span>
                    <span className="text-xs font-extrabold text-slate-800">
                      {(() => {
                        const d = new Date(issuer.subscriptionEnds);
                        return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth()+1).padStart(2, "0")}/${d.getFullYear()}`;
                      })()}
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Saldo Disponible:</span>
                    <span className={`text-base font-black ${issuer.balance < 1.0 ? "text-red-500" : "text-slate-900"}`}>
                      ${issuer.balance.toFixed(2)}
                    </span>
                  </div>
                )}
                <span className={`text-[9px] border rounded-xl px-2.5 py-0.5 font-bold uppercase shrink-0 ${
                  issuer.planType === "MONTHLY" && new Date(issuer.subscriptionEnds) < new Date()
                    ? "bg-red-50 text-red-700 border-red-200/60 animate-pulse"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                }`}>
                  {issuer.planType === "MONTHLY" && new Date(issuer.subscriptionEnds) < new Date() ? "Vencido" : "Activa"}
                </span>
              </div>
            </div>
          )}
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3.5 px-4 py-3 rounded-2xl text-xs font-bold text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
          >
            <LogOut className="h-4.5 w-4.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Backdrop overlay for mobile menu drawer */}
      {isMobileSidebarOpen && (
        <div 
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 md:hidden animate-fade-in"
        />
      )}

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* TOP BAR HEADER */}
        <header className="py-4 md:py-6 px-4 md:px-8 flex items-center justify-between shrink-0 bg-transparent gap-4">
          <div className="flex items-center space-x-3 min-w-0">
            {/* Burger menu button */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden h-9 w-9 bg-white border border-[#e8ebf7] rounded-xl flex items-center justify-center text-slate-500 shadow-2xs hover:bg-slate-50 cursor-pointer transition-colors shrink-0"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight truncate">
                {activeTab === "dashboard" && `¡Bienvenido de nuevo, ${issuer?.nombres || "Usuario"}!`}
                {activeTab === "pos" && "Punto de Venta (POS)"}
                {activeTab === "billing" && "Nueva Factura Electrónica"}
                {activeTab === "history" && "Historial de Facturas"}
                {activeTab === "clients" && "Directorio de Clientes"}
                {activeTab === "products" && "Catálogo de Productos"}
                {activeTab === "settings" && "Configuración Emisor"}
                {activeTab === "guia" && "Guía de Inicio Rápido"}
                {activeTab === "admin" && "Consola SaaS Supervisor"}
                {activeTab === "admin_approvals" && "Aprobaciones de Pagos SaaS"}
                {activeTab === "admin_companies" && "Empresas y Emisores Registrados"}
                {activeTab === "admin_branding" && "Configuración de Marca del SaaS"}
                {activeTab === "admin_email_test" && "Pruebas de Envío de Correo Electrónico"}
              </h1>
              <p className="text-[10px] md:text-xs text-slate-400 mt-0.5 font-semibold truncate hidden sm:block">
              {activeTab === "dashboard" && "Es el mejor momento para gestionar tu facturación y finanzas."}
              {activeTab === "pos" && "Registro rápido de ventas, códigos de barra y cobro express"}
              {activeTab === "billing" && "Crea y emite comprobantes al SRI de forma guiada"}
              {activeTab === "history" && "Descarga RIDES (PDF), XMLs autorizados y consulta estados"}
              {activeTab === "clients" && "Administra tus clientes y sus datos de facturación"}
              {activeTab === "products" && "Gestiona códigos, precios e impuestos (IVA)"}
              {activeTab === "settings" && "Gestiona tu firma .p12, datos tributarios y logo"}
              {activeTab === "guia" && "Aprende cómo configurar tu cuenta paso a paso"}
              {activeTab === "admin" && "Visualiza empresas, activa/desactiva servicios y recarga saldos"}
              {activeTab === "admin_approvals" && "Cola de solicitudes de recargas y renovación de membresías"}
              {activeTab === "admin_companies" && "Visualiza emisores registrados, activa/desactiva servicios y gestiona saldos"}
              {activeTab === "admin_branding" && "Personaliza el logotipo, nombre del sistema, pantallas de login y contacto"}
              {activeTab === "admin_email_test" && "Envía correos de prueba y verifica la conectividad del servidor SMTP de Gmail en vivo"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 relative">
            {!isAdminLoggedIn && issuer && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5 bg-white border border-[#e8ebf7] rounded-2xl py-1.5 px-3 shadow-2xs select-none">
                <div className="flex items-center space-x-1 shrink-0">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Est.:</span>
                  <span className="text-xs font-black text-slate-800">
                    {issuer.establecimiento}-{issuer.puntoEmision}
                  </span>
                </div>
                <span className="hidden sm:inline text-slate-300 text-[10px]">|</span>
                <div className="flex items-center space-x-1 shrink-0">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Secuencial:</span>
                  <span className="text-xs font-mono font-black text-violet-750">
                    {issuer.startSecuencial}
                  </span>
                </div>
              </div>
            )}
            
            {/* Header Widgets Mock */}
            <div 
              onClick={() => {
                setShowSearchModal(true);
                setShowNotifications(false);
              }}
              className="h-9 w-9 bg-white border border-[#e8ebf7] rounded-full flex items-center justify-center text-slate-500 shadow-2xs hover:bg-slate-50 cursor-pointer transition-colors shrink-0"
            >
              <Search className="h-4.5 w-4.5" />
            </div>
            
            {/* Notifications Bell Button */}
            <div className="relative shrink-0">
              <div 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowSearchModal(false);
                }}
                className="h-9 w-9 bg-white border border-[#e8ebf7] rounded-full flex items-center justify-center text-slate-500 shadow-2xs hover:bg-slate-50 relative cursor-pointer transition-colors"
              >
                <Bell className="h-4.5 w-4.5" />
                {notifications.some(n => !n.read) && (
                  <div className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></div>
                )}
              </div>
              
              {showNotifications && (
                <div className="absolute right-0 mt-2.5 w-80 bg-white border border-[#e8ebf7] rounded-2xl shadow-xl z-50 py-3 font-sans">
                  <div className="px-4 pb-2 border-b border-slate-100 flex justify-between items-center">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Notificaciones</span>
                    {notifications.length > 0 && (
                      <button 
                        onClick={() => {
                          setCustomNotifications(prev => prev.map(n => ({ ...n, read: true })));
                        }}
                        className="text-[10px] text-violet-600 hover:underline font-semibold"
                      >
                        Marcar leídas
                      </button>
                    )}
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <div key={n.id} className="p-3 hover:bg-slate-50/50 transition-colors">
                          <div className="flex justify-between items-start gap-2">
                            <span className={`text-[10px] font-black uppercase tracking-wider shrink-0 ${
                              n.type === "success" ? "text-emerald-600" :
                              n.type === "warning" ? "text-amber-500" : "text-blue-500"
                            }`}>
                              {n.title}
                            </span>
                            <span className="text-[8px] text-slate-400 font-bold shrink-0">{n.date}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-normal mt-1">{n.description}</p>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center text-slate-400 text-xs font-medium">
                        No tienes notificaciones en este momento.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div 
              onClick={() => {
                setActiveTab("settings");
                setIsMobileSidebarOpen(false);
              }}
              className="h-9 w-9 bg-violet-100 border border-violet-200 text-violet-750 font-bold rounded-full flex items-center justify-center shadow-2xs cursor-pointer text-xs transition-transform hover:scale-105 shrink-0"
            >
              {issuer?.nombres ? issuer.nombres.charAt(0).toUpperCase() : "U"}
            </div>
          </div>
        </header>

        {/* TABS VIEWPORT */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          
          {/* TAB: DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="space-y-8 animate-fade-in">
              {/* Filtro Temporal Superior */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
                <div>
                  <h2 className="text-base font-black text-slate-800 tracking-tight">Estadísticas y Analítica de Ventas</h2>
                  <p className="text-[11px] text-slate-450 font-extrabold uppercase tracking-wider mt-0.5">Monitoreo Comercial en Tiempo Real</p>
                </div>
                <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-1 shrink-0 select-none">
                  {(["HOY", "ESTE_MES", "ESTE_ANO", "TODO"] as const).map((period) => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => setStatsPeriodFilter(period)}
                      className={`px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                        statsPeriodFilter === period
                          ? "bg-slate-900 text-white shadow-xs"
                          : "text-slate-400 hover:text-slate-700"
                      }`}
                    >
                      {period === "HOY"
                        ? "Hoy"
                        : period === "ESTE_MES"
                        ? "Este Mes"
                        : period === "ESTE_ANO"
                        ? "Este Año"
                        : "Todo"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stats Grid - 6 Columnas */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-5">
                {/* Card 1: Ventas Totales */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm transition-all hover:shadow-md">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[9px] font-black uppercase tracking-widest block">Ventas Totales</span>
                    <div className="p-1.5 bg-blue-50 rounded-lg">
                      <DollarSign className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                  <p className="text-xl font-black text-slate-800 mt-3">${dashboardStats.totalSales.toFixed(2)}</p>
                </div>
                
                {/* Card 2: Autorizadas SRI */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm transition-all hover:shadow-md">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[9px] font-black uppercase tracking-widest block">Autorizadas SRI</span>
                    <div className="p-1.5 bg-green-50 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                  <p className="text-xl font-black text-slate-800 mt-3">{dashboardStats.counts.AUTORIZADA}</p>
                </div>

                {/* Card 3: Devueltas / Errores */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm transition-all hover:shadow-md">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[9px] font-black uppercase tracking-widest block">Errores SRI</span>
                    <div className="p-1.5 bg-red-50 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    </div>
                  </div>
                  <p className="text-xl font-black text-slate-800 mt-3">{dashboardStats.counts.DEVUELTA}</p>
                </div>

                {/* Card 4: IVA Cobrado */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm transition-all hover:shadow-md">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[9px] font-black uppercase tracking-widest block">IVA Recaudado</span>
                    <div className="p-1.5 bg-indigo-50 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-indigo-600" />
                    </div>
                  </div>
                  <p className="text-xl font-black text-slate-800 mt-3">${dashboardStats.taxCollected.toFixed(2)}</p>
                </div>

                {/* Card 5: Ticket Promedio */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm transition-all hover:shadow-md">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[9px] font-black uppercase tracking-widest block">Ticket Promedio</span>
                    <div className="p-1.5 bg-amber-50 rounded-lg">
                      <ShoppingCart className="h-4 w-4 text-amber-600" />
                    </div>
                  </div>
                  <p className="text-xl font-black text-slate-800 mt-3">${dashboardStats.ticketPromedio.toFixed(2)}</p>
                </div>

                {/* Card 6: Clientes Activos */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm transition-all hover:shadow-md">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[9px] font-black uppercase tracking-widest block">Clientes Activos</span>
                    <div className="p-1.5 bg-violet-50 rounded-lg">
                      <Users className="h-4 w-4 text-violet-600" />
                    </div>
                  </div>
                  <p className="text-xl font-black text-slate-800 mt-3">{dashboardStats.clientesActivos}</p>
                </div>
              </div>

              {/* Chart & Breakdowns */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                {/* Sales Trend Chart (Pure SVG) */}
                <div className="col-span-1 lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 tracking-tight">Evolución Comercial</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Historial Gráfico del Periodo Seleccionado</p>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700">
                      {statsPeriodFilter === "HOY" ? "Desglose por Horas" : statsPeriodFilter === "ESTE_MES" ? "Desglose por Semanas" : statsPeriodFilter === "ESTE_ANO" ? "Desglose por Meses" : "Tendencia Histórica"}
                    </span>
                  </div>
                  <div className="h-64 flex flex-col justify-between">
                    <div className="flex-1 flex items-stretch justify-between px-2 pb-2 border-b border-slate-100 relative">
                      {chartSalesData.map((day, i) => {
                        const pctHeight = (day.value / maxChartSaleVal) * 100;
                        return (
                          <div key={i} className="h-full flex flex-col justify-end items-center flex-1 group z-10 relative">
                            <div
                              style={{ height: `${day.value > 0 ? Math.max(pctHeight, 4) : 0}%` }}
                              className="w-8 sm:w-12 bg-gradient-to-t from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600 rounded-t-lg transition-all duration-300 shadow-3xs cursor-pointer relative group/bar"
                            >
                              {day.value > 0 && (
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-bold rounded-lg px-2 py-1 opacity-0 group-hover/bar:opacity-100 transition-opacity duration-150 shadow-md border border-slate-700 pointer-events-none z-35 whitespace-nowrap">
                                  ${day.value.toFixed(2)}
                                </div>
                              )}
                            </div>
                            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide mt-2">{day.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Tax Breakdown & Cashflow Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 tracking-tight">Estructura Financiera</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Impuestos y Métodos de Cobro</p>
                    </div>
                    
                    {/* Desglose de impuestos */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Subtotal Gravado IVA</span>
                        <span className="text-xs font-bold text-slate-700">${dashboardStats.subtotalIvaVal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Subtotal 0% IVA</span>
                        <span className="text-xs font-bold text-slate-700">${dashboardStats.subtotal0Val.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Total IVA Cobrado</span>
                        <span className="text-xs font-bold text-slate-700">${dashboardStats.taxCollected.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Desglose por Formas de Pago */}
                    <div className="space-y-3">
                      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Orígenes de Flujo de Caja</h4>
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-[10px] mb-1 font-bold">
                            <span className="text-slate-500">Efectivo / Sin Utiliz. (01)</span>
                            <span className="text-slate-700">${paymentStats.cash.toFixed(2)} ({paymentStats.cashPct.toFixed(0)}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5">
                            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${paymentStats.cashPct}%` }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] mb-1 font-bold">
                            <span className="text-slate-500">Bancos / Financiero (20)</span>
                            <span className="text-slate-700">${paymentStats.financial.toFixed(2)} ({paymentStats.financialPct.toFixed(0)}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5">
                            <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${paymentStats.financialPct}%` }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-6">
                    <p className="text-[10px] text-slate-400 leading-normal">
                      * Este resumen contempla únicamente comprobantes que han sido procesados y marcados en estado <strong>AUTORIZADA</strong> por el SRI en Ecuador.
                    </p>
                  </div>
                </div>
              </div>

              {/* Secciones de Rendimiento y Rankings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mt-8">
                {/* Columna Izquierda: Productos más vendidos */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 tracking-tight">Productos Más Vendidos</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Top 5 por Volumen de Ventas</p>
                      </div>
                      <ShoppingCart className="h-4 w-4 text-blue-500" />
                    </div>

                    <div className="space-y-4">
                      {topProducts.map((prod) => {
                        const maxQty = topProducts[0]?.cantidad || 1;
                        const relativePct = (prod.cantidad / maxQty) * 100;
                        return (
                          <div key={prod.codigo} className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <div className="min-w-0">
                                <span className="font-extrabold text-slate-700 block truncate">{prod.nombre}</span>
                                <span className="text-[10px] font-mono text-slate-400 uppercase">{prod.codigo}</span>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-black text-slate-850 block">{prod.cantidad} und.</span>
                                <span className="text-[10px] font-bold text-slate-400">${prod.total.toFixed(2)}</span>
                              </div>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5">
                              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full" style={{ width: `${relativePct}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                      {topProducts.length === 0 && (
                        <div className="py-8 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                          No hay registros de ventas para este periodo.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Columna Derecha: Clientes que más han comprado */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 tracking-tight">Clientes Más Valiosos</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Top 5 por Volumen de Compra</p>
                      </div>
                      <Users className="h-4 w-4 text-indigo-500" />
                    </div>

                    <div className="space-y-4">
                      {topClients.map((client) => {
                        return (
                          <div key={client.identificacion} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                            <div className="flex items-center space-x-3 min-w-0">
                              <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-650 shrink-0">
                                {client.nombres.split(" ").map((n: string) => n.charAt(0)).join("").slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <span className="font-extrabold text-slate-700 block truncate">{client.nombres}</span>
                                <span className="text-[9px] font-mono text-slate-400">{client.identificacion}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-black text-slate-900 block">${client.total.toFixed(2)}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{client.compras} factura{client.compras > 1 ? "s" : ""}</span>
                            </div>
                          </div>
                        );
                      })}
                      {topClients.length === 0 && (
                        <div className="py-8 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                          No hay registros de ventas para este periodo.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Invoices list */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                  <h3 className="text-sm font-bold text-slate-800 tracking-tight">Comprobantes Recientes</h3>
                  <button
                    onClick={() => setActiveTab("history")}
                    className="text-xs text-blue-600 hover:underline font-semibold"
                  >
                    Ver Historial Completo
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {invoices.slice(0, 5).map((inv) => (
                    <div key={inv.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center space-x-4 min-w-0">
                        <div className="h-9 w-9 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-700 truncate">{inv.client.nombres}</p>
                          <div className="flex items-center space-x-2 mt-0.5">
                            <span className="text-[10px] text-slate-400 font-mono">Factura: {inv.secuencial}</span>
                            <span className="text-[10px] text-slate-300">•</span>
                            <span className="text-[10px] text-slate-400">
                              {(() => {
                                const d = new Date(inv.fechaEmision);
                                return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6">
                        <span className={`text-[10px] font-bold uppercase rounded-full px-2 py-0.5 border ${
                          inv.estado === "AUTORIZADA" ? "bg-green-50 border-green-200 text-green-700" :
                          inv.estado === "DEVUELTA" ? "bg-red-50 border-red-200 text-red-700" :
                          "bg-yellow-50 border-yellow-200 text-yellow-700"
                        }`}>
                          {inv.estado}
                        </span>
                        <span className="text-sm font-bold text-slate-700">${inv.total.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                  {invoices.length === 0 && (
                    <div className="px-6 py-10 text-center text-slate-400 text-xs">
                      Aún no se han emitido facturas en este emisor.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: PUNTO DE VENTA (POS) */}
          {activeTab === "pos" && (
            <div className="h-auto lg:h-[calc(100vh-180px)] grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 overflow-y-auto lg:overflow-y-visible animate-fade-in">
              {/* Product Shelf Grid */}
              <div className="col-span-1 lg:col-span-2 flex flex-col justify-between h-[520px] lg:h-full bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                <div className="space-y-4 flex-1 overflow-y-auto">
                  {/* Category filters */}
                  <div className="flex space-x-2 overflow-x-auto pb-1">
                    {getProductCategories().map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setPosCategory(cat)}
                        className={`text-xs font-bold rounded-lg px-3 py-1.5 border transition-colors shrink-0 uppercase ${
                          posCategory === cat
                            ? "bg-slate-800 border-slate-800 text-white"
                            : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Barcode Search box */}
                  <form onSubmit={handleBarcodeSearch} className="flex gap-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Barcode className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Escriba o escanee código de barras..."
                        value={barcodeQuery}
                        onChange={(e) => setBarcodeQuery(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 text-sm transition-colors"
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs px-4 rounded-lg transition-colors"
                    >
                      Búsqueda
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPOSFreeProductModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 rounded-lg transition-colors flex items-center"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Producto Rápido
                    </button>
                  </form>

                  {/* Products card grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {getFilteredPOSProducts().map((prod) => (
                      <button
                        key={prod.id}
                        onClick={() => addToPOSCart(prod)}
                        className="bg-white border border-slate-200 hover:border-blue-300 rounded-xl p-4 text-left transition-all hover:scale-[1.01] active:scale-[0.99] shadow-sm flex flex-col justify-between h-36"
                      >
                        <div>
                          <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider block bg-blue-50/50 border border-blue-100 rounded px-1.5 py-0.5 w-max">
                            {prod.codigoPrincipal}
                          </span>
                          <h4 className="text-xs font-bold text-slate-800 mt-2 truncate w-full uppercase">{prod.nombre}</h4>
                          <p className="text-[10px] text-slate-400 line-clamp-2 mt-1">{prod.descripcion || "N/A"}</p>
                        </div>
                        <div className="flex justify-between items-center mt-2 w-full">
                          <span className="text-xs text-slate-400 font-medium">IVA: {prod.iva}%</span>
                          <span className="text-sm font-black text-slate-800">${prod.precio.toFixed(2)}</span>
                        </div>
                      </button>
                    ))}
                    {products.length === 0 && (
                      <div className="col-span-3 text-center py-20 text-slate-400 text-xs">
                        No hay productos registrados en el catálogo. Vaya a la pestaña "Productos" para agregar.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Cart sidebar & checkout controls */}
              <div className="col-span-1 bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex flex-col justify-between h-[520px] lg:h-full">
                <div className="flex-1 overflow-y-auto space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center">
                      <ShoppingCart className="h-4 w-4 mr-2 text-blue-600" /> Ticket de Caja
                    </h3>
                    <button
                      onClick={() => setPOSCart([])}
                      className="text-xs text-red-500 hover:underline font-semibold"
                    >
                      Limpiar
                    </button>
                  </div>

                  {/* Cart items list */}
                  <div className="space-y-3 divide-y divide-slate-50">
                    {posCart.map((item) => (
                      <div key={item.product.id} className="pt-3 flex justify-between items-center gap-3">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {item.product.imagen ? (
                            <img src={item.product.imagen} alt={item.product.nombre} className="h-8 w-8 rounded-lg object-cover border border-slate-100 bg-slate-50 flex-shrink-0" />
                          ) : (
                            <div className="h-8 w-8 rounded-lg border border-slate-100 bg-slate-50/50 flex items-center justify-center text-slate-400 flex-shrink-0">
                              <ImageIcon className="h-3.5 w-3.5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-700 truncate uppercase">{item.product.nombre}</p>
                            <p className="text-[10px] text-slate-400 font-medium">${item.product.precio.toFixed(2)} c/u</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2.5 ml-4">
                          <button
                            onClick={() => updateCartQty(item.product.id, -1)}
                            className="h-5 w-5 border border-slate-200 hover:bg-slate-100 rounded flex items-center justify-center text-slate-600 transition-colors"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-xs font-bold text-slate-700 w-4 text-center">{item.cantidad}</span>
                          <button
                            onClick={() => updateCartQty(item.product.id, 1)}
                            className="h-5 w-5 border border-slate-200 hover:bg-slate-100 rounded flex items-center justify-center text-slate-600 transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <span className="text-xs font-black text-slate-800 w-16 text-right">
                          ${(item.product.precio * item.cantidad).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {posCart.length === 0 && (
                      <div className="py-20 text-center text-slate-400 text-xs">
                        Agregue productos haciendo clic en ellos o escaneando su código de barras.
                      </div>
                    )}
                  </div>
                </div>

                {/* Subtotals & Payments */}
                <div className="border-t border-slate-100 pt-4 mt-4 space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Subtotal 0%</span>
                      <span className="font-semibold text-slate-700">${calculatePOSTotals().subtotal0.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Subtotal Grabado IVA</span>
                      <span className="font-semibold text-slate-700">${calculatePOSTotals().subtotalIva.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>IVA Cobrado</span>
                      <span className="font-semibold text-slate-700">${calculatePOSTotals().valorIva.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-black border-t border-slate-50 pt-2 text-slate-800">
                      <span>TOTAL A PAGAR</span>
                      <span className="text-base text-blue-600">${calculatePOSTotals().total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Cash Change Calculator */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Efectivo Recibido
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="$0.00"
                        value={posCashReceived}
                        onChange={(e) => setPosCashReceived(e.target.value)}
                        className="block w-full px-3 py-1.5 border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none focus:border-blue-600 text-sm transition-colors"
                      />
                      {parseFloat(posCashReceived) > calculatePOSTotals().total && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-3 rounded-lg flex items-center shrink-0 text-xs font-bold font-mono">
                          Cambio: ${(parseFloat(posCashReceived) - calculatePOSTotals().total).toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Client selector (optional for POS) */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Cliente Asignado
                    </label>
                    <select
                      value={invoiceForm.clientId}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, clientId: e.target.value })}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none focus:border-blue-600"
                    >
                      <option value="">-- Consumidor Final Express --</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.identificacion} - {c.nombres}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <button
                      onClick={() => handlePOSCheckout("9999999999999")}
                      className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-2 rounded-lg text-xs tracking-tight shadow-sm transition-colors flex items-center justify-center"
                    >
                      ⚡ Consumidor Final
                    </button>
                    <button
                      onClick={() => handlePOSCheckout()}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-2 rounded-lg text-xs tracking-tight shadow-sm transition-colors flex items-center justify-center"
                    >
                      Facturar Seleccionado
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: EMITIR FACTURA (BILLING) */}
          {activeTab === "billing" && (
            <div className="max-w-7xl mx-auto space-y-6 animate-fade-in font-sans">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* LEFT COLUMN: Main Billing Forms */}
                <div className="lg:col-span-9 space-y-6">
                  
                  {/* CARD 1: DATOS DEL CLIENTE */}
                  <div className="bg-white border border-[#e8ebf7] rounded-3xl shadow-sm p-6 space-y-6">
                    
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-[#e8ebf7]/60 bg-transparent">
                      <div className="flex items-center space-x-3.5">
                        <div className="h-10 w-10 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600 shadow-2xs">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Datos del Cliente</h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Identidad fiscal del receptor</p>
                        </div>
                      </div>
                      
                      <a
                        href={`https://wa.me/${systemConfig?.adminWhatsapp || "593999999999"}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 font-bold text-xs py-2.5 px-4.5 rounded-2xl shadow-2xs transition-all flex items-center space-x-1.5 self-start sm:self-auto"
                      >
                        <MessageSquare className="h-4 w-4 text-emerald-500 fill-emerald-500" />
                        <span>Contactar a mi Proveedor</span>
                      </a>
                    </div>
                    
                    <div className="space-y-5">
                      {/* Búsqueda Autocompletable */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Búsqueda de cliente
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Escriba nombre, celular, correo o cédula para autocompletar..."
                            value={clientSearch}
                            onChange={(e) => {
                              setClientSearch(e.target.value);
                              setShowClientDropdown(true);
                            }}
                            onFocus={() => setShowClientDropdown(true)}
                            className="block w-full pl-5 pr-11 py-3.5 border border-[#e8ebf7] rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-violet-600/5 focus:border-violet-600 text-xs font-semibold bg-[#fdfdfd] shadow-2xs transition-all"
                          />
                          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-400" />
                          </div>
                          
                          {showClientDropdown && clientSearch.trim().length > 0 && (
                            <div className="absolute z-30 w-full bg-white border border-[#e8ebf7] rounded-2xl shadow-xl mt-2 max-h-56 overflow-y-auto divide-y divide-[#e8ebf7]/40">
                              {clients
                                .filter((c) =>
                                  c.nombres.toLowerCase().includes(clientSearch.toLowerCase()) ||
                                  c.identificacion.includes(clientSearch) ||
                                  c.celular.includes(clientSearch)
                                )
                                .map((c) => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                      setBillingClient({
                                        id: c.id,
                                        nombres: c.nombres,
                                        tipoIdentificacion: c.tipoIdentificacion,
                                        identificacion: c.identificacion,
                                        direccion: c.direccion,
                                        mail: c.mail,
                                        celular: c.celular,
                                        telefono: c.telefono || "029999999",
                                      });
                                      setClientSearch("");
                                      setShowClientDropdown(false);
                                    }}
                                    className="w-full text-left px-5 py-3.5 hover:bg-slate-50/70 text-xs transition-colors flex justify-between items-center"
                                  >
                                    <div>
                                      <p className="font-extrabold text-slate-800">{c.nombres}</p>
                                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">{c.mail} • {c.celular}</p>
                                    </div>
                                    <span className="font-mono bg-violet-50 border border-violet-100 text-violet-700 font-bold px-2.5 py-0.5 rounded-lg text-[9px]">
                                      {c.identificacion}
                                    </span>
                                  </button>
                                ))}
                              {clients.filter((c) =>
                                c.nombres.toLowerCase().includes(clientSearch.toLowerCase()) ||
                                c.identificacion.includes(clientSearch) ||
                                c.celular.includes(clientSearch)
                              ).length === 0 && (
                                <div className="px-5 py-4 text-xs text-slate-400 text-center font-bold">
                                  Ningún cliente registrado coincide.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Grid de Campos Fiscales */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        
                        {/* Identificación */}
                        <div className="md:col-span-3 space-y-1.5">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Identificación
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={billingClient.identificacion}
                              onChange={(e) => {
                                const val = e.target.value;
                                  setBillingClient({ ...billingClient, identificacion: val });
                                  if (val.trim().length === 10 || val.trim().length === 13) {
                                    handleLookupBillingClient(val);
                                  }
                              }}
                              className="block w-full px-4 py-3 border border-[#e8ebf7] rounded-2xl text-slate-850 font-bold placeholder-slate-400 focus:outline-none focus:border-violet-600 focus:ring-4 focus:ring-violet-600/5 text-xs bg-[#fdfdfd] shadow-2xs transition-all"
                            />
                            {lookingUpBillingClient && (
                              <div className="absolute right-3 top-3">
                                <RefreshCw className="h-4 w-4 text-violet-600 animate-spin" />
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Razón Social */}
                        <div className="md:col-span-6 space-y-1.5">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Razón Social
                          </label>
                          <input
                            type="text"
                            value={billingClient.nombres}
                            onChange={(e) => setBillingClient({ ...billingClient, nombres: e.target.value.toUpperCase() })}
                            className="block w-full px-4 py-3 border border-[#e8ebf7] rounded-2xl text-slate-900 font-extrabold placeholder-slate-400 focus:outline-none focus:border-violet-600 focus:ring-4 focus:ring-violet-600/5 text-xs bg-[#fdfdfd] shadow-2xs transition-all"
                          />
                        </div>
                        
                        {/* Tipo Identificación */}
                        <div className="md:col-span-3 space-y-1.5">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Tipo Identificación
                          </label>
                          <select
                            value={billingClient.tipoIdentificacion}
                            onChange={(e) => setBillingClient({ ...billingClient, tipoIdentificacion: e.target.value })}
                            className="block w-full px-4 py-3 border border-[#e8ebf7] rounded-2xl text-slate-800 font-extrabold focus:outline-none focus:border-violet-600 focus:ring-4 focus:ring-violet-600/5 text-xs bg-[#fdfdfd] shadow-2xs transition-all cursor-pointer"
                          >
                            <option value="07">C. FINAL</option>
                            <option value="05">CÉDULA</option>
                            <option value="04">RUC</option>
                            <option value="06">PASAPORTE</option>
                          </select>
                        </div>
                        
                        {/* Dirección Principal */}
                        <div className="md:col-span-7 space-y-1.5">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Dirección Principal
                          </label>
                          <input
                            type="text"
                            value={billingClient.direccion}
                            onChange={(e) => setBillingClient({ ...billingClient, direccion: e.target.value })}
                            className="block w-full px-4 py-3 border border-[#e8ebf7] rounded-2xl text-slate-800 font-semibold placeholder-slate-400 focus:outline-none focus:border-violet-600 focus:ring-4 focus:ring-violet-600/5 text-xs bg-[#fdfdfd] shadow-2xs transition-all"
                          />
                        </div>
                        
                        {/* Correo Electrónico */}
                        <div className="md:col-span-5 space-y-1.5">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Correo Electrónico
                          </label>
                          <input
                            type="email"
                            value={billingClient.mail}
                            onChange={(e) => setBillingClient({ ...billingClient, mail: e.target.value })}
                            className="block w-full px-4 py-3 border border-[#e8ebf7] rounded-2xl text-slate-850 font-semibold placeholder-slate-400 focus:outline-none focus:border-violet-600 focus:ring-4 focus:ring-violet-600/5 text-xs bg-[#fdfdfd] shadow-2xs transition-all"
                          />
                        </div>
                        
                        {/* Celular */}
                        <div className="md:col-span-3 space-y-1.5">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Celular
                          </label>
                          <input
                            type="text"
                            value={billingClient.celular}
                            onChange={(e) => setBillingClient({ ...billingClient, celular: e.target.value })}
                            className="block w-full px-4 py-3 border border-[#e8ebf7] rounded-2xl text-slate-850 font-semibold placeholder-slate-400 focus:outline-none focus:border-violet-600 focus:ring-4 focus:ring-violet-600/5 text-xs bg-[#fdfdfd] shadow-2xs transition-all"
                          />
                        </div>
                        
                        {/* Teléfono */}
                        <div className="md:col-span-3 space-y-1.5">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Teléfono
                          </label>
                          <input
                            type="text"
                            value={billingClient.telefono}
                            onChange={(e) => setBillingClient({ ...billingClient, telefono: e.target.value })}
                            className="block w-full px-4 py-3 border border-[#e8ebf7] rounded-2xl text-slate-855 font-semibold placeholder-slate-400 focus:outline-none focus:border-violet-600 focus:ring-4 focus:ring-violet-600/5 text-xs bg-[#fdfdfd] shadow-2xs transition-all"
                          />
                        </div>
                        
                        {/* Historial de Compras */}
                        <div className="md:col-span-6 border border-violet-100 bg-violet-50/15 rounded-2xl p-4 flex justify-between items-center shadow-2xs">
                          <div>
                            <p className="text-[10px] font-black text-violet-600 uppercase tracking-widest">
                              Historial de Compras
                            </p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Resumen acumulado del cliente</p>
                          </div>
                          <div>
                            {getClientPurchaseHistory(billingClient.identificacion).count > 0 ? (
                              <div className="text-right">
                                <span className="inline-block bg-violet-100 text-violet-700 border border-violet-200/50 text-[9px] font-bold px-2.5 py-0.5 rounded-full mb-1">
                                  {getClientPurchaseHistory(billingClient.identificacion).count} facturas
                                </span>
                                <p className="text-xs font-black text-slate-900 font-mono">
                                  Total: ${getClientPurchaseHistory(billingClient.identificacion).total.toFixed(2)}
                                </p>
                              </div>
                            ) : (
                              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
                                Sin Historial Previo
                              </span>
                            )}
                          </div>
                        </div>
                        
                      </div>
                    </div>
                  </div>
                  
                  {/* CARD 2: DETALLE / DESCRIPCIÓN DEL ÍTEM */}
                  <div className="bg-white border border-[#e8ebf7] rounded-3xl shadow-sm overflow-hidden">
                    
                    {/* Encabezado Principal */}
                    <div className="bg-transparent px-6 py-5 flex justify-between items-center text-slate-800 border-b border-[#e8ebf7]/60">
                      <div className="flex items-center space-x-2.5">
                        <div className="h-2 w-2 bg-violet-600 rounded-full animate-pulse" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">
                          Detalle / Descripción del Ítem
                        </h3>
                      </div>
                      
                      <div className="hidden sm:flex items-center space-x-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <span>CANT.</span>
                        <span>V. UNIT</span>
                        <span>DESC.</span>
                        <span>IVA</span>
                        <span>SUBTOTAL</span>
                      </div>
                    </div>
                    
                    {/* Fila Activa de Registro Rápido */}
                    <div className="p-5 bg-slate-50/50 border-b border-[#e8ebf7]/60">
                      <div className="flex flex-col sm:flex-row gap-3 items-end w-full">
                        
                        {/* Buscador de Producto */}
                        <div className="flex-1 min-w-[200px] w-full space-y-1.5">
                          <div className="flex justify-between items-center">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              Buscar producto
                            </label>
                            <div className="flex space-x-2 text-[9px] font-black uppercase tracking-wider">
                              <button
                                type="button"
                                onClick={() => setShowExtraNotes(!showExtraNotes)}
                                className="text-violet-600 hover:text-violet-750 transition-colors flex items-center space-x-0.5"
                              >
                                <span>{showExtraNotes ? "v Ocultar Notas" : "v Notas extra"}</span>
                              </button>
                              <span className="text-slate-300">|</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setManualProductForm({
                                    nombre: "",
                                    descripcion: "",
                                    cantidad: "1",
                                    iva: "15",
                                    precioSinIva: "0",
                                    precioConIva: "0",
                                    descuento: "0",
                                    notaExtra1: "",
                                    notaExtra2: "",
                                    imagen: "",
                                    saveToCatalog: false,
                                  });
                                  setShowManualProductModal(true);
                                }}
                                className="text-emerald-600 hover:text-emerald-750 transition-colors"
                              >
                                + Agregar sin registrar
                              </button>
                            </div>
                          </div>
                          
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Escribe para buscar un producto..."
                              value={productSearch}
                              onChange={(e) => {
                                setProductSearch(e.target.value);
                                setShowProductDropdown(true);
                              }}
                              onFocus={() => setShowProductDropdown(true)}
                              className="block w-full px-4 py-3 border border-[#e8ebf7] rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-violet-600 focus:ring-4 focus:ring-violet-600/5 text-xs font-semibold bg-white shadow-2xs transition-all"
                            />
                            
                            {showProductDropdown && productSearch.trim().length > 0 && (
                              <div className="absolute z-20 w-full bg-white border border-[#e8ebf7] rounded-2xl shadow-xl mt-2 max-h-48 overflow-y-auto divide-y divide-[#e8ebf7]/40 font-sans">
                                {products
                                  .filter((p) =>
                                    p.nombre.toLowerCase().includes(productSearch.toLowerCase()) ||
                                    p.codigoPrincipal.includes(productSearch)
                                  )
                                  .map((p) => (
                                    <button
                                      key={p.id}
                                      type="button"
                                      onClick={() => {
                                        setActiveItem({
                                          productId: String(p.id),
                                          nombre: p.nombre,
                                          precio: String(p.precio),
                                          iva: String(p.iva),
                                          cantidad: "1",
                                          descuento: "0",
                                          notaExtra1: "",
                                          notaExtra2: "",
                                          isDynamic: false,
                                        });
                                        setProductSearch(p.nombre);
                                        setShowProductDropdown(false);
                                      }}
                                      className="w-full text-left px-4 py-3 hover:bg-slate-50/70 text-[11px] transition-colors flex justify-between items-center"
                                    >
                                      <div>
                                        <p className="font-extrabold text-slate-800">{p.nombre}</p>
                                        <p className="text-[9px] text-slate-400 font-bold mt-0.5">Código: {p.codigoPrincipal}</p>
                                      </div>
                                      <span className="font-extrabold text-violet-600 font-mono text-[11px]">
                                        ${p.precio.toFixed(2)}
                                      </span>
                                    </button>
                                  ))}
                                {products.filter((p) =>
                                  p.nombre.toLowerCase().includes(productSearch.toLowerCase()) ||
                                  p.codigoPrincipal.includes(productSearch)
                                ).length === 0 && (
                                  <div className="px-4 py-3 text-[10px] text-slate-400 text-center font-bold">
                                    Ningún producto del catálogo coincide.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Cantidad */}
                        <div className="w-full sm:w-16 space-y-1.5 shrink-0">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                            Cant.
                          </label>
                          <input
                            type="number"
                            min="1"
                            step="any"
                            value={activeItem.cantidad}
                            onChange={(e) => setActiveItem({ ...activeItem, cantidad: e.target.value })}
                            className="block w-full px-2 py-3 border border-[#e8ebf7] rounded-2xl text-slate-800 text-center focus:outline-none focus:border-violet-600 focus:ring-4 focus:ring-violet-600/5 text-xs bg-white font-extrabold shadow-2xs"
                          />
                        </div>
                        
                        {/* V. Unit */}
                        <div className="w-full sm:w-24 space-y-1.5 shrink-0">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                            V. Unit
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={activeItem.precio}
                            onChange={(e) => setActiveItem({ ...activeItem, precio: e.target.value })}
                            className="block w-full px-2 py-3 border border-[#e8ebf7] rounded-2xl text-slate-900 text-center focus:outline-none focus:border-violet-600 focus:ring-4 focus:ring-violet-600/5 text-xs bg-white font-extrabold text-violet-650 shadow-2xs"
                          />
                        </div>
                        
                        {/* Desc. */}
                        <div className="w-full sm:w-16 space-y-1.5 shrink-0">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                            Desc.
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={activeItem.descuento}
                            onChange={(e) => setActiveItem({ ...activeItem, descuento: e.target.value })}
                            className="block w-full px-2 py-3 border border-[#e8ebf7] rounded-2xl text-slate-900 text-center focus:outline-none focus:border-violet-600 focus:ring-4 focus:ring-violet-600/5 text-xs bg-white font-extrabold text-orange-600 shadow-2xs"
                          />
                        </div>
                        
                        {/* IVA */}
                        <div className="w-full sm:w-24 space-y-1.5 shrink-0">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                            IVA
                          </label>
                          <select
                            value={activeItem.iva}
                            onChange={(e) => setActiveItem({ ...activeItem, iva: e.target.value })}
                            className="block w-full px-2 py-3 border border-[#e8ebf7] rounded-2xl text-slate-800 text-center focus:outline-none focus:border-violet-600 focus:ring-4 focus:ring-violet-600/5 text-xs bg-white font-extrabold shadow-2xs cursor-pointer"
                          >
                            <option value="15">15%</option>
                            <option value="12">12%</option>
                            <option value="8">8%</option>
                            <option value="5">5%</option>
                            <option value="0">0%</option>
                          </select>
                        </div>
                        
                        {/* Botón Añadir */}
                        <div className="w-full sm:w-24 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (!activeItem.nombre.trim()) {
                                alert("Por favor escriba o busque un producto primero.");
                                return;
                              }
                              setAddedItems(prev => [...prev, { ...activeItem }]);
                              // Reset active
                              setActiveItem({
                                productId: "",
                                nombre: "",
                                precio: "0",
                                iva: "15",
                                cantidad: "1",
                                descuento: "0",
                                notaExtra1: "",
                                notaExtra2: "",
                              });
                              setProductSearch("");
                            }}
                            className="w-full bg-violet-600 hover:bg-violet-750 text-white font-extrabold text-xs py-3.5 px-3 rounded-2xl shadow-md shadow-violet-600/10 transition-all text-center flex items-center justify-center"
                          >
                            + Añadir
                          </button>
                        </div>
                        
                      </div>
                      
                      {/* Notas Extra Expansibles */}
                      {showExtraNotes && (
                        <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-200/50 animate-fade-in">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Nota Extra 1 (ej. Color)
                            </label>
                            <input
                              type="text"
                              placeholder="Color Rojo, Talla M, etc."
                              value={activeItem.notaExtra1}
                              onChange={(e) => setActiveItem({ ...activeItem, notaExtra1: e.target.value })}
                              className="block w-full px-3 py-1.5 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 text-xs bg-white focus:outline-none focus:border-blue-600"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Nota Extra 2 (ej. Detalle o Empaque)
                            </label>
                            <input
                              type="text"
                              placeholder="Con estuche, Caja especial, etc."
                              value={activeItem.notaExtra2}
                              onChange={(e) => setActiveItem({ ...activeItem, notaExtra2: e.target.value })}
                              className="block w-full px-3 py-1.5 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 text-xs bg-white focus:outline-none focus:border-blue-600"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Lista de Ítems Agregados en Formato Factura POS */}
                    <div className="overflow-x-auto max-h-80 overflow-y-auto">
                      <table className="w-full text-left text-xs divide-y divide-[#e8ebf7]/40">
                        <thead className="bg-[#f3f4fd]/50 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky top-0 backdrop-blur-md">
                          <tr>
                            <th className="px-6 py-4 w-[45%]">Descripción del Item</th>
                            <th className="px-4 py-4 text-center">Cant.</th>
                            <th className="px-4 py-4 text-right">Precio Unit.</th>
                            <th className="px-4 py-4 text-right">Desc.</th>
                            <th className="px-4 py-4 text-center">IVA</th>
                            <th className="px-4 py-4 text-right">Subtotal</th>
                            <th className="px-6 py-4 w-10 text-center">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e8ebf7]/30 text-slate-700">
                          {addedItems.map((item, index) => {
                            const cant = parseFloat(item.cantidad) || 0;
                            const price = parseFloat(item.precio) || 0;
                            const desc = parseFloat(item.descuento) || 0;
                            const sub = price * cant - desc;
                            
                            return (
                              <tr key={index} className="hover:bg-slate-50/40 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="font-extrabold text-slate-800">{item.nombre}</div>
                                  {(item.notaExtra1 || item.notaExtra2) && (
                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                      {item.notaExtra1 && (
                                        <span className="bg-violet-50 border border-violet-100 text-violet-750 text-[9px] font-bold px-2 py-0.5 rounded-lg shadow-3xs">
                                          {item.notaExtra1}
                                        </span>
                                      )}
                                      {item.notaExtra2 && (
                                        <span className="bg-purple-50 border border-purple-100 text-purple-750 text-[9px] font-bold px-2 py-0.5 rounded-lg shadow-3xs">
                                          {item.notaExtra2}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-4 text-center font-extrabold text-slate-700">{cant}</td>
                                <td className="px-4 py-4 text-right font-bold text-slate-500 font-mono">${price.toFixed(2)}</td>
                                <td className="px-4 py-4 text-right font-bold text-orange-650 font-mono">${desc.toFixed(2)}</td>
                                <td className="px-4 py-4 text-center">
                                  <span className="bg-slate-100 border border-slate-200/60 text-slate-600 text-[9px] font-bold px-2.5 py-0.5 rounded-lg">
                                    {item.iva}%
                                  </span>
                                </td>
                                <td className="px-4 py-4 text-right font-black text-slate-900 font-mono">${sub.toFixed(2)}</td>
                                <td className="px-6 py-4 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setAddedItems(prev => prev.filter((_, i) => i !== index))}
                                    className="h-8 w-8 rounded-xl border border-[#e8ebf7] bg-white flex items-center justify-center text-red-500 hover:bg-red-50 hover:border-red-200/60 transition-all shadow-3xs"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          
                          {addedItems.length === 0 && (
                            <tr>
                              <td colSpan={7} className="py-20 text-center text-slate-400 text-xs bg-transparent">
                                <div className="space-y-2">
                                  <p className="font-black uppercase text-[10px] tracking-widest text-slate-350">
                                    Sin ítems agregados
                                  </p>
                                  <p className="text-[11px] font-bold text-slate-400">
                                    Busque productos en la fila de arriba o pulse "+ Agregar sin registrar"
                                  </p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* CARD 3: MÉTODOS DE PAGO Y NOTAS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Métodos de Pago */}
                    <div className="bg-white border border-[#e8ebf7] rounded-3xl shadow-sm p-6 space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <CreditCard className="h-4.5 w-4.5 text-slate-500" />
                          <h4 className="text-xs font-black uppercase tracking-widest text-slate-700">
                            Métodos de Pago
                          </h4>
                          
                          {/* Asistente visual de cuadre */}
                          {(() => {
                            const paymentsSum = billingPayments.reduce((acc, p) => acc + (parseFloat(p.total) || 0), 0);
                            const invoiceTotal = calculateNewInvoiceTotals().total;
                            const paymentDiff = invoiceTotal - paymentsSum;
                            
                            return (
                              <div className="flex items-center space-x-1.5">
                                {Math.abs(paymentDiff) < 0.01 ? (
                                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/50 rounded-xl px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-3xs animate-fade-in">
                                    ✓ Cuadrado
                                  </span>
                                ) : paymentDiff > 0.01 ? (
                                  <span className="bg-amber-50 text-amber-700 border border-amber-200/50 rounded-xl px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-3xs animate-pulse">
                                    Faltan ${paymentDiff.toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="bg-red-50 text-red-700 border border-red-200/50 rounded-xl px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-3xs animate-pulse">
                                    Exceso ${Math.abs(paymentDiff).toFixed(2)}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        <button
                          type="button"
                          onClick={() => setBillingPayments([...billingPayments, { formaPago: "01", total: "0.00" }])}
                          className="bg-[#f3f4fd] hover:bg-[#e8ebf7] text-violet-650 border border-violet-100 font-extrabold text-[10px] px-3 py-1.5 rounded-xl transition-all"
                        >
                          + Añadir
                        </button>
                      </div>
                      
                      <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1">
                        {billingPayments.map((p, idx) => (
                          <div key={idx} className="flex gap-2 items-center animate-fade-in">
                            <select
                              value={p.formaPago}
                              onChange={(e) => {
                                const newPayments = [...billingPayments];
                                newPayments[idx].formaPago = e.target.value;
                                setBillingPayments(newPayments);
                              }}
                              className="block w-full px-3 py-2.5 border border-[#e8ebf7] rounded-2xl text-[11px] font-bold text-slate-700 bg-white focus:outline-none focus:border-violet-600 focus:ring-4 focus:ring-violet-600/5 transition-all shadow-2xs cursor-pointer"
                            >
                              <option value="01">SIN UTILIZACION DEL SISTEMA FINANCIERO</option>
                              <option value="15">COMPENSACIÓN DE DEUDAS</option>
                              <option value="16">TARJETA DE DEBITO</option>
                              <option value="17">DINERO ELECTRÓNICO</option>
                              <option value="18">TARJETA PREPAGO</option>
                              <option value="19">TARJETA DE CREDITO</option>
                              <option value="20">OTROS CON UTILIZACION DEL SISTEMA FINANCIERO</option>
                              <option value="21">ENDOSO DE TÍTULOS</option>
                            </select>
                            
                            <input
                              type="number"
                              step="any"
                              value={p.total}
                              onChange={(e) => {
                                const newPayments = [...billingPayments];
                                newPayments[idx].total = e.target.value;
                                setBillingPayments(newPayments);
                              }}
                              className="block w-28 px-3 py-2.5 border border-[#e8ebf7] rounded-2xl text-center focus:outline-none focus:border-violet-600 focus:ring-4 focus:ring-violet-600/5 text-xs bg-white font-extrabold text-slate-900 shadow-2xs"
                            />
                            
                            {billingPayments.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setBillingPayments(billingPayments.filter((_, i) => i !== idx))}
                                className="p-2.5 text-red-500 hover:bg-red-50 border border-[#e8ebf7] rounded-2xl transition-all bg-white shadow-2xs"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Notas del Comprobante */}
                    <div className="bg-white border border-[#e8ebf7] rounded-3xl shadow-sm p-6 space-y-4">
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="h-4.5 w-4.5 text-slate-500" />
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-700">
                          Notas del Comprobante
                        </h4>
                      </div>
                      
                      <textarea
                        rows={3}
                        placeholder="Agrega cualquier observación para el cliente..."
                        value={billingObservaciones}
                        onChange={(e) => setBillingObservaciones(e.target.value)}
                        className="block w-full p-3 border border-slate-200 rounded-2xl text-xs placeholder-slate-400 focus:outline-none focus:border-blue-600 bg-white"
                      />
                    </div>
                    
                  </div>
                </div>
                
                {/* RIGHT COLUMN: Real-Time Totals Sidebar */}
                <div className="lg:col-span-3 space-y-6">
                  
                  {/* Totals Panel */}
                  <div className="bg-white border border-[#e8ebf7] rounded-3xl p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-15 pointer-events-none text-violet-200">
                      <Wallet className="h-36 w-36" />
                    </div>
                    
                    <div className="space-y-4 relative z-10 font-sans">
                      
                      {/* Subtotal Neto */}
                      <div className="flex justify-between border-b border-[#e8ebf7]/60 pb-3">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                          Subtotal Neto
                        </span>
                        <span className="font-bold font-mono text-xs text-slate-800">
                          ${calculateNewInvoiceTotals().subtotalIva.toFixed(2)}
                        </span>
                      </div>
                      
                      {/* Total IVA */}
                      <div className="flex justify-between border-b border-[#e8ebf7]/60 pb-3">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                          Total IVA
                        </span>
                        <span className="font-bold font-mono text-xs text-slate-800">
                          ${calculateNewInvoiceTotals().valorIva.toFixed(2)}
                        </span>
                      </div>
                      
                      {/* Total Final */}
                      <div className="space-y-1 pt-2">
                        <span className="text-[9px] text-violet-650 font-black uppercase tracking-widest block">
                          Total Final
                        </span>
                        <p className="text-4xl font-black tracking-tight text-slate-900 font-mono">
                          ${calculateNewInvoiceTotals().total.toFixed(2)}
                        </p>
                      </div>
                      
                      {/* Botón Emitir Factura */}
                      <button
                        type="button"
                        onClick={handleNewSubmitInvoice}
                        disabled={addedItems.length === 0}
                        className="w-full bg-violet-600 hover:bg-violet-750 text-white font-extrabold py-4 px-4 rounded-2xl shadow-md shadow-violet-600/10 text-xs uppercase tracking-widest transition-all mt-4 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center space-x-2"
                      >
                        <span>Emitir Factura</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Action Bar */}
                  <div className="bg-white border border-[#e8ebf7] rounded-3xl p-6 shadow-sm space-y-4">
                    
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setShowTicketPreviewModal(true)}
                        className="bg-[#f3f4fd]/50 hover:bg-[#e8ebf7]/80 text-violet-750 border border-violet-100/65 font-bold py-3 px-2 rounded-2xl text-[10px] transition-all flex items-center justify-center space-x-1 shadow-2xs"
                      >
                        <span>👁 Previsualizar</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleClearBillingForm}
                        className="bg-[#f3f4fd]/50 hover:bg-[#e8ebf7]/80 text-violet-750 border border-violet-100/65 font-bold py-3 px-2 rounded-2xl text-[10px] transition-all flex items-center justify-center space-x-1 shadow-2xs"
                      >
                        <span>↺ Reiniciar</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveBillingDraft}
                        className="bg-[#f3f4fd]/50 hover:bg-[#e8ebf7]/80 text-violet-750 border border-violet-100/65 font-bold py-3 px-2 rounded-2xl text-[10px] transition-all shadow-2xs"
                      >
                        📁 Guardar
                      </button>
                      <button
                        type="button"
                        onClick={handleLoadBillingDraft}
                        className="bg-[#f3f4fd]/50 hover:bg-[#e8ebf7]/80 text-violet-750 border border-violet-100/65 font-bold py-3 px-2 rounded-2xl text-[10px] transition-all shadow-2xs"
                      >
                        📂 Cargar
                      </button>
                    </div>
                    
                    {/* Calculator Vuelto */}
                    <div className="border-t border-[#e8ebf7]/60 pt-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Recibe:
                        </span>
                        <input
                          type="number"
                          step="any"
                          value={billingCashReceived}
                          onChange={(e) => setBillingCashReceived(e.target.value)}
                          className="w-24 px-3 py-2 border border-[#e8ebf7] rounded-xl text-right text-xs bg-slate-50 focus:outline-none focus:border-violet-600 font-extrabold shadow-2xs"
                        />
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Vuelto:
                        </span>
                        <span className="font-black text-sm text-emerald-600 font-mono">
                          ${calculateChange().toFixed(2)}
                        </span>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={handleClearBillingForm}
                      className="w-full bg-red-50 hover:bg-red-100 text-red-700 font-extrabold py-3 px-4 rounded-2xl border border-red-200/60 transition-colors text-[10px] uppercase tracking-widest text-center shadow-2xs"
                    >
                      🧹 Limpiar Todo
                    </button>
                    
                  </div>
                </div>
                
              </div>
            </div>
          )}

          {/* TAB: HISTORIAL */}
          {activeTab === "history" && (
            <div className="space-y-4 animate-fade-in font-sans">
              
              {/* TARJETA DE FILTROS Y BOTONERA DE EXPORTACIÓN */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-blue-600" /> Historial de Comprobantes SRI
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Filtra facturas por Cédula, RUC, Pasaporte, fechas o estado, y exporta reportes contables para declaraciones.
                    </p>
                  </div>

                  {/* BOTONERA DE EXPORTACIÓN CONTABLE */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleExportHistory("pdf")}
                      className="inline-flex items-center text-xs font-bold bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 px-3.5 py-2 rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer"
                    >
                      <Download className="h-4 w-4 mr-1.5 text-rose-600" /> Exportar PDF Contable
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportHistory("xlsx")}
                      className="inline-flex items-center text-xs font-bold bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-3.5 py-2 rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer"
                    >
                      <Download className="h-4 w-4 mr-1.5 text-emerald-600" /> Exportar Excel (.xlsx)
                    </button>
                  </div>
                </div>

                {/* FILTROS INTERACTIVOS */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  
                  {/* Buscador Cédula / RUC / Pasaporte / Secuencial */}
                  <div className="md:col-span-2 relative">
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                      Cédula / RUC / Pasaporte / Secuencial
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Buscar por Cédula, RUC, Pasaporte o Nº Secuencial..."
                        value={historySearch}
                        onChange={(e) => {
                          setHistorySearch(e.target.value);
                          setHistoryPage(1);
                          fetchInvoices(1, e.target.value, historyStartDate, historyEndDate, historyStatus);
                        }}
                        className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 text-xs bg-slate-50/50 focus:bg-white font-medium"
                      />
                    </div>
                  </div>

                  {/* Selector Fecha Desde */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                      Fecha Desde
                    </label>
                    <input
                      type="date"
                      value={historyStartDate}
                      onChange={(e) => {
                        setHistoryStartDate(e.target.value);
                        setHistoryPage(1);
                        fetchInvoices(1, historySearch, e.target.value, historyEndDate, historyStatus);
                      }}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:border-blue-600 font-medium"
                    />
                  </div>

                  {/* Selector Fecha Hasta */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                      Fecha Hasta
                    </label>
                    <input
                      type="date"
                      value={historyEndDate}
                      onChange={(e) => {
                        setHistoryEndDate(e.target.value);
                        setHistoryPage(1);
                        fetchInvoices(1, historySearch, historyStartDate, e.target.value, historyStatus);
                      }}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:border-blue-600 font-medium"
                    />
                  </div>

                </div>

                {/* SEGUNDA FILA: PRESETS DE FECHA Y FILTRO DE ESTADO */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase mr-1">Rango Rápido:</span>
                    <button
                      type="button"
                      onClick={() => handleApplyDatePreset("MONTH")}
                      className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 rounded-lg text-slate-600 transition-colors"
                    >
                      Mes Actual
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyDatePreset("SEMESTER")}
                      className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 rounded-lg text-slate-600 transition-colors"
                    >
                      Semestre Actual
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyDatePreset("YEAR")}
                      className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 rounded-lg text-slate-600 transition-colors"
                    >
                      Año Actual
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyDatePreset("CLEAR")}
                      className="px-2.5 py-1 text-[11px] font-bold bg-slate-200/60 hover:bg-slate-200 border border-slate-300 rounded-lg text-slate-700 transition-colors"
                    >
                      🧹 Limpiar Filtros
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Estado SRI:</span>
                    <select
                      value={historyStatus}
                      onChange={(e) => {
                        setHistoryStatus(e.target.value);
                        setHistoryPage(1);
                        fetchInvoices(1, historySearch, historyStartDate, historyEndDate, e.target.value);
                      }}
                      className="px-3 py-1.5 border border-slate-200 rounded-xl text-slate-700 text-xs font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600"
                    >
                      <option value="ALL">Todos los Estados</option>
                      <option value="AUTORIZADA">AUTORIZADA</option>
                      <option value="CREADA">CREADA / PENDIENTE</option>
                      <option value="DEVUELTA">DEVUELTA</option>
                      <option value="RECHAZADA">RECHAZADA</option>
                      <option value="ANULADA">ANULADA</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* TABLA DE FACTURAS PAGINADA */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                <div className="px-6 py-3.5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                  <h4 className="text-xs font-bold text-slate-700 tracking-tight">
                    Comprobantes ({historyPagination.total} encontrados)
                  </h4>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Mostrando máximo 30 por página
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3">Secuencial</th>
                        <th className="px-6 py-3">Fecha Emisión</th>
                        <th className="px-6 py-3">Identificación Cliente</th>
                        <th className="px-6 py-3">Cliente Receptor</th>
                        <th className="px-6 py-3 text-right">Monto Total</th>
                        <th className="px-6 py-3 text-center">Estado SRI</th>
                        <th className="px-6 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-slate-700">
                            {(inv as any).issuer?.establecimiento || issuer?.establecimiento || "001"}-{(inv as any).issuer?.puntoEmision || issuer?.puntoEmision || "001"}-{inv.secuencial}
                          </td>
                          <td className="px-6 py-4 text-slate-500">
                            {(() => {
                              const d = new Date(inv.fechaEmision);
                              return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
                            })()}
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-600 font-bold">{inv.client.identificacion}</td>
                          <td className="px-6 py-4 font-bold text-slate-800 uppercase">{inv.client.nombres}</td>
                          <td className="px-6 py-4 text-right font-black text-slate-800">${inv.total.toFixed(2)}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`text-[9px] font-black uppercase rounded-full px-2.5 py-0.5 border ${
                              inv.estado === "AUTORIZADA" ? "bg-green-50 border-green-200 text-green-700" :
                              inv.estado === "DEVUELTA" ? "bg-red-50 border-red-200 text-red-700" :
                              "bg-yellow-50 border-yellow-200 text-yellow-700"
                            }`}>
                              {inv.estado}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                            {inv.estado !== "AUTORIZADA" && (
                              <button
                                disabled={queryingInvoiceId === inv.id}
                                onClick={() => handleQuerySri(inv.id)}
                                className="inline-flex items-center text-[10px] font-semibold border border-yellow-200 bg-yellow-50 text-yellow-700 px-2 py-1 rounded-lg hover:bg-yellow-100 transition-colors disabled:opacity-50"
                              >
                                <RefreshCw className={`h-3 w-3 mr-1 ${queryingInvoiceId === inv.id ? "animate-spin" : ""}`} />
                                Consultar SRI
                              </button>
                            )}
                            {inv.estado === "AUTORIZADA" && (
                              <>
                                <button
                                  onClick={() => setPreviewInvoice(inv)}
                                  className="inline-flex items-center text-[10px] font-semibold border border-purple-200 bg-purple-50 text-purple-700 px-2 py-1 rounded-lg hover:bg-purple-100 transition-colors"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Previsualizar
                                </button>

                                <button
                                  onClick={() => {
                                    setCancelModalInvoice(inv);
                                    setCancelTab("SRI");
                                    setCancelMotivo("");
                                    setShowCancelModal(true);
                                  }}
                                  className="inline-flex items-center text-[10px] font-semibold border border-rose-200 bg-rose-50 text-rose-700 px-2 py-1 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
                                >
                                  <AlertTriangle className="h-3 w-3 mr-1 text-rose-600" />
                                  Anular / NC
                                </button>

                                <button
                                  disabled={resendingId === inv.id}
                                  onClick={() => handleResendEmail(inv.id)}
                                  className="inline-flex items-center text-[10px] font-semibold border border-blue-200 bg-blue-50 text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                                >
                                  <Mail className="h-3 w-3 mr-1" />
                                  Correo
                                </button>
                                
                                <a
                                  href={`/api/invoices/download-pdf?id=${inv.id}`}
                                  download={`FACTURA-${inv.secuencial}.pdf`}
                                  className="inline-flex items-center text-[10px] font-semibold border border-slate-200 bg-white text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  PDF (RIDE)
                                </a>

                                <a
                                  href={`/api/invoices/download-xml?id=${inv.id}`}
                                  download={`FACTURA-${inv.secuencial}.xml`}
                                  className="inline-flex items-center text-[10px] font-semibold border border-slate-200 bg-white text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  XML
                                </a>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                      {invoices.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-xs">
                            No se encontraron comprobantes emitidos que coincidan con los filtros seleccionados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* BARRA DE PAGINACIÓN */}
                {historyPagination.totalPages > 1 && (
                  <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <span className="text-slate-500 text-[11px] font-medium">
                      Página <strong>{historyPagination.page}</strong> de <strong>{historyPagination.totalPages}</strong> ({historyPagination.total} registros en total)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={historyPagination.page <= 1}
                        onClick={() => {
                          const newP = historyPagination.page - 1;
                          setHistoryPage(newP);
                          fetchInvoices(newP);
                        }}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-white disabled:opacity-40 text-xs font-semibold"
                      >
                        &lt; Anterior
                      </button>
                      
                      {Array.from({ length: historyPagination.totalPages }, (_, i) => i + 1).map((pNum) => (
                        <button
                          key={pNum}
                          type="button"
                          onClick={() => {
                            setHistoryPage(pNum);
                            fetchInvoices(pNum);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                            pNum === historyPagination.page
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {pNum}
                        </button>
                      ))}

                      <button
                        type="button"
                        disabled={historyPagination.page >= historyPagination.totalPages}
                        onClick={() => {
                          const newP = historyPagination.page + 1;
                          setHistoryPage(newP);
                          fetchInvoices(newP);
                        }}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-white disabled:opacity-40 text-xs font-semibold"
                      >
                        Siguiente &gt;
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB: CLIENTS */}
          {activeTab === "clients" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative w-full sm:w-80">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar clientes por nombre o cédula..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 text-xs transition-colors bg-white shadow-sm"
                  />
                </div>
                <button
                  onClick={() => {
                    setClientForm({ id: "", nombres: "", tipoIdentificacion: "05", identificacion: "", direccion: "", mail: "", celular: "" });
                    setShowClientModal(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center w-full sm:w-auto justify-center"
                >
                  <Plus className="h-4 w-4 mr-1" /> Agregar Cliente
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3">Identificación</th>
                        <th className="px-6 py-3">Tipo Doc</th>
                        <th className="px-6 py-3">Nombres / Razón Social</th>
                        <th className="px-6 py-3">Dirección</th>
                        <th className="px-6 py-3">Email</th>
                        <th className="px-6 py-3">Celular</th>
                        <th className="px-6 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {clients
                        .filter((c) =>
                          c.nombres.toLowerCase().includes(clientSearch.toLowerCase()) ||
                          c.identificacion.includes(clientSearch)
                        )
                        .map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50/20 transition-colors">
                            <td className="px-6 py-4 font-mono font-bold text-slate-700">{c.identificacion}</td>
                            <td className="px-6 py-4 text-slate-400 font-bold">
                              {c.tipoIdentificacion === "04" && "RUC"}
                              {c.tipoIdentificacion === "05" && "CÉDULA"}
                              {c.tipoIdentificacion === "06" && "PASAPORTE"}
                              {c.tipoIdentificacion === "07" && "CF"}
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-800 uppercase">{c.nombres}</td>
                            <td className="px-6 py-4 text-slate-500">{c.direccion}</td>
                            <td className="px-6 py-4 text-slate-500 font-medium">{c.mail}</td>
                            <td className="px-6 py-4 text-slate-400 font-mono">{c.celular}</td>
                            <td className="px-6 py-4 text-right space-x-3 whitespace-nowrap">
                              <button
                                onClick={() => {
                                  setClientForm({
                                    id: String(c.id),
                                    nombres: c.nombres,
                                    tipoIdentificacion: c.tipoIdentificacion,
                                    identificacion: c.identificacion,
                                    direccion: c.direccion,
                                    mail: c.mail,
                                    celular: c.celular,
                                  });
                                  setShowClientModal(true);
                                }}
                                className="text-blue-600 hover:underline font-semibold"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDeleteClient(c.id)}
                                className="text-red-500 hover:underline font-semibold"
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ))}
                      {clients.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-xs">
                            Ningún cliente registrado en la base de datos.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PRODUCTS */}
          {activeTab === "products" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative w-full sm:w-80">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar productos por nombre o código..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 text-xs transition-colors bg-white shadow-sm"
                  />
                </div>
                <button
                  onClick={() => {
                    setProductForm({ id: "", nombre: "", codigoPrincipal: "", descripcion: "", precio: "", iva: "12.0", imagen: "" });
                    setShowProductModal(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center w-full sm:w-auto justify-center"
                >
                  <Plus className="h-4 w-4 mr-1" /> Agregar Producto
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3">Código Principal</th>
                        <th className="px-6 py-3">Nombre Comercial</th>
                        <th className="px-6 py-3">Categoría / Info</th>
                        <th className="px-6 py-3 text-center">Impuesto IVA</th>
                        <th className="px-6 py-3 text-right">Precio Unitario</th>
                        <th className="px-6 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {products
                        .filter((p) =>
                          p.nombre.toLowerCase().includes(productSearch.toLowerCase()) ||
                          p.codigoPrincipal.includes(productSearch)
                        )
                        .map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50/20 transition-colors">
                            <td className="px-6 py-4 font-mono font-bold text-slate-700">{p.codigoPrincipal}</td>
                            <td className="px-6 py-4 font-bold text-slate-800 uppercase">
                              <div className="flex items-center gap-3">
                                {p.imagen ? (
                                  <img src={p.imagen} alt={p.nombre} className="h-8 w-8 rounded-lg object-cover border border-slate-100 bg-slate-50" />
                                ) : (
                                  <div className="h-8 w-8 rounded-lg border border-slate-100 bg-slate-50/50 flex items-center justify-center text-slate-400">
                                    <ImageIcon className="h-3 w-3" />
                                  </div>
                                )}
                                <span>{p.nombre}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-500 font-medium">{p.descripcion || "N/A"}</td>
                            <td className="px-6 py-4 text-center font-bold text-blue-600">{p.iva}% IVA</td>
                            <td className="px-6 py-4 text-right font-black text-slate-800">${p.precio.toFixed(2)}</td>
                            <td className="px-6 py-4 text-right space-x-3 whitespace-nowrap">
                              <button
                                onClick={() => {
                                  setProductForm({
                                    id: String(p.id),
                                    nombre: p.nombre,
                                    codigoPrincipal: p.codigoPrincipal,
                                    descripcion: p.descripcion || "",
                                    precio: String(p.precio),
                                    iva: String(p.iva),
                                    imagen: p.imagen || "",
                                  });
                                  setShowProductModal(true);
                                }}
                                className="text-blue-600 hover:underline font-semibold"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.id)}
                                className="text-red-500 hover:underline font-semibold"
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ))}
                      {products.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs">
                            Ningún producto registrado en el catálogo permanente.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SETTINGS (CONFIGURACIÓN EMISOR) */}
          {activeTab === "settings" && issuer && (
            <form onSubmit={handleSaveIssuer} className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 max-w-2xl mx-auto space-y-6 animate-fade-in">
              <h3 className="text-sm font-bold text-slate-800 tracking-tight border-b border-slate-100 pb-3 flex items-center">
                <Building className="h-4 w-4 mr-2 text-blue-500" /> Información Comercial del Emisor (Ecuador)
              </h3>

              {/* Logo upload field */}
              <div className="border border-dashed border-slate-200 bg-slate-50/50 rounded-lg p-5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Logotipo Comercial de la Empresa (PDF RIDE)
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="h-16 w-16 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-400 overflow-hidden shrink-0">
                    {issuer.logo ? (
                      <img src={issuer.logo} alt="Logo preview" className="h-full w-full object-contain" />
                    ) : (
                      <Building className="h-6 w-6" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="text-[10px] text-slate-400">Archivos recomendados: PNG o JPG no mayores a 800KB.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    RUC del Emisor *
                  </label>
                  <input
                    type="text"
                    required
                    disabled
                    value={issuer.ruc}
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Razón Social *
                  </label>
                  <input
                    type="text"
                    required
                    value={issuer.razonSocial}
                    onChange={(e) => setIssuer({ ...issuer, razonSocial: e.target.value })}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Nombre Comercial
                  </label>
                  <input
                    type="text"
                    value={issuer.nombreEmpresa}
                    onChange={(e) => setIssuer({ ...issuer, nombreEmpresa: e.target.value })}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Dirección Matriz *
                  </label>
                  <input
                    type="text"
                    required
                    value={issuer.direccion}
                    onChange={(e) => setIssuer({ ...issuer, direccion: e.target.value })}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Establecimiento (ej. 001)
                  </label>
                  <input
                    type="text"
                    maxLength={3}
                    value={issuer.establecimiento}
                    onChange={(e) => setIssuer({ ...issuer, establecimiento: e.target.value })}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-600 text-center font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Punto de Emisión (ej. 001)
                  </label>
                  <input
                    type="text"
                    maxLength={3}
                    value={issuer.puntoEmision}
                    onChange={(e) => setIssuer({ ...issuer, puntoEmision: e.target.value })}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-600 text-center font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    value={issuer.email}
                    onChange={(e) => setIssuer({ ...issuer, email: e.target.value })}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Celular *
                  </label>
                  <input
                    type="text"
                    required
                    value={issuer.celular}
                    onChange={(e) => setIssuer({ ...issuer, celular: e.target.value })}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Secuencial de Inicio *
                  </label>
                  <input
                    type="text"
                    maxLength={9}
                    required
                    placeholder="ej. 000000250"
                    value={issuer.startSecuencial}
                    onChange={(e) => setIssuer({ ...issuer, startSecuencial: e.target.value })}
                    onBlur={(e) => {
                      const val = e.target.value.trim();
                      if (val) {
                        const parsed = parseInt(val, 10);
                        if (!isNaN(parsed)) {
                          setIssuer({ ...issuer, startSecuencial: String(parsed).padStart(9, "0") });
                        }
                      }
                    }}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-600 text-center font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Régimen Tributario
                  </label>
                  <select
                    value={issuer.regimen}
                    onChange={(e) => setIssuer({ ...issuer, regimen: e.target.value })}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-600 text-xs"
                  >
                    <option value="REGIMEN GENERAL">RÉGIMEN GENERAL</option>
                    <option value="RIMPE EMPRENDEDOR">RIMPE EMPRENDEDOR</option>
                    <option value="RIMPE NEGOCIO POPULAR">RIMPE NEGOCIO POPULAR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Ambiente SRI *
                  </label>
                  <select
                    value={issuer.ambiente}
                    onChange={(e) => setIssuer({ ...issuer, ambiente: parseInt(e.target.value, 10) })}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-600 text-xs"
                  >
                    <option value="1">1 = PRUEBAS (TEST)</option>
                    <option value="2">2 = PRODUCCIÓN (REAL)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-3 py-2">
                <input
                  type="checkbox"
                  id="obligadoContabilidad"
                  checked={issuer.obligadoContabilidad}
                  onChange={(e) => setIssuer({ ...issuer, obligadoContabilidad: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                <label htmlFor="obligadoContabilidad" className="text-xs font-semibold text-slate-600 select-none">
                  Obligado a Llevar Contabilidad en el Ecuador
                </label>
              </div>

              <h3 className="text-sm font-bold text-slate-800 tracking-tight border-b border-slate-100 pt-4 pb-3 flex items-center">
                <Lock className="h-4 w-4 mr-2 text-blue-500" /> Firma Electrónica (.p12) y Credenciales
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Archivo de Firma (.p12 en Base64)
                  </label>
                  <input
                    type="file"
                    accept=".p12"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setIssuer({ ...issuer, firmaElectronica: reader.result as string });
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {issuer.firmaElectronica && (
                    <span className="text-[10px] text-green-600 font-bold block mt-1">
                      ✓ Firma cargada en memoria.
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Contraseña de la Firma .p12
                  </label>
                  <div className="relative">
                    <input
                      type={showSignaturePassword ? "text" : "password"}
                      placeholder="Contraseña de firma digital"
                      value={issuer.codigoSri || ""}
                      onChange={(e) => {
                        setIssuer({ ...issuer, codigoSri: e.target.value });
                        setSignatureStatus({ checked: false, valid: false, message: "", loading: false });
                      }}
                      className="block w-full pl-3 pr-10 py-2 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignaturePassword(!showSignaturePassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      {showSignaturePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={handleVerifySignature}
                      disabled={signatureStatus.loading}
                      className="inline-flex items-center text-[10px] font-extrabold bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-all shadow-2xs active:scale-95 disabled:opacity-50"
                    >
                      <ShieldCheck className={`h-3.5 w-3.5 mr-1 ${signatureStatus.loading ? "animate-spin" : ""}`} />
                      {signatureStatus.loading ? "Verificando..." : "Validar Firma y Clave"}
                    </button>
                  </div>

                  {signatureStatus.checked && (
                    <div className={`mt-2 p-2.5 rounded-xl border text-xs font-bold flex items-center transition-all animate-fade-in ${
                      signatureStatus.valid 
                        ? "bg-green-50 border-green-200 text-green-700" 
                        : "bg-red-50 border-red-200 text-red-700"
                    }`}>
                      {signatureStatus.valid ? (
                        <CheckCircle className="h-4 w-4 mr-2 shrink-0 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 mr-2 shrink-0 text-red-600" />
                      )}
                      <span>{signatureStatus.message}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loadingIssuer}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-4 rounded-lg text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {loadingIssuer ? "Guardando..." : "Guardar Perfil Tributario"}
                </button>
              </div>

            </form>
          )}

          {/* TAB: GUÍA DE INICIO (GUIDE) */}
          {activeTab === "guia" && (
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-800">Guía de Inicio Rápido FácilSRI</h2>
                <p className="text-slate-400 text-xs mt-1">Aprende a configurar tu cuenta y empieza a facturar de forma legal con el SRI en minutos.</p>
              </div>

              <div className="grid grid-cols-3 gap-6">
                
                {/* Paso 1 */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
                  <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center">
                    01
                  </div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Perfil Comercial</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Llena tu RUC, Razón Social y dirección en la pestaña de <strong>Configuración Emisor</strong>. Asegúrate de verificar tu dirección exacta registrada en el SRI.
                  </p>
                </div>

                {/* Paso 2 */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
                  <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center">
                    02
                  </div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Logo de tu Marca</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Carga el logo de tu empresa en formato PNG o JPG. Este logotipo se estampará automáticamente en el margen superior de todos tus RIDES (PDF de facturas).
                  </p>
                </div>

                {/* Paso 3 */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
                  <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center">
                    03
                  </div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Firma Electrónica</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Sube tu archivo de firma digital <strong>.p12</strong> y contraseña. En Ecuador puedes obtenerla en Banco Central, Security Data, ANF, Uanataqa, etc.
                  </p>
                </div>

                {/* Paso 4 */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
                  <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center">
                    04
                  </div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Secuencial Inicial</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Si ya emitiste facturas en otro sistema, coloca tu último secuencial más uno en el campo <strong>Secuencial de Inicio</strong> para evitar duplicados en el SRI.
                  </p>
                </div>

                {/* Paso 5 */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
                  <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center">
                    05
                  </div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Billetera / Saldo</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Si elegiste el plan recargable, puedes realizar transferencias y enviar el comprobante vía WhatsApp al supervisor para activar tus saldo.
                  </p>
                </div>

                {/* Paso 6 */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
                  <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center">
                    06
                  </div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">¡Listo para Vender!</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Dirígete a la pestaña <strong>Emitir Factura</strong> o abre el <strong>POS de caja</strong> para facturar a tus clientes de forma instantánea.
                  </p>
                </div>

              </div>
            </div>
          )}

          {/* TAB: SUPER ADMINISTRADOR SAAS */}
          {/* TAB: SUPER ADMINISTRADOR - APROBACIONES DE PAGOS */}
          {activeTab === "admin_approvals" && isAdminLoggedIn && (
            <div className="space-y-8 animate-fade-in">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
                  <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center">
                    <CheckCircle className="h-4.5 w-4.5 mr-2 text-emerald-500" /> Aprobación de Recargas y Membresías (SaaS)
                  </h3>
                  <button
                    type="button"
                    onClick={fetchAdminPaymentRequests}
                    className="inline-flex items-center space-x-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-2.5 py-1 rounded-lg transition-colors active:scale-95"
                  >
                    <RefreshCw className={`h-3 w-3 ${loadingAdminRequests ? "animate-spin" : ""}`} />
                    <span>Actualizar</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-2">Empresa / RUC</th>
                        <th className="px-4 py-2">Tipo de Plan</th>
                        <th className="px-4 py-2">Monto Solicitado</th>
                        <th className="px-4 py-2">Referencia / Banco</th>
                        <th className="px-4 py-2">Fecha Solicitud</th>
                        <th className="px-4 py-2 text-center">Estado</th>
                        <th className="px-4 py-2 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {adminPaymentRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-bold text-slate-700 block uppercase">{req.razonSocial}</span>
                            <span className="font-mono text-slate-400 text-[10px]">{req.ruc}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg ${
                              req.tipo === "TOPUP" ? "bg-emerald-50 text-emerald-700" : "bg-violet-50 text-violet-700"
                            }`}>
                              {req.tipo === "TOPUP" ? "Recarga Billetera" : "Renovación Plan"}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-black text-slate-800">
                            ${req.monto.toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-slate-700 block font-bold">{req.referencia}</span>
                            <span className="text-[10px] text-slate-400">{req.bancoDestino}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-mono text-[10px]">
                            {(() => {
                              const d = new Date(req.fechaSolicitud);
                              return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
                            })()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-[8px] font-black uppercase rounded-full px-2 py-0.5 border ${
                              req.estado === "APROBADO"
                                ? "bg-green-50 border-green-200 text-green-700"
                                : req.estado === "RECHAZADO"
                                ? "bg-red-50 border-red-200 text-red-700"
                                : "bg-amber-50 border-amber-200 text-amber-700 animate-pulse"
                            }`}>
                              {req.estado}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-sans">
                            {req.estado === "PENDIENTE" ? (
                              <div className="flex justify-end space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handleApprovePayment(req.id)}
                                  className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white font-extrabold rounded-lg text-[9px] uppercase tracking-wider transition-colors shadow-3xs active:scale-95"
                                >
                                  Aprobar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectPayment(req.id)}
                                  className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-lg text-[9px] uppercase tracking-wider transition-colors shadow-3xs active:scale-95"
                                >
                                  Rechazar
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-bold italic">Procesado</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {adminPaymentRequests.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-xs">
                            No hay ninguna solicitud de pago registrada.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SUPER ADMINISTRADOR - EMPRESAS REGISTRADAS */}
          {activeTab === "admin_companies" && isAdminLoggedIn && (
            <div className="space-y-8 animate-fade-in">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                    <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center">
                      <Building className="h-4.5 w-4.5 mr-2 text-slate-555" /> Empresas / Emisores Registrados
                    </h3>
                    
                    <div className="relative w-full sm:w-64">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Filtrar empresas..."
                        value={adminSearch}
                        onChange={(e) => setAdminSearch(e.target.value)}
                        className="block w-full pl-10 pr-3 py-1.5 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 text-xs transition-colors"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-sans">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-2">Empresa / RUC</th>
                          <th className="px-4 py-2">Plan</th>
                          <th className="px-4 py-2">Saldo / Vence</th>
                          <th className="px-4 py-2 text-center">Estado</th>
                          <th className="px-4 py-2 text-right">Membresía</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {companies
                          .filter((c) =>
                            c.ruc.includes(adminSearch) ||
                            c.nombreEmpresa.toLowerCase().includes(adminSearch.toLowerCase()) ||
                            c.razonSocial.toLowerCase().includes(adminSearch.toLowerCase())
                          )
                          .map((c) => (
                            <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-3">
                                <span className="font-bold text-slate-700 block uppercase">{c.nombreEmpresa}</span>
                                <span className="font-mono text-slate-400 text-[10px]">{c.ruc}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-bold text-slate-500 uppercase text-[10px]">
                                  {c.planType === "MONTHLY" ? "Mensualidad" : "Por Factura"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {c.planType === "MONTHLY" ? (
                                  <span className="font-bold text-slate-700">
                                    {(() => {
                                      const d = new Date(c.subscriptionEnds);
                                      return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
                                    })()}
                                  </span>
                                ) : (
                                  <span className={`font-black ${c.balance < 0.20 ? "text-red-500" : "text-slate-800"}`}>
                                    ${c.balance.toFixed(2)}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`text-[9px] font-black uppercase rounded-full px-2 py-0.5 border ${
                                  c.status === "ACTIVE" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
                                }`}>
                                  {c.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => {
                                    setEditingCompany(c);
                                    setBalanceChangeVal("0");
                                  }}
                                  className="text-xs text-blue-600 hover:underline font-semibold"
                                >
                                  Gestionar
                                </button>
                              </td>
                            </tr>
                          ))}
                        {companies.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-6 text-center text-slate-400 text-xs">
                              Ninguna empresa registrada aún.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SUPER ADMINISTRADOR - CONFIGURACIÓN DE MARCA, PARÁMETROS Y PLANES */}
          {activeTab === "admin_branding" && isAdminLoggedIn && (
            <div className="space-y-6 animate-fade-in max-w-5xl mx-auto font-sans">
              
              {/* Barra de Sub-pestañas */}
              <div className="flex border border-slate-200 mb-6 bg-slate-50/80 p-1.5 rounded-2xl gap-2 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setAdminSubTab("BRANDING")}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center space-x-2 ${
                    adminSubTab === "BRANDING"
                      ? "bg-white text-blue-600 shadow-sm border border-slate-200/80"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Tag className="h-4 w-4" />
                  <span>1. Configuración de Marca & SEO</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAdminSubTab("GLOBAL")}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center space-x-2 ${
                    adminSubTab === "GLOBAL"
                      ? "bg-white text-blue-600 shadow-sm border border-slate-200/80"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Settings className="h-4 w-4" />
                  <span>2. Parámetros Globales & Cuentas (CRUD + QR)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAdminSubTab("PLANS")}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center space-x-2 ${
                    adminSubTab === "PLANS"
                      ? "bg-white text-blue-600 shadow-sm border border-slate-200/80"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                  <span>3. Tarifas y Planes Comerciales</span>
                </button>
              </div>

              {/* CONTENIDO SUB-PESTAÑA 1: BRANDING & SEO */}
              {adminSubTab === "BRANDING" && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6">
                  <h3 className="text-sm font-bold text-slate-800 tracking-tight border-b border-slate-100 pb-4 flex items-center mb-6">
                    <Tag className="h-4 w-4 mr-2 text-blue-600" /> Personalización de Marca, Logotipos y Metadatos SEO
                  </h3>

                  <form onSubmit={handleSaveBranding} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Logo Principal */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Logotipo Principal del Sistema
                        </label>
                        <div className="flex items-center space-x-3 mt-1">
                          {brandForm.systemLogo ? (
                            <div className="relative h-14 w-14 border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-center p-1 overflow-hidden shrink-0">
                              <img src={brandForm.systemLogo} alt="Logo" className="h-full w-full object-contain" />
                              <button
                                type="button"
                                onClick={() => setBrandForm({ ...brandForm, systemLogo: "" })}
                                className="absolute top-0 right-0 h-4 w-4 bg-red-600 text-white rounded-full text-[8px] flex items-center justify-center font-bold hover:bg-red-700 transition-colors"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div className="h-14 w-14 border border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                              <ImageIcon className="h-6 w-6" />
                            </div>
                          )}
                          <label className="flex-1 cursor-pointer">
                            <span className="inline-flex justify-center items-center w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 font-bold text-[10px] uppercase rounded-lg transition-colors">
                              <Upload className="h-3.5 w-3.5 mr-1" /> Subir Logotipo
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => setBrandForm((prev) => ({ ...prev, systemLogo: reader.result as string }));
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>

                      {/* Favicon / Ícono del Buscador */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Favicon / Ícono del Buscador (Pestaña Navegador)
                        </label>
                        <div className="flex items-center space-x-3 mt-1">
                          {brandForm.systemFavicon ? (
                            <div className="relative h-14 w-14 border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-center p-2 overflow-hidden shrink-0">
                              <img src={brandForm.systemFavicon} alt="Favicon" className="h-full w-full object-contain" />
                              <button
                                type="button"
                                onClick={() => setBrandForm({ ...brandForm, systemFavicon: "" })}
                                className="absolute top-0 right-0 h-4 w-4 bg-red-600 text-white rounded-full text-[8px] flex items-center justify-center font-bold hover:bg-red-700 transition-colors"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div className="h-14 w-14 border border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                              <Sparkles className="h-5 w-5" />
                            </div>
                          )}
                          <label className="flex-1 cursor-pointer">
                            <span className="inline-flex justify-center items-center w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 font-bold text-[10px] uppercase rounded-lg transition-colors">
                              <Upload className="h-3.5 w-3.5 mr-1" /> Subir Favicon (PNG/ICO)
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleSystemFaviconUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Nombre Comercial del Sistema
                        </label>
                        <input
                          type="text"
                          required
                          value={brandForm.systemName}
                          onChange={(e) => setBrandForm({ ...brandForm, systemName: e.target.value })}
                          className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-600 font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Título de Pantalla de Inicio
                        </label>
                        <input
                          type="text"
                          required
                          value={brandForm.loginTitle}
                          onChange={(e) => setBrandForm({ ...brandForm, loginTitle: e.target.value })}
                          className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-600 font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Subtítulo de Pantalla de Inicio
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={brandForm.loginSubtitle}
                        onChange={(e) => setBrandForm({ ...brandForm, loginSubtitle: e.target.value })}
                        className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none focus:border-blue-600 font-medium leading-relaxed"
                      />
                    </div>

                    {/* Metadatos SEO */}
                    <div className="border-t border-slate-100 pt-4 space-y-4">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
                        🌐 Metadatos SEO para Google y Redes Sociales
                      </h4>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Meta Description (Descripción SEO para buscadores)
                        </label>
                        <textarea
                          rows={2}
                          placeholder="ej. Sistema de Facturación Electrónica en Ecuador para personas naturales y empresas..."
                          value={brandForm.metaDescription}
                          onChange={(e) => setBrandForm({ ...brandForm, metaDescription: e.target.value })}
                          className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none focus:border-blue-600 font-medium leading-relaxed"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Meta Keywords (Palabras clave SEO separadas por coma)
                        </label>
                        <input
                          type="text"
                          placeholder="ej. facturacion sri, ecuador, facturas electronicas, comprobantes sri"
                          value={brandForm.metaKeywords}
                          onChange={(e) => setBrandForm({ ...brandForm, metaKeywords: e.target.value })}
                          className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-600 font-medium"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs uppercase tracking-wider transition-colors shadow-sm active:scale-98 cursor-pointer"
                      >
                        Guardar Configuración de Marca & SEO
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* CONTENIDO SUB-PESTAÑA 2: PARÁMETROS GLOBALES & CRUD CUENTAS BANCARIAS */}
              {adminSubTab === "GLOBAL" && (
                <div className="space-y-6">
                  {/* Formulario Parámetros Globales & Clave Admin */}
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6">
                    <h3 className="text-sm font-bold text-slate-800 tracking-tight border-b border-slate-100 pb-4 flex items-center mb-6">
                      <Settings className="h-4 w-4 mr-2 text-slate-600" /> Parámetros Generales del Sistema
                    </h3>

                    <form onSubmit={handleSaveGlobalParams} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            WhatsApp de Contacto / Soporte (ej. 593999999999)
                          </label>
                          <input
                            type="text"
                            required
                            value={globalParamsForm.adminWhatsapp}
                            onChange={(e) => setGlobalParamsForm({ ...globalParamsForm, adminWhatsapp: e.target.value })}
                            className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-600 font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Saldo Inicial de Cortesía (Registros Nuevos en USD)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            value={globalParamsForm.defaultBalance}
                            onChange={(e) => setGlobalParamsForm({ ...globalParamsForm, defaultBalance: e.target.value })}
                            className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-600 font-bold text-center"
                          />
                        </div>
                      </div>

                      {/* Cambiar Contraseña Admin */}
                      <div className="border-t border-slate-100 pt-4 space-y-4">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
                          🔒 Cambiar Contraseña de Administración
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Nueva Contraseña
                            </label>
                            <input
                              type="password"
                              placeholder="Dejar en blanco para no cambiar"
                              value={globalParamsForm.adminNewPassword}
                              onChange={(e) => setGlobalParamsForm({ ...globalParamsForm, adminNewPassword: e.target.value })}
                              className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-600 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Confirmar Nueva Contraseña
                            </label>
                            <input
                              type="password"
                              placeholder="Repita la nueva contraseña"
                              value={globalParamsForm.adminConfirmNewPassword}
                              onChange={(e) => setGlobalParamsForm({ ...globalParamsForm, adminConfirmNewPassword: e.target.value })}
                              className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-600 font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex justify-end">
                        <button
                          type="submit"
                          className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-6 rounded-xl text-xs uppercase tracking-wider transition-colors shadow-sm active:scale-98 cursor-pointer"
                        >
                          Guardar Parámetros y Clave
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* CRUD DE CUENTAS BANCARIAS CON CÓDIGO QR */}
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4 mb-4">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center">
                          <Building className="h-4.5 w-4.5 mr-2 text-blue-600" /> Cuentas Bancarias y Códigos QR de Pago
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Administra las cuentas bancarias donde tus usuarios realizarán sus transferencias y escaneos de QR.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setBankForm({
                            id: "",
                            banco: "",
                            tipoCuenta: "Ahorros",
                            numeroCuenta: "",
                            titular: "",
                            identificacionTitular: "",
                            qrCode: "",
                            activo: true,
                          });
                          setShowBankModal(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2 px-4 rounded-xl shadow-sm transition-colors flex items-center justify-center cursor-pointer"
                      >
                        <Plus className="h-4 w-4 mr-1.5" /> Agregar Cuenta Bancaria
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-sans">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3">Código QR</th>
                            <th className="px-4 py-3">Banco / Institución</th>
                            <th className="px-4 py-3">Tipo Cuenta</th>
                            <th className="px-4 py-3">Número Cuenta</th>
                            <th className="px-4 py-3">Titular / Beneficiario</th>
                            <th className="px-4 py-3">Cédula / RUC</th>
                            <th className="px-4 py-3 text-center">Estado</th>
                            <th className="px-4 py-3 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {bankAccountsList.map((acc) => (
                            <tr key={acc.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-3">
                                {acc.qrCode ? (
                                  <img src={acc.qrCode} alt="QR" className="h-10 w-10 object-contain rounded-lg border border-slate-200 bg-white p-0.5 cursor-pointer hover:scale-110 transition-transform" />
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">Sin QR</span>
                                )}
                              </td>
                              <td className="px-4 py-3 font-bold text-slate-800 uppercase">{acc.banco}</td>
                              <td className="px-4 py-3 text-slate-500 font-bold text-[10px] uppercase">{acc.tipoCuenta}</td>
                              <td className="px-4 py-3 font-mono font-bold text-slate-800">{acc.numeroCuenta}</td>
                              <td className="px-4 py-3 text-slate-700 font-medium uppercase">{acc.titular}</td>
                              <td className="px-4 py-3 text-slate-400 font-mono text-[10px]">{acc.identificacionTitular || "N/A"}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`text-[8px] font-black uppercase rounded-full px-2 py-0.5 border ${
                                  acc.activo ? "bg-green-50 border-green-200 text-green-700" : "bg-slate-100 border-slate-200 text-slate-500"
                                }`}>
                                  {acc.activo ? "Activa" : "Inactiva"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBankForm({
                                      id: String(acc.id),
                                      banco: acc.banco,
                                      tipoCuenta: acc.tipoCuenta,
                                      numeroCuenta: acc.numeroCuenta,
                                      titular: acc.titular,
                                      identificacionTitular: acc.identificacionTitular || "",
                                      qrCode: acc.qrCode || "",
                                      activo: acc.activo,
                                    });
                                    setShowBankModal(true);
                                  }}
                                  className="text-blue-600 hover:underline font-semibold cursor-pointer"
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBankAccount(acc.id)}
                                  className="text-red-500 hover:underline font-semibold cursor-pointer"
                                >
                                  Eliminar
                                </button>
                              </td>
                            </tr>
                          ))}
                          {bankAccountsList.length === 0 && (
                            <tr>
                              <td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-xs">
                                Ninguna cuenta bancaria registrada aún. Haz clic en "Agregar Cuenta Bancaria".
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* CONTENIDO SUB-PESTAÑA 3: PLANES Y TARIFAS SAAS */}
              {adminSubTab === "PLANS" && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6">
                  <h3 className="text-sm font-bold text-slate-800 tracking-tight border-b border-slate-100 pb-4 flex items-center mb-6">
                    <CreditCard className="h-4 w-4 mr-2 text-violet-600" /> Configuración de Tarifas y Modalidades Comerciales SaaS
                  </h3>

                  <form onSubmit={handleSavePlansTariff} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Modalidad 1: Pago por Factura */}
                      <div className="border border-emerald-100 bg-emerald-50/40 p-5 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center">
                            <Receipt className="h-4 w-4 mr-1.5 text-emerald-600" /> Modalidad 1: Pago Por Uso (Billetera)
                          </h4>
                          <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full">Recargable</span>
                        </div>
                        <p className="text-[10px] text-emerald-700 leading-normal">
                          Configura la tarifa individual que se descontará de la billetera del cliente por cada factura electrónica autorizada.
                        </p>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Precio en USD por Factura Emitida ($)
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              required
                              value={plansTariffForm.pricePerInvoice}
                              onChange={(e) => setPlansTariffForm({ ...plansTariffForm, pricePerInvoice: e.target.value })}
                              className="block w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-emerald-600 font-black text-base"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Modalidad 2: Plan Mensual Ilimitado */}
                      <div className="border border-violet-100 bg-violet-50/40 p-5 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-violet-800 uppercase tracking-wider flex items-center">
                            <Sparkles className="h-4 w-4 mr-1.5 text-violet-600" /> Modalidad 2: Suscripción Mensual
                          </h4>
                          <span className="bg-violet-100 text-violet-800 text-[9px] font-bold px-2 py-0.5 rounded-full">30 Días Ilimitados</span>
                        </div>
                        <p className="text-[10px] text-violet-700 leading-normal">
                          Configura el costo de la tarifa plana mensual por 30 días de emisión ilimitada de facturas.
                        </p>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Costo de Renovación Mensual Fijo ($ USD)
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">$</span>
                            <input
                              type="number"
                              step="0.50"
                              min="1"
                              required
                              value={plansTariffForm.monthlyPlanFee}
                              onChange={(e) => setPlansTariffForm({ ...plansTariffForm, monthlyPlanFee: e.target.value })}
                              className="block w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-violet-600 font-black text-base"
                            />
                          </div>
                        </div>
                      </div>

                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                      <button
                        type="submit"
                        className="bg-violet-600 hover:bg-violet-700 text-white font-extrabold py-2.5 px-6 rounded-xl text-xs uppercase tracking-wider transition-colors shadow-sm active:scale-98 cursor-pointer"
                      >
                        Guardar Configuración de Tarifas y Planes
                      </button>
                    </div>
                  </form>
                </div>
              )}

            </div>
          )}

          {/* TAB: SUPER ADMINISTRADOR - PRUEBAS DE CORREO */}
          {activeTab === "admin_email_test" && isAdminLoggedIn && (
            <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
              
              {/* Tarjeta de Diagnóstico de Servidor SMTP */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 rounded-3xl p-6 text-white shadow-xl border border-slate-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <Mail className="h-48 w-48 text-indigo-300" />
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-500/30">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-white">Servidor de Correo SMTP Activo</h3>
                      <p className="text-xs text-indigo-250">Infraestructura de Despacho de Comprobantes Electrónicos</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    🟢 CONECTADO
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800 text-xs">
                  <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Servidor Host</span>
                    <span className="font-mono font-bold text-indigo-200">smtp.gmail.com:465</span>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cuenta de Despacho</span>
                    <span className="font-mono font-bold text-indigo-200">lojafacec@gmail.com</span>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Copia Oculta (BCC)</span>
                    <span className="font-mono font-bold text-indigo-200">lojafacec@gmail.com</span>
                  </div>
                </div>
              </div>

              {/* Formulario de Envío de Prueba */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs">
                <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-100">
                  <div className="h-9 w-9 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Enviar Correo de Prueba en Tiempo Real</h3>
                    <p className="text-xs text-slate-500">Prueba la entrega de mensajes, plantilla HTML y recepción directa sin emitir una factura.</p>
                  </div>
                </div>

                {/* Banner de Resultado */}
                {testEmailResult && (
                  <div className={`p-4 rounded-2xl mb-6 border text-xs font-semibold flex items-start space-x-3 ${
                    testEmailResult.success 
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-red-50 border-red-200 text-red-800"
                  }`}>
                    {testEmailResult.success ? (
                      <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-bold text-sm mb-0.5">
                        {testEmailResult.success ? "¡Despacho Exitoso de Correo!" : "Fallo al Enviar Correo de Prueba"}
                      </p>
                      <p className="text-xs leading-relaxed">{testEmailResult.message}</p>
                      {testEmailResult.messageId && (
                        <p className="text-[10px] font-mono mt-1 text-emerald-700 opacity-80">
                          Google Message ID: {testEmailResult.messageId}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <form onSubmit={handleSendTestEmail} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Correo Electrónico Destinatario <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className="h-4.5 w-4.5 text-slate-400" />
                      </div>
                      <input
                        type="email"
                        required
                        placeholder="ejemplo@correo.com"
                        value={testEmailForm.to}
                        onChange={(e) => setTestEmailForm({ ...testEmailForm, to: e.target.value })}
                        className="block w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 text-xs font-medium transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Asunto del Correo
                    </label>
                    <input
                      type="text"
                      required
                      value={testEmailForm.subject}
                      onChange={(e) => setTestEmailForm({ ...testEmailForm, subject: e.target.value })}
                      className="block w-full px-4 py-3 border border-slate-200 rounded-2xl text-slate-800 text-xs font-medium focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Mensaje / Contenido de Prueba
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={testEmailForm.message}
                      onChange={(e) => setTestEmailForm({ ...testEmailForm, message: e.target.value })}
                      className="block w-full px-4 py-3 border border-slate-200 rounded-2xl text-slate-800 text-xs font-medium focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 transition-all leading-relaxed"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={sendingTestEmail}
                      className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-extrabold py-3.5 px-8 rounded-2xl shadow-lg shadow-blue-600/10 hover:shadow-xl transition-all duration-200 text-xs tracking-wide active:scale-[0.98] cursor-pointer flex items-center justify-center space-x-2"
                    >
                      {sendingTestEmail ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Enviando Correo de Prueba...</span>
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4" />
                          <span>Enviar Correo de Prueba</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

            </div>
          )}

        </div>
      </main>

      {/* MODAL: PREVISUALIZACIÓN DE FACTURA RIDE (PDF) */}
      {previewInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-3 sm:p-6 backdrop-blur-xs font-sans animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full border border-slate-100 overflow-hidden flex flex-col h-[90vh]">
            
            {/* Header / Actions Bar */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="h-9 w-9 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0">
                  RIDE
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-800 truncate">
                    Factura N° {issuer?.establecimiento || "001"}-{issuer?.puntoEmision || "001"}-{previewInvoice.secuencial}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold truncate">
                    Cliente: {previewInvoice.client?.nombres || "Consumidor Final"} ({previewInvoice.client?.identificacion || "S/N"})
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <a
                  href={`/api/invoices/download-pdf?id=${previewInvoice.id}`}
                  download={`FACTURA-${previewInvoice.secuencial}.pdf`}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs flex items-center shadow-xs transition-all active:scale-95"
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Descargar RIDE (PDF)
                </a>

                <a
                  href={`/api/invoices/download-xml?id=${previewInvoice.id}`}
                  download={`FACTURA-${previewInvoice.secuencial}.xml`}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center transition-all active:scale-95"
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  XML
                </a>

                <button
                  onClick={() => handleResendEmail(previewInvoice.id)}
                  disabled={resendingId === previewInvoice.id}
                  className="px-3 py-1.5 bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 font-bold rounded-xl text-xs flex items-center transition-all disabled:opacity-50 active:scale-95"
                >
                  <Mail className="h-3.5 w-3.5 mr-1.5" />
                  Correo
                </button>

                <button
                  onClick={() => setPreviewInvoice(null)}
                  className="h-8 w-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-500 transition-colors font-bold text-xs"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Viewer Iframe Body */}
            <div className="flex-1 bg-slate-100 relative overflow-hidden">
              <iframe
                src={`/api/invoices/download-pdf?id=${previewInvoice.id}&preview=true`}
                className="w-full h-full border-0"
                title={`Factura ${previewInvoice.secuencial}`}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BÚSQUEDA GLOBAL */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-start justify-center p-4 pt-16 md:pt-24 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-100 overflow-hidden animate-scale-up flex flex-col max-h-[80vh]">
            
            {/* Header / Input */}
            <div className="p-5 border-b border-[#e8ebf7] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Search className="h-5 w-5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Buscar facturas (secuencial) o clientes (nombre, cédula, RUC)..."
                  value={globalSearchQuery}
                  onChange={(e) => setGlobalSearchQuery(e.target.value)}
                  className="w-full text-sm font-semibold text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none"
                />
              </div>
              <button 
                onClick={() => {
                  setShowSearchModal(false);
                  setGlobalSearchQuery("");
                }}
                className="h-8 w-8 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors shrink-0"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Results list */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {(() => {
                const query = globalSearchQuery.trim().toLowerCase();
                if (!query) {
                  return (
                    <div className="text-center py-12 text-slate-400">
                      <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-xs font-bold uppercase tracking-wider">Buscador Inteligente</p>
                      <p className="text-[11px] mt-1">Escribe arriba para encontrar clientes o facturas rápidamente.</p>
                    </div>
                  );
                }

                const matchedClients = clients.filter(c => 
                  c.nombres.toLowerCase().includes(query) ||
                  c.identificacion.includes(query)
                );

                const matchedInvoices = invoices.filter(inv => 
                  inv.secuencial.includes(query) ||
                  inv.client.nombres.toLowerCase().includes(query) ||
                  inv.client.identificacion.includes(query)
                );

                if (matchedClients.length === 0 && matchedInvoices.length === 0) {
                  return (
                    <div className="text-center py-12 text-slate-400">
                      <p className="text-xs font-bold uppercase tracking-wider">Sin coincidencias</p>
                      <p className="text-[11px] mt-1">Ningún cliente o factura coincide con "{globalSearchQuery}".</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-6">
                    {/* Clientes */}
                    {matchedClients.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">
                          Clientes Coincidentes ({matchedClients.length})
                        </h4>
                        <div className="divide-y divide-slate-50">
                          {matchedClients.slice(0, 5).map(c => (
                            <div 
                              key={c.id} 
                              onClick={() => {
                                setActiveTab("clients");
                                setClientSearch(c.nombres);
                                setShowSearchModal(false);
                                setGlobalSearchQuery("");
                              }}
                              className="py-2.5 px-3 rounded-xl hover:bg-slate-50/70 transition-colors cursor-pointer flex justify-between items-center gap-4 group"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-extrabold text-slate-700 uppercase group-hover:text-violet-750 transition-colors">{c.nombres}</p>
                                <p className="text-[9px] text-slate-400 mt-0.5 font-mono">ID: {c.identificacion} • Correo: {c.mail || "N/A"}</p>
                              </div>
                              <span className="text-[9px] bg-slate-100 group-hover:bg-violet-50 text-slate-500 group-hover:text-violet-750 font-bold uppercase px-2 py-0.5 rounded-lg transition-colors">
                                Ver Cliente
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Facturas */}
                    {matchedInvoices.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">
                          Facturas Coincidentes ({matchedInvoices.length})
                        </h4>
                        <div className="divide-y divide-slate-50">
                          {matchedInvoices.slice(0, 5).map(inv => (
                            <div 
                              key={inv.id} 
                              onClick={() => {
                                setActiveTab("history");
                                setShowSearchModal(false);
                                setGlobalSearchQuery("");
                              }}
                              className="py-2.5 px-3 rounded-xl hover:bg-slate-50/70 transition-colors cursor-pointer flex justify-between items-center gap-4 group"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-mono font-bold text-slate-700">No. {inv.secuencial}</span>
                                  <span className={`text-[8px] font-black uppercase rounded px-1.5 py-0.25 border ${
                                    inv.estado === "AUTORIZADA" ? "bg-green-50 border-green-200 text-green-700" :
                                    inv.estado === "DEVUELTA" ? "bg-red-50 border-red-200 text-red-700" :
                                    "bg-yellow-50 border-yellow-200 text-yellow-700"
                                  }`}>
                                    {inv.estado}
                                  </span>
                                </div>
                                <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold truncate">Receptor: {inv.client.nombres}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs font-black text-slate-800 font-mono">${inv.total.toFixed(2)}</p>
                                <span className="text-[8px] text-slate-400 font-bold block mt-0.5">
                                  {(() => {
                                    const d = new Date(inv.fechaEmision);
                                    return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
                                  })()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR CLIENTE */}
      {showClientModal && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-100 animate-scale-up">
            <h3 className="text-sm font-bold text-slate-800 tracking-tight border-b border-slate-100 pb-3 uppercase">
              {clientForm.id ? "Editar Cliente" : "Registrar Cliente en Ecuador"}
            </h3>
            
            <form onSubmit={handleCreateClient} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Tipo Identificación
                  </label>
                  <select
                    value={clientForm.tipoIdentificacion}
                    onChange={(e) => setClientForm({ ...clientForm, tipoIdentificacion: e.target.value })}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none focus:border-blue-600"
                  >
                    <option value="05">CÉDULA</option>
                    <option value="04">RUC</option>
                    <option value="06">PASAPORTE</option>
                    <option value="07">CONSUMIDOR FINAL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Identificación *
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      required
                      placeholder="Cédula o RUC"
                      value={clientForm.identificacion}
                      onChange={(e) => setClientForm({ ...clientForm, identificacion: e.target.value })}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-600 font-mono font-bold"
                    />
                    {(clientForm.tipoIdentificacion === "05" || clientForm.tipoIdentificacion === "04") && (
                      <button
                        type="button"
                        onClick={handleLookupClient}
                        disabled={lookingUpClient}
                        className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 font-bold px-2 rounded-lg text-[10px] flex items-center justify-center shrink-0 disabled:opacity-50"
                      >
                        {lookingUpClient ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : "Consultar"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Nombres Completos / Razón Social *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. MARÍA ESTHER LOAIZA CEVALLOS"
                  value={clientForm.nombres}
                  onChange={(e) => setClientForm({ ...clientForm, nombres: e.target.value.toUpperCase() })}
                  className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-600 font-bold uppercase"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Dirección Domiciliaria *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Dirección del cliente"
                  value={clientForm.direccion}
                  onChange={(e) => setClientForm({ ...clientForm, direccion: e.target.value })}
                  className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="email@example.com"
                    value={clientForm.mail}
                    onChange={(e) => setClientForm({ ...clientForm, mail: e.target.value })}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Celular
                  </label>
                  <input
                    type="text"
                    placeholder="ej. 0991234567"
                    value={clientForm.celular}
                    onChange={(e) => setClientForm({ ...clientForm, celular: e.target.value })}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowClientModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-500 text-xs hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors"
                >
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR PRODUCTO */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-100 animate-scale-up">
            <h3 className="text-sm font-bold text-slate-800 tracking-tight border-b border-slate-100 pb-3 uppercase">
              {productForm.id ? "Editar Producto" : "Registrar Producto en Catálogo"}
            </h3>

            <form onSubmit={handleCreateProduct} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Código Principal *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej. PROD-001"
                    value={productForm.codigoPrincipal}
                    onChange={(e) => setProductForm({ ...productForm, codigoPrincipal: e.target.value.toUpperCase() })}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-600 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    IVA Aplicado *
                  </label>
                  <select
                    value={productForm.iva}
                    onChange={(e) => setProductForm({ ...productForm, iva: e.target.value })}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none focus:border-blue-600"
                  >
                    <option value="12.0">12% IVA</option>
                    <option value="15.0">15% IVA</option>
                    <option value="8.0">8% IVA</option>
                    <option value="0.0">0% IVA</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Nombre Comercial / Producto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. YOGURT DE FRESA 1 LITRO"
                  value={productForm.nombre}
                  onChange={(e) => setProductForm({ ...productForm, nombre: e.target.value.toUpperCase() })}
                  className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-600 font-bold uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Precio Unitario *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="$0.00"
                    value={productForm.precio}
                    onChange={(e) => setProductForm({ ...productForm, precio: e.target.value })}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-600 font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Categoría / Grupo
                  </label>
                  <input
                    type="text"
                    placeholder="ej. CAT: Lacteos"
                    value={productForm.descripcion || ""}
                    onChange={(e) => setProductForm({ ...productForm, descripcion: e.target.value })}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Imagen del Producto (Opcional)
                </label>
                <div className="flex items-center gap-3 mt-1.5">
                  {productForm.imagen ? (
                    <div className="relative h-12 w-12 rounded-xl border border-slate-100 overflow-hidden bg-slate-50 flex items-center justify-center">
                      <img src={productForm.imagen} alt="Producto" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setProductForm({ ...productForm, imagen: "" })}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 text-[8px] hover:bg-red-600 transition-colors shadow-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-center text-slate-400">
                      <ImageIcon className="h-4 w-4" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    id="product-catalog-image"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 800 * 1024) {
                        alert("La imagen es demasiado grande. El límite recomendado es de 800KB.");
                        return;
                      }
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setProductForm({ ...productForm, imagen: reader.result as string });
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <label
                    htmlFor="product-catalog-image"
                    className="px-3 py-2 border border-slate-200 hover:border-blue-600 hover:text-blue-600 rounded-xl text-xs font-semibold text-slate-500 bg-white cursor-pointer transition-all duration-200 flex items-center gap-1 active:scale-95 select-none"
                  >
                    <Upload className="h-3 w-3" /> Seleccionar Imagen
                  </label>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-500 text-xs hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors"
                >
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PRODUCTO RÁPIDO EN POS */}
      {showPOSFreeProductModal && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4 backdrop-blur-xs font-sans animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-slate-100 animate-scale-up">
            <h3 className="text-sm font-bold text-slate-800 tracking-tight border-b border-slate-100 pb-3 flex items-center">
              <Plus className="h-4 w-4 mr-1 text-blue-600" /> Agregar Producto Libre POS
            </h3>
            
            <form onSubmit={handleAddPOSFreeProduct} className="space-y-4 mt-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Descripción del Producto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. YOGURT DE MORA RAPIDO"
                  value={posFreeProduct.nombre}
                  onChange={(e) => setPOSFreeProduct({ ...posFreeProduct, nombre: e.target.value })}
                  className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-600 font-bold uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Precio Unitario *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="$0.00"
                    value={posFreeProduct.precio}
                    onChange={(e) => setPOSFreeProduct({ ...posFreeProduct, precio: e.target.value })}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-600 font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    IVA Aplicable
                  </label>
                  <select
                    value={posFreeProduct.iva}
                    onChange={(e) => setPOSFreeProduct({ ...posFreeProduct, iva: e.target.value })}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none focus:border-blue-600"
                  >
                    <option value="12">12% IVA</option>
                    <option value="15">15% IVA</option>
                    <option value="8">8% IVA</option>
                    <option value="0">0% IVA</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2 py-1.5">
                <input
                  type="checkbox"
                  id="saveToCatalog"
                  checked={posFreeProduct.saveToCatalog}
                  onChange={(e) => setPOSFreeProduct({ ...posFreeProduct, saveToCatalog: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                <label htmlFor="saveToCatalog" className="text-xs font-semibold text-slate-600 select-none">
                  Guardar en el catálogo permanente
                </label>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Imagen del Producto (Opcional)
                </label>
                <div className="flex items-center gap-3 mt-1.5">
                  {posFreeProduct.imagen ? (
                    <div className="relative h-12 w-12 rounded-xl border border-slate-100 overflow-hidden bg-slate-50 flex items-center justify-center">
                      <img src={posFreeProduct.imagen} alt="Producto" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPOSFreeProduct({ ...posFreeProduct, imagen: "" })}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 text-[8px] hover:bg-red-600 transition-colors shadow-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-center text-slate-400">
                      <ImageIcon className="h-4 w-4" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    id="product-pos-image"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 800 * 1024) {
                        alert("La imagen es demasiado grande. El límite recomendado es de 800KB.");
                        return;
                      }
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setPOSFreeProduct({ ...posFreeProduct, imagen: reader.result as string });
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <label
                    htmlFor="product-pos-image"
                    className="px-3 py-2 border border-slate-200 hover:border-blue-600 hover:text-blue-600 rounded-xl text-xs font-semibold text-slate-500 bg-white cursor-pointer transition-all duration-200 flex items-center gap-1 active:scale-95 select-none"
                  >
                    <Upload className="h-3 w-3" /> Seleccionar Imagen
                  </label>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPOSFreeProductModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-500 text-xs hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors"
                >
                  Añadir al Carrito
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ESTADO DE EMISIÓN AL SRI */}
      {sriStatusModal.show && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-100 text-center animate-scale-up">
            
            {sriStatusModal.step === "signing" && (
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mx-auto"></div>
                <h3 className="text-sm font-bold text-slate-800 tracking-tight uppercase">Firmando Comprobante</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">{sriStatusModal.message}</p>
              </div>
            )}

            {sriStatusModal.step === "sending" && (
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-full border-4 border-slate-700 border-t-transparent animate-spin mx-auto"></div>
                <h3 className="text-sm font-bold text-slate-800 tracking-tight uppercase">Comunicando con SRI</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">{sriStatusModal.message}</p>
              </div>
            )}

            {sriStatusModal.step === "authorized" && (
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-full bg-green-50 text-green-500 flex items-center justify-center mx-auto border border-green-200">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-green-700 tracking-tight uppercase">¡Factura Autorizada!</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">{sriStatusModal.message}</p>
                {sriStatusModal.claveAcceso && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Clave de Acceso</span>
                    <span className="text-xs font-mono font-bold text-slate-700 break-all select-all">{sriStatusModal.claveAcceso}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setSriStatusModal({ show: false, step: "init", message: "" })}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2 px-6 rounded-lg shadow-sm transition-colors mt-2"
                >
                  Entendido
                </button>
              </div>
            )}

            {sriStatusModal.step === "warning" && (
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-full bg-yellow-50 text-yellow-500 flex items-center justify-center mx-auto border border-yellow-200">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-yellow-700 tracking-tight uppercase">Autorización Pendiente</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">{sriStatusModal.message}</p>
                {sriStatusModal.claveAcceso && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Clave de Acceso</span>
                    <span className="text-xs font-mono font-bold text-slate-700 break-all">{sriStatusModal.claveAcceso}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setSriStatusModal({ show: false, step: "init", message: "" })}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2 px-6 rounded-lg shadow-sm transition-colors mt-2"
                >
                  Cerrar
                </button>
              </div>
            )}

            {sriStatusModal.step === "error" && (
              <div className="space-y-4 text-left">
                <div className="h-12 w-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto border border-red-200">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-red-700 tracking-tight uppercase text-center">Fallo de Recepción SRI</h3>
                <p className="text-xs text-slate-500 leading-normal bg-red-50/50 border border-red-100 rounded-lg p-4 font-bold text-center">
                  {sriStatusModal.message}
                </p>

                {sriStatusModal.mensajes && sriStatusModal.mensajes.length > 0 && (
                  <div className="space-y-2 mt-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mensajes devueltos por el SRI:</span>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 text-[10px] leading-relaxed">
                      {sriStatusModal.mensajes.map((m, idx) => (
                        <div key={idx} className="border-b border-slate-200/50 pb-2 last:border-b-0">
                          <strong className="text-red-600 block">{m.mensaje}</strong>
                          {m.informacionAdicional && <p className="text-slate-500 mt-0.5">{m.informacionAdicional}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setSriStatusModal({ show: false, step: "init", message: "" })}
                    className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2 px-6 rounded-lg shadow-sm transition-colors"
                  >
                    Regresar
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* MODAL: GESTIONAR MEMBRESÍA DE EMPRESA (ADMIN PANEL) */}
      {editingCompany && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-100 animate-scale-up space-y-5">
            <h3 className="text-sm font-bold text-slate-800 tracking-tight border-b border-slate-100 pb-3 flex items-center uppercase">
              <Building className="h-5 w-5 mr-2 text-blue-600" /> Gestionar Membresía: {editingCompany.nombreEmpresa}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">RUC de la Empresa:</span>
                  <span className="font-mono font-bold text-slate-700">{editingCompany.ruc}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Estado del Servicio:</span>
                  <span className={`font-bold uppercase ${editingCompany.status === "ACTIVE" ? "text-green-600" : "text-red-500"}`}>
                    {editingCompany.status === "ACTIVE" ? "Activo" : "Suspendido"}
                  </span>
                </div>
              </div>

              {/* Toggle Habilitación / Suspensión */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateCompanyMembership(editingCompany.id, { status: editingCompany.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" })}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-colors ${
                    editingCompany.status === "ACTIVE"
                      ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                      : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                  }`}
                >
                  {editingCompany.status === "ACTIVE" ? "Suspender Empresa 🚫" : "Habilitar Empresa ✓"}
                </button>
              </div>

              {/* Editar tipo de plan y mensualidad */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Esquema y Tarifas de Facturación</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Tipo de Plan
                    </label>
                    <select
                      value={editingCompany.planType}
                      onChange={(e) => handleUpdateCompanyMembership(editingCompany.id, { planType: e.target.value })}
                      className="block w-full px-2 py-1.5 border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none focus:border-blue-600"
                    >
                      <option value="MONTHLY">MENSUALIDAD</option>
                      <option value="PAY_PER_INVOICE">BILLETERA (SALDO)</option>
                    </select>
                  </div>
                  
                  {editingCompany.planType === "MONTHLY" ? (
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Cuota Mensual ($)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={editingCompany.monthlyFee}
                        onChange={(e) => handleUpdateCompanyMembership(editingCompany.id, { monthlyFee: e.target.value })}
                        className="block w-full px-2 py-1.5 border border-slate-200 rounded-lg text-slate-800 text-xs text-center font-bold focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Saldo Actual
                      </label>
                      <input
                        type="text"
                        disabled
                        value={`$${editingCompany.balance.toFixed(2)}`}
                        className="block w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 text-xs text-center font-black"
                      />
                    </div>
                  )}
                </div>

                {editingCompany.planType === "MONTHLY" ? (
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Fecha de Vencimiento de Membresía
                    </label>
                    <input
                      type="date"
                      value={editingCompany.subscriptionEnds.split("T")[0]}
                      onChange={(e) => handleUpdateCompanyMembership(editingCompany.id, { subscriptionEnds: e.target.value })}
                      className="block w-full px-2 py-1.5 border border-slate-200 rounded-lg text-slate-800 text-xs text-center font-mono font-bold focus:outline-none focus:border-blue-600"
                    />
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      Recargar / Ajustar Saldo de Billetera ($)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="any"
                        placeholder="ej. 20.00"
                        value={balanceChangeVal}
                        onChange={(e) => setBalanceChangeVal(e.target.value)}
                        className="block w-full px-2 py-1 border border-slate-200 rounded-lg text-slate-800 text-xs text-center font-bold focus:outline-none focus:border-blue-600"
                      />
                      <button
                        type="button"
                        onClick={() => handleWalletRecharge(editingCompany.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 rounded-lg transition-colors"
                      >
                        Recargar
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingCompany(null)}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs transition-colors"
              >
                Cerrar Gestión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO PRODUCTO MANUAL */}
      {showManualProductModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-scale-up">
            
            {/* Header */}
            <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white">
              <div className="flex items-center space-x-2">
                <div className="h-5 w-5 bg-blue-500 rounded-full flex items-center justify-center text-[10px] font-black text-white">
                  +
                </div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-100">
                  Nuevo Producto Manual
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowManualProductModal(false)}
                className="text-slate-400 hover:text-white transition-colors font-extrabold text-sm"
              >
                ✕
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              <div className="space-y-3">
                {/* Nombre */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Nombre del Producto *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="EJ: SERVICIO DE CONSULTORÍA"
                    value={manualProductForm.nombre}
                    onChange={(e) => setManualProductForm({ ...manualProductForm, nombre: e.target.value.toUpperCase() })}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 font-bold uppercase"
                  />
                </div>
                
                {/* Detalle */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Detalle / Descripción
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Descripción adicional si es necesario..."
                    value={manualProductForm.descripcion}
                    onChange={(e) => setManualProductForm({ ...manualProductForm, descripcion: e.target.value })}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* Cantidad */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      value={manualProductForm.cantidad}
                      onChange={(e) => setManualProductForm({ ...manualProductForm, cantidad: e.target.value })}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-xs text-center font-bold focus:outline-none focus:border-blue-600 bg-slate-50"
                    />
                  </div>
                  
                  {/* IVA */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Impuesto IVA
                    </label>
                    <select
                      value={manualProductForm.iva}
                      onChange={(e) => handleManualProductIvaChange(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-blue-600 font-medium"
                    >
                      <option value="15">IVA 15%</option>
                      <option value="12">IVA 12%</option>
                      <option value="8">IVA 8%</option>
                      <option value="5">IVA 5%</option>
                      <option value="0">IVA 0%</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* P. Unitario (Sin IVA) */}
                  <div className="bg-blue-50/30 border border-blue-100 rounded-xl p-3">
                    <label className="block text-[9px] font-bold text-blue-500 uppercase tracking-wider mb-1">
                      P. Unitario (Sin IVA)
                    </label>
                    <div className="flex items-center">
                      <span className="text-blue-500 font-bold text-xs mr-1">$</span>
                      <input
                        type="number"
                        step="any"
                        value={manualProductForm.precioSinIva}
                        onChange={(e) => handleManualProductUnitChange(e.target.value, manualProductForm.iva)}
                        className="block w-full bg-transparent text-slate-800 font-bold text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                  
                  {/* Precio Final (Con IVA) */}
                  <div className="bg-emerald-50/30 border border-emerald-100 rounded-xl p-3">
                    <label className="block text-[9px] font-bold text-emerald-500 uppercase tracking-wider mb-1">
                      Precio Final (Con IVA)
                    </label>
                    <div className="flex items-center">
                      <span className="text-emerald-500 font-bold text-xs mr-1">$</span>
                      <input
                        type="number"
                        step="any"
                        value={manualProductForm.precioConIva}
                        onChange={(e) => handleManualProductFinalChange(e.target.value, manualProductForm.iva)}
                        className="block w-full bg-transparent text-slate-800 font-bold text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Descuento */}
                <div className="bg-amber-50/20 border border-amber-100 rounded-xl p-3">
                  <label className="block text-[9px] font-bold text-amber-500 uppercase tracking-wider mb-1">
                    Aplicar Descuento ($)
                  </label>
                  <div className="flex items-center">
                    <span className="text-amber-500 font-bold text-xs mr-1">$</span>
                    <input
                      type="number"
                      step="any"
                      value={manualProductForm.descuento}
                      onChange={(e) => setManualProductForm({ ...manualProductForm, descuento: e.target.value })}
                      className="block w-full bg-transparent text-slate-800 font-bold text-xs focus:outline-none"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* Nota Extra 1 */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Nota Extra 1
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Color Rojo"
                      value={manualProductForm.notaExtra1}
                      onChange={(e) => setManualProductForm({ ...manualProductForm, notaExtra1: e.target.value })}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  
                  {/* Nota Extra 2 */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Nota Extra 2
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Con empaque"
                      value={manualProductForm.notaExtra2}
                      onChange={(e) => setManualProductForm({ ...manualProductForm, notaExtra2: e.target.value })}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <label className="flex items-center space-x-3 bg-slate-50/50 border border-slate-100 hover:border-slate-200 rounded-xl p-3 cursor-pointer transition-all duration-200 select-none">
                  <input
                    type="checkbox"
                    checked={manualProductForm.saveToCatalog}
                    onChange={(e) => setManualProductForm({ ...manualProductForm, saveToCatalog: e.target.checked })}
                    className="h-4.5 w-4.5 rounded-lg border-slate-300 text-slate-900 focus:ring-slate-900/10 cursor-pointer shrink-0"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-extrabold text-slate-700">¿Deseas guardar este producto en tu catálogo permanente?</span>
                    <span className="text-[9px] text-slate-400 mt-0.5 leading-normal">Si activas esta casilla, el producto se registrará para que puedas buscarlo y seleccionarlo en futuras facturas.</span>
                  </div>
                </label>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Imagen del Producto (Opcional)
                  </label>
                  <div className="flex items-center gap-3 mt-1.5">
                    {manualProductForm.imagen ? (
                      <div className="relative h-12 w-12 rounded-xl border border-slate-100 overflow-hidden bg-slate-50 flex items-center justify-center">
                        <img src={manualProductForm.imagen} alt="Producto" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setManualProductForm({ ...manualProductForm, imagen: "" })}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 text-[8px] hover:bg-red-600 transition-colors shadow-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-center text-slate-400">
                        <ImageIcon className="h-4 w-4" />
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      id="product-manual-image"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 800 * 1024) {
                          alert("La imagen es demasiado grande. El límite recomendado es de 800KB.");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setManualProductForm({ ...manualProductForm, imagen: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                    <label
                      htmlFor="product-manual-image"
                      className="px-3 py-2 border border-slate-200 hover:border-blue-600 hover:text-blue-600 rounded-xl text-xs font-semibold text-slate-500 bg-white cursor-pointer transition-all duration-200 flex items-center gap-1 active:scale-95 select-none"
                    >
                      <Upload className="h-3 w-3" /> Seleccionar Imagen
                    </label>
                  </div>
                </div>
                
              </div>
              
              {/* Actions */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowManualProductModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-500 text-xs hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAddManualProductToList}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-extrabold rounded-xl text-xs transition-colors flex items-center space-x-1.5 shadow-sm"
                >
                  <span>✓ Añadir a la lista</span>
                </button>
              </div>
              
            </div>
            
          </div>
        </div>
      )}

      {/* MODAL: PREVISUALIZAR FACTURA ELECTRÓNICA (RIDE MOCKUP) */}
      {showTicketPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs font-sans">
          <div className="bg-slate-100 rounded-3xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden animate-scale-up">
            
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-400" />
                <span className="text-xs font-black uppercase tracking-widest text-slate-100">
                  Previsualización Oficial de Factura RIDE
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowTicketPreviewModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold transition-colors"
              >
                ✕
              </button>
            </div>
            
            {/* RIDE Invoice Canvas Area */}
            <div className="p-6 max-h-[75vh] overflow-y-auto bg-slate-100">
              <div className="bg-white border border-slate-200 shadow-sm p-8 rounded-xl max-w-3xl mx-auto space-y-6 text-slate-800 text-[11px] leading-relaxed">
                
                {/* 1. Header Rows (Two Columns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  
                  {/* Left Column Emitter Info */}
                  <div className="space-y-4">
                    {issuer?.logo ? (
                      <div className="bg-white border border-slate-100 rounded-xl p-3 inline-block shadow-xs">
                        <img
                          src={issuer.logo}
                          alt="Logo Emisor"
                          className="h-16 max-w-[200px] object-contain"
                        />
                      </div>
                    ) : (
                      <div className="h-16 w-32 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-300 font-extrabold uppercase tracking-wide text-[10px]">
                        Sin Logotipo
                      </div>
                    )}
                    
                    <div className="border border-slate-150 rounded-xl p-4 space-y-2 bg-slate-50/20">
                      <h4 className="font-extrabold text-sm text-slate-800 uppercase leading-snug">
                        {issuer?.razonSocial || `${issuer?.nombres} ${issuer?.apellidos}`}
                      </h4>
                      <p className="font-semibold text-slate-700">{issuer?.nombreEmpresa}</p>
                      <p className="text-slate-500"><strong className="text-slate-600">Dirección Matriz:</strong> {issuer?.direccion}</p>
                      <p className="text-slate-500"><strong className="text-slate-600">Dirección Sucursal:</strong> {issuer?.direccion}</p>
                      <p className="text-slate-500"><strong className="text-slate-600">Obligado a llevar contabilidad:</strong> {issuer?.obligadoContabilidad ? "SÍ" : "NO"}</p>
                      <p className="text-slate-500"><strong className="text-slate-600">Régimen:</strong> {issuer?.regimen || "RÉGIMEN GENERAL"}</p>
                    </div>
                  </div>
                  
                  {/* Right Column SRI Invoice Details */}
                  <div className="border border-slate-200 rounded-xl p-5 space-y-3 bg-white shadow-xs">
                    <div className="space-y-1">
                      <p className="text-[12px] font-black text-slate-800 uppercase tracking-wide">R.U.C.: {issuer?.ruc}</p>
                      <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">FACTURA</h3>
                      <p className="text-slate-500 font-mono text-xs">No. {issuer?.establecimiento || "001"}-{issuer?.puntoEmision || "001"}-{String(parseInt(issuer?.startSecuencial || "1", 10)).padStart(9, "0")}</p>
                    </div>
                    
                    <div className="bg-blue-50/30 border border-blue-100 rounded-lg py-1 px-3 text-center">
                      <span className="text-[10px] font-bold text-blue-700 tracking-wide uppercase">Autorizado por el SRI</span>
                    </div>
                    
                    <div className="space-y-1.5 text-[10px] text-slate-600">
                      <p><strong className="text-slate-700">NÚMERO DE AUTORIZACIÓN:</strong></p>
                      <p className="font-mono text-slate-500 break-all select-all">2004202601110319994700120010010000008601234567816</p>
                      <p><strong className="text-slate-700">FECHA Y HORA DE AUTORIZACIÓN:</strong> {new Date().toLocaleString()}</p>
                      <p><strong className="text-slate-700">AMBIENTE:</strong> {issuer?.ambiente === 2 ? "PRODUCCIÓN" : "PRUEBAS"}</p>
                      <p><strong className="text-slate-700">EMISIÓN:</strong> NORMAL</p>
                    </div>
                    
                    {/* Simulated Barcode Access Code */}
                    <div className="border-t border-slate-100 pt-3 space-y-1 text-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Clave de Acceso SRI</span>
                      <div className="h-9 w-full flex items-center justify-center gap-[1.5px] bg-slate-50 rounded p-1 opacity-80 select-none">
                        {Array.from({ length: 42 }).map((_, i) => (
                          <div
                            key={i}
                            className="bg-slate-800 h-full"
                            style={{ width: i % 3 === 0 ? "3px" : i % 5 === 0 ? "1px" : "2px" }}
                          />
                        ))}
                      </div>
                      <p className="font-mono text-[9px] text-slate-500 break-all">2004202601110319994700120010010000008601234567816</p>
                    </div>
                  </div>
                  
                </div>
                
                {/* 2. Client Receptor Details Card */}
                <div className="border border-slate-150 rounded-xl p-4 bg-slate-50/30 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p><strong className="text-slate-500 uppercase text-[9px] tracking-wider block">Razón Social / Nombres:</strong> <span className="font-bold text-slate-800">{billingClient.nombres}</span></p>
                    <p><strong className="text-slate-500 uppercase text-[9px] tracking-wider block">Identificación (RUC/CI):</strong> <span className="font-mono font-bold text-slate-700">{billingClient.identificacion}</span></p>
                    <p><strong className="text-slate-500 uppercase text-[9px] tracking-wider block">Dirección Principal:</strong> <span className="text-slate-600">{billingClient.direccion}</span></p>
                  </div>
                  <div className="space-y-1 text-left md:text-right">
                    <p><strong className="text-slate-500 uppercase text-[9px] tracking-wider block">Fecha Emisión:</strong> <span className="font-semibold text-slate-800">{new Date().toLocaleDateString()}</span></p>
                    <p><strong className="text-slate-500 uppercase text-[9px] tracking-wider block">Guía de Remisión:</strong> <span className="text-slate-400 font-semibold">-</span></p>
                  </div>
                </div>
                
                {/* 3. Items Grid Table */}
                <div className="border border-slate-150 rounded-xl overflow-hidden">
                  <table className="w-full text-left divide-y divide-slate-150">
                    <thead className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-2.5">Código</th>
                        <th className="px-4 py-2.5 text-center">Cant</th>
                        <th className="px-4 py-2.5">Descripción / Detalle</th>
                        <th className="px-4 py-2.5 text-right">Unitario</th>
                        <th className="px-4 py-2.5 text-right">Dsct</th>
                        <th className="px-4 py-2.5 text-center">IVA</th>
                        <th className="px-4 py-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 text-[10px]">
                      {addedItems.map((item, idx) => {
                        const cant = parseFloat(item.cantidad) || 0;
                        const price = parseFloat(item.precio) || 0;
                        const desc = parseFloat(item.descuento) || 0;
                        const itemSub = price * cant - desc;
                        
                        return (
                          <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-4 py-2.5 font-mono text-[9px] text-slate-400">
                              {item.isDynamic ? `TEMP-${1000 + idx}` : item.codigoPrincipal || `PROD-${item.productId}`}
                            </td>
                            <td className="px-4 py-2.5 text-center font-bold text-slate-700">{cant.toFixed(2)}</td>
                            <td className="px-4 py-2.5">
                              <span className="font-semibold text-slate-800">{item.nombre}</span>
                              {item.descripcion && <p className="text-[9px] text-slate-400 mt-0.5">{item.descripcion}</p>}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono">${price.toFixed(4)}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-orange-600">${desc.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-center">
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[8px] font-bold">{item.iva}%</span>
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-slate-800 font-mono">${itemSub.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                      {addedItems.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400 italic">
                            No hay ítems registrados en la factura.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* 4. Bottom Information Block and Desglose */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start pt-4 border-t border-slate-100">
                  
                  {/* Left Column Information */}
                  <div className="md:col-span-7 border border-slate-150 rounded-xl p-4 bg-slate-50/20 space-y-3.5">
                    <div>
                      <h4 className="font-bold text-slate-700 border-b border-slate-150 pb-1 uppercase tracking-wider text-[9px]">
                        Información del Comprobante
                      </h4>
                      <div className="space-y-1 mt-2 text-[10px] text-slate-600">
                        <p><strong className="text-slate-700">Correo Electrónico:</strong> {billingClient.mail}</p>
                        <p><strong className="text-slate-700">Teléfono Contacto:</strong> {billingClient.celular} {billingClient.telefono ? ` / ${billingClient.telefono}` : ""}</p>
                        {billingObservaciones && (
                          <p className="mt-1"><strong className="text-slate-700">Observaciones:</strong> <span className="italic">{billingObservaciones}</span></p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-bold text-slate-700 border-b border-slate-150 pb-1 uppercase tracking-wider text-[9px]">
                        Detalle de Pagos
                      </h4>
                      <div className="space-y-1.5 mt-2">
                        {billingPayments.map((p, i) => {
                          const formaPagoMap: { [key: string]: string } = {
                            "01": "SIN UTILIZACION DEL SISTEMA FINANCIERO",
                            "15": "COMPENSACION DE DEUDAS",
                            "16": "TARJETA DE DEBITO",
                            "17": "DINERO ELECTRONICO",
                            "18": "TARJETA PREPAGO",
                            "19": "TARJETA DE CREDITO",
                            "20": "OTROS CON UTILIZACION DEL SISTEMA FINANCIERO",
                            "21": "ENDOSO DE TITULOS",
                          };
                          
                          // Auto-completar el pago único si es cero
                          const displayTotal = (billingPayments.length === 1 && (parseFloat(p.total) === 0 || !p.total)) 
                            ? calculateNewInvoiceTotals().total 
                            : parseFloat(p.total) || 0;
                          
                          return (
                            <div key={i} className="flex justify-between items-center text-[9px] bg-white border border-slate-100 rounded-lg p-2 font-mono">
                              <span className="font-bold text-slate-600 max-w-[200px] truncate">{formaPagoMap[p.formaPago] || "OTROS"}</span>
                              <span className="font-black text-slate-800">${displayTotal.toFixed(2)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  
                  {/* Right Column Financial Breakdown */}
                  <div className="md:col-span-5 border border-slate-150 rounded-xl overflow-hidden divide-y divide-slate-100 font-sans shadow-xs">
                    <div className="flex justify-between p-2.5 text-slate-500">
                      <span className="font-semibold">SUBTOTAL 0%</span>
                      <span className="font-bold font-mono text-slate-700">${calculateNewInvoiceTotals().subtotal0.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-2.5 text-slate-500">
                      <span className="font-semibold">SUBTOTAL GRABADO IVA</span>
                      <span className="font-bold font-mono text-slate-700">${calculateNewInvoiceTotals().subtotalIva.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-2.5 text-slate-500">
                      <span className="font-semibold">DESCUENTO</span>
                      <span className="font-bold font-mono text-slate-700">${calculateNewInvoiceTotals().descuento.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-2.5 text-slate-500">
                      <span className="font-semibold">IVA TOTAL</span>
                      <span className="font-bold font-mono text-slate-700">${calculateNewInvoiceTotals().valorIva.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-slate-900 text-white font-extrabold text-[12px]">
                      <span>VALOR TOTAL</span>
                      <span className="font-mono text-blue-400">${calculateNewInvoiceTotals().total.toFixed(2)}</span>
                    </div>
                  </div>
                  
                </div>
                
              </div>
            </div>
            
            {/* Actions Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowTicketPreviewModal(false)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-extrabold text-[10px] rounded-xl transition-all uppercase tracking-wider shadow-xs"
              >
                Cerrar Previsualización
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* MODAL: GESTIONAR MEMBRESÍA Y BILLETERA */}
      {showMembershipModal && issuer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-start justify-center p-4 pt-10 md:pt-16 backdrop-blur-xs font-sans overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full border border-slate-100 overflow-hidden animate-scale-up flex flex-col my-8">
            
            {/* Header */}
            <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white">
              <div className="flex items-center space-x-2.5">
                <CreditCard className="h-5 w-5 text-violet-400" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-100">
                  Gestionar Membresía y Billetera Virtual
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMembershipModal(false)}
                className="text-slate-400 hover:text-white transition-colors font-extrabold text-sm"
              >
                ✕
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                
                {/* Column 1: Info del Plan Actual */}
                <div className="space-y-6 bg-slate-50/50 border border-slate-100 p-5 rounded-2xl">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Modalidad Activa</span>
                    {issuer.planType === "MONTHLY" ? (
                      <div className="flex items-center space-x-3 bg-violet-50 border border-violet-100 rounded-xl p-4">
                        <div className="h-10 w-10 bg-violet-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm">
                          <CreditCard className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="text-xs font-extrabold text-violet-900 uppercase tracking-wider block">PLAN MENSUAL ILIMITADO</span>
                          <span className="text-[10px] text-violet-500 font-bold block mt-0.5">$15.00 / mes • Emisiones ilimitadas</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3 bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                        <div className="h-10 w-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm">
                          <Wallet className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="text-xs font-extrabold text-emerald-900 uppercase tracking-wider block">BILLETERA (PAGO POR FACTURA)</span>
                          <span className="text-[10px] text-emerald-500 font-bold block mt-0.5">$0.20 por factura emitida con éxito</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Estado / Detalles del Plan */}
                  <div className="border-t border-slate-200/60 pt-4 space-y-3">
                    {issuer.planType === "MONTHLY" ? (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-bold">FECHA DE VENCIMIENTO:</span>
                        <span className="font-extrabold text-slate-800 font-mono">
                          {(() => {
                            const d = new Date(issuer.subscriptionEnds);
                            return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth()+1).padStart(2, "0")}/${d.getFullYear()}`;
                          })()}
                        </span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-bold">SALDO DISPONIBLE:</span>
                        <span className="font-black text-slate-900 text-sm">
                          ${issuer.balance.toFixed(2)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-bold">ESTADO DE CUENTA:</span>
                      <span className={`text-[9px] font-black uppercase rounded-full px-2 py-0.5 border ${
                        issuer.planType === "MONTHLY" && new Date(issuer.subscriptionEnds) < new Date()
                          ? "bg-red-50 border-red-200 text-red-700 animate-pulse"
                          : "bg-green-50 border-green-200 text-green-700"
                      }`}>
                        {issuer.planType === "MONTHLY" && new Date(issuer.subscriptionEnds) < new Date() ? "Suspendido por Expiración" : "Activa"}
                      </span>
                    </div>
                  </div>

                  {/* Cambio de Plan */}
                  <div className="border-t border-slate-200/60 pt-4 space-y-3 bg-white p-4 rounded-xl border border-slate-100 shadow-3xs">
                    <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center">
                      <RefreshCw className="h-3 w-3 mr-1 text-violet-500" /> Cambiar de Modalidad de Plan
                    </h4>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      {issuer.planType === "MONTHLY" 
                        ? "Si no deseas pagar $15 mensuales y facturas poco, puedes cambiar a Pago por Factura. Pagarás $0.20 solo por cada factura emitida satisfactoriamente usando tu saldo de billetera."
                        : "Si facturas frecuentemente, te conviene contratar el Plan Mensual Ilimitado por $15.00 al mes y olvidarte de recargar saldo por cada factura."}
                    </p>
                    <button
                      type="button"
                      onClick={handleSwitchPlanType}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-950 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors shadow-2xs active:scale-[0.98]"
                    >
                      <span>Cambiar a {issuer.planType === "MONTHLY" ? "Pago por Factura" : "Plan Mensual"}</span>
                    </button>
                  </div>
                </div>

                {/* Column 2: Registrar / Recargar */}
                <div className="space-y-6">
                  {/* Selector de Tipo de Solicitud */}
                  <div className="flex border border-slate-200 rounded-xl p-1 bg-slate-50 select-none">
                    <button
                      type="button"
                      onClick={() => setSelectedRequestType("TOPUP")}
                      className={`flex-1 text-center py-2 rounded-lg text-xs font-black transition-all ${
                        selectedRequestType === "TOPUP" 
                          ? "bg-white text-slate-800 shadow-2xs" 
                          : "text-slate-400 hover:text-slate-700"
                      }`}
                    >
                      Recargar Billetera
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRequestType("MEMBERSHIP")}
                      className={`flex-1 text-center py-2 rounded-lg text-xs font-black transition-all ${
                        selectedRequestType === "MEMBERSHIP" 
                          ? "bg-white text-slate-800 shadow-2xs" 
                          : "text-slate-400 hover:text-slate-700"
                      }`}
                    >
                      Renovar Mensualidad ({systemConfig?.monthlyPlanFee ? `$${systemConfig.monthlyPlanFee.toFixed(2)}` : "$15"})
                    </button>
                  </div>

                  {/* Cuentas Bancarias Dinámicas */}
                  <div className="space-y-2 bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center">
                        <Building className="h-3.5 w-3.5 mr-1 text-slate-400" /> Cuentas para Transferencia / Depósito
                      </h4>
                      <span className="text-[9px] text-slate-400 font-semibold">Toca una cuenta para seleccionarla</span>
                    </div>

                    {bankAccountsList && bankAccountsList.filter((b) => b.activo !== false).length > 0 ? (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {bankAccountsList
                          .filter((b) => b.activo !== false)
                          .map((acc) => (
                            <div
                              key={acc.id}
                              onClick={() => setPaymentBank(`${acc.banco} - ${acc.tipoCuenta}`)}
                              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                                paymentBank.includes(acc.banco)
                                  ? "bg-blue-50/90 border-blue-400 ring-1 ring-blue-300 shadow-xs"
                                  : "bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs"
                              }`}
                            >
                              <div className="space-y-0.5 text-xs">
                                <div className="flex items-center space-x-2">
                                  <span className="font-extrabold text-slate-800">{acc.banco}</span>
                                  <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                                    {acc.tipoCuenta}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2 font-mono text-slate-800">
                                  <span className="font-black text-slate-900">{acc.numeroCuenta}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopyText(acc.numeroCuenta, `Número de cuenta ${acc.banco}`);
                                    }}
                                    className="text-[10px] text-blue-600 hover:text-blue-800 font-sans font-bold hover:underline ml-1 cursor-pointer"
                                  >
                                    📋 Copiar
                                  </button>
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  <span>Titular:</span> {acc.titular} {acc.identificacionTitular && `(${acc.identificacionTitular})`}
                                </div>
                              </div>

                              {acc.qrCode && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewQrModal({
                                      isOpen: true,
                                      banco: acc.banco,
                                      qrCode: acc.qrCode,
                                      titular: acc.titular,
                                      numeroCuenta: acc.numeroCuenta,
                                      tipoCuenta: acc.tipoCuenta,
                                    });
                                  }}
                                  className="shrink-0 p-2 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-xl text-emerald-700 text-[10px] font-bold flex flex-col items-center justify-center transition-colors cursor-pointer"
                                  title="Ver Código QR para escanear"
                                >
                                  <QrCode className="h-5 w-5 text-emerald-600 mb-0.5" />
                                  <span>Ver QR</span>
                                </button>
                              )}
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="bg-white border border-slate-200/60 rounded-xl p-3 font-mono text-[10px] text-slate-600 whitespace-pre-wrap leading-relaxed shadow-3xs">
                        {systemConfig?.bankAccounts || "No hay cuentas bancarias configuradas actualmente."}
                      </div>
                    )}
                  </div>

                  {/* Formulario de registro de pago */}
                  <form onSubmit={handleRequestPayment} className="space-y-4">
                    {selectedRequestType === "TOPUP" ? (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Monto a Recargar * (Mínimo $5.00)
                        </label>
                        <div className="relative rounded-lg shadow-2xs">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-slate-400 text-xs font-bold">$</span>
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            min="5"
                            required
                            value={topupAmount}
                            onChange={(e) => setTopupAmount(e.target.value)}
                            className="block w-full pl-7 pr-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-600 font-bold"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Costo de Renovación Fijo
                        </label>
                        <div className="py-2 px-3 border border-slate-100 rounded-lg bg-slate-50/50 text-slate-700 text-xs font-black">
                          {systemConfig?.monthlyPlanFee ? `$${systemConfig.monthlyPlanFee.toFixed(2)}` : "$15.00"} USD (30 días de suscripción ilimitada)
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          No. Referencia / Comprobante *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="ej. 892381273"
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                          className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-600 font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Banco de Destino *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="ej. Banco Pichincha"
                          value={paymentBank}
                          onChange={(e) => setPaymentBank(e.target.value)}
                          className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-600 font-bold"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row gap-3">
                      <button
                        type="submit"
                        className="flex-1 bg-slate-900 hover:bg-slate-950 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-colors flex items-center justify-center space-x-1.5 shadow-sm active:scale-[0.98]"
                      >
                        <Check className="h-4 w-4" />
                        <span>Registrar Transferencia</span>
                      </button>

                      {/* Notificar por WhatsApp */}
                      <a
                        href={`https://wa.me/${systemConfig?.adminWhatsapp || "593999999999"}?text=Hola%20Administrador,%20he%20registrado%20un%20pago%20en%20FácilSRI%20para%20mi%20RUC%20${issuer.ruc}%20(${issuer.nombreEmpresa})%20por%20un%20monto%20de%20$${selectedRequestType === "TOPUP" ? topupAmount : (systemConfig?.monthlyPlanFee ? systemConfig.monthlyPlanFee.toFixed(2) : "15.00")}%20para%20${selectedRequestType === "TOPUP" ? "Recarga de Billetera" : "Renovación de Membresía"}.%20Referencia%20del%20depósito:%20${paymentReference || "N/A"}.%20Quedo%20atento%20a%20la%20aprobación.%20Gracias!`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center bg-green-500 hover:bg-green-600 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-colors shadow-sm active:scale-[0.98]"
                      >
                        <MessageSquare className="h-4 w-4 mr-1.5" /> WhatsApp
                      </a>
                    </div>
                  </form>
                </div>

              </div>

              {/* Historial de solicitudes */}
              <div className="border-t border-slate-200/60 pt-6 space-y-3">
                <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest flex items-center">
                  <Clock className="h-4 w-4 mr-1 text-slate-400" /> Historial de Solicitudes de Recarga y Renovación
                </h4>
                <div className="overflow-x-auto max-h-[200px] border border-slate-100 rounded-xl">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-slate-50 border-b border-slate-150 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-2">Fecha</th>
                        <th className="px-4 py-2">Tipo</th>
                        <th className="px-4 py-2">Monto</th>
                        <th className="px-4 py-2">Referencia</th>
                        <th className="px-4 py-2">Banco</th>
                        <th className="px-4 py-2 text-right">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-mono text-[10px]">
                      {membershipRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-2.5 font-sans text-slate-500">
                            {(() => {
                              const d = new Date(req.fechaSolicitud);
                              return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
                            })()}
                          </td>
                          <td className="px-4 py-2.5 font-sans font-bold text-slate-600">
                            {req.tipo === "TOPUP" ? "Recarga Billetera" : "Renovación Plan"}
                          </td>
                          <td className="px-4 py-2.5 font-black text-slate-800">
                            ${req.monto.toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 text-slate-500">
                            {req.referencia}
                          </td>
                          <td className="px-4 py-2.5 font-sans text-slate-600">
                            {req.bancoDestino}
                          </td>
                          <td className="px-4 py-2.5 text-right font-sans">
                            <span className={`text-[8px] font-black uppercase rounded-full px-2 py-0.5 border ${
                              req.estado === "APROBADO" 
                                ? "bg-green-50 border-green-200 text-green-700" 
                                : req.estado === "RECHAZADO"
                                ? "bg-red-50 border-red-200 text-red-700"
                                : "bg-amber-50 border-amber-200 text-amber-700 animate-pulse"
                            }`}>
                              {req.estado}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {membershipRequests.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-slate-400 font-sans text-xs">
                            No tienes ninguna solicitud registrada.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowMembershipModal(false)}
                className="px-5 py-2 border border-slate-250 bg-white hover:bg-slate-50 rounded-xl text-slate-700 font-black text-xs uppercase tracking-wider transition-colors"
              >
                Cerrar
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* MODAL DE ANULACIÓN Y EMISIÓN DE NOTAS DE CRÉDITO */}
      {showCancelModal && cancelModalInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-100">
            
            {/* Header del Modal */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold flex items-center tracking-tight">
                  <AlertTriangle className="h-4 w-4 mr-2 text-rose-400" /> Anulación / Nota de Crédito de Factura
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                  Secuencial: {(cancelModalInvoice as any).issuer?.establecimiento || issuer?.establecimiento || "001"}-{(cancelModalInvoice as any).issuer?.puntoEmision || issuer?.puntoEmision || "001"}-{cancelModalInvoice.secuencial} | Total: ${cancelModalInvoice.total.toFixed(2)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="text-slate-400 hover:text-white transition-colors text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Pestañas de Modalidades */}
            <div className="flex border-b border-slate-200 bg-slate-50/50 p-1.5 gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setCancelTab("SRI")}
                className={`flex-1 py-2 px-3 rounded-xl transition-all ${
                  cancelTab === "SRI"
                    ? "bg-white text-blue-700 shadow-2xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                1. Anular en Portal SRI (Copy & Paste)
              </button>

              <button
                type="button"
                onClick={() => setCancelTab("NC")}
                className={`flex-1 py-2 px-3 rounded-xl transition-all ${
                  cancelTab === "NC"
                    ? "bg-white text-blue-700 shadow-2xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                2. Emitir Nota de Crédito (SRI 04)
              </button>

              <button
                type="button"
                onClick={() => setCancelTab("SYSTEM")}
                className={`flex-1 py-2 px-3 rounded-xl transition-all ${
                  cancelTab === "SYSTEM"
                    ? "bg-white text-blue-700 shadow-2xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                3. Solo en Sistema (Interno)
              </button>
            </div>

            {/* Alerta flotante de feedback al copiar */}
            {copyFeedback && (
              <div className="bg-emerald-500 text-white text-xs font-bold px-4 py-2 text-center transition-all animate-fade-in">
                {copyFeedback}
              </div>
            )}

            {/* CUERPO DEL MODAL SEGÚN LA PESTAÑA */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              
              {/* --- PESTAÑA 1: ANULAR EN PORTAL SRI (ASISTENTE COPY & PASTE COMPLETO) --- */}
              {cancelTab === "SRI" && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 space-y-1">
                    <strong className="font-extrabold flex items-center">
                      <FileText className="h-4 w-4 mr-1 text-blue-600" /> Solicitud de Anulación en el Portal Oficial del SRI:
                    </strong>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Haz clic en los botones <strong>"📋 Copiar"</strong> de cada campo para pegar exactamente la información requerida en la página oficial de anulación del SRI.
                    </p>
                  </div>

                  {/* TABLA DE CAMPOS PARA COPIAR Y PEGAR */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white shadow-2xs text-xs">
                    
                    {/* Campo 1: Tipo de Comprobante */}
                    <div className="p-3 flex items-center justify-between hover:bg-slate-50/50">
                      <div>
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">1. Tipo de comprobante</span>
                        <span className="font-bold text-slate-800">Factura</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyText("Factura", "Tipo de comprobante")}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center cursor-pointer"
                      >
                        📋 Copiar
                      </button>
                    </div>

                    {/* Campo 2: Fecha Autorización */}
                    <div className="p-3 flex items-center justify-between hover:bg-slate-50/50">
                      <div>
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">2. Fecha autorización</span>
                        <span className="font-bold text-slate-800 font-mono">
                          {(() => {
                            const d = new Date(cancelModalInvoice.fechaEmision);
                            return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
                          })()}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date(cancelModalInvoice.fechaEmision);
                          const fechaStr = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
                          handleCopyText(fechaStr, "Fecha autorización");
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center cursor-pointer"
                      >
                        📋 Copiar
                      </button>
                    </div>

                    {/* Campo 3: Clave acceso */}
                    <div className="p-3 flex items-center justify-between hover:bg-slate-50/50">
                      <div className="pr-4">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">3. Clave acceso (49 dígitos)</span>
                        <span className="font-bold text-slate-700 font-mono text-[11px] break-all">{cancelModalInvoice.claveAcceso}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyText(cancelModalInvoice.claveAcceso, "Clave de acceso")}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center shrink-0 cursor-pointer"
                      >
                        📋 Copiar
                      </button>
                    </div>

                    {/* Campo 4: No. Autorización */}
                    <div className="p-3 flex items-center justify-between hover:bg-slate-50/50">
                      <div className="pr-4">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">4. No. Autorización</span>
                        <span className="font-bold text-slate-700 font-mono text-[11px] break-all">{cancelModalInvoice.claveAcceso}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyText(cancelModalInvoice.claveAcceso, "No. Autorización")}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center shrink-0 cursor-pointer"
                      >
                        📋 Copiar
                      </button>
                    </div>

                    {/* Campo 5: Identificación receptor */}
                    <div className="p-3 flex items-center justify-between hover:bg-slate-50/50">
                      <div>
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">5. Identificación receptor</span>
                        <span className="font-bold text-slate-800 font-mono">{cancelModalInvoice.client?.identificacion}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyText(cancelModalInvoice.client?.identificacion, "Identificación receptor")}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center cursor-pointer"
                      >
                        📋 Copiar
                      </button>
                    </div>

                    {/* Campo 6: Correo electrónico receptor */}
                    <div className="p-3 flex items-center justify-between hover:bg-slate-50/50">
                      <div>
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">6. Correo electrónico receptor</span>
                        <span className="font-bold text-slate-800">{cancelModalInvoice.client?.mail}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyText(cancelModalInvoice.client?.mail, "Correo del receptor")}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center cursor-pointer"
                      >
                        📋 Copiar
                      </button>
                    </div>

                  </div>

                  {/* ACCIONES DE PORTAL Y CONFIRMACIÓN */}
                  <div className="pt-2 space-y-2">
                    <a
                      href="https://srienlinea.sri.gob.ec/sri-en-linea/SriComprobantesElectronicosWeb/AnulacionComprobantes/SolicitudAnulacionComprobantes/consultarComprobante.jsf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs transition-all shadow-md shadow-blue-600/10"
                    >
                      🌐 Abrir Portal Oficial de Anulaciones del SRI ➔
                    </a>

                    <button
                      type="button"
                      disabled={cancelLoading}
                      onClick={() => handleExecuteCancel("cancel_sri")}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs transition-all shadow-md shadow-emerald-600/10 cursor-pointer disabled:opacity-50"
                    >
                      ✓ Confirmar Anulación Registrada en el SRI
                    </button>
                  </div>
                </div>
              )}

              {/* --- PESTAÑA 2: EMITIR NOTA DE CRÉDITO ELECTRÓNICA (SRI 04) --- */}
              {cancelTab === "NC" && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-purple-50 border border-purple-100 rounded-xl text-xs text-purple-900 space-y-1">
                    <strong className="font-extrabold flex items-center">
                      <FileText className="h-4 w-4 mr-1 text-purple-600" /> Emisión Oficial de Nota de Crédito (Tipo 04):
                    </strong>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Se generará y firmará digitalmente el comprobante de Nota de Crédito modificatorio ante los Web Services SOAP del SRI para anular o ajustar esta factura.
                    </p>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                        Factura de Origen a Modificar
                      </label>
                      <input
                        type="text"
                        disabled
                        value={`Factura Nº ${(cancelModalInvoice as any).issuer?.establecimiento || issuer?.establecimiento || "001"}-${(cancelModalInvoice as any).issuer?.puntoEmision || issuer?.puntoEmision || "001"}-${cancelModalInvoice.secuencial}`}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-100 font-bold text-slate-700"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                        Cliente / Razón Social
                      </label>
                      <input
                        type="text"
                        disabled
                        value={`${cancelModalInvoice.client?.nombres} (${cancelModalInvoice.client?.identificacion})`}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-100 font-bold text-slate-700 uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                        Motivo de la Nota de Crédito *
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Ejemplo: Devolución total de mercadería / Descuento concedido / Error en factura..."
                        value={cancelMotivo}
                        onChange={(e) => setCancelMotivo(e.target.value)}
                        className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-600 text-xs text-slate-800"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={cancelLoading}
                      onClick={() => handleExecuteCancel("issue_credit_note")}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs transition-all shadow-md shadow-purple-600/10 cursor-pointer disabled:opacity-50"
                    >
                      {cancelLoading ? "Emitiendo Nota de Crédito en el SRI..." : "⚡ Firmar y Transmitir Nota de Crédito al SRI"}
                    </button>
                  </div>
                </div>
              )}

              {/* --- PESTAÑA 3: ANULAR SOLO EN EL SISTEMA (LOCAL) --- */}
              {cancelTab === "SYSTEM" && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-900 space-y-1">
                    <strong className="font-extrabold flex items-center">
                      ⚠️ Anulación Interna Únicamente:
                    </strong>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Esta opción cambiará el estado de la factura a <strong>ANULADA_SISTEMA</strong> en la base de datos local de la aplicación sin transmitir ninguna solicitud al SRI.
                    </p>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                        Motivo de Anulación Interna *
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Ingrese el motivo por el cual invalida este registro en el sistema..."
                        value={cancelMotivo}
                        onChange={(e) => setCancelMotivo(e.target.value)}
                        className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-600 text-xs text-slate-800"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={cancelLoading}
                      onClick={() => handleExecuteCancel("cancel_system")}
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs transition-all shadow-md shadow-rose-600/10 cursor-pointer disabled:opacity-50"
                    >
                      🚫 Confirmar Anulación Solo en Sistema
                    </button>
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

      {/* MODAL PARA AGREGAR / EDITAR CUENTA BANCARIA CON QR */}
      {showBankModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100">
            
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-sm font-extrabold flex items-center tracking-tight">
                <Building className="h-4 w-4 mr-2 text-emerald-400" />
                {bankForm.id ? "Editar Cuenta Bancaria" : "Agregar Nueva Cuenta Bancaria"}
              </h3>
              <button
                type="button"
                onClick={() => setShowBankModal(false)}
                className="text-slate-400 hover:text-white transition-colors text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBankForm} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Banco / Institución *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Banco Pichincha"
                    value={bankForm.banco}
                    onChange={(e) => setBankForm({ ...bankForm, banco: e.target.value })}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-600 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Tipo de Cuenta *
                  </label>
                  <select
                    value={bankForm.tipoCuenta}
                    onChange={(e) => setBankForm({ ...bankForm, tipoCuenta: e.target.value })}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-600 font-bold"
                  >
                    <option value="Ahorros">Cuenta de Ahorros</option>
                    <option value="Corriente">Cuenta Corriente</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Número de Cuenta *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej. 2200123456"
                    value={bankForm.numeroCuenta}
                    onChange={(e) => setBankForm({ ...bankForm, numeroCuenta: e.target.value })}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-600 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Cédula / RUC del Titular
                  </label>
                  <input
                    type="text"
                    placeholder="ej. 1790000000001"
                    value={bankForm.identificacionTitular}
                    onChange={(e) => setBankForm({ ...bankForm, identificacionTitular: e.target.value })}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Nombre del Titular / Beneficiario *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. FácilSRI SaaS Cía. Ltda."
                  value={bankForm.titular}
                  onChange={(e) => setBankForm({ ...bankForm, titular: e.target.value })}
                  className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-600 font-bold uppercase"
                />
              </div>

              {/* Imagen del Código QR de Pago */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Código QR de Pago (Deuna, Pichincha QR, etc.)
                </label>
                <div className="flex items-center space-x-3 mt-1">
                  {bankForm.qrCode ? (
                    <div className="relative h-16 w-16 border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-center p-1 overflow-hidden shrink-0">
                      <img src={bankForm.qrCode} alt="QR" className="h-full w-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setBankForm({ ...bankForm, qrCode: "" })}
                        className="absolute top-0 right-0 h-4 w-4 bg-red-600 text-white rounded-full text-[8px] flex items-center justify-center font-bold hover:bg-red-700 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="h-16 w-16 border border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                      <Sparkles className="h-6 w-6" />
                    </div>
                  )}
                  <label className="flex-1 cursor-pointer">
                    <span className="inline-flex justify-center items-center w-full px-3 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 font-bold text-[10px] uppercase rounded-xl transition-colors">
                      <Upload className="h-4 w-4 mr-1.5" /> Subir Imagen QR de Pago
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBankQrUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="bankActivo"
                  checked={bankForm.activo}
                  onChange={(e) => setBankForm({ ...bankForm, activo: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <label htmlFor="bankActivo" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Cuenta activa (visible para transferencias de clientes)
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowBankModal(false)}
                  className="px-4 py-2 border border-slate-250 bg-white hover:bg-slate-50 rounded-xl text-slate-700 font-bold text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-sm"
                >
                  Guardar Cuenta Bancaria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE VISUALIZACIÓN / ESCANEO DE CÓDIGO QR */}
      {previewQrModal && previewQrModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-fade-in font-sans">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden border border-slate-100 text-center p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="text-left">
                <h3 className="text-sm font-extrabold text-slate-800">{previewQrModal.banco}</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase">{previewQrModal.tipoCuenta} - {previewQrModal.numeroCuenta}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewQrModal(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-center shadow-inner">
              <img
                src={previewQrModal.qrCode}
                alt={`QR ${previewQrModal.banco}`}
                className="max-h-64 w-auto object-contain rounded-xl"
              />
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <p className="font-extrabold text-slate-800 uppercase tracking-tight">{previewQrModal.titular}</p>
              <p className="text-[11px] text-slate-500">
                Abre tu app bancaria (Deuna, Pichincha, Guayaquil, etc.) y escanea el código para transferir directamente.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setPreviewQrModal(null)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cerrar QR
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
