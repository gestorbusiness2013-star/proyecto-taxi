'use client';

import { useState } from 'react';
import {
  Star,
  Award,
  MessageCircle,
  EyeOff,
  Eye,
  CheckCircle2,
  Car,
  Gift,
  ShieldCheck,
} from 'lucide-react';
import type { Review, User } from '@/lib/types';
import { rewardDriverFreeMonth, setReviewStatus } from '@/lib/admin';
import { buildWhatsAppLink } from '@/lib/whatsapp';
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
} from '../ui';
import { ActionMessage, useAdminAction } from '../useAdminAction';

export default function ReviewsSection({
  reviews,
  users,
  adminEmail,
}: {
  reviews: Review[];
  users: User[];
  adminEmail: string;
}) {
  const [filterRating, setFilterRating] = useState<'all' | '5' | '4' | 'low'>('all');
  const [query, setQuery] = useState('');
  const { busyId, message, run } = useAdminAction();

  // Choferes ordenados por calificación
  const drivers = users
    .filter((u) => u.role === 'driver')
    .sort((a, b) => (b.ratingAverage || 5) - (a.ratingAverage || 5));

  const averagePlatformRating =
    reviews.length > 0
      ? Math.round((reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length) * 10) / 10
      : 5.0;

  const fiveStarReviewsCount = reviews.filter((r) => r.rating === 5).length;

  const filteredReviews = reviews.filter((r) => {
    if (filterRating === '5' && r.rating !== 5) return false;
    if (filterRating === '4' && r.rating !== 4) return false;
    if (filterRating === 'low' && r.rating > 3) return false;

    if (query.trim()) {
      const q = query.toLowerCase();
      const matchDriver = r.driverName.toLowerCase().includes(q);
      const matchPassenger = r.passengerName.toLowerCase().includes(q);
      const matchComment = r.comment?.toLowerCase().includes(q);
      if (!matchDriver && !matchPassenger && !matchComment) return false;
    }
    return true;
  });

  const handleToggleStatus = async (review: Review) => {
    const nextStatus = review.status === 'hidden' ? 'approved' : 'hidden';
    await run(
      review.id,
      () => setReviewStatus(review.id, nextStatus),
      nextStatus === 'hidden' ? 'Reseña ocultada al público.' : 'Reseña aprobada y visible.'
    );
  };

  const handleRewardDriver = async (driver: User) => {
    if (!confirm(`¿Deseas premiar a ${driver.name} con 1 MES GRATIS de suscripción por su excelente calificación?`)) {
      return;
    }
    await run(
      `reward-${driver.id}`,
      () => rewardDriverFreeMonth(driver.id, adminEmail),
      `¡Premio otorgado! Se ha exonerado 1 mes de membresía a ${driver.name}.`
    );
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Calificaciones & Ranking de Conductores"
        subtitle="Reputación de la flota, opiniones de pasajeros y premios a los mejores choferes"
        actions={
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Buscar por chofer o comentario..."
          />
        }
      />

      <ActionMessage message={message} />

      {/* Métricas destacadas */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={Star}
          label="Promedio de la Flota"
          value={`★ ${averagePlatformRating}`}
          hint={`${reviews.length} opiniones registradas`}
          tone="amber"
        />
        <StatCard
          icon={Award}
          label="Calificaciones 5 Estrellas"
          value={fiveStarReviewsCount}
          hint={`${Math.round((fiveStarReviewsCount / (reviews.length || 1)) * 100)}% de satisfacción`}
          tone="emerald"
        />
        <StatCard
          icon={Car}
          label="Chofer Mejor Valorado"
          value={drivers[0]?.name?.split(' ')[0] || 'N/A'}
          hint={`★ ${drivers[0]?.ratingAverage || '5.0'} (${drivers[0]?.vehicle?.model || 'Flota'})`}
          tone="sky"
        />
      </div>

      {/* Top Conductores (Ranking) */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Award className="h-4 w-4" />
            <span>Top Conductores Destacados del Mes</span>
          </h3>
          <span className="text-[11px] text-zinc-400">Premia el buen servicio en carretera</span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {drivers.slice(0, 3).map((driver, index) => {
            const isBusy = busyId === `reward-${driver.id}`;
            const congratsMsg = `¡Felicidades, ${driver.name}! 🌟
Te escribimos del equipo de Proyecto Taxi para felicitarte por tu excelente calificación de ${driver.ratingAverage || 5.0} estrellas en nuestras rutas.
¡Gracias por brindar un servicio seguro y de calidad a nuestros pasajeros!`;

            return (
              <div
                key={driver.id}
                className="rounded-xl border border-white/10 bg-zinc-950/80 p-3.5 space-y-2 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 font-black text-xs border border-amber-500/40">
                    #{index + 1}
                  </span>
                  <div className="flex items-center gap-1 text-amber-400 font-bold text-xs">
                    <Star className="h-3.5 w-3.5 fill-amber-400" />
                    <span>{driver.ratingAverage || 5.0}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-white text-xs">{driver.name}</h4>
                  <p className="text-[11px] text-zinc-400 font-mono">
                    {driver.vehicle ? `${driver.vehicle.model} (${driver.vehicle.plate})` : driver.phone}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 pt-1 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => handleRewardDriver(driver)}
                    disabled={isBusy}
                    className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-emerald-500/50 bg-emerald-500/15 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/25 transition disabled:opacity-50"
                  >
                    <Gift className="h-3 w-3" />
                    <span>Premiar 1 Mes</span>
                  </button>
                  <a
                    href={buildWhatsAppLink(driver.phone, congratsMsg)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 p-1 text-emerald-400 hover:bg-zinc-700"
                    title="Felicitar por WhatsApp"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Muro de Reseñas */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-white">Comentarios y Calificaciones Recientes</h3>
          <FilterChips
            value={filterRating}
            onChange={setFilterRating}
            options={[
              { value: 'all', label: 'Todas las reseñas', count: reviews.length },
              { value: '5', label: '5 Estrellas (Excelentes)', count: fiveStarReviewsCount },
              { value: '4', label: '4 Estrellas', count: reviews.filter((r) => r.rating === 4).length },
              { value: 'low', label: '3 o menos (A revisar)', count: reviews.filter((r) => r.rating <= 3).length },
            ]}
          />
        </div>

        {filteredReviews.length === 0 ? (
          <EmptyState text="Aún no hay reseñas registradas con este filtro." />
        ) : (
          <Table head={['Pasajero / Fecha', 'Chofer Evaluado', 'Puntuación', 'Comentario & Aspectos', 'Estado', 'Acciones']}>
            {filteredReviews.map((r) => {
              const isHidden = r.status === 'hidden';
              const isBusy = busyId === r.id;

              return (
                <tr key={r.id} className="hover:bg-white/[0.02]">
                  <td className="px-3 py-3">
                    <div className="font-bold text-white">{r.passengerName}</div>
                    <div className="text-[11px] text-zinc-400">{fmtDate(r.createdAt)}</div>
                  </td>
                  <td className="px-3 py-3 font-medium text-zinc-200">
                    {r.driverName}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-0.5 text-amber-400 font-bold">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-700'}`}
                        />
                      ))}
                      <span className="ml-1 text-xs">{r.rating}.0</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-xs text-zinc-200">{r.comment || 'Sin comentario de texto'}</p>
                    {r.tags && r.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {r.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-medium text-zinc-400 border border-zinc-700"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {isHidden ? <Badge tone="red">Oculta</Badge> : <Badge tone="green">Visible</Badge>}
                  </td>
                  <td className="px-3 py-3">
                    <ActionButton
                      tone={isHidden ? 'green' : 'red'}
                      onClick={() => handleToggleStatus(r)}
                      disabled={isBusy}
                    >
                      {isHidden ? (
                        <>
                          <Eye className="h-3 w-3" />
                          <span>Mostrar</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3 w-3" />
                          <span>Moderar</span>
                        </>
                      )}
                    </ActionButton>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </div>
    </div>
  );
}

