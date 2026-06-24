-- Migration: Add asset status, asset_type, maintenance history, activity logs
ALTER TABLE assets ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE assets ADD COLUMN IF NOT EXISTS asset_type TEXT;

CREATE TABLE IF NOT EXISTS asset_maintenance_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id text NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  old_status text,
  new_status text,
  expired_date_old date,
  expired_date_new date,
  reason text,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamp WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  created_at timestamp WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE asset_maintenance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_logs_read_all" ON activity_logs FOR SELECT USING (true);
CREATE POLICY "activity_logs_insert_system" ON activity_logs FOR INSERT WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' OR auth.uid() IS NULL);
CREATE POLICY "maintenance_history_select" ON asset_maintenance_history FOR SELECT USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' OR updated_by = auth.uid());
CREATE POLICY "maintenance_history_insert" ON asset_maintenance_history FOR INSERT WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' OR updated_by = auth.uid());
