"use client";

import { CheckCircle2 } from "lucide-react";

export default function KycStepBadge({
  number, label, active, done,
}: {
  number: number; label: string; active: boolean; done: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all ${done ? "bg-emerald-500 text-white" : active ? "bg-white text-black" : "bg-white/10 text-white/40"}`}>
        {done ? <CheckCircle2 size={12} /> : number}
      </span>
      <span className={`text-sm transition-colors ${done ? "text-emerald-400" : active ? "text-white font-medium" : "text-white/30"}`}>
        {label}
      </span>
    </div>
  );
}
