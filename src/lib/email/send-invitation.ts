"use server";

import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM_EMAIL ?? "Apotek Manage <noreply@apotek-manage.id>";

interface SendInvitationParams {
  to: string;
  token: string;
  tenantName: string;
  roleLabel: string;
  branchName?: string | null;
}

export async function sendInvitationEmail({
  to,
  token,
  tenantName,
  roleLabel,
  branchName,
}: SendInvitationParams): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping email send");
    return false;
  }

  const resend = new Resend(RESEND_API_KEY);
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/invite/accept?token=${token}`;

  const branchInfo = branchName ? `Cabang: ${branchName}` : "Semua Cabang";

  try {
    await resend.emails.send({
      from: RESEND_FROM,
      to,
      subject: `Undangan bergabung ke ${tenantName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1e293b;">Anda diundang ke ${tenantName}</h2>
          <p style="color: #475569;">Anda telah diundang sebagai <strong>${roleLabel}</strong> di ${tenantName}.</p>
          <p style="color: #475569;">${branchInfo}</p>
          <a href="${inviteUrl}"
             style="display: inline-block; margin-top: 16px; padding: 12px 24px;
                    background: #2563eb; color: white; text-decoration: none;
                    border-radius: 8px; font-weight: 600;">
            Terima Undangan
          </a>
          <p style="margin-top: 24px; font-size: 12px; color: #94a3b8;">
            Link berlaku selama 7 hari. Jika Anda tidak mengenal pengirim, abaikan email ini.
          </p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error("[email] Failed to send invitation email:", err);
    return false;
  }
}
