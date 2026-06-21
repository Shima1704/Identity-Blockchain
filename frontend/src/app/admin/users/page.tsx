import { Metadata } from 'next';
import { Suspense } from 'react';
import AdminUsersPage from '@/components/admin/AdminUsersPage';

export const metadata: Metadata = {
  title: 'Users Management - Admin Dashboard',
  description: 'Manage all users in the blockchain identity system',
};

export default function UsersPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminUsersPage />
    </Suspense>
  );
}
