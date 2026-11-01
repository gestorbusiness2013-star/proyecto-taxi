'use client';

import { useState } from 'react';
import {
  Siren,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Phone,
  MessageCircle,
  MapPin,
  FileText,
} from 'lucide-react';
import type { Report, ReportStatus, ReportType } from '@/lib/types';
import { updateReport } from '@/lib/admin';
import { WhatsAppTemplates, buildWhatsAppLink } from '@/lib/whatsapp';
import {
  ActionButton,
  Badge,
  EmptyState,
  FilterChips,
  SearchInput,
  SectionHeader,
  Table,
  fmtDateTime,
} from '../ui';
import { ActionMessage, useAdminAction } from '../useAdminAction';

export default function ReportsSection({ reports }: { reports: Report[] }) {
  const [typeFilter, setTypeFilter] = useState<ReportType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [query, setQuery] = useState('');
  const [activeReportModal, setActiveReportModal] = useState<Report | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const { busyId, message, run } = useAdminAction();

  const sosCount = reports.filter((r) => r.type === 'sos' && r.status !== 'resolved').length;

  const filtered = reports.filter((r) => {
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;

    if (query.trim()) {
      const q = query.toLowerCase();
      const matchMsg = r.message.toLowerCase().includes(q);
      const matchName = r.reporterName?.toLowerCase().includes(q);
      const matchPhone = r.reporterPhone?.toLowerCase().includes(q);
      if (!matchMsg && !matchName && !matchPhone) return false;
    }
    return true;
  });

  const handleUpdateStatus = async (reportId: string, nextStatus: ReportStatus, note?: string) => {
    const ok = await run(
      reportId,
      () => updateReport(reportId, nextStatus, note),
      `Reporte marcado como "${nextStatus}".`
    );
    if (ok && activeReportModal?.id === reportId) {
      setActiveReportModal(null);
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Alertas S.O.S. y Quejas"
        subtitle="Atención de emergencias en carretera, reclamos de pasajeros y mediación de disputas"
        actions={
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Buscar en mensajes o remitente..."
          />
        }
      />

      <ActionMessage message={message} />

      {sosCount > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/60 bg-red-950/40 p-4">
          <Siren className="h-6 w-6 animate-pulse text-red-400" />
          <div>
            <h4 className="text-sm font-black text-red-200">
              ¡Hay {sosCount} alerta(s) de Auxilio Vial S.O.S. pendientes!
            </h4>
            <p className="text-xs text-red-300/80">
              Verifica de inmediato el número telefónico y la ubicación del usuario para coordinar auxilio con los Ángeles de la Autopista o VEN 911.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <FilterChips
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { value: 'all', label: 'Todos los tipos', count: reports.length },
            { value: 'sos', label: 'Auxilio S.O.S.', count: reports.filter((r) => r.type === 'sos').length },
            { value: 'complaint', label: 'Quejas', count: reports.filter((r) => r.type === 'complaint').length },
            { value: 'dispute', label: 'Disputas', count: reports.filter((r) => r.type === 'dispute').length },
          ]}
        />
        <FilterChips
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'all', label: 'Todos los estados' },
            { value: 'open', label: 'Abiertos' },
            { value: 'in_progress', label: 'En proceso' },
            { value: 'resolved', label: 'Resueltos' },
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState text="No se encontraron reportes con los filtros seleccionados." />
      ) : (
        <Table head={['Tipo', 'Remitente / Teléfono', 'Mensaje / Detalle', 'Fecha', 'Estado', 'Acciones']}>
          {filtered.map((r) => {
            const isBusy = busyId === r.id;
            const isSos = r.type === 'sos';
            const cleanPhone = r.reporterPhone?.replace(/\D/g, '');

            return (
              <tr key={r.id} className={`hover:bg-white/[0.02] ${isSos && r.status !== 'resolved' ? 'bg-red-950/20' : ''}`}>
                <td className="px-3 py-3">
                  {r.type === 'sos' && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-red-500/50 bg-red-950/60 px-2 py-0.5 text-[10px] font-black text-red-400">
                      <Siren className="h-3 w-3 animate-pulse" />
                      S.O.S.
                    </span>
                  )}
                  {r.type === 'complaint' && <Badge tone="amber">Queja</Badge>}
                  {r.type === 'dispute' && <Badge tone="sky">Disputa</Badge>}
                </td>
                <td className="px-3 py-3">
                  <div className="font-bold text-white">
                    {r.reporterName || 'Usuario anónimo'}
                  </div>
                  {r.reporterPhone && (
                    <div className="flex items-center gap-1.5 text-xs text-zinc-300 mt-0.5">
                      <span className="font-mono">{r.reporterPhone}</span>
                      <a
                        href={buildWhatsAppLink(
                          r.reporterPhone,
                          r.type === 'sos'
                            ? WhatsAppTemplates.sosResponse(r.reporterName || 'Usuario')
                            : `Hola ${r.reporterName || ''}, te contactamos de Proyecto Taxi respecto a tu reporte.`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 font-semibold"
                        title="Responder por WhatsApp"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span className="text-[10px] hidden sm:inline">WhatsApp</span>
                      </a>
                    </div>
                  )}
                </td>
                <td className="px-3 py-3">
                  <p className="max-w-xs line-clamp-2 text-xs text-zinc-200">
                    {r.message}
                  </p>
                  {r.adminNote && (
                    <div className="mt-1 text-[11px] text-amber-400/90 italic">
                      Nota admin: {r.adminNote}
                    </div>
                  )}
                </td>
                <td className="px-3 py-3 text-zinc-400 text-xs">
                  {fmtDateTime(r.createdAt)}
                </td>
                <td className="px-3 py-3">
                  {r.status === 'open' && <Badge tone="red">Abierto</Badge>}
                  {r.status === 'in_progress' && <Badge tone="amber">En Proceso</Badge>}
                  {r.status === 'resolved' && <Badge tone="green">Resuelto</Badge>}
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveReportModal(r);
                        setAdminNoteInput(r.adminNote || '');
                      }}
                      className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] font-bold text-zinc-300 hover:text-white"
                    >
                      Gestionar
                    </button>
                    {r.status !== 'resolved' && (
                      <ActionButton
                        tone="green"
                        onClick={() => handleUpdateStatus(r.id, 'resolved')}
                        disabled={isBusy}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Resolver</span>
                      </ActionButton>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
      )}

      {/* Modal de gestión de reporte */}
      {activeReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white">
                Gestionar Reporte: {activeReportModal.type.toUpperCase()}
              </h3>
              <button
                type="button"
                onClick={() => setActiveReportModal(null)}
                className="rounded-lg p-1 text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                <span className="text-[10px] uppercase font-bold text-zinc-500 block">Mensaje</span>
                <p className="text-zinc-200 mt-1 whitespace-pre-wrap">{activeReportModal.message}</p>
              </div>

              {activeReportModal.reporterName && (
                <div className="flex justify-between text-zinc-300">
                  <span className="text-zinc-500">Reportado por:</span>
                  <span className="font-bold text-white">{activeReportModal.reporterName}</span>
                </div>
              )}

              {activeReportModal.reporterPhone && (
                <div className="flex justify-between text-zinc-300">
                  <span className="text-zinc-500">Teléfono:</span>
                  <span className="font-mono text-amber-400">{activeReportModal.reporterPhone}</span>
                </div>
              )}

              {activeReportModal.location && (
                <div className="flex justify-between text-zinc-300">
                  <span className="text-zinc-500">Coordenadas GPS:</span>
                  <a
                    href={`https://www.google.com/maps?q=${activeReportModal.location.lat},${activeReportModal.location.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-sky-400 hover:underline flex items-center gap-1"
                  >
                    <MapPin className="h-3 w-3" />
                    <span>{activeReportModal.location.lat.toFixed(4)}, {activeReportModal.location.lng.toFixed(4)}</span>
                  </a>
                </div>
              )}

              <div>
                <label className="block text-zinc-400 font-bold mb-1">
                  Nota interna del Administrador:
                </label>
                <textarea
                  value={adminNoteInput}
                  onChange={(e) => setAdminNoteInput(e.target.value)}
                  placeholder="Ej. Se contactó a Protección Civil regional a las 07:45 AM..."
                  rows={3}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-white outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-between gap-2 border-t border-zinc-800 pt-3">
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(activeReportModal.id, 'in_progress', adminNoteInput)}
                  className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-500/20"
                >
                  En Proceso
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(activeReportModal.id, 'resolved', adminNoteInput)}
                  className="rounded-xl border border-emerald-500/50 bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
                >
                  Resolver
                </button>
              </div>

              <button
                type="button"
                onClick={() => setActiveReportModal(null)}
                className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

