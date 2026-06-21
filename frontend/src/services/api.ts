import axios from "axios";

const rawApiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const API_BASE = rawApiBase.replace(/\/+$/, "");

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30_000,
});

/* ── Auto-attach JWT token ─────────────────────────────────────── */
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ── Global error handling ─────────────────────────────────────── */
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        window.location.href = "/";
      }
    }
    return Promise.reject(err);
  }
);

/* ═══════════════════════════════════════════════════════════════
   AUTH
═══════════════════════════════════════════════════════════════ */
export interface RegisterPayload {
  lastName: string;
  firstName: string;
  phone?: string;
  email?: string;
  password: string;
}

export interface LoginPayload {
  phoneOrEmail: string;
  password: string;
}

export interface AuthUser {
  id: string;
  phone: string | null;
  email: string | null;
  role: string;
  isActive: boolean;
  isAdmin?: boolean;
  username?: string;
}

export interface AuthResponse {
  access_token: string;
  user: AuthUser | {
    id: string;
    username?: string;
    role: string;
    isAdmin?: boolean;
  };
  isAdmin?: boolean;
}

export const authApi = {
  register: (data: RegisterPayload) =>
    api.post<{ message: string; user: AuthUser; access_token?: string; already_exists?: boolean }>('/api/auth/register', data),

  login: (data: LoginPayload) =>
    api.post<AuthResponse>('/api/auth/login', data),

  me: () => api.get<AuthUser>('/api/auth/me'),
};

/* ═══════════════════════════════════════════════════════════════
   KYC
═══════════════════════════════════════════════════════════════ */
export interface CCCDData {
  cccd_number: string;
  full_name: string;
  dob: string;
  gender: string;
  hometown: string;
  address: string;
  expiry: string;
  ocr_confidence: number;
}

export interface FaceVerifyResult {
  success: boolean;
  message: string;
  match_score: number;
  liveness_score: number;
  warning?: string;
}

export interface KycCompleteResult {
  success: boolean;
  message: string;
  did: string;
  tx_hash: string | null;
  block_number: number | null;
  kyc_score: number;
}

export const kycApi = {
  scanCCCD: (frontFile: File) => {
    const form = new FormData();
    form.append("file", frontFile);
    return api.post<{ success: boolean; message: string; data: CCCDData; warning?: string }>(
      "/api/kyc/cccd/scan",
      form,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
  },

  verifyFace: (selfieFile: File) => {
    const form = new FormData();
    form.append("selfie", selfieFile);
    return api.post<FaceVerifyResult>(
      "/api/kyc/face/verify",
      form,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
  },

  complete: () =>
    api.post<KycCompleteResult>("/api/kyc/complete"),

  status: () =>
    api.get<{ kyc_status: string; did?: string; kyc_score?: number; tx_hash?: string }>("/api/kyc/status"),

  profile: () =>
    api.get<{
      kyc_status: string; did?: string; kyc_score?: number; face_match?: number;
      tx_hash?: string | null; kyc_verified_at?: string;
      profile: {
        full_name: string; dob: string; age: number | null;
        gender: string; hometown: string; address: string;
        nationality: string; cccd_number: string; cccd_expiry: string;
      } | null;
    }>("/api/kyc/profile"),
};
