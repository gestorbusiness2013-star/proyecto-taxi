// Generador de enlaces y plantillas de WhatsApp para operaciones de Proyecto Taxi

export function sanitizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('58')) return digits;
  if (digits.startsWith('0')) return `58${digits.slice(1)}`;
  if (digits.length === 10) return `58${digits}`;
  return digits;
}

export function buildWhatsAppLink(phone: string, text: string): string {
  const cleanPhone = sanitizePhone(phone);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text.trim())}`;
}

export const WhatsAppTemplates = {
  /** Notificación de chofer aprobado */
  driverApproved: (driverName: string) => `¡Hola, ${driverName}! 🚖
Te informamos que tu solicitud de registro como conductor en *Proyecto Taxi* ha sido *APROBADA*.

Ya puedes acceder a tu panel de conductor para publicar rutas interurbanas y validar pasajeros con PIN de abordaje seguro.

🌐 Ingresa aquí: https://proyecto-taxi-snowy.vercel.app/conductor
¡Bienvenido a la red de transporte interurbano más segura de Venezuela!`,

  /** Notificación de rechazo con motivo */
  driverRejected: (driverName: string, reason: string) => `Hola, ${driverName}. Te saludamos de la administración de *Proyecto Taxi*.

Revisamos tu solicitud de conductor y en este momento no fue aprobada por el siguiente motivo:
📌 *${reason || 'Documentos incompletos o no legibles'}*.

Por favor ingresa a la aplicación o contáctanos por esta vía para corregir los recaudos y reactivar tu postulación.`,

  /** Recordatorio de suscripción por vencer */
  subscriptionReminder: (driverName: string, expiryDate: string, amountUsd = 10) => `Hola, ${driverName} 🚕
Te recordamos que tu membresía mensual de conductor en *Proyecto Taxi* vence el *${expiryDate}*.

Tarifa de renovación: *$${amountUsd} USD* (o al cambio oficial BCV por Pago Móvil).
Mantén tu membresía al día para que tus rutas continúen visibles para todos los pasajeros en carretera.

¿Deseas los datos para realizar tu Pago Móvil hoy?`,

  /** Notificación de boleto y PIN al pasajero */
  bookingConfirmation: (passengerName: string, origin: string, destination: string, pin: string, driverName: string, seats: number) => `¡Hola, ${passengerName}! 🎟️
Tu reserva de viaje en *Proyecto Taxi* está *CONFIRMADA*.

📍 *Ruta:* ${origin} ➔ ${destination}
🔢 *Puestos:* ${seats}
👤 *Conductor:* ${driverName}
🔑 *PIN de Abordaje Seguro:* *${pin}*

⚠️ *IMPORTANTE:* Dicta o muestra este PIN de 4 dígitos al chofer únicamente al momento de subir al vehículo. ¡Buen viaje!`,

  /** Respuesta inmediata a alerta S.O.S. */
  sosResponse: (reporterName: string) => `🚨 *CENTRO DE OPERACIONES - PROYECTO TAXI* 🚨
Hola, ${reporterName}. Hemos recibido tu *alerta S.O.S.* emitida en carretera.

Estamos verificando tu ubicación GPS y coordinando apoyo de emergencia vial con las autoridades y Ángeles de la Autopista (0800-VIAL).

Por favor confírmanos si tú o algún acompañante requieren asistencia médica o auxilio mecánico inmediato.`,
};

