-- =================================================================
-- 052_transaction_corrections.sql
-- Generic Transaction Correction Framework
-- Supports: purchase_invoice, sales_invoice, stock_adjustment,
--           medical_billing, clinical (future)
-- EEOS V5 — Architecture Board Approved
-- =================================================================

-- ─── ENUM Types ───

DO $$ BEGIN
  CREATE TYPE transaction_module AS ENUM (
    'purchase_invoice',
    'sales_invoice',
    'stock_adjustment',
    'medical_billing',
    'clinical'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE correction_type AS ENUM (
    'revision',
    'void',
    'adjustment'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE correction_status AS ENUM (
    'draft',
    'pending_otp',
    'verified',
    'applied',
    'rejected',
    'expired',
    'rolled_back'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE field_data_type AS ENUM (
    'number',
    'date',
    'text',
    'select'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE approval_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'skipped'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE session_status AS ENUM (
    'pending',
    'verified',
    'expired',
    'revoked'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE otp_module AS ENUM (
    'invoice_revision',
    'void_invoice',
    'stock_adjustment',
    'opname_approval',
    'financial_adjustment',
    'delete_product',
    'clinical_approval'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── OTP Sessions (Generic) ───

CREATE TABLE IF NOT EXISTS otp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id UUID NOT NULL,
  module otp_module NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  branch_id UUID,
  destination VARCHAR(255) NOT NULL,
  delivery_channel VARCHAR(20) NOT NULL DEFAULT 'email',
  status session_status NOT NULL DEFAULT 'pending',
  created_by UUID NOT NULL REFERENCES users(id),
  ip_address INET,
  device_info TEXT,
  user_agent TEXT,
  metadata JSONB,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Security OTPs (Generic, Hashed) ───

CREATE TABLE IF NOT EXISTS security_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES otp_sessions(id) ON DELETE CASCADE,
  module otp_module NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID NOT NULL,
  destination VARCHAR(255) NOT NULL,
  delivery_channel VARCHAR(20) NOT NULL DEFAULT 'email',
  hashed_code VARCHAR(255) NOT NULL,
  algorithm VARCHAR(20) NOT NULL DEFAULT 'bcrypt',
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  ip_address INET,
  device_info TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Transaction Corrections (Generic) ───

CREATE TABLE IF NOT EXISTS transaction_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  branch_id UUID,
  module transaction_module NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID NOT NULL,
  correction_type correction_type NOT NULL DEFAULT 'revision',
  correction_number INTEGER NOT NULL,
  status correction_status NOT NULL DEFAULT 'draft',
  reason TEXT NOT NULL CHECK (char_length(reason) >= 20),
  requested_by UUID NOT NULL REFERENCES users(id),
  requested_by_name VARCHAR(255) NOT NULL,
  requested_by_role VARCHAR(50) NOT NULL,
  session_id UUID REFERENCES otp_sessions(id),
  metadata JSONB,
  contract_version INTEGER NOT NULL DEFAULT 1,
  applied_at TIMESTAMPTZ,
  rolled_back_at TIMESTAMPTZ,
  rolled_back_from_correction_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(module, resource_type, resource_id, correction_number)
);

-- Self-referential FK for rollback chain
ALTER TABLE transaction_corrections
  ADD CONSTRAINT fk_rollback_from
  FOREIGN KEY (rolled_back_from_correction_id)
  REFERENCES transaction_corrections(id);

-- ─── Correction Details ───

CREATE TABLE IF NOT EXISTS correction_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id UUID NOT NULL,
  correction_id UUID NOT NULL REFERENCES transaction_corrections(id) ON DELETE CASCADE,
  resource_item_id UUID,
  product_id UUID,
  product_name VARCHAR(255) NOT NULL,
  field_name VARCHAR(50) NOT NULL,
  old_value TEXT NOT NULL,
  new_value TEXT NOT NULL,
  data_type field_data_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Approval Steps (Structured, Future-Proof) ───

CREATE TABLE IF NOT EXISTS approval_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correction_id UUID NOT NULL REFERENCES transaction_corrections(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  approver_role VARCHAR(50) NOT NULL,
  approver_id UUID REFERENCES users(id),
  status approval_status NOT NULL DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  comment TEXT,
  UNIQUE(correction_id, step_order)
);

-- ─── Financial Adjustments (Generic) ───

CREATE TABLE IF NOT EXISTS financial_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  branch_id UUID,
  module transaction_module NOT NULL,
  source_type VARCHAR(50) NOT NULL,
  source_id UUID NOT NULL,
  entity_type VARCHAR(20) NOT NULL,
  entity_id UUID,
  amount DECIMAL(15,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  reason TEXT NOT NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Notifications ───

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  channel VARCHAR(20) NOT NULL DEFAULT 'email',
  recipient_user_id UUID REFERENCES users(id),
  recipient_email VARCHAR(255),
  recipient_role VARCHAR(50),
  subject TEXT,
  body TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── ALTER: purchase_invoices ───

ALTER TABLE purchase_invoices
  ADD COLUMN IF NOT EXISTS revision_number INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Set posted_at for existing invoices (use created_at)
UPDATE purchase_invoices SET posted_at = created_at WHERE posted_at IS NULL;

-- ─── ALTER: purchase_items ───

ALTER TABLE purchase_items
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS replaced_by_item_id UUID,
  ADD COLUMN IF NOT EXISTS created_by_correction_id UUID;

-- ─── ALTER: stock_movements ───

ALTER TABLE stock_movements
  ADD COLUMN IF NOT EXISTS correlation_id UUID;

-- ─── ALTER: activity_logs ───

ALTER TABLE activity_logs
  ADD COLUMN IF NOT EXISTS correlation_id UUID;

-- ─── Indexes ───

-- transaction_corrections
CREATE INDEX IF NOT EXISTS idx_corrections_resource
  ON transaction_corrections(module, resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_corrections_correlation
  ON transaction_corrections(correlation_id);
CREATE INDEX IF NOT EXISTS idx_corrections_status
  ON transaction_corrections(status) WHERE status IN ('pending_otp', 'verified');
CREATE INDEX IF NOT EXISTS idx_corrections_tenant
  ON transaction_corrections(tenant_id, created_at DESC);

-- correction_details
CREATE INDEX IF NOT EXISTS idx_correction_details_correction
  ON correction_details(correction_id);
CREATE INDEX IF NOT EXISTS idx_correction_details_correlation
  ON correction_details(correlation_id);

-- approval_steps
CREATE INDEX IF NOT EXISTS idx_approval_correction
  ON approval_steps(correction_id, step_order);
CREATE INDEX IF NOT EXISTS idx_approval_pending
  ON approval_steps(approver_id, status) WHERE status = 'pending';

-- otp_sessions
CREATE INDEX IF NOT EXISTS idx_otp_sessions_correlation
  ON otp_sessions(correlation_id);
CREATE INDEX IF NOT EXISTS idx_otp_sessions_resource
  ON otp_sessions(module, resource_type, resource_id, status);

-- security_otps
CREATE INDEX IF NOT EXISTS idx_security_otps_session
  ON security_otps(session_id);

-- activity_logs correlation
CREATE INDEX IF NOT EXISTS idx_activity_logs_correlation
  ON activity_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource
  ON activity_logs(resource_type, resource_id, created_at DESC);

-- stock_movements correlation
CREATE INDEX IF NOT EXISTS idx_stock_movements_correlation
  ON stock_movements(correlation_id);

-- financial_adjustments
CREATE INDEX IF NOT EXISTS idx_financial_adjustments_source
  ON financial_adjustments(source_type, source_id);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_correlation
  ON notifications(correlation_id);

-- purchase_items active
CREATE INDEX IF NOT EXISTS idx_purchase_items_active
  ON purchase_items(invoice_id) WHERE is_active = true;

-- ─── RLS: Enable on new tables ───

ALTER TABLE otp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE correction_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ─── RLS: Read policies (tenant-scoped) ───

CREATE POLICY otp_sessions_tenant_read ON otp_sessions
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY security_otps_tenant_read ON security_otps
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM otp_sessions WHERE otp_sessions.id = security_otps.session_id
    AND otp_sessions.tenant_id = current_setting('app.current_tenant_id')::UUID
  ));

CREATE POLICY corrections_tenant_read ON transaction_corrections
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY correction_details_tenant_read ON correction_details
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM transaction_corrections tc WHERE tc.id = correction_details.correction_id
    AND tc.tenant_id = current_setting('app.current_tenant_id')::UUID
  ));

CREATE POLICY approval_steps_tenant_read ON approval_steps
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM transaction_corrections tc WHERE tc.id = approval_steps.correction_id
    AND tc.tenant_id = current_setting('app.current_tenant_id')::UUID
  ));

CREATE POLICY financial_adjustments_tenant_read ON financial_adjustments
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY notifications_tenant_read ON notifications
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- ─── RLS: Audit tables — INSERT only, no UPDATE/DELETE ───

-- transaction_corrections can be inserted and updated (status changes)
CREATE POLICY corrections_tenant_insert ON transaction_corrections
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::UUID);
CREATE POLICY corrections_tenant_update ON transaction_corrections
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- correction_details: INSERT + SELECT only (immutable after creation)
CREATE POLICY correction_details_tenant_insert ON correction_details
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM transaction_corrections tc WHERE tc.id = correction_details.correction_id
    AND tc.tenant_id = current_setting('app.current_tenant_id')::UUID
  ));
