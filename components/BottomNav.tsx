'use client';

import { Compass, CalendarCheck, User, Sparkles } from 'lucide-react';

export type NavTab = 'viajes' | 'reservas' | 'perfil';

interface BottomNavProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  activeBookingsCount?: number;
}

export default function BottomNav({
  currentTab,
  onTabChange,
  activeBookingsCount = 1,
}: BottomNavProps) {
  const tabs = [
    {
      id: 'viajes' as NavTab,
      label: 'Viajes',
      sublabel: 'Cartelera',
      icon: Compass,
    },
    {
      id: 'reservas' as NavTab,
      label: 'Mis Reservas',
      sublabel: 'Rutas',
      icon: CalendarCheck,
      badge: activeBookingsCount > 0 ? activeBookingsCount : undefined,
    },
    {
      id: 'perfil' as NavTab,
      label: 'Perfil',
      sublabel: 'Cuenta',
      icon: User,
    },
  ];

  return (
    <nav
      aria-label="Barra de navegación principal"
      className="fixed bottom-0 left-0 right-0 z-40 w-full border-t border-zinc-800/80 bg-[#0B0F17]/95 backdrop-blur-xl bottom-bar-safe"
    >
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`group relative flex flex-1 flex-col items-center justify-center py-1 transition-all duration-200 active:scale-95 ${
                isActive ? 'text-amber-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {/* Active top amber line glow indicator */}
              {isActive && (
                <div className="absolute -top-2 flex flex-col items-center">
                  <span className="h-1 w-8 rounded-full bg-gradient-to-r from-amber-500 to-amber-300 shadow-sm shadow-amber-400/80" />
                </div>
              )}

              {/* Icon Container with badge */}
              <div className="relative">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30'
                      : 'text-zinc-400 group-hover:bg-zinc-800/60'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
                </div>

                {/* Badge if present */}
                {tab.badge !== undefined && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-black text-zinc-950 shadow-sm">
                    {tab.badge}
                  </span>
                )}
              </div>

              {/* Tab Title */}
              <span
                className={`mt-0.5 text-[11px] tracking-tight ${
                  isActive ? 'text-amber-400 font-bold' : 'text-zinc-400'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
