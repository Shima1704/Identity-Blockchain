'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import AdminLayout from './AdminLayout';
import { Search, ChevronRight } from 'lucide-react';

interface User {
  id: string;
  phone: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  isLocked: boolean;
  kycStatus?: string;
  lastLoginAt: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>(searchParams.get('filter') || 'all');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) {
          router.push('/admin/login');
          return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const response = await axios.get(
          `${apiUrl}/api/admin/users`,
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000,
          }
        );

        setUsers(response.data);
      } catch (err: any) {
        console.error('Users error:', err);
        setError(err.response?.data?.message || 'Lỗi khi tải dữ liệu');
        if (err.response?.status === 401) {
          localStorage.removeItem('adminToken');
          router.push('/admin/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [router]);

  const filteredUsers = users.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      user.phone?.includes(searchLower) ||
      user.email?.includes(searchLower) ||
      user.firstName?.toLowerCase().includes(searchLower) ||
      user.lastName?.toLowerCase().includes(searchLower)
    );

    // Filter by KYC status
    if (selectedFilter === 'all') return matchesSearch;
    if (selectedFilter === 'verified') return matchesSearch && user.kycStatus === 'verified';
    if (selectedFilter === 'pending') return matchesSearch && (user.kycStatus === 'pending' || !user.kycStatus);
    if (selectedFilter === 'processing') return matchesSearch && user.kycStatus === 'processing';
    if (selectedFilter === 'rejected') return matchesSearch && user.kycStatus === 'rejected';
    if (selectedFilter === 'active') return matchesSearch && user.isActive;
    
    return matchesSearch;
  });

  const getKycStatusColor = (status?: string) => {
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

  const getFilterDisplayName = (filter: string) => {
    switch (filter) {
      case 'verified': return 'KYC đã xác thực';
      case 'pending': return 'KYC chờ xác nhận';
      case 'processing': return 'KYC đang xử lý';
      case 'rejected': return 'KYC bị từ chối';
      case 'active': return 'Người dùng hoạt động';
      default: return 'Tất cả người dùng';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quản lý người dùng</h1>
          <p className="text-gray-600 mt-2">
            {getFilterDisplayName(selectedFilter)} - {filteredUsers.length} trong {users.length} người dùng
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'verified', label: 'KYC đã xác thực' },
            { key: 'pending', label: 'KYC chờ xác nhận' },
            { key: 'processing', label: 'KYC đang xử lý' },
            { key: 'rejected', label: 'KYC bị từ chối' },
            { key: 'active', label: 'Hoạt động' },
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setSelectedFilter(filter.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                selectedFilter === filter.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, email, số điện thoại..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="bg-white rounded-lg shadow">
            <div className="h-96 animate-pulse bg-gray-200" />
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Không tìm thấy người dùng nào
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
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
                        Trạng thái
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                        Lần đăng nhập cuối
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">
                        Hành động
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 text-sm">
                          <div className="font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{user.email || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{user.phone || '-'}</td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getKycStatusColor(
                              user.kycStatus
                            )}`}
                          >
                            {user.kycStatus || 'pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center space-x-2">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                user.isActive ? 'bg-green-500' : 'bg-gray-300'
                              }`}
                            />
                            <span className="text-gray-600">
                              {user.isActive ? 'Hoạt động' : 'Không hoạt động'}
                            </span>
                            {user.isLocked && (
                              <span className="text-red-600 text-xs">(Bị khóa)</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {user.lastLoginAt
                            ? formatDate(user.lastLoginAt)
                            : 'Chưa từng'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Link
                            href={`/admin/users/${user.id}`}
                            className="inline-flex items-center text-blue-600 hover:text-blue-800 transition"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
