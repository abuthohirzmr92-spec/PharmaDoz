-- Store expansion request table
-- Owner can request new store; SUPER_ADMIN must approve before provisioning.
-- Self-provisioning is NOT activated at this phase.

CREATE TABLE IF NOT EXISTS store_expansion_requests (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pharmacy_name VARCHAR(200) NOT NULL,
    pharmacy_code VARCHAR(20),
    address       TEXT,
    phone         VARCHAR(30),
    status        VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by   UUID REFERENCES users(id),
    reviewed_at   TIMESTAMPTZ,
    notes         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_store_expansion_status ON store_expansion_requests(status);
CREATE INDEX idx_store_expansion_owner ON store_expansion_requests(owner_id);
