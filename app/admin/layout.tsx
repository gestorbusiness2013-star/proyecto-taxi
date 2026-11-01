import type { Metadata } from 'next';
import { AdminAuthProvider } from '@/lib/adminAuth';

export const metadata: Metadata = {
  title: 'Panel de Administración | Proyecto Taxi',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminAuthProvider>{children}</AdminAuthProvider>;
}

