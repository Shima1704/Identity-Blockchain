"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { kycApi } from "@/services/api";
import { motion, AnimatePresence } from "motion/react";
import Webcam from "react-webcam";
import {
  Camera, CheckCircle2, XCircle, RefreshCw,
  ShieldCheck, Eye, Smile, RotateCcw, ArrowRight, Loader2,
} from "lucide-react";

type Stage = "intro" | "positioning" | "liveness" | "capturing" | "analyzing" | "success" | "failed";

interface LivenessAction { icon: React.ElementType; label: string; hint: string; }

const ACTIONS: LivenessAction[] = [
  { icon: Eye,       label: "Chớp mắt",  hint: "Chớp mắt chậm 2 lần"          },
  { icon: Smile,     label: "Mỉm cười",  hint: "Mỉm cười tự nhiên"             },
  { icon: RotateCcw, label: "Xoay đầu",  hint: "Xoay đầu nhẹ trái rồi phải"   },
];

const MAX_RETRIES = 3;

function StepBadge({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${done ? "bg-emerald-500 text-white" : active ? "bg-white text-black" : "bg-white/10 text-white/40"}`}>
        {done ? <CheckCircle2 size={12} /> : n}
      </span>
      <span className={`text-sm ${done ? "text-emerald-400" : active ? "text-white font-medium" : "text-white/30"}`}>{label}</span>
    </div>
  );
}

export default function FaceScanPage() {
  const webcamRef    = useRef<Webcam>(null);
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [stage, setStage]               = useState<Stage>("intro");
  const [retryCount, setRetryCount]     = useState(0);
  const [step, setStep]                 = useState(0);
  const [progress, setProgress]         = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [matchScore, setMatchScore]     = useState<number | null>(null);
  const [livenessScore, setLivenessScore] = useState<number | null>(null);
  const [warning, setWarning]           = useState<string | null>(null);
  const [camError, setCamError]         = useState(false);

  const clearTimer = () => { if (timerRef.current) clearTimeout(timerRef.current); };

  /* ── Capture & call API ─────────────────────────────────────── */
  const retryRef = useRef(retryCount);
  useEffect(() => { retryRef.current = retryCount; }, [retryCount]);

  const captureAndVerify = useCallback(async () => {
    setStage("analyzing");
    try {
      const screenshot = webcamRef.current?.getScreenshot();
      if (!screenshot) throw new Error("Không chụp được ảnh");

      // Webcam mirrored → flip lại trước khi gửi để khớp với ảnh CCCD
      const img = new Image();
      img.src = screenshot;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Không đọc được ảnh"));
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Không tạo được canvas");
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error("Không tạo được ảnh"))), "image/jpeg", 0.92);
      });
      const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });

      const resp = await kycApi.verifyFace(file);
      const d = resp.data;
      setMatchScore(Math.round(d.match_score * 1000) / 10);
      setLivenessScore(Math.round(d.liveness_score * 1000) / 10);
      if (d.warning) setWarning(d.warning);
      if (typeof window !== "undefined") {
        localStorage.setItem("kyc_avatar", screenshot);
      }
      setStage("success");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (msg) setWarning(msg);
      const current = retryRef.current;
      if (current + 1 >= MAX_RETRIES) {
        setStage("failed");
      } else {
        setRetryCount(c => c + 1);
        setFaceDetected(false);
        setStep(0);
        setProgress(0);
        setStage("positioning");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = useCallback(() => {
    clearTimer();
    setFaceDetected(false);
    setStep(0);
    setProgress(0);
    setWarning(null);
    setStage("positioning");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Simulate face detection ── */
  useEffect(() => {
    if (stage !== "positioning") return;
    const t = setTimeout(() => setFaceDetected(true), 2000);
    return () => clearTimeout(t);
  }, [stage]);

  /* ── Auto advance positioning → liveness ── */
  useEffect(() => {
    if (stage !== "positioning" || !faceDetected) return;
    timerRef.current = setTimeout(() => setStage("liveness"), 800);
    return clearTimer;
  }, [stage, faceDetected]);

  /* ── Progress bar per action ── */
  useEffect(() => {
    if (stage !== "liveness") return;
    setProgress(0);
    const iv = setInterval(() => setProgress(p => p >= 100 ? (clearInterval(iv), 100) : p + 2.5), 50);
    return () => clearInterval(iv);
  }, [stage, step]);

  /* ── Advance steps / trigger capture ── */
  useEffect(() => {
    if (progress < 100 || stage !== "liveness") return;
    const t = setTimeout(() => {
      if (step < ACTIONS.length - 1) {
        setStep(s => s + 1);
      } else {
        setStage("capturing");
        // Small delay for flash animation, then capture
        setTimeout(() => {
          captureAndVerify();
        }, 600);
      }
    }, 400);
    return () => clearTimeout(t);
  // captureAndVerify is stable (empty deps via useCallback)
  }, [progress, step, stage, captureAndVerify]);

  const currentAction = ACTIONS[step];

  /* ── Oval overlay ── */
  const FaceOval = ({ pulse = false }: { pulse?: boolean }) => (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className={`relative rounded-full border-4 transition-all duration-500 ${stage === "success" ? "border-emerald-400" : faceDetected || stage === "liveness" ? "border-white" : "border-white/30"} ${pulse ? "animate-pulse" : ""}`} style={{ width: 220, height: 280 }}>
        {["tl","tr","bl","br"].map(c => (
          <span key={c} className={`absolute w-6 h-6 border-white/60 ${c.includes("t") ? "-top-1" : "-bottom-1"} ${c.includes("l") ? "-left-1" : "-right-1"} ${c==="tl"?"border-t-2 border-l-2 rounded-tl":c==="tr"?"border-t-2 border-r-2 rounded-tr":c==="bl"?"border-b-2 border-l-2 rounded-bl":"border-b-2 border-r-2 rounded-br"}`} />
        ))}
      </div>
    </div>
  );

  return (
    <main className="flex min-h-screen w-full bg-black selection:bg-white/30 p-2 lg:h-screen lg:p-4">
      {/* Left panel */}
      <div className="relative hidden w-[52%] flex-col items-center justify-end pb-32 px-12 rounded-3xl overflow-hidden shadow-2xl h-full lg:flex bg-[#0a0a0a]">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.05) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl" />
        <motion.div className="relative z-10 w-full max-w-xs space-y-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="flex items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
              <polygon points="24,2 44,13 44,35 24,46 4,35 4,13" fill="white" />
              <circle cx="16" cy="24" r="5" fill="none" stroke="#1A1A1A" strokeWidth="2.5" />
              <circle cx="32" cy="24" r="5" fill="none" stroke="#1A1A1A" strokeWidth="2.5" />
              <line x1="21" y1="24" x2="27" y2="24" stroke="#1A1A1A" strokeWidth="2.5" />
              <circle cx="24" cy="13" r="2.5" fill="#f5a623" /><circle cx="24" cy="35" r="2.5" fill="#f5a623" />
            </svg>
            <span className="text-xl font-semibold tracking-tight text-white">VNChain</span>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-white/30 uppercase tracking-widest mb-4">Tiến trình đăng ký</p>
            <StepBadge n={1} label="Thông tin cơ bản"    active={false} done={true} />
            <div className="ml-3 w-px h-4 bg-white/10" />
            <StepBadge n={2} label="Xác thực CCCD"       active={false} done={true} />
            <div className="ml-3 w-px h-4 bg-white/10" />
            <StepBadge n={3} label="Xác nhận khuôn mặt"  active={true}  done={stage === "success"} />
            <div className="ml-3 w-px h-4 bg-white/10" />
            <StepBadge n={4} label="Hoàn tất định danh"  active={false} done={false} />
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-3">
            <div className="flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-400" /><span className="text-sm font-medium text-white">Bảo mật tối đa</span></div>
            <p className="text-xs text-white/40 leading-relaxed">Ảnh khuôn mặt sẽ bị xóa ngay sau khi xác minh. Chỉ kết quả được lưu dạng mã hóa.</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-white/30 uppercase tracking-widest">Yêu cầu</p>
            {["Ánh sáng đầy đủ, không ngược sáng","Khuôn mặt rõ ràng, không đeo kính đen","Giữ thiết bị thẳng ngang tầm mắt"].map(r => (
              <div key={r} className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/30 shrink-0" /><span className="text-xs text-white/50">{r}</span></div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col items-center justify-start py-12 lg:py-8 px-4 sm:px-12 lg:px-16 xl:px-20 overflow-y-auto">
        <motion.div className="w-full max-w-md space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
          <div className="space-y-1">
            <h2 className="text-3xl font-medium tracking-tight text-white">Xác nhận khuôn mặt</h2>
            <p className="text-white/40 text-sm">Bước 3 / 4 — Liveness Detection & Face Matching</p>
          </div>

          <AnimatePresence mode="wait">

            {/* INTRO */}
            {stage === "intro" && (
              <motion.div key="intro" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">
                <div className="flex items-center justify-center h-48 rounded-2xl bg-[#1A1A1A] border border-white/5">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center"><Camera size={28} className="text-white/70" /></div>
                    <p className="text-white/50 text-sm">Camera sẵn sàng</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {ACTIONS.map((a, i) => (
                    <div key={i} className="flex flex-col items-center gap-2 rounded-xl bg-[#1A1A1A] p-4 border border-white/5">
                      <a.icon size={20} className="text-white/60" />
                      <span className="text-xs text-white/50 text-center">{a.label}</span>
                    </div>
                  ))}
                </div>
                <button onClick={handleStart} className="h-14 w-full rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition-all flex items-center justify-center gap-2">
                  <Camera size={18} /> Bắt đầu quét khuôn mặt
                </button>
              </motion.div>
            )}

            {/* CAMERA: positioning / liveness / capturing */}
            {(stage === "positioning" || stage === "liveness" || stage === "capturing") && (
              <motion.div key="camera" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden bg-[#111] aspect-[3/4] w-full max-w-sm mx-auto">
                  {camError ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <XCircle size={40} className="text-red-400" />
                      <p className="text-white/50 text-sm text-center px-4">Không truy cập được camera.</p>
                    </div>
                  ) : (
                    <>
                      <Webcam ref={webcamRef} audio={false} mirrored screenshotFormat="image/jpeg"
                        videoConstraints={{ facingMode: "user", width: 480, height: 640 }}
                        onUserMediaError={() => setCamError(true)}
                        className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 70% at 50% 45%, transparent 40%, rgba(0,0,0,0.7) 100%)" }} />
                      <FaceOval pulse={stage === "positioning" && !faceDetected} />
                      {/* Status bar */}
                      <div className="absolute top-4 inset-x-4 flex items-center justify-center">
                        <div className="rounded-full bg-black/60 backdrop-blur-sm px-4 py-2 flex items-center gap-2">
                          {stage === "positioning" && !faceDetected && <><span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" /><span className="text-xs text-white/80">Đưa khuôn mặt vào khung</span></>}
                          {stage === "positioning" && faceDetected  && <><span className="h-2 w-2 rounded-full bg-emerald-400" /><span className="text-xs text-white/80">Khuôn mặt đã nhận diện</span></>}
                          {stage === "liveness"   && <><span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" /><span className="text-xs text-white/80">Đang kiểm tra liveness...</span></>}
                          {stage === "capturing"  && <><span className="h-2 w-2 rounded-full bg-white animate-ping" /><span className="text-xs text-white/80">Đang chụp ảnh...</span></>}
                        </div>
                      </div>
                      {/* Liveness card */}
                      {stage === "liveness" && (
                        <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="absolute bottom-4 inset-x-4">
                          <div className="rounded-xl bg-black/70 backdrop-blur-sm border border-white/10 p-4 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"><currentAction.icon size={18} className="text-white" /></div>
                              <div><p className="text-sm font-medium text-white">{currentAction.label}</p><p className="text-xs text-white/50">{currentAction.hint}</p></div>
                              <span className="ml-auto text-xs text-white/40">{step + 1}/{ACTIONS.length}</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                              <motion.div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                        </motion.div>
                      )}
                      {stage === "capturing" && (
                        <motion.div className="absolute inset-0 bg-white" initial={{ opacity: 0.8 }} animate={{ opacity: 0 }} transition={{ duration: 0.5 }} />
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center justify-center gap-2">
                  {ACTIONS.map((_, i) => (
                    <span key={i} className={`h-1.5 rounded-full transition-all ${stage === "liveness" && i === step ? "w-6 bg-white" : stage === "liveness" && i < step ? "w-1.5 bg-emerald-400" : "w-1.5 bg-white/20"}`} />
                  ))}
                </div>
              </motion.div>
            )}

            {/* ANALYZING */}
            {stage === "analyzing" && (
              <motion.div key="analyzing" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="flex flex-col items-center justify-center gap-5 h-56 rounded-2xl bg-[#1A1A1A] border border-white/5">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full border-2 border-white/10 flex items-center justify-center"><Loader2 size={32} className="text-white/60 animate-spin" /></div>
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center"><ShieldCheck size={10} className="text-white" /></span>
                  </div>
                  <div className="text-center"><p className="text-white font-medium text-sm">Đang phân tích khuôn mặt</p><p className="text-white/40 text-xs">So khớp với ảnh CCCD...</p></div>
                  <div className="space-y-2 w-full px-8">
                    {["Kiểm tra liveness","Trích xuất đặc điểm","So khớp với CCCD"].map((s, i) => (
                      <motion.div key={s} className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.6 }}>
                        <Loader2 size={12} className="text-white/40 animate-spin shrink-0" /><span className="text-xs text-white/40">{s}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* SUCCESS */}
            {stage === "success" && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                <div className="flex flex-col items-center gap-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-8">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.1 }} className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 size={40} className="text-emerald-400" />
                  </motion.div>
                  <div className="text-center"><p className="text-xl font-semibold text-white">Xác nhận thành công!</p><p className="text-white/50 text-sm">Khuôn mặt khớp với ảnh CCCD.</p></div>
                  <div className="flex items-center gap-3 rounded-xl bg-black/30 px-5 py-3">
                    <div className="text-center"><p className="text-2xl font-bold text-emerald-400">{matchScore ?? 0}%</p><p className="text-xs text-white/40">Độ chính xác</p></div>
                    <div className="h-8 w-px bg-white/10" />
                    <div className="text-center"><p className="text-sm font-semibold text-white">Đạt yêu cầu</p><p className="text-xs text-white/40">Ngưỡng tối thiểu 95%</p></div>
                  </div>
                </div>
                <div className="rounded-2xl bg-[#1A1A1A] border border-white/5 divide-y divide-white/5">
                  {[
                    { label: "Liveness Detection", value: `Đạt (${livenessScore ?? 0}%)` },
                    { label: "Face Matching",       value: `${matchScore ?? 0}% khớp`     },
                    { label: "Chống giả mạo",       value: "Không phát hiện"              },
                  ].map(r => (
                    <div key={r.label} className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-white/50">{r.label}</span>
                      <span className="text-sm font-medium text-emerald-400 flex items-center gap-1.5"><CheckCircle2 size={14} />{r.value}</span>
                    </div>
                  ))}
                </div>
                {warning && <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 px-4 py-3"><p className="text-yellow-400 text-xs">⚠️ {warning}</p></div>}
                <button onClick={async () => { try { await kycApi.complete(); } catch {} window.location.href = "/kyc/complete"; }}
                  className="h-14 w-full rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                  Tiếp tục hoàn tất định danh <ArrowRight size={18} />
                </button>
              </motion.div>
            )}

            {/* FAILED */}
            {stage === "failed" && (
              <motion.div key="failed" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                <div className="flex flex-col items-center gap-4 rounded-2xl bg-red-500/10 border border-red-500/20 p-8">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.1 }} className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
                    <XCircle size={40} className="text-red-400" />
                  </motion.div>
                  <div className="text-center"><p className="text-xl font-semibold text-white">Xác nhận thất bại</p><p className="text-white/50 text-sm">Không khớp sau {MAX_RETRIES} lần thử.</p></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => window.location.href = "/register"} className="h-12 rounded-xl border border-white/10 bg-black text-white/70 text-sm font-medium hover:bg-white/5 transition-all">Quay lại đăng ký</button>
                  <button onClick={() => { setRetryCount(0); handleStart(); }} className="h-12 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                    <RefreshCw size={15} /> Thử lại
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

          {(stage === "positioning" || stage === "liveness" || stage === "capturing") && retryCount > 0 && (
            <div className="space-y-2">
              <p className="text-center text-xs text-white/30">Lần thử {retryCount + 1} / {MAX_RETRIES}</p>
              {warning && (
                <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 px-4 py-3">
                  <p className="text-yellow-400 text-xs text-center">{warning}</p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}
