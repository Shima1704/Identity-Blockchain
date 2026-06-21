'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import AdminLayout from './AdminLayout';
import { Users, CheckCircle, Clock, XCircle, Blocks, TrendingUp, ChevronRight } from 'lucide-react';

interface DashboardStats {
  total_users: number;
  active_users: number;
  kyc_verified: number;
  kyc_pending: number;
  kyc_rejected: number;
  blockchain_records: number;
}

interface RecentUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  kycStatus: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) {
          router.push('/admin/login');
          return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        
        // Fetch dashboard stats
        const statsResponse = await axios.get(
          `${apiUrl}/api/admin/dashboard`,
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000,
          }
        );
        setStats(statsResponse.data);

        // Fetch recent users
        const usersResponse = await axios.get(
          `${apiUrl}/api/admin/users`,
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000,
          }
        );
        
        // Get latest 5 users
        const sortedUsers = usersResponse.data
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5);
        setRecentUsers(sortedUsers);

      } catch (err: any) {
        console.error('Dashboard error:', err);
        setError(err.response?.data?.message || 'Lỗi khi tải dữ liệu: ' + err.message);
        if (err.response?.status === 401) {
          localStorage.removeItem('adminToken');
          router.push('/admin/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const getKycStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bảng điều khiển</h1>
          <p className="text-gray-600 mt-2">Tổng quan hệ thống quản lý định danh blockchain</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-32 animate-pulse" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Total Users */}
            <button
              onClick={() => router.push('/admin/users?filter=all')}
              className="bg-white rounded-lg shadow p-6 hover:bg-gray-50 transition-colors text-left w-full"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Tổng người dùng</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_users}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </button>

            {/* Active Users */}
            <button
              onClick={() => router.push('/admin/users?filter=active')}
              className="bg-white rounded-lg shadow p-6 hover:bg-gray-50 transition-colors text-left w-full"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Người dùng hoạt động</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.active_users}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </button>

            {/* KYC Verified */}
            <button
              onClick={() => router.push('/admin/users?filter=verified')}
              className="bg-white rounded-lg shadow p-6 hover:bg-gray-50 transition-colors text-left w-full"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">KYC đã xác thực</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.kyc_verified}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </button>

            {/* KYC Pending */}
            <button
              onClick={() => router.push('/admin/users?filter=pending')}
              className="bg-white rounded-lg shadow p-6 hover:bg-yellow-50 transition-colors text-left w-full"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">KYC chờ xác nhận</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.kyc_pending}</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </button>

            {/* KYC Rejected */}
            <button
              onClick={() => router.push('/admin/users?filter=rejected')}
              className="bg-white rounded-lg shadow p-6 hover:bg-red-50 transition-colors text-left w-full"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">KYC bị từ chối</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.kyc_rejected}</p>
                </div>
                <div className="bg-red-100 p-3 rounded-lg">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </button>

            {/* Blockchain Records */}
            <button
              onClick={() => router.push('/admin/blockchain')}
              className="bg-white rounded-lg shadow p-6 hover:bg-purple-50 transition-colors text-left w-full"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Bản ghi Blockchain</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.blockchain_records}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Blocks className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </button>
          </div>
        ) : null}

        {/* Recent Users */}
        {!loading && recentUsers.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Người dùng mới nhất</h2>
                <a
                  href="/admin/users"
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Xem tất cả →
                </a>
              </div>
            </div>
            <div className="overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Tên
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Điện thoại
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      KYC
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Ngày tạo
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">
                      Xem
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentUsers.map((user) => (
                    <tr 
                      key={user.id} 
                      className="hover:bg-gray-50 transition cursor-pointer"
                      onClick={() => router.push(`/admin/users/${user.id}`)}
                    >
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {user.email || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {user.phone || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getKycStatusColor(
                            user.kycStatus || 'pending'
                          )}`}
                        >
                          {user.kycStatus || 'pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/admin/users/${user.id}`);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Chi tiết →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Hành động nhanh</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <a
              href="/admin/users"
              className="block p-4 border-2 border-blue-200 rounded-lg hover:bg-blue-50 transition"
            >
              <h3 className="font-medium text-blue-900">Quản lý người dùng</h3>
              <p className="text-sm text-blue-600 mt-1">Xem tất cả người dùng</p>
            </a>
            <a
              href="/admin/blockchain"
              className="block p-4 border-2 border-purple-200 rounded-lg hover:bg-purple-50 transition"
            >
              <h3 className="font-medium text-purple-900">Bản ghi Blockchain</h3>
              <p className="text-sm text-purple-600 mt-1">Xem tất cả DID</p>
            </a>
            <button
              onClick={() => {
                localStorage.removeItem('adminToken');
                router.push('/admin/login');
              }}
              className="block p-4 border-2 border-red-200 rounded-lg hover:bg-red-50 transition text-left"
            >
              <h3 className="font-medium text-red-900">Đăng xuất</h3>
              <p className="text-sm text-red-600 mt-1">Kết thúc phiên làm việc</p>
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
