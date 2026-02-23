-- =============================================
-- 약품 재고관리 앱 Supabase 초기 설정 SQL
-- Supabase 대시보드 > SQL Editor에서 실행하세요
-- =============================================

-- 1. 약품 테이블
CREATE TABLE chemicals (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT DEFAULT '',
  unit        TEXT DEFAULT '',
  stock       NUMERIC DEFAULT 0,
  min_stock   NUMERIC DEFAULT 0,
  location    TEXT DEFAULT '',
  hazards     TEXT[] DEFAULT '{}',
  msds_url    TEXT DEFAULT '',
  grade       TEXT DEFAULT '',
  supplier    TEXT DEFAULT '',
  last_updated TEXT DEFAULT '',
  school_id   TEXT DEFAULT ''
);

-- 2. 입출고 로그 테이블
CREATE TABLE logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chemical_id TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('in', 'out')),
  amount      NUMERIC NOT NULL,
  user_name   TEXT NOT NULL,
  purpose     TEXT DEFAULT '',
  note        TEXT DEFAULT '',
  date        TIMESTAMPTZ DEFAULT NOW(),
  school_id   TEXT DEFAULT ''
);

-- 3. Row Level Security 활성화
ALTER TABLE chemicals ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- 4. 학교별 데이터 격리 정책 (회원가입 시 입력한 학교명으로 분리)
CREATE POLICY "school_select_chemicals" ON chemicals FOR SELECT TO authenticated
  USING (school_id = (auth.jwt() -> 'user_metadata' ->> 'school_name'));
CREATE POLICY "school_insert_chemicals" ON chemicals FOR INSERT TO authenticated
  WITH CHECK (school_id = (auth.jwt() -> 'user_metadata' ->> 'school_name'));
CREATE POLICY "school_update_chemicals" ON chemicals FOR UPDATE TO authenticated
  USING (school_id = (auth.jwt() -> 'user_metadata' ->> 'school_name'));
CREATE POLICY "school_delete_chemicals" ON chemicals FOR DELETE TO authenticated
  USING (school_id = (auth.jwt() -> 'user_metadata' ->> 'school_name'));

CREATE POLICY "school_select_logs" ON logs FOR SELECT TO authenticated
  USING (school_id = (auth.jwt() -> 'user_metadata' ->> 'school_name'));
CREATE POLICY "school_insert_logs" ON logs FOR INSERT TO authenticated
  WITH CHECK (school_id = (auth.jwt() -> 'user_metadata' ->> 'school_name'));
CREATE POLICY "school_update_logs" ON logs FOR UPDATE TO authenticated
  USING (school_id = (auth.jwt() -> 'user_metadata' ->> 'school_name'));
CREATE POLICY "school_delete_logs" ON logs FOR DELETE TO authenticated
  USING (school_id = (auth.jwt() -> 'user_metadata' ->> 'school_name'));

-- 5. 실시간 구독 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE chemicals;
ALTER PUBLICATION supabase_realtime ADD TABLE logs;

-- =============================================
-- 기존 DB에 school_id 추가할 때 실행 (마이그레이션)
-- =============================================
-- ALTER TABLE chemicals ADD COLUMN IF NOT EXISTS school_id TEXT DEFAULT '';
-- ALTER TABLE logs ADD COLUMN IF NOT EXISTS school_id TEXT DEFAULT '';
-- DROP POLICY IF EXISTS "auth_select_chemicals" ON chemicals;
-- DROP POLICY IF EXISTS "auth_insert_chemicals" ON chemicals;
-- DROP POLICY IF EXISTS "auth_update_chemicals" ON chemicals;
-- DROP POLICY IF EXISTS "auth_delete_chemicals" ON chemicals;
-- DROP POLICY IF EXISTS "auth_select_logs" ON logs;
-- DROP POLICY IF EXISTS "auth_insert_logs" ON logs;
-- DROP POLICY IF EXISTS "auth_update_logs" ON logs;
-- DROP POLICY IF EXISTS "auth_delete_logs" ON logs;
-- (위 정책 삭제 후 4번 항목의 CREATE POLICY 들을 다시 실행)