-- No UPDATE/DELETE policy for correction_details = immutable

-- approval_steps: INSERT + UPDATE (status changes)
CREATE POLICY approval_steps_tenant_insert ON approval_steps
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM transaction_corrections tc WHERE tc.id = approval_steps.correction_id
    AND tc.tenant_id = current_setting('app.current_tenant_id')::UUID
  ));
CREATE POLICY approval_steps_tenant_update ON approval_steps
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM transaction_corrections tc WHERE tc.id = approval_steps.correction_id
    AND tc.tenant_id = current_setting('app.current_tenant_id')::UUID
  ));

-- notifications: INSERT + SELECT
CREATE POLICY notifications_tenant_insert ON notifications
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- security_otps: INSERT + SELECT (UPDATE for verification)
CREATE POLICY security_otps_tenant_insert ON security_otps
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM otp_sessions WHERE otp_sessions.id = security_otps.session_id
    AND otp_sessions.tenant_id = current_setting('app.current_tenant_id')::UUID
  ));
CREATE POLICY security_otps_tenant_update ON security_otps
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM otp_sessions WHERE otp_sessions.id = security_otps.session_id
    AND otp_sessions.tenant_id = current_setting('app.current_tenant_id')::UUID
  ));

-- otp_sessions: INSERT + UPDATE (status changes)
CREATE POLICY otp_sessions_tenant_insert ON otp_sessions
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::UUID);
CREATE POLICY otp_sessions_tenant_update ON otp_sessions
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- financial_adjustments: INSERT + SELECT (immutable after creation)
CREATE POLICY financial_adjustments_tenant_insert ON financial_adjustments
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::UUID);
