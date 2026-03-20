-- ============================================================
-- Care to Dare — Donation Tracker Schema
-- ============================================================

-- 1. Donors table
CREATE TABLE donors (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Donations table
--    jar_id is constrained to 1, 2, or 3
CREATE TABLE donations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id   UUID NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
  jar_id     INTEGER NOT NULL CHECK (jar_id IN (1, 2, 3)),
  amount     NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast look-ups by donor
CREATE INDEX idx_donations_donor_id ON donations(donor_id);

-- ============================================================
-- 3. Function: recalculate a donor's total_amount
-- ============================================================
CREATE OR REPLACE FUNCTION update_donor_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE donors
  SET total_amount = (
    SELECT COALESCE(SUM(amount), 0)
    FROM donations
    WHERE donor_id = NEW.donor_id
  )
  WHERE id = NEW.donor_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 4. Trigger: fire after every INSERT on donations
-- ============================================================
CREATE TRIGGER trg_update_donor_total
AFTER INSERT ON donations
FOR EACH ROW
EXECUTE FUNCTION update_donor_total();

-- ============================================================
-- 5. (Optional) Row-Level Security policies
--    Enable RLS on both tables so Supabase respects auth.
-- ============================================================
ALTER TABLE donors    ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all rows
CREATE POLICY "Allow authenticated read on donors"
  ON donors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read on donations"
  ON donations FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert rows
CREATE POLICY "Allow authenticated insert on donors"
  ON donors FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated insert on donations"
  ON donations FOR INSERT
  TO authenticated
  WITH CHECK (true);
