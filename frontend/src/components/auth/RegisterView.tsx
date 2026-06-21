"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Chrome, Eye, EyeOff } from "lucide-react";
import VNChainIcon from "@/components/shared/VNChainIcon";
import { authApi } from "@/services/api";
import { getErrorMessage } from "@/utils/error";

function StepItem({ number, text, active = false }: { number: number; text: string; active?: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition-all ${active ? "bg-white text-black border border-white" : "bg-[#1A1A1A] text-white"}`}>
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${active ? "bg-black text-white" : "bg-white/10 text-white/40"}`}>{number}</span>
      <span className={`text-sm font-medium ${active ? "text-black" : "text-white/70"}`}>{text}</span>
    </div>
  );
}

export default function RegisterView() {
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ lastName: "", firstName: "", phone: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const stagger = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.2 } },
  };
  const item = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

  const update = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.lastName || !form.firstName) { setError("Vui lòng nhập họ và tên."); return; }
    if (!form.phone && !form.email) { setError("Vui lòng nhập số điện thoại hoặc email."); return; }
    if (form.password.length < 8) { setError("Mật khẩu phải có ít nhất 8 ký tự."); return; }

    setLoading(true);
    try {
      const resp = await authApi.register({
        lastName:  form.lastName,
        firstName: form.firstName,
        phone:     form.phone || undefined,
        email:     form.email || undefined,
        password:  form.password,
      });
      // Backend returns access_token directly — use it, no need for separate login call
      const token = (resp.data as any).access_token;
      const user  = (resp.data as any).user;
      if (token) {
        localStorage.setItem("access_token", token);
        localStorage.setItem("user", JSON.stringify(user));
      }
      window.location.href = "/kyc/cccd";
    } catch (err: any) {
      setError(getErrorMessage(err, "Đăng ký thất bại. Vui lòng thử lại."));
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
            <h1 className="text-4xl font-medium tracking-tight text-white whitespace-nowrap">Tham gia VNChain</h1>
            <p className="text-white/60 text-sm leading-relaxed px-4">Hoàn thành 3 bước nhanh để kích hoạt danh tính số.</p>
          </motion.div>
          <motion.div variants={item} className="space-y-3">
            <StepItem number={1} text="Đăng ký thông tin cơ bản" active />
            <StepItem number={2} text="Xác thực CCCD & khuôn mặt" />
            <StepItem number={3} text="Hoàn tất định danh số" />
          </motion.div>
        </motion.div>
      </div>

      {/* Right */}
      <div className="flex flex-1 flex-col items-center justify-center py-12 lg:py-6 px-4 sm:px-12 lg:px-16 xl:px-24 overflow-y-auto">
        <motion.div className="w-full max-w-xl space-y-8 lg:space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
          <div className="space-y-1.5">
            <h2 className="text-3xl font-medium tracking-tight text-white">Tạo tài khoản mới</h2>
            <p className="text-white/40 text-sm">Nhập thông tin cơ bản để bắt đầu hành trình định danh số.</p>
          </div>

          <button type="button" className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-black px-4 py-3 text-sm font-medium text-white hover:bg-white/5">
            <Chrome size={16} /> Đăng ký với Google
          </button>

          <div className="relative flex items-center">
            <div className="flex-1 border-t border-white/10" />
            <span className="bg-black px-4 text-xs font-medium text-white/40 uppercase tracking-widest">Hoặc</span>
            <div className="flex-1 border-t border-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[["lastName","Họ","Nguyễn"],["firstName","Tên","Văn A"]].map(([f,l,p]) => (
                <div key={f} className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-white">{l}</label>
                  <input type="text" placeholder={p} value={form[f as keyof typeof form]} onChange={update(f as any)}
                    className="h-11 rounded-xl bg-[#1A1A1A] px-4 text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-white/20 transition-all" />
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-white">Số điện thoại</label>
              <input type="tel" placeholder="0912 345 678" value={form.phone} onChange={update("phone")}
                className="h-11 rounded-xl bg-[#1A1A1A] px-4 text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-white/20 transition-all" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-white">Gmail</label>
              <input type="email" placeholder="yourname@gmail.com" value={form.email} onChange={update("email")}
                className="h-11 rounded-xl bg-[#1A1A1A] px-4 text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-white/20 transition-all" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-white">Mật khẩu</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} placeholder="••••••••"
                  value={form.password} onChange={update("password")}
                  className="h-11 w-full rounded-xl bg-[#1A1A1A] px-4 pr-11 text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-white/20 transition-all" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-xs text-white/30">Yêu cầu ít nhất 8 ký tự.</p>
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
                  Đang xử lý...</>
              ) : "Tạo tài khoản"}
            </button>
          </form>

          <p className="text-center text-sm text-white/40">
            Đã có tài khoản?{" "}
            <a href="/" className="text-white font-medium hover:underline">Đăng nhập</a>
          </p>
        </motion.div>
      </div>
    </main>
  );
}
