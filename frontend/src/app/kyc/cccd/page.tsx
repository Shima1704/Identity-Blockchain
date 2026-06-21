"use client";

import { useState, useRef, useCallback } from "react";
import { kycApi, CCCDData as APICCCDData } from "@/services/api";
import { motion, AnimatePresence } from "motion/react";
import Webcam from "react-webcam";
import {
  Upload,
  Camera,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowRight,
  Loader2,
  CreditCard,
  FlipHorizontal,
  ImagePlus,
  X,
  AlertCircle,
} from "lucide-react";

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
type Side = "front" | "back";
type CardStage = "idle" | "camera" | "uploading" | "analyzing" | "done" | "error";

interface CardState {
  stage: CardStage;
  preview: string | null;
  error: string | null;
}

interface ExtractedInfo {
  id: string;
  name: string;
  dob: string;
  gender: string;
  hometown: string;
  address: string;
  expiry: string;
}

/* ─────────────────────────────────────────
   Step badge (shared)
───────────────────────────────────────── */
function StepBadge({ number, label, active, done }: { number: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all ${done ? "bg-emerald-500 text-white" : active ? "bg-white text-black" : "bg-white/10 text-white/40"}`}>
        {done ? <CheckCircle2 size={12} /> : number}
      </span>
      <span className={`text-sm transition-colors ${done ? "text-emerald-400" : active ? "text-white font-medium" : "text-white/30"}`}>{label}</span>
    </div>
  );
}

/* ─────────────────────────────────────────
   Card upload/capture box
───────────────────────────────────────── */
function CCCDCard({
  side,
  state,
  onUpload,
  onCapture,
  onRetake,
}: {
  side: Side;
  state: CardState;
  onUpload: (file: File) => void;
  onCapture: () => void;
  onRetake: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const isFront = side === "front";

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlipHorizontal size={14} className={isFront ? "text-blue-400" : "text-purple-400"} />
          <span className="text-sm font-medium text-white">
            {isFront ? "Mặt trước" : "Mặt sau"} CCCD
          </span>
        </div>
        {state.stage === "done" && (
          <button onClick={onRetake} className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors">
            <RotateCcw size={11} /> Chụp lại
          </button>
        )}
      </div>

      {/* Box */}
      <div
        className={`relative rounded-2xl overflow-hidden transition-all border ${
          state.stage === "done"
            ? "border-emerald-500/30 bg-emerald-500/5"
            : state.stage === "error"
            ? "border-red-500/30 bg-red-500/5"
            : "border-white/10 bg-[#1A1A1A]"
        }`}
        style={{ aspectRatio: "16/10" }}
      >
        <AnimatePresence mode="wait">

          {/* Idle — choose method */}
          {state.stage === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4"
            >
              {/* Card outline illustration */}
              <div className={`w-24 h-14 rounded-lg border-2 flex items-center justify-center ${isFront ? "border-blue-400/30" : "border-purple-400/30"}`}>
                <CreditCard size={20} className={isFront ? "text-blue-400/50" : "text-purple-400/50"} />
              </div>
              <p className="text-xs text-white/30 text-center">
                {isFront ? "Mặt có ảnh & số CCCD" : "Mặt có mã vạch & thông tin"}
              </p>
              <div className="flex gap-2 w-full">
                <button
                  onClick={() => onCapture()}
                  className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl border border-white/10 bg-black text-white/70 text-xs font-medium hover:bg-white/5 transition-all"
                >
                  <Camera size={13} /> Chụp ảnh
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl border border-white/10 bg-black text-white/70 text-xs font-medium hover:bg-white/5 transition-all"
                >
                  <ImagePlus size={13} /> Tải lên
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,application/pdf" className="hidden" onChange={handleFile} />
            </motion.div>
          )}

          {/* Uploading */}
          {(state.stage === "uploading" || state.stage === "analyzing") && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3"
            >
              <Loader2 size={28} className="text-white/40 animate-spin" />
              <p className="text-xs text-white/40">
                {state.stage === "uploading" ? "Đang tải ảnh..." : "Đang nhận dạng OCR..."}
              </p>
            </motion.div>
          )}

          {/* Done — preview */}
          {state.stage === "done" && state.preview && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={state.preview} alt="CCCD" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/20" />
              <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-emerald-500/90 backdrop-blur-sm px-3 py-1.5">
                <CheckCircle2 size={12} className="text-white" />
                <span className="text-xs font-medium text-white">Đã nhận dạng</span>
              </div>
            </motion.div>
          )}

          {/* Error */}
          {state.stage === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4"
            >
              <XCircle size={28} className="text-red-400" />
              <p className="text-xs text-red-400 text-center">{state.error}</p>
              <button
                onClick={onRetake}
                className="flex items-center gap-1.5 h-8 px-4 rounded-xl border border-white/10 bg-black text-white/70 text-xs font-medium hover:bg-white/5 transition-all"
              >
                <RotateCcw size={12} /> Thử lại
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Camera modal
───────────────────────────────────────── */
function CameraModal({
  side,
  onCapture,
  onClose,
}: {
  side: Side;
  onCapture: (img: string) => void;
  onClose: () => void;
}) {
  const webcamRef = useRef<Webcam>(null);
  const [ready, setReady] = useState(false);

  const shoot = useCallback(() => {
    const img = webcamRef.current?.getScreenshot();
    if (img) onCapture(img);
  }, [onCapture]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="w-full max-w-md rounded-3xl bg-[#111] border border-white/10 overflow-hidden"
        initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <p className="text-sm font-medium text-white">
              Chụp {side === "front" ? "mặt trước" : "mặt sau"} CCCD
            </p>
            <p className="text-xs text-white/40 mt-0.5">
              Đặt CCCD vừa khít trong khung, đủ sáng
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
            <X size={14} className="text-white" />
          </button>
        </div>

        {/* Camera */}
        <div className="relative bg-black" style={{ aspectRatio: "4/3" }}>
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={{ facingMode: "environment", width: 1280, height: 960 }}
            onUserMedia={() => setReady(true)}
            className="w-full h-full object-cover"
          />
          {/* Card guide frame */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-2 border-white/60 rounded-xl w-4/5 h-3/5 flex items-center justify-center relative">
              {/* Corner dots */}
              {["tl","tr","bl","br"].map(c => (
                <span key={c} className={`absolute w-4 h-4 border-white ${c==="tl"?"top-0 left-0 border-t-2 border-l-2 rounded-tl":c==="tr"?"top-0 right-0 border-t-2 border-r-2 rounded-tr":c==="bl"?"bottom-0 left-0 border-b-2 border-l-2 rounded-bl":"bottom-0 right-0 border-b-2 border-r-2 rounded-br"}`} />
              ))}
              <span className="text-white/30 text-xs">Căn CCCD vào đây</span>
            </div>
          </div>
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <Loader2 size={28} className="text-white/40 animate-spin" />
            </div>
          )}
        </div>

        {/* Capture btn */}
        <div className="p-5">
          <button
            onClick={shoot}
            disabled={!ready}
            className="w-full h-12 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <Camera size={16} /> Chụp ảnh
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────
   Main page
───────────────────────────────────────── */

export default function CCCDPage() {
  const [front, setFront] = useState<CardState>({ stage: "idle", preview: null, error: null });
  const [back, setBack]   = useState<CardState>({ stage: "idle", preview: null, error: null });
  const [cameraOpen, setCameraOpen] = useState<Side | null>(null);
  const [extracted, setExtracted]   = useState<ExtractedInfo | null>(null);
  const [apiWarning, setApiWarning] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const bothDone = front.stage === "done" && back.stage === "done";

  /* ── Real OCR call for front; back just previews ── */
  const processImage = async (side: Side, dataUrl: string, file?: File) => {
    const set = side === "front" ? setFront : setBack;
    set({ stage: "uploading", preview: dataUrl, error: null });

    if (side === "back") {
      // Back side: just preview, no OCR needed
      await new Promise(r => setTimeout(r, 600));
      set(s => ({ ...s, stage: "done" }));
      return;
    }

    // Front side: call real OCR API
    set(s => ({ ...s, stage: "analyzing" }));
    try {
      if (!file) throw new Error("File not available");
      const resp = await kycApi.scanCCCD(file);
      const d    = resp.data.data;
      setExtracted({
        id:       d.cccd_number,
        name:     d.full_name,
        dob:      d.dob,
        gender:   d.gender,
        hometown: d.hometown,
        address:  d.address,
        expiry:   d.expiry,
      });
      if (resp.data.warning) setApiWarning(resp.data.warning);
      set(s => ({ ...s, stage: "done" }));
    } catch (err: any) {
      const raw = err?.response?.data?.message || err?.response?.data?.error || err?.message || "OCR thất bại";
      const msg = Array.isArray(raw) ? raw[0] : typeof raw === "object" ? JSON.stringify(raw) : String(raw);
      set({ stage: "error", preview: dataUrl, error: msg });
    }
  };

  const handleUpload = (side: Side) => async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      await processImage(side, dataUrl, file);
    };
    reader.readAsDataURL(file);
  };

  const handleCapture = (img: string) => {
    if (!cameraOpen) return;
    // Convert base64 to File
    const byteStr = atob(img.split(",")[1]);
    const arr = new Uint8Array(byteStr.length);
    for (let i = 0; i < byteStr.length; i++) arr[i] = byteStr.charCodeAt(i);
    const file = new File([arr], "capture.jpg", { type: "image/jpeg" });
    setCameraOpen(null);
    processImage(cameraOpen, img, file);
  };

  const handleRetake = (side: Side) => {
    const set = side === "front" ? setFront : setBack;
    set({ stage: "idle", preview: null, error: null });
    if (side === "front") { setExtracted(null); setApiWarning(null); }
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    // Chỉ chuyển sang bước xác nhận mặt, không gọi complete
    // complete() sẽ được gọi sau khi xác nhận khuôn mặt thành công
    window.location.href = "/kyc/face";
  };

  return (
    <main className="flex min-h-screen w-full bg-black selection:bg-white/30 p-2 transition-all duration-500 lg:h-screen lg:p-4">

      {/* ── Left panel ── */}
      <div className="relative hidden w-[52%] flex-col items-center justify-end pb-32 px-12 rounded-3xl overflow-y-auto shadow-2xl h-full lg:flex bg-[#0a0a0a]">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.05) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-60 h-60 rounded-full bg-blue-500/10 blur-3xl" />

        <motion.div className="relative z-10 w-full max-w-xs space-y-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          {/* Brand */}
          <div className="flex items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
              <polygon points="24,2 44,13 44,35 24,46 4,35 4,13" fill="white" />
              <circle cx="16" cy="24" r="5" fill="none" stroke="#1A1A1A" strokeWidth="2.5" />
              <circle cx="32" cy="24" r="5" fill="none" stroke="#1A1A1A" strokeWidth="2.5" />
              <line x1="21" y1="24" x2="27" y2="24" stroke="#1A1A1A" strokeWidth="2.5" />
              <circle cx="24" cy="13" r="2.5" fill="#f5a623" />
              <circle cx="24" cy="35" r="2.5" fill="#f5a623" />
            </svg>
            <span className="text-xl font-semibold tracking-tight text-white">VNChain</span>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <p className="text-xs text-white/30 uppercase tracking-widest mb-4">Tiến trình đăng ký</p>
            <StepBadge number={1} label="Thông tin cơ bản" active={false} done={true} />
            <div className="ml-3 w-px h-4 bg-white/10" />
            <StepBadge number={2} label="Xác thực CCCD" active={true} done={bothDone} />
            <div className="ml-3 w-px h-4 bg-white/10" />
            <StepBadge number={3} label="Xác nhận khuôn mặt" active={false} done={false} />
            <div className="ml-3 w-px h-4 bg-white/10" />
            <StepBadge number={4} label="Hoàn tất định danh số" active={false} done={false} />
          </div>

          {/* Tips */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className="text-yellow-400" />
              <span className="text-sm font-medium text-white">Lưu ý khi chụp</span>
            </div>
            {[
              "Đặt CCCD trên nền tối, phẳng",
              "Đảm bảo đủ sáng, không bị chói",
              "Chụp rõ toàn bộ 4 góc của thẻ",
              "Không che khuất bất kỳ thông tin nào",
            ].map(t => (
              <div key={t} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-white/20 shrink-0" />
                <span className="text-xs text-white/40">{t}</span>
              </div>
            ))}
          </div>

          {/* Format */}
          <div className="space-y-2">
            <p className="text-xs text-white/30 uppercase tracking-widest">Định dạng hỗ trợ</p>
            <div className="flex gap-2">
              {["JPEG", "PNG", "PDF"].map(f => (
                <span key={f} className="rounded-lg bg-white/10 px-3 py-1 text-xs text-white/60 font-mono">{f}</span>
              ))}
              <span className="rounded-lg bg-white/10 px-3 py-1 text-xs text-white/60">tối đa 10MB</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Right: form ── */}
      <div className="flex flex-1 flex-col items-center justify-start py-12 lg:py-8 px-4 sm:px-12 lg:px-16 xl:px-20 overflow-y-auto">
        <motion.div className="w-full max-w-md space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, ease: "easeOut" }}>

          {/* Header */}
          <div className="space-y-1">
            <h2 className="text-3xl font-medium tracking-tight text-white">Xác thực CCCD</h2>
            <p className="text-white/40 text-sm">Bước 2 / 4 — Chụp hoặc tải lên ảnh Căn cước công dân</p>
          </div>

          <AnimatePresence mode="wait">

            {/* ── Upload view ── */}
            {!confirming && (
              <motion.div key="upload" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">

                <CCCDCard
                  side="front"
                  state={front}
                  onUpload={handleUpload("front")}
                  onCapture={() => setCameraOpen("front")}
                  onRetake={() => handleRetake("front")}
                />

                <CCCDCard
                  side="back"
                  state={back}
                  onUpload={handleUpload("back")}
                  onCapture={() => setCameraOpen("back")}
                  onRetake={() => handleRetake("back")}
                />

                {/* Status */}
                {bothDone && extracted && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 space-y-2"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 size={15} className="text-emerald-400" />
                      <span className="text-sm font-medium text-emerald-400">Nhận dạng OCR thành công</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {[
                        ["Số CCCD", extracted.id ?? ""],
                        ["Họ tên",  extracted.name ?? ""],
                        ["Ngày sinh", extracted.dob ?? ""],
                        ["Giới tính", extracted.gender ?? ""],
                        ["Quê quán", extracted.hometown ?? ""],
                        ["Hết hạn",  extracted.expiry ?? ""],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <p className="text-xs text-white/30">{k}</p>
                          <p className="text-xs text-white font-medium truncate">{v}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* API warning (mock data notice) */}
                {apiWarning && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 px-4 py-3 flex gap-2"
                  >
                    <span className="text-yellow-400 text-xs leading-relaxed">⚠️ {apiWarning}</span>
                  </motion.div>
                )}

                <button
                  disabled={!bothDone}
                  onClick={() => setConfirming(true)}
                  className="h-14 w-full rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {bothDone ? (<>Xác nhận thông tin <ArrowRight size={16} /></>) : "Chụp đủ 2 mặt CCCD để tiếp tục"}
                </button>

              </motion.div>
            )}

            {/* ── Confirm view ── */}
            {confirming && extracted && (
              <motion.div key="confirm" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                <div className="rounded-2xl bg-[#1A1A1A] border border-white/5 overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/5">
                    <p className="text-sm font-medium text-white">Xác nhận thông tin CCCD</p>
                    <p className="text-xs text-white/40 mt-0.5">Kiểm tra lại trước khi chuyển sang bước tiếp theo</p>
                  </div>
                  <div className="divide-y divide-white/5">
                    {[
                      ["Số CCCD",      extracted.id       ?? ""],
                      ["Họ và tên",    extracted.name     ?? ""],
                      ["Ngày sinh",    extracted.dob      ?? ""],
                      ["Giới tính",    extracted.gender   ?? ""],
                      ["Quê quán",     extracted.hometown ?? ""],
                      ["Địa chỉ",      extracted.address  ?? ""],
                      ["Ngày hết hạn", extracted.expiry   ?? ""],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between px-5 py-3">
                        <span className="text-xs text-white/40">{k}</span>
                        <span className="text-sm text-white font-medium text-right max-w-[60%] truncate">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-center text-xs text-white/30 leading-relaxed">
                  Thông tin sẽ được mã hóa và lưu trữ an toàn trên Blockchain.
                  Ảnh CCCD sẽ bị xóa ngay sau khi xác minh.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setConfirming(false)}
                    className="h-12 rounded-xl border border-white/10 bg-black text-white/70 text-sm font-medium hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                  >
                    <RotateCcw size={13} /> Chụp lại
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={submitting}
                    className="h-12 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {submitting
                      ? <><Loader2 size={14} className="animate-spin" /> Đang xử lý...</>
                      : <><ArrowRight size={14} /> Tiếp tục</>}
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>
      </div>

      {/* ── Camera modal ── */}
      <AnimatePresence>
        {cameraOpen && (
          <CameraModal
            side={cameraOpen}
            onCapture={handleCapture}
            onClose={() => setCameraOpen(null)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
