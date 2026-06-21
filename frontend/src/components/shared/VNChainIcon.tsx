"use client";

/** Inline hex icon dùng trên nền tối (dark theme) */
export default function VNChainIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <polygon points="24,2 44,13 44,35 24,46 4,35 4,13" fill="white" />
      <circle cx="16" cy="24" r="5" fill="none" stroke="#1A1A1A" strokeWidth="2.5" />
      <circle cx="32" cy="24" r="5" fill="none" stroke="#1A1A1A" strokeWidth="2.5" />
      <line x1="21" y1="24" x2="27" y2="24" stroke="#1A1A1A" strokeWidth="2.5" />
      <circle cx="24" cy="13" r="2.5" fill="#f5a623" />
      <circle cx="24" cy="35" r="2.5" fill="#f5a623" />
    </svg>
  );
}
