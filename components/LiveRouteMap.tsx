'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  Car,
  ShieldCheck,
  Star,
  Users,
  DollarSign,
  ArrowRight,
  X,
  Compass,
  Radio,
  Navigation,
  RefreshCw,
  Lock,
  LogIn,
  Sparkles,
  Clock,
} from 'lucide-react';
import type { Trip, GeoLocation } from '@/lib/types';
import { useAuth, DEMO_PASSENGER } from '@/lib/auth';
import { getAllActiveTrips } from '@/lib/db';

interface LiveRouteMapProps {
  onSelectTripToBook?: (trip: Trip) => void;
  selectedRouteFilter?: string; // e.g. 'all' | 'caracas-valencia' | 'puerto-ordaz-caracas' | 'caracas-barquisimeto'
  originFilter?: string;
  destinationFilter?: string;
  onFilterChange?: (filter: string) => void;
}

// ---------------------------------------------------------------------------
// Coordenadas de los principales corredores viales venezolanos
// ---------------------------------------------------------------------------

export const ARC_HIGHWAY_COORDS: [number, number][] = [
  [10.496, -66.914], // Caracas (Salida Plaza Venezuela)
  [10.435, -66.935], // Tazón / Peaje Hoyo de la Puerta
  [10.372, -66.985], // Cortada de Maturín / Paracotos
  [10.252, -67.170], // Las Tejerías
  [10.228, -67.332], // La Victoria
  [10.207, -67.420], // San Mateo
  [10.246, -67.595], // Maracay (Peaje Palo Negro / Encrucijada)
  [10.242, -67.876], // Guacara
  [10.181, -67.997], // Valencia (Distribuidor San Blas)
];

export const ORIENTE_HIGHWAY_COORDS: [number, number][] = [
  [10.496, -66.914], // Caracas
  [10.470, -66.600], // Guarenas / Guatire
  [10.290, -66.400], // Caucagua (Troncal 9)
  [10.200, -65.980], // Boca de Uchire
  [10.050, -65.350], // Clarines / Píritu
  [10.150, -64.680], // Barcelona / Puerto La Cruz
  [9.420, -64.460],  // Anaco
  [8.880, -64.250],  // El Tigre
  [8.140, -63.540],  // Ciudad Bolívar (Puente Angostura)
  [8.310, -62.715],  // Puerto Ordaz
];

export const MATURIN_HIGHWAY_COORDS: [number, number][] = [
  [10.150, -64.680], // Barcelona
  [9.920, -64.050],  // San Mateo de Anzoátegui
  [9.745, -63.180],  // Maturín
];

export const BARQUISIMETO_HIGHWAY_COORDS: [number, number][] = [
  [10.181, -67.997], // Valencia
  [10.330, -68.740], // San Felipe
  [10.260, -69.130], // Yaritagua
  [10.067, -69.347], // Barquisimeto
];

// Helper para calcular punto interpolado a lo largo de una polilínea
function getPointAlongPolyline(
  polyline: [number, number][],
  fraction: number
): { lat: number; lng: number; heading: number } {
  const clamped = Math.max(0, Math.min(1, fraction));
  const totalSegments = polyline.length - 1;
  const targetIndex = Math.min(Math.floor(clamped * totalSegments), totalSegments - 1);
  const segFraction = clamped * totalSegments - targetIndex;

  const [lat1, lng1] = polyline[targetIndex];
  const [lat2, lng2] = polyline[targetIndex + 1];

  const lat = lat1 + (lat2 - lat1) * segFraction;
  const lng = lng1 + (lng2 - lng1) * segFraction;

  // Rumbo hacia el siguiente punto
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLng);
  const heading = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;

  return { lat, lng, heading: Math.round(heading) };
}

