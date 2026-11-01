'use client';

import { useState } from 'react';
import {
  Check,
  X,
  Car,
  Phone,
  Shield,
  AlertCircle,
  Clock,
  FileText,
  MessageCircle,
  Eye,
  Camera,
} from 'lucide-react';
import type { User } from '@/lib/types';
import { accountStatus, setUserStatus } from '@/lib/admin';
import { WhatsAppTemplates, buildWhatsAppLink } from '@/lib/whatsapp';
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

type RequestFilter = 'pending' | 'approved' | 'rejected' | 'all';

export default function RequestsSection({ users }: { users: User[] }) {
  const [filter, setFilter] = useState<RequestFilter>('pending');
  const [query, setQuery] = useState('');
  const [rejectingUser, setRejectingUser] = useState<User | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [inspectingDocsDriver, setInspectingDocsDriver] = useState<User | null>(null);
  const { busyId, message, run } = useAdminAction();

  // Solicitudes: choferes registrados
  const drivers = users.filter((u) => u.role === 'driver');

  const pendingCount = drivers.filter((d) => accountStatus(d) === 'pending').length;
  const approvedCount = drivers.filter((d) => accountStatus(d) === 'approved').length;
  const rejectedCount = drivers.filter((d) => accountStatus(d) === 'rejected').length;

  const filtered = drivers.filter((d) => {
    const status = accountStatus(d);
    if (filter === 'pending' && status !== 'pending') return false;
    if (filter === 'approved' && status !== 'approved') return false;
    if (filter === 'rejected' && status !== 'rejected') return false;

    if (query.trim()) {
      const q = query.toLowerCase();
      const matchName = d.name.toLowerCase().includes(q);
      const matchDni = d.dni.toLowerCase().includes(q);
      const matchPhone = d.phone.toLowerCase().includes(q);
      const matchPlate = d.vehicle?.plate.toLowerCase().includes(q);
      const matchModel = d.vehicle?.model.toLowerCase().includes(q);
      if (!matchName && !matchDni && !matchPhone && !matchPlate && !matchModel) return false;
    }
    return true;
  });

  const handleApprove = async (driver: User) => {
    await run(
      driver.id,
      () => setUserStatus(driver.id, 'approved'),
      `Chofer ${driver.name} aprobado exitosamente.`
    );
  };

  const handleRejectConfirm = async () => {
    if (!rejectingUser) return;
    const ok = await run(
      rejectingUser.id,
      () => setUserStatus(rejectingUser.id, 'rejected', rejectReason),
      `Solicitud de ${rejectingUser.name} rechazada.`
    );
    if (ok) {
      setRejectingUser(null);
      setRejectReason('');
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Solicitudes de Choferes"
        subtitle="Verificación de documentos, cédula y vehículos registrados"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Buscar por nombre, cédula o placa..."
            />
          </div>
        }
      />

      <ActionMessage message={message} />

      <FilterChips
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'pending', label: 'Pendientes', count: pendingCount },
          { value: 'approved', label: 'Aprobadas', count: approvedCount },
          { value: 'rejected', label: 'Rechazadas', count: rejectedCount },
          { value: 'all', label: 'Todas', count: drivers.length },
        ]}
      />

      {filtered.length === 0 ? (
        <EmptyState text="No se encontraron solicitudes con los filtros actuales." />
      ) : (
        <Table head={['Chofer / Cédula', 'Contacto', 'Vehículo Registrado', 'Fecha', 'Estado', 'Acciones']}>
          {filtered.map((driver) => {
            const status = accountStatus(driver);
            const isBusy = busyId === driver.id;

            return (
              <tr key={driver.id} className="hover:bg-white/[0.02]">
                <td className="px-3 py-3">
                  <div className="font-bold text-white">{driver.name}</div>
                  <div className="font-mono text-[11px] text-zinc-400">CI: {driver.dni}</div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1 text-zinc-300">
                    <Phone className="h-3 w-3 text-amber-400" />
                    <span>{driver.phone}</span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  {driver.vehicle ? (
                    <div>
                      <div className="font-medium text-zinc-200">
                        {driver.vehicle.model} ({driver.vehicle.color})
                      </div>
                      <div className="font-mono text-[11px] text-amber-400">
                        Placa: {driver.vehicle.plate}
                      </div>
                    </div>
                  ) : (
                    <span className="text-zinc-500 italic">Sin datos de vehículo</span>
                  )}
                </td>
                <td className="px-3 py-3 text-zinc-400">
                  {fmtDate(driver.createdAt)}
                </td>
                <td className="px-3 py-3">
                  {status === 'pending' && <Badge tone="amber">Pendiente</Badge>}
                  {status === 'approved' && <Badge tone="green">Aprobado</Badge>}
                  {status === 'rejected' && (
                    <div>
                      <Badge tone="red">Rechazado</Badge>
                      {driver.statusReason && (
                        <p className="mt-0.5 max-w-[140px] truncate text-[10px] text-zinc-500" title={driver.statusReason}>
                          {driver.statusReason}
                        </p>
                      )}
                    </div>
                  )}
                  {status === 'suspended' && <Badge tone="red">Suspendido</Badge>}
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Botón Ver Documentos y Fotos */}
                    <button
                      type="button"
                      onClick={() => setInspectingDocsDriver(driver)}
                      className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-[11px] font-bold text-zinc-300 hover:bg-zinc-700 hover:text-white transition"
                    >
                      <Camera className="h-3 w-3 text-amber-400" />
                      <span>Recaudos</span>
                    </button>

                    {status !== 'approved' && (
                      <ActionButton
                        tone="green"
                        onClick={() => handleApprove(driver)}
                        disabled={isBusy}
                      >
                        <Check className="h-3 w-3" />
                        <span>Aprobar</span>
                      </ActionButton>
                    )}

                    {status === 'approved' && (
                      <a
                        href={buildWhatsAppLink(driver.phone, WhatsAppTemplates.driverApproved(driver.name))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/50 bg-emerald-500/15 px-2.5 py-1.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/25 transition"
                        title="Enviar bienvenida por WhatsApp"
                      >
                        <MessageCircle className="h-3 w-3" />
                        <span>Aviso WhatsApp</span>
                      </a>
                    )}

                    {status !== 'rejected' && (
                      <ActionButton
                        tone="red"
                        onClick={() => {
                          setRejectingUser(driver);
                          setRejectReason('');
                        }}
                        disabled={isBusy}
                      >
                        <X className="h-3 w-3" />
                        <span>Rechazar</span>
                      </ActionButton>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
      )}

      {/* Modal de confirmación de rechazo con motivo */}
      {rejectingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-red-500/40 bg-zinc-950 p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="h-5 w-5" />
              <h3 className="font-bold text-white text-sm">Rechazar Solicitud</h3>
            </div>
            <p className="text-xs text-zinc-300">
              Indica la razón por la que se rechaza la solicitud de{' '}
              <strong className="text-white">{rejectingUser.name}</strong>:
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ej. Cédula ilegible o placa no coincide con título de propiedad..."
              rows={3}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-xs text-white outline-none focus:border-red-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingUser(null)}
                className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                disabled={busyId === rejectingUser.id}
                className="rounded-xl border border-red-500/50 bg-red-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-red-500"
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Visor de Documentos y Recaudos */}
      {inspectingDocsDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Camera className="h-4 w-4 text-amber-400" />
                  <span>Recaudos de: {inspectingDocsDriver.name}</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Cédula: {inspectingDocsDriver.dni} · Teléfono: {inspectingDocsDriver.phone}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingDocsDriver(null)}
                className="rounded-lg p-1 text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              {/* Cédula */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
                <span className="font-bold text-zinc-300 block">1. Cédula de Identidad</span>
                {inspectingDocsDriver.documents?.idCardUrl ? (
                  <img
                    src={inspectingDocsDriver.documents.idCardUrl}
                    alt="Cédula"
                    className="w-full h-32 object-cover rounded-lg border border-zinc-800"
                  />
                ) : (
                  <div className="h-32 flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-800 text-zinc-500 text-[11px] text-center p-2">
                    <span>Documento registrado por C.I.</span>
                    <span className="font-mono text-zinc-400 font-bold mt-1">{inspectingDocsDriver.dni}</span>
                  </div>
                )}
              </div>

              {/* Licencia */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
                <span className="font-bold text-zinc-300 block">2. Licencia de Conducir</span>
                {inspectingDocsDriver.documents?.driverLicenseUrl ? (
                  <img
                    src={inspectingDocsDriver.documents.driverLicenseUrl}
                    alt="Licencia"
                    className="w-full h-32 object-cover rounded-lg border border-zinc-800"
                  />
                ) : (
                  <div className="h-32 flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-800 text-zinc-500 text-[11px] text-center p-2">
                    <span>Licencia 4ta/5ta Grado</span>
                    <span className="text-amber-400 text-[10px] mt-1">Verificación presencial / datos</span>
                  </div>
                )}
              </div>

              {/* Carnet de Circulación */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
                <span className="font-bold text-zinc-300 block">3. Carnet de Circulación / Título</span>
                {inspectingDocsDriver.documents?.vehicleRegistrationUrl ? (
                  <img
                    src={inspectingDocsDriver.documents.vehicleRegistrationUrl}
                    alt="Carnet"
                    className="w-full h-32 object-cover rounded-lg border border-zinc-800"
                  />
                ) : (
                  <div className="h-32 flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-800 text-zinc-500 text-[11px] text-center p-2">
                    <span>Placa registrada:</span>
                    <span className="font-mono text-amber-400 font-bold mt-1">
                      {inspectingDocsDriver.vehicle?.plate || 'Pendiente'}
                    </span>
                  </div>
                )}
              </div>

              {/* Foto del Carro */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
                <span className="font-bold text-zinc-300 block">4. Foto del Vehículo</span>
                {inspectingDocsDriver.documents?.vehiclePhotoUrl ? (
                  <img
                    src={inspectingDocsDriver.documents.vehiclePhotoUrl}
                    alt="Vehículo"
                    className="w-full h-32 object-cover rounded-lg border border-zinc-800"
                  />
                ) : (
                  <div className="h-32 flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-800 text-zinc-500 text-[11px] text-center p-2">
                    <span>Modelo declarado:</span>
                    <span className="font-semibold text-zinc-300 mt-1">
                      {inspectingDocsDriver.vehicle ? `${inspectingDocsDriver.vehicle.model} (${inspectingDocsDriver.vehicle.color})` : 'No especificado'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setInspectingDocsDriver(null)}
                className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

