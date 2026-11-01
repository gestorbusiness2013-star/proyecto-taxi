'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export const usd = (n: number) =>
  `$${n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const fmtDateTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString('es-VE', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
    : '—';

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'amber',
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'amber' | 'emerald' | 'red' | 'sky' | 'zinc';
  onClick?: () => void;
}) {
  const tones = {
    amber: 'text-amber-400 bg-amber-500/10 ring-amber-500/30',
    emerald: 'text-emerald-400 bg-emerald-500/10 ring-emerald-500/30',
    red: 'text-red-400 bg-red-500/10 ring-red-500/30',
    sky: 'text-sky-400 bg-sky-500/10 ring-sky-500/30',
    zinc: 'text-zinc-300 bg-zinc-800/60 ring-zinc-700',
  };
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900/60 p-4 text-left transition hover:border-white/20"
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{label}</p>
        <p className="text-xl font-black text-white">{value}</p>
        {hint && <p className="truncate text-[11px] text-zinc-500">{hint}</p>}
      </div>
    </Comp>
  );
}

const BADGE_TONES: Record<string, string> = {
  green: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  amber: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  red: 'border-red-500/40 bg-red-500/10 text-red-300',
  sky: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
  zinc: 'border-zinc-700 bg-zinc-800/60 text-zinc-300',
};

export function Badge({ tone = 'zinc', children }: { tone?: keyof typeof BADGE_TONES; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${BADGE_TONES[tone]}`}>
      {children}
    </span>
  );
}

export function SectionHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-black text-white">{title}</h2>
        {subtitle && <p className="text-xs text-zinc-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-xs text-zinc-500">
      {text}
    </div>
  );
}

export function FilterChips<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition ${value === o.value
              ? 'border-amber-500 bg-amber-500 text-zinc-950'
              : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1 opacity-70">({o.count})</span>}
        </button>
      ))}
    </div>
  );
}

export function ActionButton({
  children,
  onClick,
  tone = 'zinc',
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  tone?: 'zinc' | 'green' | 'red' | 'amber';
  disabled?: boolean;
}) {
  const tones = {
    zinc: 'border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700',
    green: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25',
    red: 'border-red-500/50 bg-red-500/10 text-red-300 hover:bg-red-500/20',
    amber: 'border-amber-500 bg-amber-500 text-zinc-950 hover:bg-amber-400',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white outline-none focus:border-amber-500 sm:w-64"
    />
  );
}

/** Contenedor de tabla con scroll horizontal en móvil. */
export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-zinc-900/40">
      <table className="w-full min-w-[640px] text-left text-xs">
        <thead className="border-b border-white/10 text-[10px] uppercase tracking-wider text-zinc-500">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-3 py-2.5 font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">{children}</tbody>
      </table>
    </div>
  );
}

