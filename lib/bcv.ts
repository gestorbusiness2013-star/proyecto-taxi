'use client';

// Gestión de Tasa Oficial del Dólar BCV (Banco Central de Venezuela)
// Fuente oficial: https://www.bcv.org.ve/glosario/cambio-oficial
// y funciones de conversión monetaria para pagos en Bolívares (Bs.) y Dólares ($).

import { doc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore';
import { getDb, isFirebaseConfigured } from './db';

/**
 * Tasa oficial de referencia Banco Central de Venezuela (BCV).
 * Actualizada al valor oficial verificado: Bs. 889,26 por USD.
 * Fuente: https://www.bcv.org.ve/glosario/cambio-oficial
 */
export const DEFAULT_BCV_RATE = 889.26;

export interface BcvConfig {
  rate: number;
  lastUpdated: string;
  source: 'auto' | 'manual';
  updatedBy?: string;
  officialUrl?: string;
}

const SETTINGS_COLLECTION = 'settings';
const BCV_DOC_ID = 'bcv_rate';

/**
 * Consulta la tasa oficial en tiempo real desde nuestro endpoint /api/bcv
 */
export async function fetchLiveBcvRate(): Promise<number> {
  try {
    const res = await fetch('/api/bcv', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data?.rate && typeof data.rate === 'number' && data.rate > 0) {
        return data.rate;
      }
    }
  } catch (err) {
    console.warn('[bcv] Error fetching live rate from /api/bcv:', err);
  }
  return DEFAULT_BCV_RATE;
}

/**
 * Sincroniza la tasa oficial del BCV en Firestore
 */
export async function syncLiveBcvRate(adminEmail = 'sistema'): Promise<number> {
  const liveRate = await fetchLiveBcvRate();
  if (isFirebaseConfigured()) {
    try {
      const db = getDb();
      const ref = doc(db, SETTINGS_COLLECTION, BCV_DOC_ID);
      await setDoc(
        ref,
        {
          rate: liveRate,
          lastUpdated: new Date().toISOString(),
          source: 'auto',
          updatedBy: adminEmail,
          officialUrl: 'https://www.bcv.org.ve/glosario/cambio-oficial',
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('[bcv] Could not write synced rate to Firestore:', e);
    }
  }
  return liveRate;
}

/**
 * Obtiene la tasa BCV en tiempo real de Firestore con sincronización automática.
 */
export function listenBcvRate(
  onData: (config: BcvConfig) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  // Intentar sincronizar en segundo plano al cargar
  fetchLiveBcvRate().then((rate) => {
    onData({
      rate,
      lastUpdated: new Date().toISOString(),
      source: 'auto',
      officialUrl: 'https://www.bcv.org.ve/glosario/cambio-oficial',
    });
  }).catch(() => {});

  if (!isFirebaseConfigured()) {
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
          // Si la tasa guardada en firestore era menor a 100 (tasa antigua de pruebas), sincronizamos con la real
          if (data.rate < 100) {
            fetchLiveBcvRate().then((realRate) => {
              onData({ ...data, rate: realRate, source: 'auto' });
            });
          } else {
            onData(data);
          }
        }
      },
      (err) => onError?.(err)
    );
  } catch (err) {
    onError?.(err instanceof Error ? err : new Error(String(err)));
    return () => {};
  }
}

/** Permite al administrador fijar manualmente la tasa BCV oficial. */
export async function updateBcvRate(rate: number, adminEmail: string): Promise<void> {
  if (rate <= 0) throw new Error('La tasa BCV debe ser mayor a 0.');
  const db = getDb();
  const ref = doc(db, SETTINGS_COLLECTION, BCV_DOC_ID);
  const config: BcvConfig = {
    rate: Math.round(rate * 100) / 100,
    lastUpdated: new Date().toISOString(),
    source: 'manual',
    updatedBy: adminEmail,
    officialUrl: 'https://www.bcv.org.ve/glosario/cambio-oficial',
  };
  await setDoc(ref, config, { merge: true });
}

/**
 * Formatea un monto en Bolívares con formato venezolano (ej. "889,26" o "13.338,90").
 * Si se pasa `rate`, multiplica `amountOrUsd * rate`.
 * Si no se pasa `rate`, asume que el monto ya está en Bolívares.
 */
export function formatBs(amountOrUsd: number, rate?: number): string {
  const finalBs = rate !== undefined ? amountOrUsd * rate : amountOrUsd;
  if (isNaN(finalBs)) return '0,00';
  return finalBs.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Formatea monto en USD (ej. "$10,00"). */
export function formatUsd(amountUsd: number): string {
  return `$${amountUsd.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Devuelve ambos formatos combinados (ej. "$10,00 USD · Bs. 8.892,60"). */
export function formatDualCurrency(amountUsd: number, rate = DEFAULT_BCV_RATE): string {
  const bs = amountUsd * rate;
  return `${formatUsd(amountUsd)} USD · Bs. ${formatBs(bs)}`;
}
