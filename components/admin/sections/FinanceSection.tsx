'use client';

import { useState } from 'react';
import {
  Wallet,
  PlusCircle,
  Download,
  AlertCircle,
  Calendar,
  CreditCard,
  Ban,
  CheckCircle2,
  Clock,
  Phone,
} from 'lucide-react';
import type { Payment, PaymentMethod, User } from '@/lib/types';
import {
  DEFAULT_SUBSCRIPTION_FEE_USD,
  PAYMENT_METHOD_LABELS,
  paymentsToCsv,
  recordPayment,
  subscriptionState,
  voidPayment,
} from '@/lib/admin';
import {
  ActionButton,
  Badge,
  EmptyState,
  FilterChips,
  SearchInput,
  SectionHeader,
  StatCard,
  Table,
  fmtDate,
  fmtDateTime,
  usd,
} from '../ui';
import { ActionMessage, useAdminAction } from '../useAdminAction';

type FinanceTab = 'historial' | 'choferes';

export default function FinanceSection({
  users,
  payments,
  adminEmail,
}: {
  users: User[];
  payments: Payment[];
  adminEmail: string;
}) {
  const [activeTab, setActiveTab] = useState<FinanceTab>('historial');
  const [query, setQuery] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const { busyId, message, run } = useAdminAction();

  // Choferes registrados
  const drivers = users.filter((u) => u.role === 'driver');

  // Formulario nuevo pago
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [amount, setAmount] = useState<number>(DEFAULT_SUBSCRIPTION_FEE_USD);
  const [method, setMethod] = useState<PaymentMethod>('pago_movil');
  const [reference, setReference] = useState('');
  const [months, setMonths] = useState<number>(1);
  const [notes, setNotes] = useState('');

  // Anulación de pago
  const [voidingPayment, setVoidingPayment] = useState<Payment | null>(null);
  const [voidReason, setVoidReason] = useState('');

  // Estadísticas financieras
  const verifiedPayments = payments.filter((p) => p.status === 'verified');
  const totalRevenue = verifiedPayments.reduce((acc, p) => acc + p.amount, 0);

  const now = new Date();
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthRevenue = verifiedPayments
    .filter((p) => p.createdAt.startsWith(currentMonthPrefix))
    .reduce((acc, p) => acc + p.amount, 0);

  const activeDriversCount = drivers.filter(
    (d) => subscriptionState(d) === 'active' || subscriptionState(d) === 'expiring'
  ).length;

  const handleExportCsv = () => {
    const csv = paymentsToCsv(payments);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-ingresos-taxi-${now.toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriverId) return;

    const ok = await run(
      'new-payment',
      () =>
        recordPayment({
          driverId: selectedDriverId,
          amount: Number(amount),
          method,
          reference,
          months: Number(months),
          notes,
          recordedBy: adminEmail,
        }),
      'Pago registrado y suscripción de chofer actualizada.'
    );

    if (ok) {
      setShowPaymentModal(false);
      setSelectedDriverId('');
      setReference('');
      setNotes('');
      setAmount(DEFAULT_SUBSCRIPTION_FEE_USD);
      setMonths(1);
    }
  };

  const handleVoidConfirm = async () => {
    if (!voidingPayment) return;
    const ok = await run(
      voidingPayment.id,
      () => voidPayment(voidingPayment.id, voidReason),
      `Pago ${voidingPayment.reference} anulado exitosamente.`
    );
    if (ok) {
      setVoidingPayment(null);
      setVoidReason('');
    }
  };

  const filteredPayments = payments.filter((p) => {
    if (query.trim()) {
      const q = query.toLowerCase();
      const matchDriver = p.driverName.toLowerCase().includes(q);
      const matchRef = p.reference.toLowerCase().includes(q);
      const matchMethod = (PAYMENT_METHOD_LABELS[p.method] || p.method).toLowerCase().includes(q);
      if (!matchDriver && !matchRef && !matchMethod) return false;
    }
    return true;
  });

  const filteredDrivers = drivers.filter((d) => {
    if (query.trim()) {
      const q = query.toLowerCase();
      const matchName = d.name.toLowerCase().includes(q);
      const matchPhone = d.phone.toLowerCase().includes(q);
      const matchPlate = d.vehicle?.plate.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchPlate) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Control Financiero & Suscripciones"
        subtitle="Recaudación por membresías mensuales de choferes y conciliación de pagos"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-700 active:scale-95 transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Exportar Excel (CSV)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPaymentModal(true);
                if (drivers.length > 0 && !selectedDriverId) {
                  setSelectedDriverId(drivers[0].id);
                }
              }}
              className="flex items-center gap-1.5 rounded-xl border border-amber-500 bg-amber-500 px-3 py-2 text-xs font-black text-zinc-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400 active:scale-95 transition"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Registrar Pago</span>
            </button>
          </div>
        }
      />

      <ActionMessage message={message} />

      {/* Tarjetas de estadísticas financieras */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={Wallet}
          label="Recaudación Este Mes"
          value={usd(monthRevenue)}
          hint={`${payments.filter((p) => p.status === 'verified' && p.createdAt.startsWith(currentMonthPrefix)).length} pagos confirmados`}
          tone="emerald"
        />
        <StatCard
          icon={CreditCard}
          label="Ingresos Históricos"
          value={usd(totalRevenue)}
          hint={`${verifiedPayments.length} pagos totales procesados`}
          tone="sky"
        />
        <StatCard
          icon={CheckCircle2}
          label="Choferes con Membresía"
          value={`${activeDriversCount} / ${drivers.length}`}
          hint={`${drivers.length - activeDriversCount} choferes sin pago o vencidos`}
          tone="amber"
        />
      </div>

      {/* Tabs internas: Historial de Pagos vs Estado de Membresías */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('historial')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === 'historial'
                ? 'bg-amber-500 text-zinc-950'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Historial de Pagos ({payments.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('choferes')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === 'choferes'
                ? 'bg-amber-500 text-zinc-950'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Vencimiento de Choferes ({drivers.length})
          </button>
        </div>

        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Buscar chofer, comprobante..."
        />
      </div>

      {activeTab === 'historial' ? (
        filteredPayments.length === 0 ? (
          <EmptyState text="No hay registros de pagos en el historial." />
        ) : (
          <Table head={['Fecha', 'Chofer', 'Monto / Meses', 'Método / Comprobante', 'Cubre Hasta', 'Estado', 'Acciones']}>
            {filteredPayments.map((p) => {
              const isVoid = p.status === 'void';
              const isBusy = busyId === p.id;

              return (
                <tr key={p.id} className="hover:bg-white/[0.02]">
                  <td className="px-3 py-3 text-zinc-400 text-xs">
                    {fmtDateTime(p.createdAt)}
                  </td>
                  <td className="px-3 py-3 font-bold text-white">
                    {p.driverName}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`font-mono text-sm font-bold ${isVoid ? 'line-through text-zinc-500' : 'text-emerald-400'}`}>
                      {usd(p.amount)}
                    </span>
                    <span className="text-[11px] text-zinc-400 ml-1">({p.months} mes/es)</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-zinc-200 text-xs font-medium">
                      {PAYMENT_METHOD_LABELS[p.method] || p.method}
                    </div>
                    <div className="text-[11px] font-mono text-amber-400">
                      Ref: {p.reference}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-zinc-300 text-xs">
                    {fmtDate(p.coversUntil)}
                  </td>
                  <td className="px-3 py-3">
                    {isVoid ? (
                      <div>
                        <Badge tone="red">Anulado</Badge>
                        {p.notes && <p className="text-[10px] text-zinc-500 mt-0.5 max-w-[120px] truncate">{p.notes}</p>}
                      </div>
                    ) : (
                      <Badge tone="green">Verificado</Badge>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {!isVoid && (
                      <ActionButton
                        tone="red"
                        onClick={() => {
                          setVoidingPayment(p);
                          setVoidReason('');
                        }}
                        disabled={isBusy}
                      >
                        <Ban className="h-3 w-3" />
                        <span>Anular</span>
                      </ActionButton>
                    )}
                  </td>
                </tr>
              );
            })}
          </Table>
        )
      ) : (
        /* Tabla de Vencimientos de Choferes */
        <Table head={['Chofer', 'Teléfono / Auto', 'Vencimiento', 'Estado de Membresía', 'Acciones']}>
          {filteredDrivers.map((d) => {
            const state = subscriptionState(d);

            return (
              <tr key={d.id} className="hover:bg-white/[0.02]">
                <td className="px-3 py-3">
                  <div className="font-bold text-white">{d.name}</div>
                  <div className="text-[11px] text-zinc-400 font-mono">CI: {d.dni}</div>
                </td>
                <td className="px-3 py-3 text-xs text-zinc-300">
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3 text-amber-400" />
                    <span>{d.phone}</span>
                  </div>
                  {d.vehicle && (
                    <div className="text-[11px] text-zinc-500">
                      {d.vehicle.model} ({d.vehicle.plate})
                    </div>
                  )}
                </td>
                <td className="px-3 py-3 text-xs">
                  {d.subscriptionExpiresAt ? (
                    <span className="text-zinc-200">{fmtDate(d.subscriptionExpiresAt)}</span>
                  ) : (
                    <span className="text-zinc-500 italic">Sin vencimiento fijado</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  {state === 'active' && <Badge tone="green">Al Día</Badge>}
                  {state === 'expiring' && <Badge tone="amber">Vence Pronto</Badge>}
                  {state === 'expired' && <Badge tone="red">Vencido</Badge>}
                  {state === 'none' && <Badge tone="zinc">Sin Pago</Badge>}
                </td>
                <td className="px-3 py-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDriverId(d.id);
                      setShowPaymentModal(true);
                    }}
                    className="flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-400 hover:bg-amber-500/20"
                  >
                    <PlusCircle className="h-3 w-3" />
                    <span>Cobrar / Renovar</span>
                  </button>
                </td>
              </tr>
            );
          })}
        </Table>
      )}

      {/* Modal Registrar Pago */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Wallet className="h-5 w-5" />
                <h3 className="font-bold text-white text-sm">Registrar Pago de Chofer</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="rounded-lg p-1 text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 font-bold mb-1">Chofer</label>
                <select
                  required
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-amber-500"
                >
                  <option value="" disabled>Selecciona un chofer...</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-400 font-bold mb-1">Monto en USD</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-bold mb-1">Meses que Cubre</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    required
                    value={months}
                    onChange={(e) => setMonths(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-400 font-bold mb-1">Método de Pago</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-amber-500"
                  >
                    <option value="pago_movil">Pago Móvil</option>
                    <option value="zelle">Zelle</option>
                    <option value="transferencia">Transferencia Bancaria</option>
                    <option value="binance">Binance USDT</option>
                    <option value="efectivo">Efectivo ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-400 font-bold mb-1">Nº Comprobante / Ref</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 1284903"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-bold mb-1">Notas / Observaciones (opcional)</label>
                <input
                  type="text"
                  placeholder="Ej. Banco Banesco pagado por familiar..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busyId === 'new-payment'}
                  className="rounded-xl border border-amber-500 bg-amber-500 px-4 py-2 text-xs font-black text-zinc-950 hover:bg-amber-400"
                >
                  {busyId === 'new-payment' ? 'Registrando...' : 'Confirmar Pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Anular Pago */}
      {voidingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-red-500/40 bg-zinc-950 p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-400">
              <Ban className="h-5 w-5" />
              <h3 className="font-bold text-white text-sm">Anular Pago</h3>
            </div>
            <p className="text-xs text-zinc-300">
              ¿Seguro que deseas anular el pago de{' '}
              <strong className="text-white">{usd(voidingPayment.amount)}</strong> de{' '}
              <strong className="text-white">{voidingPayment.driverName}</strong> (Ref: {voidingPayment.reference})?
            </p>
            <input
              type="text"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Motivo de anulación (ej. comprobante falso o error de tipeo)..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-xs text-white outline-none focus:border-red-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setVoidingPayment(null)}
                className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleVoidConfirm}
                disabled={busyId === voidingPayment.id}
                className="rounded-xl border border-red-500/50 bg-red-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-red-500"
              >
                Confirmar Anulación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
