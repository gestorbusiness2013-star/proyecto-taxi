// Catálogo de Puntos de Encuentro y Abordaje Seguro en Venezuela (Rutas Interurbanas)

export interface MeetingPoint {
  id: string;
  name: string;
  landmark: string;
  lat: number;
  lng: number;
}

export const SECURE_MEETING_POINTS: Record<string, MeetingPoint[]> = {
  Caracas: [
    {
      id: 'ccs-plaza-vzla',
      name: 'Plaza Venezuela (Torre La Previsora)',
      landmark: 'Frente a estación de Metro Plaza Venezuela',
      lat: 10.496,
      lng: -66.914,
    },
    {
      id: 'ccs-tazon',
      name: 'Peaje Hoyo de la Puerta / Tazón',
      landmark: 'Parada segura salida hacia la ARC',
      lat: 10.435,
      lng: -66.935,
    },
    {
      id: 'ccs-bandera',
      name: 'Terminal La Bandera',
      landmark: 'Zona de abordaje interurbano',
      lat: 10.478,
      lng: -66.916,
    },
  ],
  Valencia: [
    {
      id: 'val-san-blas',
      name: 'Distribuidor San Blas',
      landmark: 'Parada central de enlace vial ARC',
      lat: 10.181,
      lng: -67.997,
    },
    {
      id: 'val-big-low',
      name: 'Terminal Big Low Center (San Diego)',
      landmark: 'Frente a estación de servicio Big Low',
      lat: 10.198,
      lng: -67.935,
    },
    {
      id: 'val-guacara',
      name: 'Peaje de Guacara',
      landmark: 'Punto de control y parador vial',
      lat: 10.242,
      lng: -67.876,
    },
  ],
  Maracay: [
    {
      id: 'mcy-palo-negro',
      name: 'Peaje Palo Negro (Maracay Sur)',
      landmark: 'Entrada principal a Maracay desde la ARC',
      lat: 10.246,
      lng: -67.595,
    },
    {
      id: 'mcy-encrucijada',
      name: 'La Encrucijada de Turmero',
      landmark: 'Parador turístico y nodo de interconexión vial',
      lat: 10.218,
      lng: -67.482,
    },
    {
      id: 'mcy-terminal',
      name: 'Terminal Central de Maracay',
      landmark: 'Avenida Constitución',
      lat: 10.239,
      lng: -67.602,
    },
  ],
  Barquisimeto: [
    {
      id: 'bar-obelisco',
      name: 'Redoma del Obelisco',
      landmark: 'Av. Libertador con Av. Pedro León Torres',
      lat: 10.066,
      lng: -69.347,
    },
    {
      id: 'bar-terminal',
      name: 'Terminal de Pasajeros de Barquisimeto',
      landmark: 'Carrera 24 con Calle 42',
      lat: 10.062,
      lng: -69.333,
    },
    {
      id: 'bar-sol-naciente',
      name: 'Monumento al Sol Naciente',
      landmark: 'Redoma del Este / Av. Los Leones',
      lat: 10.071,
      lng: -69.289,
    },
  ],
  'Puerto Ordaz': [
    {
      id: 'poz-alta-vista',
      name: 'Redoma de Alta Vista (Macrocentro)',
      landmark: 'Frente a CC Alta Vista II',
      lat: 8.297,
      lng: -62.736,
    },
    {
      id: 'poz-terminal',
      name: 'Terminal de Pasajeros de Puerto Ordaz',
      landmark: 'Sector Castillito',
      lat: 8.324,
      lng: -62.698,
    },
    {
      id: 'poz-peaje',
      name: 'Peaje Guayana (Salida a Bolívar / El Tigre)',
      landmark: 'Punto de control Troncal 19',
      lat: 8.272,
      lng: -62.812,
    },
  ],
  'San Félix': [
    {
      id: 'sfx-dorado',
      name: 'Redoma El Dorado (San Félix)',
      landmark: 'Nodo vial conector hacia Upata y Troncal 10',
      lat: 8.351,
      lng: -62.664,
    },
  ],
  'Puerto La Cruz': [
    {
      id: 'plc-terminal',
      name: 'Terminal Terrestre de Puerto La Cruz',
      landmark: 'Calle Libertad con Av. Alberto Ravell',
      lat: 10.218,
      lng: -64.632,
    },
    {
      id: 'plc-molorca',
      name: 'Redoma de Molorca',
      landmark: 'Distribuidor vial Intercomunal',
      lat: 10.198,
      lng: -64.658,
    },
  ],
  Maturín: [
    {
      id: 'mat-terminal',
      name: 'Terminal Interurbano de Maturín',
      landmark: 'Av. Libertador',
      lat: 9.742,
      lng: -63.181,
    },
  ],
};

/** Obtiene los puntos de encuentro recomendados de una ciudad. */
export function getCityMeetingPoints(cityName: string): MeetingPoint[] {
  return SECURE_MEETING_POINTS[cityName] || [];
}

export const getMeetingPointsForCity = getCityMeetingPoints;

