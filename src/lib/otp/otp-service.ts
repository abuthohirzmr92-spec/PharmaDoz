// =================================================================
// Generic OTP Service — reusable across all MEDISYNC modules
// EEOS V5 — Security Architect Approved
// =================================================================

import type {
  OtpModule,
  RequestOtpParams,
  RequestOtpResult,
  VerifyOtpParams,
  VerifyOtpResult,
} from "./otp-types";

// ─── Helpers ───

function generateCode(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String((buf[0] ?? 0) % 900000 + 100000).padStart(6, "0");
}

async function hashCode(code: string): Promise<string> {
  // Use Web Crypto API for hashing (available in Edge/Node 18+)
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltStr = btoa(String.fromCharCode(...salt));

  // PBKDF2-based hashing (simulates bcrypt in browser-compatible way)
  const key = await crypto.subtle.importKey(
    "raw",
    data,
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const hash = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(saltStr),
      iterations: 100000,
      hash: "SHA-256",
    },
    key,
    256,
  );
  const hashStr = btoa(String.fromCharCode(...new Uint8Array(hash)));
  return `pbkdf2:${saltStr}:${hashStr}`;
}

async function verifyHash(code: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(":");
  if (parts.length !== 3 || parts[0] !== "pbkdf2") return false;

  const [, saltStr, expectedHash] = parts;
  const encoder = new TextEncoder();
  const data = encoder.encode(code);

  const key = await crypto.subtle.importKey(
    "raw",
    data,
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const hash = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(saltStr),
      iterations: 100000,
      hash: "SHA-256",
    },
    key,
    256,
  );
  const hashStr = btoa(String.fromCharCode(...new Uint8Array(hash)));
  return hashStr === expectedHash;
}

// ─── Service Implementation ───

export const otpService = {
  /**
   * Generate an OTP session and code. Returns session ID.
   * The hashed code is stored; plaintext is returned ONLY for email sending.
   */
  async requestOtp(params: RequestOtpParams): Promise<RequestOtpResult> {
    const code = generateCode();
    const hashed = await hashCode(code);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // In production: INSERT into otp_sessions + security_otps via repository
    // For V1: Return session details for repository layer to persist
    const sessionId = crypto.randomUUID();

    // Store in localStorage/sessionStorage for demo/offline mode
    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        `otp:${sessionId}`,
        JSON.stringify({
          hashedCode: hashed,
          code, // Plaintext ONLY for demo — in production, send via email immediately
          expiresAt,
          attempts: 0,
          maxAttempts: 5,
          verified: false,
        }),
      );
    }

    return { sessionId, expiresAt };
  },

  /**
   * Verify an OTP code against a session.
   */
  async verifyOtp(params: VerifyOtpParams): Promise<VerifyOtpResult> {
    const { sessionId, code } = params;

    // Demo/offline mode: read from sessionStorage
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem(`otp:${sessionId}`);
      if (!stored) {
        return { valid: false, reason: "expired" };
      }

      const data = JSON.parse(stored);

      if (data.verified) {
        return { valid: false, reason: "already_verified" };
      }

      if (new Date(data.expiresAt) < new Date()) {
        return { valid: false, reason: "expired" };
      }

      if (data.attempts >= data.maxAttempts) {
        return { valid: false, reason: "max_attempts" };
      }

      data.attempts++;
      sessionStorage.setItem(`otp:${sessionId}`, JSON.stringify(data));

      const isValid = await verifyHash(code, data.hashedCode);
      if (!isValid) {
        return { valid: false, reason: "invalid" };
      }

      data.verified = true;
      sessionStorage.setItem(`otp:${sessionId}`, JSON.stringify(data));
      return { valid: true };
    }

    return { valid: false, reason: "invalid" };
  },

  /**
   * Check if a session is verified.
   */
  isVerified(sessionId: string): boolean {
    if (typeof window === "undefined") return false;
    const stored = sessionStorage.getItem(`otp:${sessionId}`);
    if (!stored) return false;
    return JSON.parse(stored).verified === true;
  },

  /**
   * Revoke (delete) an OTP session.
   */
  revokeSession(sessionId: string): void {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(`otp:${sessionId}`);
    }
  },

  /**
   * Get the plaintext code for a session (DEMO ONLY — never use in production).
   * In production, the code is sent via email immediately after generation.
   */
  getDemoCode(sessionId: string): string | null {
    if (typeof window === "undefined") return null;
    const stored = sessionStorage.getItem(`otp:${sessionId}`);
    if (!stored) return null;
    return JSON.parse(stored).code ?? null;
  },
};
