import { Metadata } from 'next';
import AdminDashboard from '@/components/admin/AdminDashboard';

export const metadata: Metadata = {
  title: 'Admin Dashboard - Blockchain Identity',
  description: 'Admin dashboard for blockchain identity system',
};

export default function AdminPage() {
  return <AdminDashboard />;
}
