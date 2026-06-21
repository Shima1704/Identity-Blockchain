import { Metadata } from 'next';
import AdminLoginPage from '@/components/admin/AdminLoginPage';

export const metadata: Metadata = {
  title: 'Admin Login - Blockchain Identity',
  description: 'Admin dashboard login page',
};

export default function LoginPage() {
  return <AdminLoginPage />;
}
