/**
 * Extract human-readable error message from Axios error response.
 * Handles NestJS validation errors (array), string messages, and objects.
 */
export function getErrorMessage(err: any, fallback = "Đã xảy ra lỗi. Vui lòng thử lại."): string {
  // Axios wraps response in err.response.data
  const data = err?.response?.data;
  if (!data) return err?.message || fallback;

  // NestJS sometimes wraps message inside another message object
  const msg = data?.message?.message ?? data?.message ?? data?.error;

  if (!msg) return fallback;
  if (typeof msg === "string") return msg;
  if (Array.isArray(msg)) {
    const first = msg[0];
    if (typeof first === "string") return first;
    if (first?.constraints) return Object.values(first.constraints as Record<string, string>)[0];
    return JSON.stringify(first);
  }
  if (typeof msg === "object") {
    // Nested object — extract message field if exists
    const inner = (msg as any).message;
    if (typeof inner === "string") return inner;
    return JSON.stringify(msg);
  }
  return String(msg);
}
