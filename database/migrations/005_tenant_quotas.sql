-- Tenant package & quota architecture
-- Prepares future SaaS subscription tiers.
-- Package enforcement NOT activated yet — schema preparation only.

-- Package tiers define resource limits per subscription level
CREATE TABLE IF NOT EXISTS tenant_packages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(50) NOT NULL UNIQUE,             -- basic, professional, enterprise
    label           VARCHAR(100) NOT NULL,                   -- display name
    max_users       INTEGER NOT NULL DEFAULT 5,
    max_branches    INTEGER NOT NULL DEFAULT 1,
    max_products    INTEGER NOT NULL DEFAULT 500,
    monthly_price   DECIMAL(12,2) DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tenant-to-package assignment with usage counters
CREATE TABLE IF NOT EXISTS tenant_quotas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id     UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    package_id      UUID NOT NULL REFERENCES tenant_packages(id) ON DELETE RESTRICT,
    current_users   INTEGER NOT NULL DEFAULT 0,
    current_branches INTEGER NOT NULL DEFAULT 1,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (pharmacy_id)
);

CREATE INDEX idx_tenant_quotas_pharmacy ON tenant_quotas(pharmacy_id);
CREATE INDEX idx_tenant_quotas_package ON tenant_quotas(package_id);

-- Seed default packages
INSERT INTO tenant_packages (id, name, label, max_users, max_branches, max_products, monthly_price) VALUES
    ('00000000-0000-0000-0000-000000000101', 'basic',        'Basic',        3,  1,  200,  0),
    ('00000000-0000-0000-0000-000000000102', 'professional', 'Professional', 10, 3,  1000, 299000),
    ('00000000-0000-0000-0000-000000000103', 'enterprise',   'Enterprise',   50, 10, 10000, 999000)
ON CONFLICT (id) DO NOTHING;
