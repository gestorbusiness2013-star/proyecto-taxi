import type { Metadata } from 'next';
import { AdminAuthProvider } from '@/lib/adminAuth';

export const metadata: Metadata = {
  title: 'Panel de Administración | Taxi Libre Venezuela',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminAuthProvider>{children}</AdminAuthProvider>;
}

