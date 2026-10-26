'use client';

import { X, Bell, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

interface NotificationsModalProps {
  onClose: () => void;
}

export default function NotificationsModal({ onClose }: NotificationsModalProps) {
  const notifications = [
    {
      id: 'notif-1',
      title: 'Paso fluido en Peaje Hoyo de La Puerta',
      time: 'Hace 15 min',
      text: 'Tráfico despejado sentido Caracas - Maracay en la Autopista Regional del Centro.',
      type: 'road',
    },
    {
      id: 'notif-2',
      title: 'Reserva de viaje confirmada',
      time: 'Hace 1 hora',
      text: 'Tu puesto en el Toyota Corolla para Valencia está listo. Recuerda llegar 15 minutos antes al punto de encuentro.',
      type: 'trip',
    },
    {
      id: 'notif-3',
      title: 'Tasa BCV del día actualizada',
      time: 'Hoy 06:00 AM',
      text: 'Rutas con cobro en bolívares calculadas a la tasa oficial del día.',
      type: 'info',
    },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Bell className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Notificaciones de Carretera
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 space-y-2.5">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 text-xs space-y-1"
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-zinc-200">{n.title}</span>
                <span className="text-[10px] text-zinc-400">{n.time}</span>
              </div>
              <p className="text-[11px] text-zinc-400">{n.text}</p>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-zinc-800 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
