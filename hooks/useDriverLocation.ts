'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { GeoLocation } from '@/lib/types';
import { updateTripLocation } from '@/lib/db';

interface UseDriverLocationOptions {
  tripId?: string;
  enabled?: boolean;
  minIntervalMs?: number; // Minimum interval between Firestore updates to save bandwidth
}

interface UseDriverLocationReturn {
  currentLocation: GeoLocation | null;
  isTracking: boolean;
  error: string | null;
  permissionState: PermissionState | 'unknown';
  startTracking: () => void;
  stopTracking: () => void;
}

/**
 * Calcula el rumbo (bearing) en grados (0° a 360°) entre dos coordenadas geográficas.
 */
function calculateHeading(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

export function useDriverLocation({
  tripId,
  enabled = false,
  minIntervalMs = 3000,
}: UseDriverLocationOptions = {}): UseDriverLocationReturn {
  const [currentLocation, setCurrentLocation] = useState<GeoLocation | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState | 'unknown'>('unknown');

  const watchIdRef = useRef<number | null>(null);
  const lastLocationRef = useRef<GeoLocation | null>(null);
  const lastUpdateTimestampRef = useRef<number>(0);

  // Consultar estado de permisos del navegador si la API Permissions está disponible
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((result) => {
          setPermissionState(result.state);
          result.onchange = () => setPermissionState(result.state);
        })
        .catch(() => setPermissionState('unknown'));
    }
  }, []);

  const handlePositionSuccess = useCallback(
    (position: GeolocationPosition) => {
      const { latitude, longitude, heading, speed } = position.coords;

      // Si el sensor no proporciona heading, calcularlo a partir de la coordenada previa
      let computedHeading = typeof heading === 'number' && !isNaN(heading) ? heading : undefined;
      if (
        computedHeading === undefined &&
        lastLocationRef.current &&
        (lastLocationRef.current.lat !== latitude || lastLocationRef.current.lng !== longitude)
      ) {
        computedHeading = calculateHeading(
          lastLocationRef.current.lat,
          lastLocationRef.current.lng,
          latitude,
          longitude
        );
      } else if (computedHeading === undefined && lastLocationRef.current?.heading !== undefined) {
        computedHeading = lastLocationRef.current.heading;
      }

      const speedKmH =
        typeof speed === 'number' && !isNaN(speed) && speed > 0
          ? Math.round(speed * 3.6)
          : undefined;

      const newLocation: GeoLocation = {
        lat: latitude,
        lng: longitude,
        heading: computedHeading ?? 0,
        speed: speedKmH,
        updatedAt: new Date().toISOString(),
      };

      lastLocationRef.current = newLocation;
      setCurrentLocation(newLocation);
      setError(null);

      // Si hay un viaje activo, emitir actualización a Firestore respetando minIntervalMs
      const now = Date.now();
      if (tripId && now - lastUpdateTimestampRef.current >= minIntervalMs) {
        lastUpdateTimestampRef.current = now;
        updateTripLocation(tripId, newLocation).catch((err) => {
          console.warn('Error al transmitir geolocalización a Firestore:', err);
        });
      }
    },
    [tripId, minIntervalMs]
  );

  const handlePositionError = useCallback((err: GeolocationPositionError) => {
    let msg = 'Error desconocido de geolocalización.';
    switch (err.code) {
      case err.PERMISSION_DENIED:
        msg = 'Permiso de ubicación denegado por el usuario o navegador.';
        break;
      case err.POSITION_UNAVAILABLE:
        msg = 'Información de ubicación no disponible en carretera.';
        break;
      case err.TIMEOUT:
        msg = 'Tiempo de espera agotado al obtener señal GPS.';
        break;
    }
    setError(msg);
  }, []);

  const startTracking = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setError('Geolocalización no soportada en este dispositivo.');
      return;
    }

    if (watchIdRef.current !== null) return;

    setIsTracking(true);
    setError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionSuccess,
      handlePositionError,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 2000,
      }
    );
  }, [handlePositionSuccess, handlePositionError]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  // Iniciar/detener automáticamente según el prop enabled
  useEffect(() => {
    if (enabled) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [enabled, startTracking, stopTracking]);

  return {
    currentLocation,
    isTracking,
    error,
    permissionState,
    startTracking,
    stopTracking,
  };
}
