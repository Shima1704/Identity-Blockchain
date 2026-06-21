'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import AdminLayout from './AdminLayout';
import { ArrowLeft, Download } from 'lucide-react';

interface UserDetail {
  id: string;
  phone: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  identity?: {
    id: string;
    did: string;
    kycStatus: string;
    kycScore: string | number; // API returns string
    faceMatchScore: string | number; // API returns string  
    txHash: string;
    blockNumber: number;
    kycVerifiedAt: string;
    createdAt: string;
    profile?: {
      full_name: string;
      dob: string;
      age: number;
      gender: string;
      hometown: string;
      address: string;
      nationality: string;
      cccd_number: string;
      cccd_expiry: string;
      cccd_front_url?: string;
      cccd_back_url?: string;
    };
  };
}

interface Props {
  userId: string;
}

export default function AdminUserDetailPage({ userId }: Props) {
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) {
          router.push('/admin/login');
          return;
        }

        console.log('Fetching user:', userId); // Debug log

        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const response = await axios.get(
          `${apiUrl}/api/admin/users/${userId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000,
          }
        );

        console.log('User data:', response.data); // Debug log
        setUser(response.data);
      } catch (err: any) {
        console.error('User detail error:', err);
        setError(err.response?.data?.message || 'Lỗi khi tải dữ liệu');
        if (err.response?.status === 401) {
          localStorage.removeItem('adminToken');
          router.push('/admin/login');
        }
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUser();
    }
  }, [userId, router]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="h-96 animate-pulse bg-gray-200 rounded-lg" />
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error || 'Không tìm thấy người dùng'}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="flex items-center text-blue-600 hover:text-blue-800 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-gray-600 mt-1">Chi tiết người dùng</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Personal Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Thông tin cơ bản</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-gray-600">ID</label>
              <p className="mt-1 text-gray-900 font-mono text-sm">{user.id}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-600">Email</label>
              <p className="mt-1 text-gray-900">{user.email || '-'}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-600">Điện thoại</label>
              <p className="mt-1 text-gray-900">{user.phone || '-'}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-600">Vai trò</label>
              <p className="mt-1 text-gray-900 capitalize">{user.role}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-600">Trạng thái</label>
              <p className="mt-1">
                <span
                  className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                    user.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {user.isActive ? 'Hoạt động' : 'Không hoạt động'}
                </span>
              </p>
            </div>
            <div>
              <label className="block text-sm text-gray-600">Khóa tài khoản</label>
              <p className="mt-1">
                <span
                  className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                    user.isLocked
                      ? 'bg-red-100 text-red-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {user.isLocked ? 'Bị khóa' : 'Bình thường'}
                </span>
              </p>
            </div>
            <div>
              <label className="block text-sm text-gray-600">Ngày tạo</label>
              <p className="mt-1 text-gray-900 text-sm">{formatDate(user.createdAt)}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-600">Cập nhật lần cuối</label>
              <p className="mt-1 text-gray-900 text-sm">{formatDate(user.updatedAt)}</p>
            </div>
          </div>
        </div>

        {/* Identity Info */}
        {user.identity ? (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Thông tin định danh</h2>
            <div className="space-y-6">
              {/* DID & Blockchain */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-gray-600">DID</label>
                  <p className="mt-1 text-gray-900 font-mono text-sm break-all">{user.identity.did}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Trạng thái KYC</label>
                  <p className="mt-1">
                    <span
                      className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                        user.identity.kycStatus === 'verified'
                          ? 'bg-green-100 text-green-800'
                          : user.identity.kycStatus === 'processing'
                          ? 'bg-blue-100 text-blue-800'
                          : user.identity.kycStatus === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {user.identity.kycStatus}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Điểm KYC</label>
                  <p className="mt-1 text-gray-900">{Math.round(parseFloat(user.identity.kycScore as any))}%</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Điểm khớp khuôn mặt</label>
                  <p className="mt-1 text-gray-900">{Math.round(parseFloat(user.identity.faceMatchScore as any) * 100) / 100}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600">TX Hash</label>
                  <p className="mt-1 text-gray-900 font-mono text-sm break-all">
                    {user.identity.txHash || '-'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Block Number</label>
                  <p className="mt-1 text-gray-900">{user.identity.blockNumber || '-'}</p>
                </div>
              </div>

              {/* Personal Profile */}
              {user.identity.profile && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Hồ sơ cá nhân (mã hóa)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm text-gray-600">Họ tên</label>
                      <p className="mt-1 text-gray-900">{user.identity.profile.full_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600">Ngày sinh</label>
                      <p className="mt-1 text-gray-900">{user.identity.profile.dob}</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600">Tuổi</label>
                      <p className="mt-1 text-gray-900">{user.identity.profile.age} tuổi</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600">Giới tính</label>
                      <p className="mt-1 text-gray-900">{user.identity.profile.gender}</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm text-gray-600">Quê quán</label>
                      <p className="mt-1 text-gray-900">{user.identity.profile.hometown}</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm text-gray-600">Địa chỉ</label>
                      <p className="mt-1 text-gray-900">{user.identity.profile.address}</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600">Quốc tịch</label>
                      <p className="mt-1 text-gray-900">{user.identity.profile.nationality}</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600">Số CCCD</label>
                      <p className="mt-1 text-gray-900 font-mono">{user.identity.profile.cccd_number}</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600">Ngày hết hạn CCCD</label>
                      <p className="mt-1 text-gray-900">{user.identity.profile.cccd_expiry}</p>
                    </div>
                  </div>

                  {/* CCCD Images */}
                  {(user.identity.profile.cccd_front_url || user.identity.profile.cccd_back_url) && (
                    <div className="mt-6">
                      <h4 className="font-semibold text-gray-900 mb-4">Ảnh CCCD</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {user.identity.profile.cccd_front_url && (
                          <div>
                            <label className="block text-sm text-gray-600 mb-2">Mặt trước</label>
                            <a
                              href={`${process.env.NEXT_PUBLIC_API_URL}${user.identity.profile.cccd_front_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-blue-600 hover:text-blue-800 transition"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Tải xuống
                            </a>
                          </div>
                        )}
                        {user.identity.profile.cccd_back_url && (
                          <div>
                            <label className="block text-sm text-gray-600 mb-2">Mặt sau</label>
                            <a
                              href={`${process.env.NEXT_PUBLIC_API_URL}${user.identity.profile.cccd_back_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-blue-600 hover:text-blue-800 transition"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Tải xuống
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
            Người dùng này chưa hoàn thành xác thực KYC
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
