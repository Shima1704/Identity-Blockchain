"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  ShieldCheck, LogOut, Copy, Check, Link2,
  User, Calendar, MapPin, CreditCard, RefreshCw,
  CheckCircle2, Fingerprint, Flag, Home, Camera, X,
} from "lucide-react";
import VNChainIcon from "@/components/shared/VNChainIcon";
import { authApi, kycApi } from "@/services/api";

export default function DashboardPage() {
  const [user,   setUser]   = useState<any>(null);
  const [kycData, setKyc]   = useState<any>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showCCCD, setShowCCCD] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAvatar(localStorage.getItem("kyc_avatar"));
      if (!localStorage.getItem("access_token")) {
        window.location.href = "/"; return;
      }
    }
    Promise.all([authApi.me(), kycApi.profile()])
      .then(([u, k]) => { setUser(u.data); setKyc(k.data); })
      .catch(() => { window.location.href = "/"; })
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    ["access_token","user","kyc_avatar"].forEach(k => localStorage.removeItem(k));
    window.location.href = "/";
  };

  const copyDid = () => {
    if (kycData?.did) {
      navigator.clipboard.writeText(kycData.did);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingAvatar(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      localStorage.setItem("kyc_avatar", base64);
      setAvatar(base64);
      setUploadingAvatar(false);
    };
    reader.readAsDataURL(file);
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <RefreshCw size={24} className="text-white/30 animate-spin" />
    </div>
  );

  const p           = kycData?.profile;
  const kycVerified = kycData?.kyc_status === "verified";
  const fullName    = p?.full_name || (user?.lastName && user?.firstName ? `${user.lastName} ${user.firstName}` : user?.phone) || "—";
  const kycScore    = kycData?.kyc_score ? Number(kycData.kyc_score).toFixed(0) : "—";
  const faceMatch   = kycData?.face_match ? Math.round(Number(kycData.face_match) * 100) : "—";

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/5 px-6 py-4 sticky top-0 bg-black/80 backdrop-blur-sm z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <VNChainIcon size={22} />
            <span className="text-lg font-semibold tracking-tight">VNChain</span>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm transition-colors">
            <LogOut size={15} /> Đăng xuất
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Profile hero ── */}
        <motion.div className="rounded-3xl bg-[#0f0f0f] border border-white/5 overflow-hidden"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="h-28 bg-gradient-to-r from-[#1a6ef5]/40 via-[#6366f1]/20 to-[#10b981]/20" />
          <div className="px-6 pb-6 -mt-14 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex items-end gap-4">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-24 h-24 rounded-2xl border-4 border-black overflow-hidden bg-[#1A1A1A] shadow-xl">
                  {avatar
                    ? <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><User size={32} className="text-white/30" /></div>}
                </div>
                <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#1a6ef5] border-2 border-black flex items-center justify-center cursor-pointer hover:bg-[#1558c0] transition-colors">
                  <Camera size={14} className="text-white" />
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </label>
                {uploadingAvatar && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl">
                    <RefreshCw size={20} className="text-white animate-spin" />
                  </div>
                )}
                {kycVerified && (
                  <span className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-emerald-500 border-2 border-black flex items-center justify-center">
                    <ShieldCheck size={13} className="text-white" />
                  </span>
                )}
              </div>
              {/* Name */}
              <div className="pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-white">{fullName}</h1>
                  {kycVerified && (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-0.5">
                      <CheckCircle2 size={10} /> Đã xác minh
                    </span>
                  )}
                </div>
                <p className="text-white/40 text-sm mt-0.5">
                  {kycVerified ? "Định danh số đã xác thực trên Blockchain" : "Chưa hoàn tất xác minh KYC"}
                </p>
              </div>
            </div>
            {!kycVerified && (
              <a href="/kyc/cccd" className="shrink-0 px-5 py-2.5 rounded-xl bg-[#1a6ef5] text-white text-sm font-medium hover:bg-[#1558c0] transition-colors">
                Xác minh ngay
              </a>
            )}
          </div>
        </motion.div>

        {/* ── Stats row ── */}
        <motion.div className="grid grid-cols-3 gap-4"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          {[
            { label: "KYC Score",   value: `${kycScore}%`,      color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
            { label: "Face Match",  value: `${faceMatch}%`,     color: "text-[#1a6ef5]",   bg: "bg-[#1a6ef5]/10 border-[#1a6ef5]/20" },
            { label: "Trạng thái",  value: kycVerified ? "Verified" : "Pending",
              color: kycVerified ? "text-emerald-400" : "text-yellow-400",
              bg: kycVerified ? "bg-emerald-500/10 border-emerald-500/20" : "bg-yellow-500/10 border-yellow-500/20" },
          ].map(c => (
            <div key={c.label} className={`rounded-2xl border p-4 sm:p-5 flex flex-col gap-1 ${c.bg}`}>
              <p className="text-xs text-white/40">{c.label}</p>
              <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Personal info from CCCD ── */}
          <motion.div className="rounded-2xl bg-[#0f0f0f] border border-white/5 overflow-hidden"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Fingerprint size={15} className="text-[#1a6ef5]" />
                <h2 className="text-sm font-semibold text-white">Thông tin cá nhân (từ CCCD)</h2>
              </div>
              {kycVerified && (
                <button onClick={() => setShowCCCD(true)} className="text-xs text-[#1a6ef5] hover:underline flex items-center gap-1">
                  <CreditCard size={12} /> Xem CCCD
                </button>
              )}
            </div>
            <div className="divide-y divide-white/5">
              {[
                { icon: User,       label: "Họ và tên",          value: p?.full_name    || "—" },
                { icon: CreditCard, label: "Số CCCD",            value: p?.cccd_number  || "—" },
                { icon: Calendar,   label: "Ngày sinh",          value: p?.dob          || "—" },
                { icon: User,       label: "Tuổi",               value: p?.age != null  ? `${p.age} tuổi` : "—" },
                { icon: User,       label: "Giới tính",          value: p?.gender       || "—" },
                { icon: MapPin,     label: "Quê quán",           value: p?.hometown     || "—" },
                { icon: Home,       label: "Địa chỉ thường trú", value: p?.address      || "—" },
                { icon: Flag,       label: "Quốc tịch",          value: p?.nationality  || "—" },
                { icon: Calendar,   label: "Ngày hết hạn CCCD",  value: p?.cccd_expiry  || "—" },
              ].map(row => (
                <div key={row.label} className="flex items-start gap-3 px-5 py-3">
                  <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                    <row.icon size={13} className="text-white/35" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/30">{row.label}</p>
                    <p className="text-sm text-white font-medium truncate">{row.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── Account + Blockchain ── */}
          <div className="space-y-4">

            {/* Account info */}
            <motion.div className="rounded-2xl bg-[#0f0f0f] border border-white/5 overflow-hidden"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
                <User size={15} className="text-[#1a6ef5]" />
                <h2 className="text-sm font-semibold text-white">Tài khoản</h2>
              </div>
              <div className="divide-y divide-white/5">
                {[
                  { label: "Số điện thoại", value: user?.phone   || "—" },
                  { label: "Email",         value: user?.email   || "—" },
                  { label: "Vai trò",       value: user?.role === "admin" ? "Quản trị viên" : "Người dùng" },
                  { label: "Ngày tạo",      value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString("vi-VN") : "—" },
                  { label: "KYC lúc",       value: kycData?.kyc_verified_at ? new Date(kycData.kyc_verified_at).toLocaleString("vi-VN") : "Chưa xác minh" },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between px-5 py-3 gap-4">
                    <span className="text-xs text-white/30 shrink-0">{r.label}</span>
                    <span className="text-sm text-white font-medium truncate text-right">{r.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* DID */}
            {kycVerified && kycData?.did && (
              <motion.div className="rounded-2xl bg-[#0f0f0f] border border-white/5 overflow-hidden"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
                  <Link2 size={15} className="text-[#1a6ef5]" />
                  <h2 className="text-sm font-semibold text-white">Blockchain DID</h2>
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3">
                    <p className="text-xs text-white font-mono truncate flex-1">{kycData.did}</p>
                    <button onClick={copyDid} className="shrink-0 w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-white/50" />}
                    </button>
                  </div>
                  {kycData.tx_hash && (
                    <div className="rounded-xl bg-white/5 px-4 py-3">
                      <p className="text-xs text-white/30 mb-1">TX Hash</p>
                      <p className="text-xs text-white font-mono truncate">{kycData.tx_hash}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { l: "Network",  v: "Local" },
                      { l: "Status",   v: "Active" },
                      { l: "KYC",      v: "4 / 4"  },
                    ].map(s => (
                      <div key={s.l} className="rounded-xl bg-white/5 py-2.5 text-center">
                        <p className="text-xs text-white/30">{s.l}</p>
                        <p className="text-xs text-white font-medium mt-0.5">{s.v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </main>

      {/* CCCD Modal */}
      {showCCCD && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCCCD(false)}>
          <div className="bg-[#0f0f0f] rounded-3xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Căn cước công dân</h2>
              <button onClick={() => setShowCCCD(false)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                <X size={16} className="text-white/60" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-white/60">Mặt trước</p>
                <div className="rounded-xl overflow-hidden border border-white/10">
                  <img src="http://localhost:3000/uploads/cccd/cccd_front.jpg" alt="CCCD mặt trước" className="w-full h-auto" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-white/60">Mặt sau</p>
                <div className="rounded-xl overflow-hidden border border-white/10">
                  <img src="http://localhost:3000/uploads/cccd/cccd_back.jpg" alt="CCCD mặt sau" className="w-full h-auto" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
