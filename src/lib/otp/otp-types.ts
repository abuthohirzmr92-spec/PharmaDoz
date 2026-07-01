// =================================================================
// Generic OTP Types — reusable across all MEDISYNC modules
// EEOS V5 — Security Architect Approved
// =================================================================

export type OtpModule =
  | "invoice_revision"
  | "void_invoice"
  | "stock_adjustment"
  | "opname_approval"
  | "financial_adjustment"
  | "delete_product"
  | "clinical_approval";

export type SessionStatus = "pending" | "verified" | "expired" | "revoked";

export type DeliveryChannel = "email" | "sms" | "whatsapp";

export interface OtpSession {
  id: string;
  correlationId: string;
  module: OtpModule;
  resourceType: string;
  resourceId: string;
  tenantId: string;
  branchId?: string | null;
  destination: string;
  deliveryChannel: DeliveryChannel;
  status: SessionStatus;
  createdBy: string;
  ipAddress?: string | null;
  deviceInfo?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
  expiresAt: string;
  createdAt: string;
}

export interface SecurityOtp {
  id: string;
  sessionId: string;
  module: OtpModule;
  resourceType: string;
  resourceId: string;
  destination: string;
  deliveryChannel: DeliveryChannel;
  hashedCode: string;
  algorithm: string;
  expiresAt: string;
  verifiedAt?: string | null;
  attempts: number;
  maxAttempts: number;
  ipAddress?: string | null;
  deviceInfo?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface RequestOtpParams {
  module: OtpModule;
  resourceType: string;
  resourceId: string;
  correlationId: string;
  tenantId: string;
  branchId?: string | null;
  destination: string;
  deliveryChannel?: DeliveryChannel;
  createdBy: string;
  ipAddress?: string;
  deviceInfo?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface RequestOtpResult {
  sessionId: string;
  expiresAt: string;
}

export interface VerifyOtpParams {
  sessionId: string;
  code: string;
  ipAddress?: string;
}

export interface VerifyOtpResult {
  valid: boolean;
  reason?: "invalid" | "expired" | "max_attempts" | "already_verified";
}
