"use client";

export default function VNChainLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const px = { sm: 22, md: 32, lg: 44 }[size];
  const textSize = { sm: "text-lg", md: "text-2xl", lg: "text-3xl" }[size];
  return (
    <div className="flex items-center gap-2">
      <svg width={px} height={px} viewBox="0 0 48 48" fill="none">
        <polygon points="24,2 44,13 44,35 24,46 4,35 4,13" fill="#1a6ef5" />
        <circle cx="16" cy="24" r="5" fill="none" stroke="white" strokeWidth="2.5" />
        <circle cx="32" cy="24" r="5" fill="none" stroke="white" strokeWidth="2.5" />
        <line x1="21" y1="24" x2="27" y2="24" stroke="white" strokeWidth="2.5" />
        <circle cx="24" cy="13" r="2.5" fill="#f5a623" />
        <circle cx="24" cy="35" r="2.5" fill="#f5a623" />
      </svg>
      <span className={`font-extrabold tracking-tight text-[#1a6ef5] ${textSize}`}>VNChain</span>
    </div>
  );
}
