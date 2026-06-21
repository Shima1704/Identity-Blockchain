"use client";

import { useState } from "react";
import PasswordInput from "@/components/shared/PasswordInput";

interface RegisterModalProps {
  onClose: () => void;
}

export default function RegisterModal({ onClose }: RegisterModalProps) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const validate = () => {
    if (!form.firstName.trim() || !form.lastName.trim())
      return "Vui lòng nhập họ và tên.";
    if (!form.phone.trim()) return "Vui lòng nhập số điện thoại.";
    if (!/^(0[3|5|7|8|9])\d{8}$/.test(form.phone))
      return "Số điện thoại không hợp lệ.";
    if (form.password.length < 8)
      return "Mật khẩu phải có ít nhất 8 ký tự.";
    if (form.password !== form.confirmPassword)
      return "Mật khẩu xác nhận không khớp.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    setLoading(true);
    try {
      // TODO: gọi API đăng ký
      await new Promise((r) => setTimeout(r, 1200));
      // Chuyển sang bước KYC (quét CCCD + xác nhận khuôn mặt)
      window.location.href = "/kyc";
    } catch {
      setError("Đăng ký thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Tạo tài khoản mới</h2>
            <p className="text-gray-500 text-sm mt-0.5">Nhanh chóng và dễ dàng.</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            aria-label="Đóng"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5" noValidate>
          <div className="flex flex-col gap-3">
            {/* Name row */}
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Họ"
                value={form.lastName}
                onChange={update("lastName")}
                className="input-field"
              />
              <input
                type="text"
                placeholder="Tên"
                value={form.firstName}
                onChange={update("firstName")}
                className="input-field"
              />
            </div>

            {/* Phone */}
            <input
              type="tel"
              placeholder="Số điện thoại"
              value={form.phone}
              onChange={update("phone")}
              autoComplete="tel"
              className="input-field"
            />

            {/* Password */}
            <PasswordInput
              placeholder="Mật khẩu mới"
              value={form.password}
              onChange={update("password")}
              autoComplete="new-password"
            />

            {/* Confirm password */}
            <PasswordInput
              placeholder="Xác nhận mật khẩu"
              value={form.confirmPassword}
              onChange={update("confirmPassword")}
              autoComplete="new-password"
            />

            {/* KYC notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex gap-3">
              <svg className="shrink-0 mt-0.5" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a6ef5" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-blue-700 text-xs leading-relaxed">
                Sau khi đăng ký, bạn sẽ cần <strong>quét CCCD</strong> và{" "}
                <strong>xác nhận khuôn mặt</strong> để hoàn tất định danh số.
              </p>
            </div>

            {/* Error */}
            {error && (
              <p className="text-red-500 text-sm text-center bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Terms */}
            <p className="text-gray-500 text-xs text-center leading-relaxed">
              Bằng cách nhấp vào Đăng ký, bạn đồng ý với{" "}
              <a href="/terms" className="text-primary hover:underline">Điều khoản</a>,{" "}
              <a href="/privacy" className="text-primary hover:underline">Chính sách quyền riêng tư</a> của VNChain.
            </p>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-success w-full flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Đang xử lý...
                </>
              ) : (
                "Đăng ký"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
