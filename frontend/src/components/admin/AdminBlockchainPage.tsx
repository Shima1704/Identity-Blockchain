'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import AdminLayout from './AdminLayout';
import { Search, ExternalLink } from 'lucide-react';

interface BlockchainRecord {
  id: string;
  userId: string;
  userName: string;
  did: string;
  kycStatus: string;
  kycScore: number;
  faceMatchScore: number;
  dataHash: string;
  txHash: string;
  blockNumber: number;
  kycVerifiedAt: string;
  createdAt: string;
}

export default function AdminBlockchainPage() {
  const router = useRouter();
  const [records, setRecords] = useState<BlockchainRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) {
          router.push('/admin/login');
          return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const response = await axios.get(
          `${apiUrl}/api/admin/blockchain`,
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000,
          }
        );

        setRecords(response.data);
      } catch (err: any) {
        console.error('Blockchain error:', err);
        setError(err.response?.data?.message || 'Lỗi khi tải dữ liệu');
        if (err.response?.status === 401) {
          localStorage.removeItem('adminToken');
          router.push('/admin/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [router]);

  const filteredRecords = records.filter((record) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      record.did.includes(searchLower) ||
      record.userName.toLowerCase().includes(searchLower) ||
      record.txHash.includes(searchLower)
    );
  });

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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateHash = (hash: string, length: number = 16) => {
    if (hash.length <= length) return hash;
    return `${hash.slice(0, length)}...`;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bản ghi Blockchain</h1>
          <p className="text-gray-600 mt-2">Tất cả {records.length} DID đã đăng ký lên blockchain</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm theo DID, tên người dùng, TX hash..."
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
            {filteredRecords.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Không tìm thấy bản ghi nào
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                        Người dùng
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                        DID
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                        Trạng thái KYC
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                        Điểm KYC
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                        TX Hash
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                        Block
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                        Ngày xác thực
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => router.push(`/admin/users/${record.userId}`)}
                            className="text-blue-600 hover:text-blue-800 transition font-medium"
                          >
                            {record.userName}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm font-mono">
                          <span title={record.did}>{truncateHash(record.did, 20)}</span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getKycStatusColor(
                              record.kycStatus
                            )}`}
                          >
                            {record.kycStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                          {Math.round(record.kycScore)}%
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {record.txHash && record.txHash !== 'N/A' ? (
                            <div className="flex items-center space-x-2 group">
                              <span
                                className="font-mono text-xs cursor-help"
                                title={record.txHash}
                              >
                                {truncateHash(record.txHash, 16)}
                              </span>
                              <a
                                href={`https://etherscan.io/tx/${record.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="opacity-0 group-hover:opacity-100 transition"
                              >
                                <ExternalLink className="w-4 h-4 text-blue-600" />
                              </a>
                            </div>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {record.blockNumber || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {record.kycVerifiedAt
                            ? formatDate(record.kycVerifiedAt)
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        {!loading && records.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-gray-600 text-sm">Tổng bản ghi</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{records.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-gray-600 text-sm">Đã xác thực</p>
              <p className="text-2xl font-bold text-green-600 mt-2">
                {records.filter((r) => r.kycStatus === 'verified').length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-gray-600 text-sm">Đang xử lý</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">
                {records.filter((r) => r.kycStatus === 'processing').length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-gray-600 text-sm">Bị từ chối</p>
              <p className="text-2xl font-bold text-red-600 mt-2">
                {records.filter((r) => r.kycStatus === 'rejected').length}
              </p>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
