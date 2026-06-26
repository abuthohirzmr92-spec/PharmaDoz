-- ==========================================================
-- Migration 051
-- Storage Areas Hardening
-- ==========================================================

-- Code tidak boleh kosong
ALTER TABLE public.storage_areas
ADD CONSTRAINT chk_storage_areas_code_not_blank
CHECK (length(trim(code)) > 0);

-- Nama tidak boleh kosong
ALTER TABLE public.storage_areas
ADD CONSTRAINT chk_storage_areas_name_not_blank
CHECK (length(trim(name)) > 0);

-- Index pencarian nama
CREATE INDEX IF NOT EXISTS
idx_storage_areas_name
ON public.storage_areas(name);

-- Composite index untuk dropdown
CREATE INDEX IF NOT EXISTS
idx_storage_areas_tenant_active_sort
ON public.storage_areas(
    tenant_id,
    is_active,
    sort_order
);