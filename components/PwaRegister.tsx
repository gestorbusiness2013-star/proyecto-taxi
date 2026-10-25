'use client';

import { useEffect, useState } from 'react';
import { Download, Share2, PlusSquare, X, CheckCircle2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installedSuccessfully, setInstalledSuccessfully] = useState(false);

  useEffect(() => {
    // Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration.scope);
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });
    }

    // Check if running in standalone mode (already installed)
    const isInStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error - iOS Safari specific property
      window.navigator.standalone === true;

    setIsStandalone(isInStandaloneMode);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Listen for install prompt on Android/Chromium
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show install prompt banner after a brief pause if not dismissed earlier
      const dismissed = sessionStorage.getItem('pwa_prompt_dismissed');
      if (!dismissed) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null);
      setShowInstallBanner(false);
      setInstalledSuccessfully(true);
      setTimeout(() => setInstalledSuccessfully(false), 4000);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (isStandalone) return null;

  return (
    <>
      {/* Success notification if installed */}
      {installedSuccessfully && (
        <div className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-md animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-zinc-900/95 p-3.5 text-emerald-400 shadow-xl backdrop-blur-md">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span className="text-xs font-semibold text-zinc-100">
              ¡App instalada correctamente en tu pantalla de inicio!
            </span>
          </div>
        </div>
      )}

      {/* Install banner for Android / Chrome */}
      {showInstallBanner && deferredPrompt && (
        <aside
          aria-label="Instalación de aplicación"
          className="fixed bottom-20 left-3 right-3 z-40 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-zinc-900/95 p-3.5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-zinc-950 font-black shadow-md shadow-amber-500/20 text-xs tracking-wider">
                  TAXI
                </div>
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Instalar Proyecto Taxi
                  </h2>
                  <p className="text-[11px] text-zinc-400">
                    Acceso rápido y modo sin conexión en carretera
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-zinc-950 shadow transition-transform active:scale-95 hover:bg-amber-400"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Instalar</span>
                </button>
                <button
                  type="button"
                  aria-label="Cerrar banner de instalación"
                  onClick={handleDismiss}
                  className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Subtle banner guide for iOS users */}
      {isIOS && !isStandalone && (
        <aside
          aria-label="Instalación en iPhone"
          className="mx-auto max-w-md px-4 pt-2 pb-1"
        >
          <div className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/60 px-3 py-2 text-[11px] text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-500/20 text-amber-400 font-bold text-[10px]">
                iOS
              </span>
              <span>
                Para instalar: pulsa <Share2 className="inline h-3 w-3 text-amber-400" /> y luego{' '}
                <strong className="text-zinc-200">«Añadir a pantalla de inicio»</strong>{' '}
                <PlusSquare className="inline h-3 w-3 text-amber-400" />
              </span>
            </div>
          </div>
        </aside>
      )}
    </>
  );
}
