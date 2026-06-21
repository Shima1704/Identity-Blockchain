"use client";

import { useState } from "react";
import PasswordInput from "@/components/shared/PasswordInput";

interface LoginFormProps {
  onRegisterClick: () => void;
}

export default function LoginForm({ onRegisterClick }: LoginFormProps) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!phone.trim()) {
      setError("Vui lòng nhập số điện thoại hoặc email.");
      return;
    }
    if (!password) {
      setError("Vui lòng nhập mật khẩu.");
      return;
    }

    setLoading(true);
    try {
      // TODO: gọi API đăng nhập
      await new Promise((r) => setTimeout(r, 1200));
      // Redirect sau khi đăng nhập thành công
      window.location.href = "/dashboard";
    } catch {
      setError("Số điện thoại hoặc mật khẩu không đúng. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card w-full max-w-sm">
      <form onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col gap-3">
          {/* Phone / Email */}
          <input
            type="text"
            placeholder="Số điện thoại hoặc email"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="username"
            className="input-field"
          />

          {/* Password */}
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {/* Error message */}
          {error && (
            <p className="text-red-500 text-sm text-center bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Login button */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Đang đăng nhập...
              </>
            ) : (
              "Đăng nhập"
            )}
          </button>

          {/* Forgot password */}
          <div className="text-center">
            <a
              href="/forgot-password"
              className="text-primary hover:underline text-sm font-medium"
            >
              Quên mật khẩu?
            </a>
          </div>
        </div>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-gray-400 text-xs font-medium">hoặc</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Register button */}
      <div className="flex justify-center">
        <a
          href="/register"
          className="btn-success px-8 inline-block text-center"
        >
          Tạo tài khoản mới
        </a>
      </div>

      {/* Footer note */}
      <p className="text-center text-gray-500 text-xs mt-5 leading-relaxed">
        <span className="font-semibold text-gray-700">Tạo Trang</span> dành cho
        tổ chức, doanh nghiệp hoặc cơ quan nhà nước.
      </p>
    </div>
  );
}
