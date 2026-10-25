'use client';

import { Shield, AlertTriangle, Car, Bell } from 'lucide-react';
import { useState } from 'react';
import SosModal from './SosModal';

interface NavbarTopProps {
  onOpenNotifications?: () => void;
}

export default function NavbarTop({ onOpenNotifications }: NavbarTopProps) {
  const [isSosOpen, setIsSosOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800/90 bg-[#0B0F17]/90 backdrop-blur-md pt-safe">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-md shadow-amber-500/20 text-zinc-950">
              <Car className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-sm font-black tracking-wider text-white">
                  PROYECTO<span className="text-amber-400">TAXI</span>
                </span>
                <span className="rounded bg-zinc-800 px-1 py-0.5 text-[9px] font-black text-amber-400 border border-amber-500/30">
                  VE
                </span>
              </div>
              <span className="text-[10px] text-zinc-400 font-medium tracking-tight">
                Interurbano & Compartido
              </span>
            </div>
          </div>

          {/* Right Action Icons: Highway Status & SOS Emergency */}
          <div className="flex items-center gap-2">
            {/* Live Network Status Indicator */}
            <div
              className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-1 text-[11px] font-medium text-emerald-400"
              title="Red de carreteras en línea"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <span className="hidden xs:inline text-[10px] font-semibold tracking-wide">
                ARC ACTIVA
              </span>
            </div>

            {/* Emergency SOS Button for Highway Safety */}
            <button
              type="button"
              onClick={() => setIsSosOpen(true)}
              className="flex items-center gap-1 rounded-lg border border-red-500/40 bg-red-950/40 px-2 py-1 text-[11px] font-bold text-red-400 shadow-sm transition active:scale-95 hover:bg-red-900/50"
              aria-label="Auxilio Vial y Seguridad"
            >
              <Shield className="h-3.5 w-3.5 text-red-400" />
              <span className="text-[11px]">S.O.S</span>
            </button>

            {/* Notifications Button */}
            <button
              type="button"
              onClick={onOpenNotifications}
              className="relative rounded-lg border border-zinc-800 bg-zinc-900/80 p-1.5 text-zinc-300 hover:text-white transition active:scale-95"
              aria-label="Notificaciones de ruta"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500"></span>
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Highway SOS Emergency Modal */}
      {isSosOpen && <SosModal onClose={() => setIsSosOpen(false)} />}
    </>
  );
}
