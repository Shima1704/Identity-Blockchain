'use client';

import { useEffect, useState } from 'react';
import AdminUserDetailPage from '@/components/admin/AdminUserDetailPage';
import AdminLayout from '@/components/admin/AdminLayout';

export default function UserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setUserId(p.userId));
  }, [params]);

  if (!userId) {
    return (
      <AdminLayout>
        <div className="h-96 animate-pulse bg-gray-200 rounded-lg" />
      </AdminLayout>
    );
  }

  return <AdminUserDetailPage userId={userId} />;
}