export default function LiveRouteMap({
  onSelectTripToBook,
  selectedRouteFilter = 'all',
  originFilter = 'all',
  destinationFilter = 'all',
  onFilterChange,
}: LiveRouteMapProps) {
  const router = useRouter();
  const { isAuthenticated, login } = useAuth();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);
  const polylinesGroupRef = useRef<any>(null);

  // Estado para montar portales en document.body (evita cortes por overflow del mapa y superposición del navbar)
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Estado de viajes en tiempo real
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRoute, setActiveRoute] = useState<string>(selectedRouteFilter);

  // Ficha flotante (Bottom-sheet) del vehículo seleccionado
  const [sheetTrip, setSheetTrip] = useState<Trip | null>(null);

  // Modal para solicitar login si usuario toca un vehículo sin sesión
  const [authPromptTrip, setAuthPromptTrip] = useState<Trip | null>(null);

  // Escuchar viajes activos de Firestore
  useEffect(() => {
    const unsub = getAllActiveTrips(
      (activeTrips) => {
        setTrips(activeTrips);
        setLoading(false);
      },
      (err) => {
        console.warn('Error fetching live trips for map:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Actualizar filtro de ruta si cambia desde afuera
  useEffect(() => {
    if (selectedRouteFilter !== activeRoute) {
      setActiveRoute(selectedRouteFilter);
    }
  }, [selectedRouteFilter, activeRoute]);

  // Inicializar Leaflet de forma dinámica en el cliente
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current || leafletMapRef.current) return;

      const L = (await import('leaflet')).default;

      if (!isMounted || !mapContainerRef.current) return;

      // 1. Encuadre inicial y configuración limpia (zoomControl: false para dejar mapa despejado)
      const map = L.map(mapContainerRef.current, {
        center: [10.25, -67.45],
        zoom: 9,
        zoomSnap: 0.5,
        minZoom: 6,
        maxZoom: 19,
        zoomControl: false,
        attributionControl: false,
      });

      // 1. Capa de mapa base: Esri World Dark Gray Canvas (100% libre sin API key ni marcas de agua)
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 16,
          attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
        }
      ).addTo(map);

      // Capa de referencia: Nombres de ciudades, estados y autopistas nítidos
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 16,
          attribution: '&copy; Esri',
        }
      ).addTo(map);

      // Grupos para capas de rutas y marcadores
      const polylinesGroup = L.layerGroup().addTo(map);
      const markersGroup = L.layerGroup().addTo(map);

      leafletMapRef.current = map;
      polylinesGroupRef.current = polylinesGroup;
      markersGroupRef.current = markersGroup;
    }

    initMap();

    return () => {
      isMounted = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Manejar el trazado de rutas con resplandor neón y ajuste de zoom según el filtro
  useEffect(() => {
    const map = leafletMapRef.current;
    const polylinesGroup = polylinesGroupRef.current;
    if (!map || !polylinesGroup) return;

    import('leaflet').then(({ default: L }) => {
      polylinesGroup.clearLayers();

      const orig = (originFilter || 'all').toLowerCase();
      const dest = (destinationFilter || 'all').toLowerCase();

      const shouldShowArc =
        activeRoute === 'all' ||
        activeRoute === 'caracas-valencia' ||
        activeRoute.includes('valencia') ||
        (orig.includes('caracas') && dest.includes('valencia')) ||
        (orig.includes('valencia') && dest.includes('caracas')) ||
        (orig === 'all' && (dest.includes('valencia') || dest.includes('caracas'))) ||
        (dest === 'all' && (orig.includes('valencia') || orig.includes('caracas')));

      const shouldShowOriente =
        activeRoute === 'all' ||
        activeRoute === 'puerto-ordaz-caracas' ||
        activeRoute.includes('ordaz') ||
        orig.includes('ordaz') ||
        dest.includes('ordaz') ||
        orig.includes('maturin') ||
        dest.includes('maturin');

      const shouldShowOccidente =
        activeRoute === 'all' ||
        activeRoute === 'caracas-barquisimeto' ||
        activeRoute.includes('barquisimeto') ||
        orig.includes('barquisimeto') ||
        dest.includes('barquisimeto');

      // 3. Trazado de ruta (ARC Caracas -> Valencia)
      if (shouldShowArc) {
        // Halo exterior con estilo neón sutil
        L.polyline(ARC_HIGHWAY_COORDS, {
          color: '#f59e0b',
          weight: 8,
          opacity: 0.25,
          lineCap: 'round',
          className: 'neon-route-arc',
        }).addTo(polylinesGroup);

        // Polilínea que conecta Caracas y Valencia siguiendo el eje vial
        L.polyline(ARC_HIGHWAY_COORDS, {
          color: '#f59e0b',
          weight: 4,
          opacity: 0.8,
          lineCap: 'round',
        }).addTo(polylinesGroup);
      }

      // Trazado de Oriente (Troncal 9 y 16)
      if (shouldShowOriente) {
        L.polyline(ORIENTE_HIGHWAY_COORDS, {
          color: '#10B981',
          weight: 6,
          opacity: 0.3,
          lineCap: 'round',
          className: 'neon-route-oriente',
        }).addTo(polylinesGroup);

        L.polyline(ORIENTE_HIGHWAY_COORDS, {
          color: '#34D399',
          weight: 3,
          opacity: 0.9,
          lineCap: 'round',
        }).addTo(polylinesGroup);
      }

      // Trazado Occidente (Barquisimeto)
      if (shouldShowOccidente) {
        L.polyline(BARQUISIMETO_HIGHWAY_COORDS, {
          color: '#38BDF8',
          weight: 3,
          opacity: 0.85,
          lineCap: 'round',
        }).addTo(polylinesGroup);
      }

      // Ajuste de zoom al tramo filtrado
      if (
        activeRoute === 'caracas-valencia' ||
        (orig.includes('caracas') && dest.includes('valencia')) ||
        (orig.includes('valencia') && dest.includes('caracas'))
      ) {
        const arcBounds = L.latLngBounds(ARC_HIGHWAY_COORDS);
        map.fitBounds(arcBounds, { padding: [40, 40], maxZoom: 11, animate: true });
      } else if (activeRoute === 'puerto-ordaz-caracas' || orig.includes('ordaz') || dest.includes('ordaz')) {
        const orienteBounds = L.latLngBounds(ORIENTE_HIGHWAY_COORDS);
        map.fitBounds(orienteBounds, { padding: [30, 30], maxZoom: 9, animate: true });
      } else if (activeRoute === 'caracas-barquisimeto' || orig.includes('barquisimeto') || dest.includes('barquisimeto')) {
        const bqtoBounds = L.latLngBounds(BARQUISIMETO_HIGHWAY_COORDS);
        map.fitBounds(bqtoBounds, { padding: [30, 30], maxZoom: 10, animate: true });
      } else if (activeRoute === 'all' && orig === 'all' && dest === 'all') {
        map.setView([10.25, -67.45], 9, { animate: true });
      }
    });
  }, [activeRoute, originFilter, destinationFilter]);

  // Actualizar marcadores de vehículos ('in_route' o 'scheduled') con rotación, radar y anti-colisión
  useEffect(() => {
    const map = leafletMapRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    import('leaflet').then(({ default: L }) => {
      markersGroup.clearLayers();

      const orig = (originFilter || 'all').toLowerCase();
      const dest = (destinationFilter || 'all').toLowerCase();

      trips.forEach((trip, idx) => {
        // Filtrar por origen
        if (orig !== 'all' && orig !== 'todas') {
          if (!trip.origin.toLowerCase().includes(orig)) return;
        }

        // Filtrar por destino
        if (dest !== 'all' && dest !== 'todas') {
          if (!trip.destination.toLowerCase().includes(dest)) return;
        }

        // Filtrar según ruta rápida
        if (activeRoute === 'caracas-valencia') {
          const match =
            (trip.destination.toLowerCase().includes('valencia') || trip.origin.toLowerCase().includes('valencia')) &&
            (trip.origin.toLowerCase().includes('caracas') || trip.destination.toLowerCase().includes('caracas'));
          if (!match) return;
        } else if (activeRoute === 'puerto-ordaz-caracas') {
          const match = trip.origin.toLowerCase().includes('ordaz') || trip.destination.toLowerCase().includes('ordaz');
          if (!match) return;
        } else if (activeRoute === 'caracas-barquisimeto') {
          const match = trip.origin.toLowerCase().includes('barquisimeto') || trip.destination.toLowerCase().includes('barquisimeto');
          if (!match) return;
        }

        // Obtener o simular ubicación a lo largo del corredor correspondiente
        let coords: { lat: number; lng: number; heading: number; speed?: number };

        if (trip.currentLocation?.lat && trip.currentLocation?.lng) {
          coords = {
            lat: trip.currentLocation.lat,
            lng: trip.currentLocation.lng,
            heading: trip.currentLocation.heading ?? 0,
            speed: trip.currentLocation.speed ?? 80,
          };
        } else {
          // Determinar polilínea según origen y destino
          const isArc = trip.origin.toLowerCase().includes('caracas') || trip.destination.toLowerCase().includes('valencia');
          const polyline = isArc ? ARC_HIGHWAY_COORDS : ORIENTE_HIGHWAY_COORDS;

          // Fracción a lo largo de la ruta (desfasada para cada viaje para simular tráfico realista)
          const baseOffset = (idx * 0.28 + (Date.now() / 60000) * 0.03) % 0.85 + 0.08;
          coords = getPointAlongPolyline(polyline, baseOffset);
          coords.speed = trip.status === 'in_route' ? 85 : 0;
        }

        const isEnRuta = trip.status === 'in_route';
        const markerColor = isEnRuta ? '#F59E0B' : '#38BDF8';
        const pingColor = isEnRuta ? 'bg-amber-400' : 'bg-sky-400';

        // Flightradar24 custom HTML DivIcon con vehículo Top-Down GPS orientado según rumbo (heading)
        // Área táctil optimizada (64x68px) para que tocar el auto o el badge registre el clic de inmediato
        const iconHtml = `
          <div class="relative flex flex-col items-center justify-center cursor-pointer group" style="width: 64px; height: 68px;">
            ${
              isEnRuta
                ? `<div class="absolute top-1 rounded-full ${pingColor} opacity-75 radar-ping" style="width: 44px; height: 44px; pointer-events: none;"></div>`
                : ''
            }
            <div 
              class="relative z-10 flex h-10 w-10 items-center justify-center rounded-full shadow-2xl border-2 transition-transform duration-300 pointer-events-auto"
              style="
                background: #0B0F17; 
                border-color: ${markerColor}; 
                box-shadow: 0 0 14px ${markerColor}70;
                transform: rotate(${coords.heading}deg);
              "
            >
              <!-- Ícono de vehículo visto desde arriba (Top-Down GPS) apuntando hacia el norte (0°) -->
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M7 5.5C7 3.5 8.5 2 11 2H13C15.5 2 17 3.5 17 5.5V18.5C17 20.5 15.5 22 13 22H11C8.5 22 7 20.5 7 18.5V5.5Z" fill="${markerColor}" />
                <path d="M8.5 7C8.5 6.2 9.2 5.5 10 5.5H14C14.8 5.5 15.5 6.2 15.5 7V9.5H8.5V7Z" fill="#0B0F17" />
                <rect x="9" y="10.5" width="6" height="4" rx="0.5" fill="${markerColor}" opacity="0.8" />
                <path d="M8.5 16H15.5V17.5C15.5 18 15 18.5 14.5 18.5H9.5C9 18.5 8.5 18 8.5 17.5V16Z" fill="#0B0F17" />
                <circle cx="9" cy="3.2" r="1.2" fill="#FEF08A" />
                <circle cx="15" cy="3.2" r="1.2" fill="#FEF08A" />
                <rect x="8.5" y="21" width="2" height="0.8" rx="0.3" fill="#EF4444" />
                <rect x="13.5" y="21" width="2" height="0.8" rx="0.3" fill="#EF4444" />
                <rect x="5.5" y="7" width="1.5" height="2.5" rx="0.5" fill="${markerColor}" />
                <rect x="17" y="7" width="1.5" height="2.5" rx="0.5" fill="${markerColor}" />
              </svg>
            </div>

            <!-- Etiqueta de chofer y puestos compacta y táctil -->
            <div class="driver-badge mt-1 z-20 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-black font-mono shadow-md border whitespace-nowrap select-none max-w-[100px] truncate pointer-events-auto"
              style="background: #0B0F17FA; border-color: ${markerColor}90; color: #FFFFFF;">
              <span style="color: ${markerColor};">●</span>
              <span class="truncate">${trip.driverName.split(' ')[0]}</span>
              <span style="color: ${markerColor}AA;">•</span>
              <span style="color: ${markerColor}; font-weight: 800;">${trip.availableSeats}p</span>
            </div>
          </div>
        `;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: 'flightradar-vehicle-marker',
          iconSize: [64, 68],
          iconAnchor: [32, 22],
        });

        // Anti-colisión: riseOnHover y zIndexOffset jerarquizado para evitar superposición agresiva
        const marker = L.marker([coords.lat, coords.lng], {
          icon: customIcon,
          riseOnHover: true,
          zIndexOffset: isEnRuta ? 1000 + idx * 5 : 500 + idx * 5,
        });

        // REQUISITO: Al tocar un vehículo, abrir la ficha completa del chofer y centrar el mapa
        marker.on('click', () => {
          setSheetTrip(trip);
          map.panTo([coords.lat, coords.lng], { animate: true });
        });

        marker.addTo(markersGroup);
      });
    });
  }, [trips, activeRoute, originFilter, destinationFilter, isAuthenticated, router]);

  return (
    <div className="relative w-full h-[calc(100vh-16rem)] min-h-[460px] rounded-3xl overflow-hidden border border-zinc-800 bg-[#080B10] shadow-2xl flex flex-col">
      {/* Contenedor Leaflet (Completamente despejado sin zoom buttons ni chips flotantes) */}
      <div ref={mapContainerRef} className="w-full h-full z-0 bg-[#080B10]" />

      {/* Badge Flotante Inferior de Estado en Vivo estilo Flightradar */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 rounded-xl bg-zinc-950/85 backdrop-blur-md border border-zinc-800 px-2.5 py-1.5 text-[11px] text-zinc-300 shadow-xl">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
        </span>
        <span className="font-bold text-white font-mono">{trips.length}</span>
        <span className="text-zinc-400">unidades transmitiendo en vivo</span>
      </div>

      {/* Atribución oficial Esri World Dark Gray Canvas & OpenStreetMap */}
      <div className="absolute bottom-2.5 right-2.5 z-10 text-[9px] text-zinc-500 bg-zinc-950/80 backdrop-blur-sm border border-zinc-900 px-2 py-0.5 rounded-md pointer-events-auto">
        &copy; <a href="https://www.esri.com" target="_blank" rel="noopener noreferrer" className="hover:underline text-zinc-400">Esri</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="hover:underline text-zinc-400">OpenStreetMap</a>
      </div>

      {/* REQUISITO: MODAL DE INICIO DE SESIÓN REQUERIDO AL INTENTAR RESERVAR SIN SESIÓN */}
      {authPromptTrip && !isAuthenticated && mounted && createPortal(
        <div className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl border border-amber-500/40 bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-950 p-6 shadow-2xl text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-lg shadow-amber-500/10">
              <Lock className="h-7 w-7" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                {authPromptTrip.origin} ➔ {authPromptTrip.destination}
              </span>
              <h3 className="text-lg font-black text-white">
                Inicia sesión para reservar
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Ingresa a tu cuenta para confirmar tu asiento en el vehículo de <span className="text-zinc-200 font-semibold">{authPromptTrip.driverName}</span> y obtener tu PIN de abordaje seguro.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const redirectUrl = `/?tripId=${authPromptTrip.id}`;
                  const msg = 'Debes ingresar para ver la ficha del viaje y reservar';
                  router.push(`/login?redirect=${encodeURIComponent(redirectUrl)}&message=${encodeURIComponent(msg)}`);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 py-3 text-xs font-black text-zinc-950 shadow-lg shadow-amber-500/20 active:scale-95 transition"
              >
                <LogIn className="h-4 w-4" />
                <span>Ingresar a mi cuenta</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  login(DEMO_PASSENGER);
                  setSheetTrip(authPromptTrip);
                  setAuthPromptTrip(null);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 py-2.5 text-xs font-bold text-zinc-300 transition"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>Acceso Rápido Demo (1-Click)</span>
              </button>

              <button
                type="button"
                onClick={() => setAuthPromptTrip(null)}
                className="w-full py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition"
              >
                Continuar explorando mapa
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* REQUISITO: FICHA INFERIOR FLOTANTE (BOTTOM-SHEET) DEL CONDUCTOR */}
      {/* Montada mediante Portal sobre document.body: posición fija por encima de BottomNav (z-[99999]) y totalmente scrolleable */}
      {sheetTrip && mounted && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-end justify-center pointer-events-none p-3 pb-[4.85rem] sm:pb-6">
          {/* Fondo oscuro clicable para cerrar al tocar el mapa */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-[2px] pointer-events-auto transition-opacity"
            onClick={() => setSheetTrip(null)}
            aria-label="Cerrar ficha del chofer"
          />

          {/* Tarjeta Flotante del Chofer y Reserva */}
          <div className="relative w-full max-w-md pointer-events-auto max-h-[82vh] overflow-y-auto rounded-3xl border border-amber-500/60 bg-gradient-to-b from-zinc-900/98 via-zinc-950/98 to-zinc-950 p-4 shadow-[0_-12px_40px_rgba(0,0,0,0.9),0_0_25px_rgba(245,158,11,0.25)] backdrop-blur-2xl space-y-3.5 animate-in slide-in-from-bottom-5 duration-200">
            {/* Indicador táctil / Handle de arrastre superior */}
            <div className="w-10 h-1 bg-zinc-700/80 rounded-full mx-auto -mt-1 mb-1" />

            {/* Header: Foto / Iniciales, Nombre, Rating y Botón Cerrar */}
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-zinc-950 font-black text-lg shadow-lg shadow-amber-500/20">
                  {sheetTrip.driverName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-white">{sheetTrip.driverName}</h3>
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="flex items-center gap-2 text-xs mt-0.5">
                    <span className="flex items-center gap-1 font-bold text-amber-400">
                      <Star className="h-3 w-3 fill-amber-400" />
                      <span>{sheetTrip.driverRating ?? 4.9}</span>
                    </span>
                    <span className="text-zinc-500">•</span>
                    <span className="text-zinc-400 flex items-center gap-1">
                      <Car className="h-3 w-3 text-amber-400" />
                      <span>{sheetTrip.vehicleModel || 'Sedán Interurbano'}</span>
                    </span>
                    <span className="text-zinc-500">•</span>
                    <span className="font-mono text-zinc-300 font-semibold">{sheetTrip.vehiclePlate}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSheetTrip(null)}
                className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Trayecto y Estado del Viaje */}
            <div className="flex items-center justify-between py-2 px-3 bg-zinc-900/70 rounded-xl border border-zinc-800/70">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white">{sheetTrip.origin}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-sm font-black text-white">{sheetTrip.destination}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                  {sheetTrip.status === 'in_route' ? (
                    <span className="flex items-center gap-1 text-emerald-400 font-bold">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span>En carretera ahora mismo</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sky-400 font-semibold">
                      <Clock className="h-3 w-3" />
                      <span>Salida estimada: {new Date(sheetTrip.departureTime).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}</span>
                    </span>
                  )}
                </div>
              </div>

              <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-black text-amber-400">
                <Users className="h-3.5 w-3.5" />
                <span>Quedan {sheetTrip.availableSeats} puestos</span>
              </span>
            </div>

            {/* Tarifa y Botón de Acción */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <div className="text-lg font-black text-white">
                  ${sheetTrip.pricePerSeat}{' '}
                  <span className="text-xs text-zinc-400 font-medium">USD / puesto</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">
                  Ref. Bs. {(sheetTrip.pricePerSeat * 85).toLocaleString('es-VE')}
                </div>
              </div>

              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => {
                    onSelectTripToBook?.(sheetTrip);
                    setSheetTrip(null);
                  }}
                  className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-2.5 text-xs font-black text-zinc-950 shadow-lg shadow-amber-500/20 active:scale-95 transition"
                >
                  <span>Reservar Asiento</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAuthPromptTrip(sheetTrip);
                    setSheetTrip(null);
                  }}
                  className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-xs font-black text-zinc-950 shadow-lg shadow-amber-500/20 active:scale-95 transition"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>Ingresar para Reservar</span>
                </button>
              )}
            </div>

            {!isAuthenticated && (
              <p className="text-[10px] text-zinc-400 text-center pt-0.5">
                Debes iniciar sesión para confirmar tu reserva y obtener tu PIN de abordaje seguro.
              </p>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
