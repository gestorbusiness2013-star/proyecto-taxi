'use client';

import { useState } from 'react';
import { UserX, UserCheck, ShieldAlert, Phone, Car, User as UserIcon } from 'lucide-react';
import type { User } from '@/lib/types';
import { accountStatus, deactivateSubscription, setUserStatus, subscriptionState } from '@/lib/admin';
import {
  ActionButton,
  Badge,
  EmptyState,
  FilterChips,
  SearchInput,
  SectionHeader,
  Table,
  fmtDate,
} from '../ui';
import { ActionMessage, useAdminAction } from '../useAdminAction';

export default function UsersSection({ users }: { users: User[] }) {
  const [roleFilter, setRoleFilter] = useState<'all' | 'driver' | 'passenger'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'suspended'>('all');
  const [query, setQuery] = useState('');
  const [suspendingUser, setSuspendingUser] = useState<User | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const { busyId, message, run } = useAdminAction();

  const filtered = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    const status = accountStatus(u);
    if (statusFilter !== 'all' && status !== statusFilter) return false;

    if (query.trim()) {
      const q = query.toLowerCase();
      const matchName = u.name.toLowerCase().includes(q);
      const matchDni = u.dni.toLowerCase().includes(q);
      const matchPhone = u.phone.toLowerCase().includes(q);
      const matchPlate = u.vehicle?.plate.toLowerCase().includes(q);
      if (!matchName && !matchDni && !matchPhone && !matchPlate) return false;
    }
    return true;
  });

  const handleReactivate = async (u: User) => {
    await run(
      u.id,
      () => setUserStatus(u.id, 'approved'),
      `Cuenta de ${u.name} reactivada.`
    );
  };

  const handleSuspendConfirm = async () => {
    if (!suspendingUser) return;
    const ok = await run(
      suspendingUser.id,
      () => setUserStatus(suspendingUser.id, 'suspended', suspendReason),
      `Cuenta de ${suspendingUser.name} suspendida.`
    );
    if (ok) {
      setSuspendingUser(null);
      setSuspendReason('');
    }
  };

  const handleDeactivateSub = async (driver: User) => {
    await run(
      driver.id,
      () => deactivateSubscription(driver.id),
      `Suscripción de ${driver.name} desactivada.`
    );
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Gestión de Usuarios"
        subtitle="Listado general de pasajeros y choferes con control de acceso"
        actions={
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Buscar por nombre, CI, teléfono..."
          />
        }
      />

      <ActionMessage message={message} />

      <div className="flex flex-wrap items-center gap-3">
        <FilterChips
          value={roleFilter}
          onChange={setRoleFilter}
          options={[
            { value: 'all', label: 'Todos los roles', count: users.length },
            { value: 'driver', label: 'Choferes', count: users.filter((u) => u.role === 'driver').length },
            { value: 'passenger', label: 'Pasajeros', count: users.filter((u) => u.role === 'passenger').length },
          ]}
        />
        <FilterChips
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'all', label: 'Todos los estados' },
            { value: 'approved', label: 'Aprobados' },
            { value: 'pending', label: 'Pendientes' },
            { value: 'suspended', label: 'Suspendidos' },
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState text="No se encontraron usuarios con los criterios de búsqueda." />
      ) : (
        <Table head={['Usuario', 'Rol', 'Contacto / Cédula', 'Detalles / Suscripción', 'Estado', 'Acciones']}>
          {filtered.map((u) => {
            const status = accountStatus(u);
            const isBusy = busyId === u.id;
            const subState = u.role === 'driver' ? subscriptionState(u) : null;

            return (
              <tr key={u.id} className="hover:bg-white/[0.02]">
                <td className="px-3 py-3">
                  <div className="font-bold text-white">{u.name}</div>
                  <div className="text-[10px] text-zinc-500 font-mono">ID: {u.id}</div>
                </td>
                <td className="px-3 py-3">
                  {u.role === 'driver' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400">
                      <Car className="h-3 w-3" />
                      Chofer
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-400">
                      <UserIcon className="h-3 w-3" />
                      Pasajero
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-zinc-300">
                  <div className="text-xs font-mono">{u.phone}</div>
                  <div className="text-[11px] text-zinc-400">CI: {u.dni}</div>
                </td>
                <td className="px-3 py-3">
                  {u.role === 'driver' ? (
                    <div className="space-y-0.5">
                      <div className="text-xs text-zinc-300">
                        {u.vehicle ? `${u.vehicle.model} (${u.vehicle.plate})` : 'Sin auto'}
                      </div>
                      <div>
                        {subState === 'active' && <Badge tone="green">Suscrito activo</Badge>}
                        {subState === 'expiring' && <Badge tone="amber">Vence pronto</Badge>}
                        {subState === 'expired' && <Badge tone="red">Suscripción vencida</Badge>}
                        {subState === 'none' && <Badge tone="zinc">Sin suscripción</Badge>}
                      </div>
                    </div>
                  ) : (
                    <span className="text-zinc-500 text-xs">Pasajero estándar</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  {status === 'approved' && <Badge tone="green">Activo</Badge>}
                  {status === 'pending' && <Badge tone="amber">Pendiente</Badge>}
                  {status === 'suspended' && (
                    <div>
                      <Badge tone="red">Suspendido</Badge>
                      {u.statusReason && (
                        <p className="mt-0.5 max-w-[140px] truncate text-[10px] text-zinc-500" title={u.statusReason}>
                          {u.statusReason}
                        </p>
                      )}
                    </div>
                  )}
                  {status === 'rejected' && <Badge tone="zinc">Rechazado</Badge>}
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {status === 'suspended' ? (
                      <ActionButton
                        tone="green"
                        onClick={() => handleReactivate(u)}
                        disabled={isBusy}
                      >
                        <UserCheck className="h-3 w-3" />
                        <span>Reactivar</span>
                      </ActionButton>
                    ) : (
                      <ActionButton
                        tone="red"
                        onClick={() => {
                          setSuspendingUser(u);
                          setSuspendReason('');
                        }}
                        disabled={isBusy}
                      >
                        <UserX className="h-3 w-3" />
                        <span>Suspender</span>
                      </ActionButton>
                    )}

                    {u.role === 'driver' && u.isSubscribed && (
                      <ActionButton
                        tone="zinc"
                        onClick={() => handleDeactivateSub(u)}
                        disabled={isBusy}
                      >
                        <span>Quitar suscripción</span>
                      </ActionButton>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
      )}

      {/* Modal de suspensión */}
      {suspendingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-red-500/40 bg-zinc-950 p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-400">
              <ShieldAlert className="h-5 w-5" />
              <h3 className="font-bold text-white text-sm">Suspender Usuario</h3>
            </div>
            <p className="text-xs text-zinc-300">
              ¿Seguro que deseas suspender la cuenta de{' '}
              <strong className="text-white">{suspendingUser.name}</strong>?
            </p>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Motivo de suspensión (ej. quejas reiteradas de usuarios o comportamiento indebido)..."
              rows={3}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-xs text-white outline-none focus:border-red-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSuspendingUser(null)}
                className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSuspendConfirm}
                disabled={busyId === suspendingUser.id}
                className="rounded-xl border border-red-500/50 bg-red-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-red-500"
              >
                Confirmar Suspensión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

