-- V3 P0.7A — Product Master: Rack Location
-- Add nullable rack_location column for physical storage tracking
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS rack_location VARCHAR(50);
