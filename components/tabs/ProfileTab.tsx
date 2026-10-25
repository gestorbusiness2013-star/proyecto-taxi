'use client';

import { useState } from 'react';
import {
  User,
  ShieldCheck,
  Car,
  CreditCard,
  Bell,
  Download,
  PhoneCall,
  CheckCircle2,
  ChevronRight,
  Sun,
  Moon,
  Zap,
} from 'lucide-react';

export default function ProfileTab() {
  const [isDriverMode, setIsDriverMode] = useState(false);
  const [highContrastRoadMode, setHighContrastRoadMode] = useState(true);
  const [offlineAlerts, setOfflineAlerts] = useState(true);
  const [emergencyPhone, setEmergencyPhone] = useState('0414-9876543 (Hermano)');
  const [paymentPreference, setPaymentPreference] = useState('Efectivo USD ($) / Pago Móvil');

  return (
    <div className="space-y-4 pb-20">
      {/* Profile Header Card */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-[#0e1624] p-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-zinc-950 font-black text-xl shadow-lg shadow-amber-500/20">
            CM
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-zinc-950">
              <ShieldCheck className="h-3 w-3 text-white" />
            </span>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-bold text-white">Carlos E. Mendoza</h2>
              <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                VERIFICADO
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono">C.I. V-21.432.890</p>
            <div className="mt-1 flex items-center gap-2 text-xs">
              <span className="font-bold text-amber-400">★ 4.95</span>
              <span className="text-zinc-500">•</span>
              <span className="text-zinc-400">42 viajes en carretera</span>
            </div>
          </div>
        </div>

        {/* Mode Switcher: Pasajero vs Conductor */}
        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/80 p-1 flex">
          <button
            type="button"
            onClick={() => setIsDriverMode(false)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
              !isDriverMode
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Modo Pasajero
          </button>
          <button
            type="button"
            onClick={() => setIsDriverMode(true)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
              isDriverMode
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Modo Conductor
          </button>
        </div>
      </div>

      {/* Driver mode extra card */}
      {isDriverMode && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Car className="h-5 w-5 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Panel de Conductor Activo
            </h3>
          </div>
          <p className="text-xs text-zinc-300">
            Vehículo registrado:{' '}
            <strong className="text-white">Toyota Corolla 2017 (Placa: AB123CD)</strong>
          </p>
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/90 p-2.5">
              <span className="block text-base font-black text-amber-400">$240 USD</span>
              <span className="text-[10px] text-zinc-400">Ganancias del mes</span>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/90 p-2.5">
              <span className="block text-base font-black text-emerald-400">100%</span>
              <span className="text-[10px] text-zinc-400">Puntualidad en ARC</span>
            </div>
          </div>
        </div>
      )}

      {/* Highway Safety & Road Settings */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4" />
          <span>Seguridad Vial & Carretera</span>
        </h3>

        <div className="space-y-2.5 divide-y divide-zinc-800/80 text-xs">
          {/* Emergency Contact */}
          <div className="pt-2 flex items-center justify-between">
            <div>
              <p className="font-semibold text-zinc-200">Contacto de Emergencia</p>
              <p className="text-[11px] text-zinc-400">{emergencyPhone}</p>
            </div>
            <button
              type="button"
              className="text-xs font-semibold text-amber-400 hover:underline"
            >
              Editar
            </button>
          </div>

          {/* High Contrast Road Mode Toggle */}
          <div className="pt-2.5 flex items-center justify-between">
            <div>
              <p className="font-semibold text-zinc-200">Visibilidad Nocturna en Carretera</p>
              <p className="text-[11px] text-zinc-400">Alto contraste y bajo brillo para choferes</p>
            </div>
            <button
              type="button"
              onClick={() => setHighContrastRoadMode(!highContrastRoadMode)}
              className={`h-6 w-11 rounded-full transition-colors relative ${
                highContrastRoadMode ? 'bg-amber-500' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-zinc-950 transition-transform ${
                  highContrastRoadMode ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Offline highway cache alerts */}
          <div className="pt-2.5 flex items-center justify-between">
            <div>
              <p className="font-semibold text-zinc-200">Modo Sin Cobertura (Autopistas)</p>
              <p className="text-[11px] text-zinc-400">Guardar billetes y teléfonos en caché local</p>
            </div>
            <button
              type="button"
              onClick={() => setOfflineAlerts(!offlineAlerts)}
              className={`h-6 w-11 rounded-full transition-colors relative ${
                offlineAlerts ? 'bg-amber-500' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-zinc-950 transition-transform ${
                  offlineAlerts ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
          <CreditCard className="h-4 w-4" />
          <span>Métodos de Pago en Venezuela</span>
        </h3>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 text-xs space-y-2">
          <div className="flex justify-between items-center text-zinc-300">
            <span>Preferencia Principal:</span>
            <span className="font-semibold text-white">{paymentPreference}</span>
          </div>
          <div className="text-[11px] text-zinc-400">
            Aceptado en todas las rutas interurbanas: Pago Móvil BCV, Efectivo USD en buen estado y Zelle al abordar.
          </div>
        </div>
      </div>

      {/* PWA & App Info */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-zinc-300">Proyecto Taxi PWA</span>
          <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-400">
            v1.0.0-MVP
          </span>
        </div>
        <p className="text-[11px] text-zinc-500">
          Diseñado para viajes interurbanos en Venezuela. Optimizado para Vercel y funcionamiento offline en carreteras nacionales.
        </p>
      </div>
    </div>
  );
}
