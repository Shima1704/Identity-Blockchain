"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, ShieldCheck, Copy, Check, ArrowRight, Sparkles } from "lucide-react";
import VNChainIcon from "@/components/shared/VNChainIcon";
import { kycApi } from "@/services/api";

function Confetti() {
  const colors = ["#1a6ef5","#f5a623","#10b981","#a855f7","#ef4444","#fff"];
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i, color: colors[i % colors.length],
    x: Math.random() * 100, delay: Math.random() * 0.8,
    duration: 1.5 + Math.random(), size: 6 + Math.random() * 8,
    rotate: Math.random() * 360,
  }));
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-50">
      {particles.map(p => (
        <motion.div key={p.id} className="absolute top-0 rounded-sm"
          style={{ left: `${p.x}%`, width: p.size, height: p.size, backgroundColor: p.color, rotate: p.rotate }}
          initial={{ y: -20, opacity: 1 }}
          animate={{ y: "110vh", opacity: [1, 1, 0], rotate: p.rotate + 360 }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeIn" }} />
      ))}
    </div>
  );
}

export default function KycCompleteView() {
  const [showConfetti, setShowConfetti] = useState(true);
  const [copiedDid, setCopiedDid]       = useState(false);
  const [copiedTx, setCopiedTx]         = useState(false);
  const [revealed, setRevealed]         = useState(false);
  const [kycData, setKycData]           = useState<any>(null);
  const [avatar, setAvatar]             = useState<string | null>(null);

  useEffect(() => {
    const t1 = setTimeout(() => setShowConfetti(false), 3500);
    const t2 = setTimeout(() => setRevealed(true), 400);
    // Load avatar from localStorage
    if (typeof window !== "undefined") {
      setAvatar(localStorage.getItem("kyc_avatar"));
    }
    // Load KYC status from backend
    kycApi.status().then(r => setKycData(r.data)).catch(() => {});
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const did      = kycData?.did      ?? "did:vnchain:0x...";
  const txHash   = kycData?.tx_hash  ?? null;
  const kycScore = kycData?.kyc_score ?? "—";
  const faceMatch = kycData?.face_match ? Math.round(Number(kycData.face_match) * 100) : "—";

  const copy = (text: string, which: "did" | "tx") => {
    navigator.clipboard.writeText(text);
    if (which === "did") { setCopiedDid(true); setTimeout(() => setCopiedDid(false), 2000); }
    else                 { setCopiedTx(true);  setTimeout(() => setCopiedTx(false),  2000); }
  };

  return (
    <>
      {showConfetti && <Confetti />}
      <main className="flex min-h-screen w-full bg-black selection:bg-white/30 p-2 lg:h-screen lg:p-4">

        {/* Left */}
        <div className="relative hidden w-[52%] flex-col items-center justify-end pb-32 px-12 rounded-3xl overflow-hidden shadow-2xl h-full lg:flex bg-[#0a0a0a]">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.05) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl" />
          <motion.div className="relative z-10 w-full max-w-xs space-y-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="flex items-center gap-2"><VNChainIcon size={22} /><span className="text-xl font-semibold tracking-tight text-white">VNChain</span></div>

            {/* Avatar */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                {avatar ? (
                  <img src={avatar} alt="avatar" className="w-24 h-24 rounded-full object-cover border-2 border-emerald-400" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center border-2 border-white/20">
                    <ShieldCheck size={32} className="text-white/40" />
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-black">
                  <CheckCircle2 size={14} className="text-white" />
                </span>
              </div>
              <div className="text-center">
                <p className="text-white font-semibold text-sm">Danh tính đã xác minh</p>
                <p className="text-white/40 text-xs mt-0.5">VNChain ID</p>
              </div>
            </div>

            {/* Steps all done */}
            <div className="space-y-2">
              <p className="text-xs text-white/30 uppercase tracking-widest mb-3">Tiến trình đăng ký</p>
              {["Thông tin cơ bản","Xác thực CCCD","Xác nhận khuôn mặt","Hoàn tất định danh số"].map((label, i) => (
                <div key={label}>
                  <motion.div className="flex items-center gap-2" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.1 }}>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"><CheckCircle2 size={12} /></span>
                    <span className="text-sm text-emerald-400 font-medium">{label}</span>
                  </motion.div>
                  {i < 3 && <div className="ml-3 w-px h-3 bg-emerald-500/20 mt-1" />}
                </div>
              ))}
            </div>

            <p className="text-xs text-white/20 leading-relaxed">Dữ liệu đã được mã hóa và ghi lên Blockchain. Không ai có thể thay đổi hoặc xóa thông tin này.</p>
          </motion.div>
        </div>

        {/* Right */}
        <div className="flex flex-1 flex-col items-center justify-start py-12 lg:py-8 px-4 sm:px-12 lg:px-16 xl:px-20 overflow-y-auto">
          <AnimatePresence>
            {revealed && (
              <motion.div className="w-full max-w-md space-y-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>

                {/* Hero */}
                <motion.div className="flex flex-col items-center gap-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 p-8 text-center"
                  initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 180, delay: 0.1 }}>
                  <div className="relative">
                    <motion.div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center overflow-hidden"
                      initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.2 }}>
                      {avatar
                        ? <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                        : <CheckCircle2 size={48} className="text-emerald-400" />}
                    </motion.div>
                    <span className="absolute inset-0 rounded-full border-2 border-emerald-400/30 animate-ping" />
                  </div>
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="space-y-2">
                    <h1 className="text-2xl font-bold text-white">Định danh số hoàn tất!</h1>
                    <p className="text-white/50 text-sm">Danh tính của bạn đã được xác minh và ghi lên Blockchain thành công.</p>
                  </motion.div>
                  <motion.div className="flex gap-4 w-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}>
                    {[
                      { label: "KYC Score",   value: `${kycScore}%`, color: "text-emerald-400" },
                      { label: "Face Match",  value: `${faceMatch}%`, color: "text-emerald-400" },
                      { label: "Trạng thái",  value: "Active",       color: "text-[#1a6ef5]" },
                    ].map(s => (
                      <div key={s.label} className="flex-1 rounded-xl bg-black/30 py-3 px-2 text-center">
                        <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-white/30 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </motion.div>
                </motion.div>

                {/* DID info */}
                <motion.div className="rounded-2xl bg-[#1A1A1A] border border-white/5 overflow-hidden" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                  <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
                    <ShieldCheck size={14} className="text-[#1a6ef5]" />
                    <p className="text-sm font-medium text-white">Thông tin định danh Blockchain</p>
                  </div>
                  <div className="divide-y divide-white/5">
                    <div className="flex items-center justify-between px-5 py-3 gap-3">
                      <span className="text-xs text-white/40 shrink-0">DID</span>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-white font-mono truncate">{did.slice(0, 34)}...</span>
                        <button onClick={() => copy(did, "did")} className="shrink-0 text-white/20 hover:text-white/50 transition-colors">
                          {copiedDid ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                        </button>
                      </div>
                    </div>
                    {txHash && (
                      <div className="flex items-center justify-between px-5 py-3 gap-3">
                        <span className="text-xs text-white/40 shrink-0">TX Hash</span>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs text-white font-mono truncate">{txHash.slice(0, 34)}...</span>
                          <button onClick={() => copy(txHash, "tx")} className="shrink-0 text-white/20 hover:text-white/50 transition-colors">
                            {copiedTx ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between px-5 py-3">
                      <span className="text-xs text-white/40">Thời gian xác minh</span>
                      <span className="text-xs text-white font-medium">{new Date().toLocaleString("vi-VN")}</span>
                    </div>
                    <div className="flex items-center justify-between px-5 py-3">
                      <span className="text-xs text-white/40">Trạng thái</span>
                      <span className="text-xs text-emerald-400 font-medium flex items-center gap-1"><CheckCircle2 size={11} /> Active</span>
                    </div>
                  </div>
                </motion.div>

                {/* CTA */}
                <motion.button onClick={() => window.location.href = "/dashboard"}
                  className="h-14 w-full rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
                  <Sparkles size={18} /> Đến trang quản lý danh tính
                </motion.button>

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </>
  );
}
