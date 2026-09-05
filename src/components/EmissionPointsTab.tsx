"use client";

import React, { useState } from "react";
import {
  Store,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Key,
  ShieldCheck,
  User,
  Hash,
  Layers,
  Eye,
  EyeOff,
  RefreshCw,
  Building,
  Info,
  Check,
  Lock
} from "lucide-react";

export interface EmissionPoint {
  id: number;
  establecimiento: string;
  puntoEmision: string;
  nombre: string;
  username: string | null;
  password?: string | null;
  secuencialInicio: string;
  siguienteSecuencial?: string;
  activo: boolean;
  issuerId: number;
  _count?: {
    invoices: number;
  };
}

interface EmissionPointsTabProps {
  issuer: any;
  emissionPoints: EmissionPoint[];
  loading: boolean;
  onRefresh: () => void;
  safeFetch: (url: string, options?: RequestInit) => Promise<any>;
}

export default function EmissionPointsTab({
  issuer,
  emissionPoints,
  loading,
  onRefresh,
  safeFetch,
}: EmissionPointsTabProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingPoint, setEditingPoint] = useState<EmissionPoint | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    establecimiento: "001",
    puntoEmision: "002",
    nombre: "",
    username: "",
    password: "",
    secuencialInicio: "000000001",
    activo: true,
  });

  // Abrir modal para crear nuevo punto
  const handleOpenCreate = () => {
    setEditingPoint(null);
    // Calcular siguiente código de punto de emisión recomendado
    let nextCodeNum = 1;
    emissionPoints.forEach((ep) => {
      const num = parseInt(ep.puntoEmision, 10);
      if (!isNaN(num) && num >= nextCodeNum) {
        nextCodeNum = num + 1;
      }
    });
    const nextCode = String(nextCodeNum).padStart(3, "0");

    setFormData({
      establecimiento: issuer?.establecimiento || "001",
      puntoEmision: nextCode,
      nombre: `Caja ${nextCodeNum}`,
      username: `caja${nextCodeNum}`,
      password: "",
      secuencialInicio: "000000001",
      activo: true,
    });
    setShowPassword(false);
    setShowModal(true);
  };

  // Abrir modal para editar punto
  const handleOpenEdit = (point: EmissionPoint) => {
    setEditingPoint(point);
    setFormData({
      establecimiento: point.establecimiento,
      puntoEmision: point.puntoEmision,
      nombre: point.nombre,
      username: point.username || "",
      password: point.password || "",
      secuencialInicio: point.secuencialInicio || "000000001",
      activo: point.activo,
    });
    setShowPassword(false);
    setShowModal(true);
  };

  // Guardar punto de emisión (crear o editar)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.puntoEmision || !formData.nombre) {
      alert("Por favor ingrese el código de punto de emisión y el nombre de la caja.");
      return;
    }

    try {
      setSaving(true);
      let result;
      if (editingPoint) {
        result = await safeFetch("/api/emission-points", {
          method: "PUT",
          body: JSON.stringify({
            id: editingPoint.id,
            ...formData,
          }),
        });
      } else {
        result = await safeFetch("/api/emission-points", {
          method: "POST",
          body: JSON.stringify(formData),
        });
      }

      if (result.ok && result.data.success) {
        alert(result.data.message || "Punto de emisión guardado exitosamente.");
        setShowModal(false);
        onRefresh();
      } else {
        alert(result.error || result.data?.error || "Error al procesar punto de emisión.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Alternar estado activo / inactivo
  const handleToggleActive = async (point: EmissionPoint) => {
    try {
      const res = await safeFetch("/api/emission-points", {
        method: "PUT",
        body: JSON.stringify({
          id: point.id,
          activo: !point.activo,
        }),
      });
      if (res.ok) {
        onRefresh();
      } else {
        alert(res.error || "No se pudo cambiar el estado.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  // Eliminar punto de emisión
  const handleDelete = async (point: EmissionPoint) => {
    if (!window.confirm(`¿Estás seguro de eliminar el punto de emisión ${point.establecimiento}-${point.puntoEmision} (${point.nombre})?`)) {
      return;
    }

    try {
      const res = await safeFetch(`/api/emission-points?id=${point.id}`, {
        method: "DELETE",
      });
      if (res.ok && res.data.success) {
        alert(res.data.message);
        onRefresh();
      } else {
        alert(res.error || res.data?.error || "Error al eliminar punto de emisión.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const activePointsCount = emissionPoints.filter((p) => p.activo).length;

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      
      {/* 1. TARJETA PRINCIPAL DE ENCABEZADO */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50/50 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center space-x-3.5">
            <div className="h-12 w-12 rounded-2xl bg-blue-600/10 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                Puntos de Emisión & Cajas de Venta SRI
                <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Multi-Caja SRI
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Crea múltiples cajas para tu empresa, genera usuarios para tus cajeros con acceso restringido y maneja correlativos independientes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-slate-600 transition-all cursor-pointer"
              title="Actualizar listado"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-2xl shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Nuevo Punto de Emisión</span>
            </button>
          </div>
        </div>

        {/* 2. MÉTRICAS RÁPIDAS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
          <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Cajas Creadas</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-slate-900">{emissionPoints.length}</span>
              <span className="text-xs text-slate-500 font-medium">puntos registrados</span>
            </div>
          </div>

          <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Cajas Activas para Venta</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-emerald-700">{activePointsCount}</span>
              <span className="text-xs text-emerald-600 font-medium">habilitadas ante el SRI</span>
            </div>
          </div>

          <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl">
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Establecimiento Matriz</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-blue-700 font-mono">{issuer?.establecimiento || "001"}</span>
              <span className="text-xs text-blue-600 font-medium">código oficial SRI</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TABLA DE PUNTOS DE EMISIÓN */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Listado de Cajas y Accesos Delegados ({emissionPoints.length})
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">
            Los cajeros delegados solo podrán acceder a POS, Emitir Factura, Productos y Clientes.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Punto SRI</th>
                <th className="px-6 py-3.5">Nombre de Caja</th>
                <th className="px-6 py-3.5">Usuario de Caja</th>
                <th className="px-6 py-3.5">Secuencial Inicio</th>
                <th className="px-6 py-3.5 text-center">Facturas</th>
                <th className="px-6 py-3.5 text-center">Estado</th>
                <th className="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {emissionPoints.map((point) => {
                const invoiceCount = point._count?.invoices ?? 0;
                return (
                  <tr key={point.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="h-8 w-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-mono font-black text-xs">
                          {point.puntoEmision}
                        </div>
                        <div>
                          <span className="font-mono font-bold text-slate-800 text-xs">
                            {point.establecimiento}-{point.puntoEmision}
                          </span>
                          {point.puntoEmision === "001" && (
                            <span className="block text-[9px] text-blue-600 font-bold uppercase">Principal</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 text-xs">{point.nombre}</p>
                      <span className="text-[10px] text-slate-400">Establecimiento {point.establecimiento}</span>
                    </td>

                    <td className="px-6 py-4">
                      {point.username ? (
                        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-mono text-[11px] font-bold">
                          <User className="h-3 w-3 text-emerald-600" />
                          <span>{point.username}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium italic">
                          (Solo acceso Administrador)
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 font-mono text-slate-600 font-bold">
                      {point.secuencialInicio || "000000001"}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span className="px-2.5 py-1 bg-slate-100 rounded-xl font-black text-slate-700 font-mono text-xs">
                        {invoiceCount}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(point)}
                        className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                          point.activo
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                            : "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                        }`}
                      >
                        {point.activo ? (
                          <>
                            <CheckCircle className="h-3 w-3" />
                            <span>Activo</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" />
                            <span>Inactivo</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(point)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-xl transition-colors cursor-pointer"
                        title="Editar datos y contraseña"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span>Editar</span>
                      </button>

                      {emissionPoints.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDelete(point)}
                          className="inline-flex items-center p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl transition-colors cursor-pointer"
                          title="Eliminar o desactivar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. MODAL CREAR / EDITAR PUNTO DE EMISIÓN */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    {editingPoint ? `Editar Punto ${editingPoint.establecimiento}-${editingPoint.puntoEmision}` : "Nuevo Punto de Emisión"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Configura la numeración oficial SRI y las credenciales del cajero.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Establecimiento (3 dígitos)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={3}
                    value={formData.establecimiento}
                    onChange={(e) => setFormData({ ...formData, establecimiento: e.target.value.replace(/\D/g, "") })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 text-center"
                    placeholder="001"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Punto Emisión (3 dígitos)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={3}
                    value={formData.puntoEmision}
                    onChange={(e) => setFormData({ ...formData, puntoEmision: e.target.value.replace(/\D/g, "") })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 text-center"
                    placeholder="002"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Nombre de la Caja / Punto de Venta
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600"
                  placeholder="ej. Caja 2 - Mostrador Norte"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Secuencial Inicial SRI (9 dígitos)
                </label>
                <input
                  type="text"
                  required
                  maxLength={9}
                  value={formData.secuencialInicio}
                  onChange={(e) => setFormData({ ...formData, secuencialInicio: e.target.value.replace(/\D/g, "").padStart(9, "0") })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600"
                  placeholder="000000001"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Número con el que empezará a emitir facturas este punto en el SRI.
                </span>
              </div>

              {/* SECCIÓN DE CREDENCIALES DEL CAJERO */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center space-x-2">
                  <Key className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                    Acceso para Cajero Delegado (Opcional)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Si asignas un usuario y contraseña, el cajero podrá iniciar sesión en <strong>/auth</strong> y solo tendrá acceso al Punto de Venta, Emitir Facturas, Productos y Clientes.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Usuario de Caja
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, "") })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600"
                      placeholder="ej. cajero2"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Contraseña de Caja
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600 pr-8"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SWITCH ACTIVO */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-xs font-bold text-slate-700">Punto de Emisión Activo para Facturar</span>
                <input
                  type="checkbox"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  className="h-5 w-5 text-blue-600 rounded-lg cursor-pointer"
                />
              </div>

              {/* BOTONES */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Guardando..." : editingPoint ? "Actualizar Punto" : "Crear Punto de Emisión"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
