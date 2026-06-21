'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Lock } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    try {
      console.log('🔍 API URL:', apiUrl);
      console.log('🔍 Credentials:', { username, password });

      // Build full URL
      const fullUrl = `${apiUrl}/api/admin/login`;
      console.log('🔍 Full URL:', fullUrl);

      const response = await axios.post(
        fullUrl,
        { username, password },
        { 
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      console.log('✅ Login response:', response.data);

      const { access_token } = response.data;

      if (!access_token) {
        throw new Error('No access_token in response');
      }

      localStorage.setItem('adminToken', access_token);
      console.log('✅ Token saved to localStorage');

      router.push('/admin');
    } catch (err: any) {
      console.error('❌ Login error:', err);

      let errorMsg = 'Đăng nhập thất bại';

      if (err.code === 'ECONNABORTED') {
        errorMsg = 'Timeout - Backend không phản hồi';
      } else if (err.code === 'ENOTFOUND') {
        errorMsg = 'Không thể kết nối - kiểm tra API URL';
      } else if (err.response?.status === 400) {
        errorMsg = err.response?.data?.message || 'Dữ liệu không hợp lệ';
      } else if (err.response?.status === 401) {
        errorMsg = 'Username hoặc password không đúng';
      } else if (err.response?.status >= 500) {
        errorMsg = 'Lỗi server - ' + (err.response?.data?.message || 'Vui lòng thử lại');
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err.message) {
        errorMsg = err.message;
      }

      setError(errorMsg);

      console.error('Error details:', {
        code: err.code,
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
        url: `${apiUrl}/api/admin/login`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
            <p className="text-gray-600 text-sm mt-2">Đăng nhập để quản lý hệ thống</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tên đăng nhập
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mật khẩu
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="admin@123"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                <p className="font-medium">{error}</p>
              </div>
            )}

            {/* Note */}
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
              <p className="font-medium mb-1">Thông tin đăng nhập mặc định:</p>
              <p>Tên: <code className="bg-blue-100 px-2 py-1 rounded">admin</code></p>
              <p>Mật khẩu: <code className="bg-blue-100 px-2 py-1 rounded">admin@123</code></p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-gray-500 text-xs mt-6">
            © 2024 Blockchain Identity. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
