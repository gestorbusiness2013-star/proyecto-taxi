'use client';

// Gestión de Tasa Oficial del Dólar BCV (Banco Central de Venezuela)
// y funciones de conversión monetaria para pagos en Bolívares (Bs.) y Dólares ($).

import { doc, getDoc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore';
import { getDb, isFirebaseConfigured } from './db';

/** Tasa oficial de referencia por defecto (Bolívares por Dólar). */
export const DEFAULT_BCV_RATE = 85.5;

export interface BcvConfig {
  rate: number;
  lastUpdated: string;
  source: 'auto' | 'manual';
  updatedBy?: string;
}

const SETTINGS_COLLECTION = 'settings';
const BCV_DOC_ID = 'bcv_rate';

/** Obtiene la tasa BCV en tiempo real de Firestore con fallback automático. */
export function listenBcvRate(
  onData: (config: BcvConfig) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!isFirebaseConfigured()) {
    onData({
      rate: DEFAULT_BCV_RATE,
      lastUpdated: new Date().toISOString(),
      source: 'manual',
    });
    return () => {};
  }

  try {
    const db = getDb();
    const ref = doc(db, SETTINGS_COLLECTION, BCV_DOC_ID);
    return onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as BcvConfig;
          onData(data);
        } else {
          onData({
            rate: DEFAULT_BCV_RATE,
            lastUpdated: new Date().toISOString(),
            source: 'manual',
          });
        }
      },
      (err) => onError?.(err)
    );
  } catch (err) {
    onError?.(err instanceof Error ? err : new Error(String(err)));
    return () => {};
  }
}

/** Permite al administrador fijar la tasa BCV oficial del día. */
export async function updateBcvRate(rate: number, adminEmail: string): Promise<void> {
  if (rate <= 0) throw new Error('La tasa BCV debe ser mayor a 0.');
  const db = getDb();
  const ref = doc(db, SETTINGS_COLLECTION, BCV_DOC_ID);
  const config: BcvConfig = {
    rate: Math.round(rate * 100) / 100,
    lastUpdated: new Date().toISOString(),
    source: 'manual',
    updatedBy: adminEmail,
  };
  await setDoc(ref, config, { merge: true });
}

/** Convierte USD a Bolívares con formato local venezolano (ej. Bs. 855,00). */
export function formatBs(amountUsd: number, rate = DEFAULT_BCV_RATE): string {
  const bs = amountUsd * rate;
  return `Bs. ${bs.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Formatea monto en USD (ej. $10,00). */
export function formatUsd(amountUsd: number): string {
  return `$${amountUsd.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Devuelve ambos formatos combinados (ej. "$10,00 USD (Bs. 855,00)"). */
export function formatDualCurrency(amountUsd: number, rate = DEFAULT_BCV_RATE): string {
  return `${formatUsd(amountUsd)} USD · ${formatBs(amountUsd, rate)}`;
}

