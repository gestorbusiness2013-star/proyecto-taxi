'use client';

import { Shield, PhoneCall, AlertTriangle, X, MapPin, Share2 } from 'lucide-react';
import { useState } from 'react';

interface SosModalProps {
  onClose: () => void;
}

export default function SosModal({ onClose }: SosModalProps) {
  const [copied, setCopied] = useState(false);

  const emergencyContacts = [
    {
      title: 'Ángeles de la Autopista (Paramédicos Viales)',
      number: '0800-VIAL (0800-8425)',
      tel: 'tel:08008425',
      note: 'Atención médica y rescate en autopistas',
    },
    {
      title: 'Emergencias Nacionales VEN 911',
      number: '911',
      tel: 'tel:911',
      note: 'Policía Nacional, Ambulancias, Bomberos',
    },
    {
      title: 'Auxilio Vial y Grúas ARC',
      number: '0800-ARCVIA',
      tel: 'tel:0800272842',
      note: 'Autopista Regional del Centro y peajes',
    },
  ];

  const handleShareLocation = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Mi ubicación en carretera - Proyecto Taxi',
        text: 'Estoy en ruta interurbana con Proyecto Taxi. Si no respondo en 30 minutos, revisa este enlace con mi última posición.',
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText('Alerta de seguridad: Proyecto Taxi - En ruta interurbana.');
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-red-500/40 bg-zinc-950 p-5 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-red-400">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-950/80 border border-red-500/40">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                ASISTENCIA VIAL & SOS
              </h3>
              <p className="text-[11px] text-zinc-400">Autopistas y Carreteras de Venezuela</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-2.5">
          {emergencyContacts.map((item) => (
            <a
              key={item.number}
              href={item.tel}
              className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/80 p-3 transition hover:border-red-500/50 hover:bg-zinc-900 active:scale-98"
            >
              <div>
                <p className="text-xs font-semibold text-zinc-200">{item.title}</p>
                <p className="text-[11px] text-zinc-400">{item.note}</p>
                <p className="text-xs font-bold text-amber-400 mt-0.5">{item.number}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-600/20 text-red-400 border border-red-500/30">
                <PhoneCall className="h-4 w-4" />
              </div>
            </a>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-zinc-800 flex gap-2">
          <button
            type="button"
            onClick={handleShareLocation}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 py-2.5 px-3 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 active:scale-95 transition"
          >
            <Share2 className="h-4 w-4" />
            <span>{copied ? '¡Copiado!' : 'Compartir con Familiar'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
