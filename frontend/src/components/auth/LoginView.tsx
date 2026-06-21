"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Chrome, Eye, EyeOff, ShieldCheck, Link2, Fingerprint } from "lucide-react";
import VNChainIcon from "@/components/shared/VNChainIcon";
import { authApi, AuthUser } from "@/services/api";
import { useAuthStore } from "@/store/auth.store";
import { getErrorMessage } from "@/utils/error";

function FeatureItem({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[#1A1A1A] px-4 py-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10">
        <Icon size={14} className="text-white/70" />
      </span>
      <span className="text-sm text-white/70">{text}</span>
    </div>
  );
}

export default function LoginView() {
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const setAuth = useAuthStore((s) => s.setAuth);

  const stagger = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.2 } },
  };
  const item = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!phone.trim()) { setError("Vui lòng nhập số điện thoại hoặc email."); return; }
    if (!password)     { setError("Vui lòng nhập mật khẩu."); return; }
    setLoading(true);
    try {
      const resp = await authApi.login({ phoneOrEmail: phone, password });
      
      // Check if admin login
      if (resp.data.isAdmin || (resp.data.user as any)?.isAdmin || resp.data.user?.role === 'admin') {
        // Store admin token
        localStorage.setItem('adminToken', resp.data.access_token);
        // Redirect to admin dashboard
        window.location.href = "/admin";
        return;
      }
      
      // Regular user login - ensure we have proper AuthUser object
      const user = resp.data.user as AuthUser;
      if (user && 'phone' in user && 'email' in user) {
        setAuth(resp.data.access_token, user);
        window.location.href = "/dashboard";
      } else {
        throw new Error('Invalid user data received');
      }
    } catch (err: any) {
      setError(getErrorMessage(err, "Đăng nhập thất bại. Vui lòng thử lại."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen w-full bg-black selection:bg-white/30 p-2 lg:h-screen lg:overflow-hidden lg:p-4">
      {/* Left */}
      <div className="relative hidden w-[52%] flex-col items-center justify-end pb-32 px-12 rounded-3xl overflow-hidden shadow-2xl h-full lg:flex">
        <video className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline>
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260506_081238_406ed0e3-5d83-436e-a512-0bbff7ec5b95.mp4" type="video/mp4" />
        </video>
        <motion.div className="relative z-10 w-full max-w-xs space-y-8" variants={stagger} initial="hidden" animate="visible">
          <motion.div variants={item} className="flex items-center gap-2">
            <VNChainIcon size={22} />
            <span className="text-xl font-semibold tracking-tight text-white">VNChain</span>
          </motion.div>
          <motion.div variants={item} className="space-y-2">
            <h1 className="text-4xl font-medium tracking-tight text-white whitespace-nowrap">Chào mừng trở lại</h1>
            <p className="text-white/60 text-sm leading-relaxed px-4">Đăng nhập để quản lý danh tính số của bạn trên nền tảng Blockchain.</p>
          </motion.div>
          <motion.div variants={item} className="space-y-3">
            <FeatureItem icon={ShieldCheck} text="Bảo mật AES-256 & Zero-Knowledge Proof" />
            <FeatureItem icon={Fingerprint} text="Xác thực CCCD + nhận diện khuôn mặt" />
            <FeatureItem icon={Link2}       text="Dữ liệu bất biến trên Blockchain" />
          </motion.div>
        </motion.div>
      </div>

      {/* Right */}
      <div className="flex flex-1 flex-col items-center justify-center py-12 lg:py-6 px-4 sm:px-12 lg:px-16 xl:px-24 overflow-y-auto">
        <motion.div className="w-full max-w-xl space-y-8 lg:space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
          <div className="flex items-center gap-2 lg:hidden">
            <VNChainIcon size={20} />
            <span className="text-lg font-semibold tracking-tight text-white">VNChain</span>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-3xl font-medium tracking-tight text-white">Đăng nhập</h2>
            <p className="text-white/40 text-sm">Nhập thông tin tài khoản để tiếp tục. (Admin: dùng 'admin' / 'admin@123')</p>
          </div>

          <button type="button" className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-black px-4 py-3 text-sm font-medium text-white hover:bg-white/5">
            <Chrome size={16} /> Đăng nhập với Google
          </button>

          <div className="relative flex items-center">
            <div className="flex-1 border-t border-white/10" />
            <span className="bg-black px-4 text-xs font-medium text-white/40 uppercase tracking-widest">Hoặc</span>
            <div className="flex-1 border-t border-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-white">Số điện thoại hoặc Email</label>
              <input type="text" placeholder="0912 345 678, example@vnchain.vn hoặc admin"
                value={phone} onChange={e => setPhone(e.target.value)} autoComplete="username"
                className="h-11 rounded-xl bg-[#1A1A1A] px-4 text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-white/20 transition-all" />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-white">Mật khẩu</label>
                <a href="/forgot-password" className="text-xs text-white/40 hover:text-white/70">Quên mật khẩu?</a>
              </div>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password"
                  className="h-11 w-full rounded-xl bg-[#1A1A1A] px-4 pr-11 text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-white/20 transition-all" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 text-center">{error}</p>
            )}

            <button type="submit" disabled={loading}
              className="mt-4 h-14 w-full rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? (
                <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                  Đang đăng nhập...</>
              ) : "Đăng nhập"}
            </button>
          </form>

          <p className="text-center text-sm text-white/40">
            Chưa có tài khoản?{" "}
            <a href="/register" className="text-white font-medium hover:underline">Tạo tài khoản mới</a>
          </p>
        </motion.div>
      </div>
    </main>
  );
}
