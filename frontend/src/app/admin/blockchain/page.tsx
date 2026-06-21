import { Metadata } from 'next';
import AdminBlockchainPage from '@/components/admin/AdminBlockchainPage';

export const metadata: Metadata = {
  title: 'Blockchain Records - Admin Dashboard',
  description: 'View all blockchain records and DID information',
};

export default function BlockchainPage() {
  return <AdminBlockchainPage />;
}
