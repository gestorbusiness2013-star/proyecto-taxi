'use client';

import Link from 'next/link';
import { Shield, Car, Bell, Coins } from 'lucide-react';
import { useState, useEffect } from 'react';
import SosModal from './SosModal';
import { listenBcvRate, DEFAULT_BCV_RATE } from '@/lib/bcv';

interface NavbarTopProps {
  onOpenNotifications?: () => void;
}

export default function NavbarTop({ onOpenNotifications }: NavbarTopProps) {
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [bcvRate, setBcvRate] = useState<number>(DEFAULT_BCV_RATE);

  useEffect(() => {
    const unsub = listenBcvRate((rate) => setBcvRate(rate.rate));
    return () => unsub();
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-[#0B0F17]/95 backdrop-blur-xl pt-safe">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-3 sm:px-4">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-2 group active:scale-95 transition">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 shadow-md shadow-amber-500/25 text-zinc-950">
              <Car className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div className="flex flex-col leading-none">
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-black tracking-wider text-white">
                  PROYECTO<span className="text-amber-400">TAXI</span>
                </span>
                <span className="rounded bg-amber-500/15 px-1 py-0.5 text-[9px] font-black text-amber-400 border border-amber-500/30">
                  VE
                </span>
              </div>
              <span className="text-[11px] text-zinc-400 font-medium tracking-tight mt-0.5">
                Rutas Interurbanas
              </span>
            </div>
          </Link>

          {/* Right Action Icons: BCV Ticker, Chofer shortcut, SOS & Bell */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Live BCV Exchange Rate Pill */}
            <div
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-300"
              title="Tasa Oficial BCV en tiempo real"
            >
              <Coins className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>Bs.{bcvRate.toFixed(2)}</span>
            </div>

            {/* Link to Conductor view */}
            <Link
              href="/conductor"
              className="flex h-8 items-center gap-1 rounded-lg border border-white/10 bg-zinc-900/90 px-2.5 text-xs font-bold text-zinc-200 hover:text-amber-400 hover:border-amber-500/40 active:scale-95 transition"
              title="Panel del chofer"
            >
              <Car className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden xs:inline">Chofer</span>
            </Link>

            {/* Emergency SOS Button for Highway Safety */}
            <button
              type="button"
              onClick={() => setIsSosOpen(true)}
              className="flex h-8 items-center gap-1 rounded-lg border border-red-500/50 bg-red-950/60 px-2.5 text-xs font-black text-red-300 shadow-sm shadow-red-950/40 transition active:scale-95 hover:bg-red-900/60"
              aria-label="Auxilio Vial y Seguridad S.O.S"
            >
              <Shield className="h-3.5 w-3.5 text-red-400 animate-pulse" />
              <span className="tracking-wide">SOS</span>
            </button>

            {/* Notifications Button */}
            <button
              type="button"
              onClick={onOpenNotifications}
              className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:text-white transition active:scale-95"
              aria-label="Notificaciones de ruta"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
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
