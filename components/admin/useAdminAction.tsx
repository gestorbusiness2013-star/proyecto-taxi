'use client';

import { useState } from 'react';

/**
 * Ejecuta acciones administrativas mostrando qué elemento está en proceso y
 * notificando errores. `busyId` permite deshabilitar solo la fila afectada.
 */
export function useAdminAction() {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const run = async (id: string, action: () => Promise<unknown>, successText?: string) => {
    setBusyId(id);
    setMessage(null);
    try {
      await action();
      if (successText) setMessage({ type: 'success', text: successText });
      return true;
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      setMessage({
        type: 'error',
        text: text.includes('permission') ? 'Permiso denegado por Firestore. Verifica las reglas publicadas.' : text,
      });
      return false;
    } finally {
      setBusyId(null);
    }
  };

  return { busyId, message, setMessage, run };
}

export function ActionMessage({
  message,
}: {
  message: { type: 'success' | 'error'; text: string } | null;
}) {
  if (!message) return null;
  return (
    <div
      className={`mb-3 rounded-xl border p-2.5 text-xs ${message.type === 'success'
          ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
          : 'border-red-500/40 bg-red-950/40 text-red-300'
        }`}
    >
      {message.text}
    </div>
  );
}

