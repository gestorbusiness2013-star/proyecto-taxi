'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
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
} from 'lucide-react';
import type { Trip, GeoLocation } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { getAllActiveTrips } from '@/lib/db';

interface LiveRouteMapProps {
  onSelectTripToBook?: (trip: Trip) => void;
  selectedRouteFilter?: string; // e.g. 'all' | 'caracas-valencia' | 'puerto-ordaz-caracas' | 'caracas-maturin'
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
  onFilterChange,
}: LiveRouteMapProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);
  const polylinesGroupRef = useRef<any>(null);

  // Estado de viajes en tiempo real
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRoute, setActiveRoute] = useState<string>(selectedRouteFilter);

  // Ficha flotante (Bottom-sheet) del vehículo seleccionado (solo usuarios autenticados)
  const [sheetTrip, setSheetTrip] = useState<Trip | null>(null);

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

      // 2. Encuadre y Zoom predeterminado: tramo central de la ARC (10.25, -67.45)
      // Nivel de zoom 9 adecuado para móvil para encuadrar Caracas, Maracay y Valencia claramente
      const map = L.map(mapContainerRef.current, {
        center: [10.25, -67.45],
        zoom: 9,
        zoomSnap: 0.5,
        minZoom: 6,
        maxZoom: 19,
        zoomControl: false,
        attributionControl: false,
      });

      // Añadir control de zoom personalizado en esquina superior derecha
      L.control
        .zoom({
          position: 'topright',
        })
        .addTo(map);

      // 1. Capa de mapa: CartoDB Dark Matter pura en alta resolución ('all' / dark_all) para fondo negro mate limpio
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          subdomains: 'abcd',
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
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

      const shouldShowArc =
        activeRoute === 'all' ||
        activeRoute === 'caracas-valencia' ||
        activeRoute.includes('valencia');

      const shouldShowOriente =
        activeRoute === 'all' ||
        activeRoute === 'puerto-ordaz-caracas' ||
        activeRoute.includes('ordaz') ||
        activeRoute.includes('caracas-maturin');

      const shouldShowOccidente =
        activeRoute === 'all' ||
        activeRoute === 'valencia-barquisimeto' ||
        activeRoute.includes('barquisimeto');

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
        // Halo exterior verde esmeralda
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

      // 2. Ajuste de zoom al tramo filtrado
      if (activeRoute === 'caracas-valencia' || activeRoute.includes('valencia')) {
        // Bounds específicos de la ARC (Caracas a Valencia)
        const arcBounds = L.latLngBounds(ARC_HIGHWAY_COORDS);
        map.fitBounds(arcBounds, { padding: [40, 40], maxZoom: 11, animate: true });
      } else if (activeRoute === 'puerto-ordaz-caracas') {
        const orienteBounds = L.latLngBounds(ORIENTE_HIGHWAY_COORDS);
        map.fitBounds(orienteBounds, { padding: [30, 30], maxZoom: 9, animate: true });
      } else if (activeRoute === 'all') {
        // Encuadre predeterminado en el tramo central de la ARC (Caracas, Maracay, Valencia)
        map.setView([10.25, -67.45], 9, { animate: true });
      }
    });
  }, [activeRoute]);

  // Actualizar marcadores de vehículos ('in_route' o 'scheduled') con rotación y radar
  useEffect(() => {
    const map = leafletMapRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    import('leaflet').then(({ default: L }) => {
      markersGroup.clearLayers();

      trips.forEach((trip, idx) => {
        // Filtrar según ruta activa si está seleccionada
        if (activeRoute === 'caracas-valencia' && !trip.destination.toLowerCase().includes('valencia') && !trip.origin.toLowerCase().includes('valencia')) {
          return;
        }
        if (activeRoute === 'puerto-ordaz-caracas' && !trip.origin.toLowerCase().includes('ordaz') && !trip.destination.toLowerCase().includes('ordaz')) {
          return;
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

        // Flightradar24 custom HTML DivIcon con orientación según heading
        const iconHtml = `
          <div class="relative flex items-center justify-center cursor-pointer group" style="width: 52px; height: 52px;">
            ${
              isEnRuta
                ? `<div class="absolute inset-0 rounded-full ${pingColor} opacity-75 radar-ping" style="pointer-events: none;"></div>`
                : ''
            }
            <div 
              class="relative z-10 flex h-9 w-9 items-center justify-center rounded-2xl shadow-xl border-2 transition-transform duration-300"
              style="
                background: #0B0F17; 
                border-color: ${markerColor}; 
                box-shadow: 0 0 12px ${markerColor}60;
                transform: rotate(${coords.heading}deg);
              "
            >
              <!-- Ícono de auto apuntando hacia el norte (rumbo 0°) -->
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${markerColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
                <circle cx="7" cy="17" r="2"/>
                <circle cx="17" cy="17" r="2"/>
              </svg>
            </div>

            <!-- Etiqueta de velocidad / puestos flotante -->
            <div class="absolute -bottom-4 z-20 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-black font-mono shadow-md border whitespace-nowrap"
              style="background: #0B0F17E6; border-color: ${markerColor}80; color: ${markerColor};">
              <span>${trip.driverName.split(' ')[0]}</span>
              <span>•</span>
              <span>${trip.availableSeats}p</span>
            </div>
          </div>
        `;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: 'flightradar-vehicle-marker',
          iconSize: [52, 52],
          iconAnchor: [26, 26],
        });

        const marker = L.marker([coords.lat, coords.lng], { icon: customIcon });

        // REQUISITO 3: INTERCEPTACIÓN Y PROTECCIÓN DE ACCESO AL TOCAR UN VEHÍCULO
        marker.on('click', () => {
          if (!isAuthenticated) {
            // Usuario NO autenticado: Redirigir de inmediato al login con el mensaje requerido
            const redirectUrl = `/?tripId=${trip.id}`;
            const message = 'Inicia sesión para ver los detalles del vehículo y conductor';
            router.push(`/login?redirect=${encodeURIComponent(redirectUrl)}&message=${encodeURIComponent(message)}`);
          } else {
            // Usuario SÍ autenticado: Desplegar la ficha flotante (bottom-sheet)
            setSheetTrip(trip);
            map.panTo([coords.lat, coords.lng], { animate: true });
          }
        });

        marker.addTo(markersGroup);
      });
    });
  }, [trips, activeRoute, isAuthenticated, router]);

  const handleFilterClick = (filterKey: string) => {
    setActiveRoute(filterKey);
    onFilterChange?.(filterKey);
  };

  return (
    <div className="relative w-full h-[calc(100vh-12.5rem)] min-h-[460px] rounded-3xl overflow-hidden border border-zinc-800 bg-[#080B10] shadow-2xl flex flex-col">
      {/* Barra de Filtros Flotante de Corredores Viales */}
      <div className="absolute top-3 left-3 right-3 z-10 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => handleFilterClick('all')}
          className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold backdrop-blur-md border transition ${
            activeRoute === 'all'
              ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-lg shadow-amber-500/20'
              : 'bg-zinc-950/80 text-zinc-300 border-zinc-800 hover:text-white'
          }`}
        >
          Todas las Rutas
        </button>

        <button
          type="button"
          onClick={() => handleFilterClick('caracas-valencia')}
          className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold backdrop-blur-md border transition ${
            activeRoute === 'caracas-valencia'
              ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-lg shadow-amber-500/20'
              : 'bg-zinc-950/80 text-amber-400 border-amber-500/30 hover:border-amber-500/60'
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
          <span>ARC (Caracas ➔ Valencia)</span>
        </button>

        <button
          type="button"
          onClick={() => handleFilterClick('puerto-ordaz-caracas')}
          className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold backdrop-blur-md border transition ${
            activeRoute === 'puerto-ordaz-caracas'
              ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-lg shadow-emerald-500/20'
              : 'bg-zinc-950/80 text-emerald-400 border-emerald-500/30 hover:border-emerald-500/60'
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
          <span>Oriente (Pto. Ordaz ➔ CCS)</span>
        </button>

      </div>

      {/* Contenedor Leaflet */}
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

      {/* Atribución oficial CartoDB Dark Matter & OpenStreetMap */}
      <div className="absolute bottom-2.5 right-2.5 z-10 text-[9px] text-zinc-500 bg-zinc-950/80 backdrop-blur-sm border border-zinc-900 px-2 py-0.5 rounded-md pointer-events-auto">
        &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="hover:underline text-zinc-400">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer" className="hover:underline text-zinc-400">CARTO</a>
      </div>

      {/* REQUISITO 3: FICHA INFERIOR FLOTANTE (BOTTOM-SHEET) PARA USUARIOS AUTENTICADOS */}
      {sheetTrip && isAuthenticated && (
        <div className="absolute bottom-0 inset-x-0 z-20 p-3 animate-in slide-in-from-bottom-6 duration-200">
          <div className="rounded-3xl border border-amber-500/50 bg-gradient-to-b from-zinc-900/95 via-zinc-950/95 to-zinc-950 p-4 shadow-2xl backdrop-blur-xl space-y-3">
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

            {/* Trayecto y Puestos */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-white">{sheetTrip.origin}</span>
                <ArrowRight className="h-3.5 w-3.5 text-zinc-500" />
                <span className="text-sm font-extrabold text-white">{sheetTrip.destination}</span>
              </div>

              <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-black text-amber-400">
                <Users className="h-3.5 w-3.5" />
                <span>Quedan {sheetTrip.availableSeats} puestos</span>
              </span>
            </div>

            {/* Tarifa y Botón "Reservar" */}
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

              <button
                type="button"
                onClick={() => {
                  onSelectTripToBook?.(sheetTrip);
                  setSheetTrip(null);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-2.5 text-xs font-black text-zinc-950 shadow-lg shadow-amber-500/20 active:scale-95 transition"
              >
                <span>Reservar</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
