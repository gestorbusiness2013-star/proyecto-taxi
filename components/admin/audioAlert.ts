'use client';

// Sistema de Alerta Sonora de Emergencia para el Panel de Administrador
// Utiliza la Web Audio API nativa (sin archivos mp3 externos) para emitir
// un sonido de alarma cuando llega una alerta S.O.S. en carretera.

let audioCtx: AudioContext | null = null;
let sirenInterval: NodeJS.Timeout | null = null;
let isMuted = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/** Reproduce un pulso de sirena de emergencia (880Hz y 660Hz). */
function playSirenBeep() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Silencioso en caso de bloqueo por política de autoplay
  }
}

/** Inicia el sonido continuo de alarma de auxilio vial. */
export function startEmergencyAlarm() {
  if (sirenInterval) return;
  playSirenBeep();
  sirenInterval = setInterval(() => {
    playSirenBeep();
  }, 1200);
}

/** Detiene la alarma. */
export function stopEmergencyAlarm() {
  if (sirenInterval) {
    clearInterval(sirenInterval);
    sirenInterval = null;
  }
}

/** Activa o desactiva el sonido. */
export function setAlarmMuted(muted: boolean) {
  isMuted = muted;
  if (muted) {
    stopEmergencyAlarm();
  }
}

export function getAlarmMuted(): boolean {
  return isMuted;
}

