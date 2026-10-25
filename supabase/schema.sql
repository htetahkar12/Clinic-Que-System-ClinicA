-- ============================================================================
-- WHITE-LABEL POLY CLINIC QUEUE & BOOKING PWA — DATABASE SCHEMA (v2)
-- ----------------------------------------------------------------------------
-- Idempotent: safe to run multiple times in the Supabase SQL Editor.
--
-- Security model
--   * Browser (anon key) can only READ doctors, bookings and messages
--     (needed for the live queue + Supabase Realtime).
--   * patients, transactions and otp_codes are NOT readable with the anon key.
--   * ALL writes go through Next.js API routes (service-role key) which verify
--     the staff session / patient session server-side.
--   * Every RPC is executable only by service_role.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- "Today" in the clinic's timezone (Myanmar, UTC+06:30). Change if needed.
CREATE OR REPLACE FUNCTION public.clinic_today()
RETURNS DATE LANGUAGE sql STABLE AS $$
  SELECT (NOW() AT TIME ZONE 'Asia/Yangon')::DATE
$$;

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- 1.1 PATIENTS ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patients (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone              TEXT NOT NULL UNIQUE,
  name               TEXT NOT NULL DEFAULT 'Patient',
  credit_points      NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (credit_points >= 0),
  fcm_token          TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'my';

-- 1.2 DOCTORS ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.doctors (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  specialty             TEXT NOT NULL,
  room_number           TEXT NOT NULL,
  current_queue_number  INTEGER NOT NULL DEFAULT 0 CHECK (current_queue_number >= 0),
  consultation_fee      NUMERIC(12, 2) NOT NULL DEFAULT 15000,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS name_my             TEXT;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS specialty_my        TEXT;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS queue_date          DATE;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS start_time          TEXT NOT NULL DEFAULT '09:00';
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS end_time            TEXT NOT NULL DEFAULT '12:00';
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS max_patients        INTEGER NOT NULL DEFAULT 30;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS avg_consult_minutes INTEGER NOT NULL DEFAULT 10;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS status              TEXT NOT NULL DEFAULT 'available';
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS status_date         DATE;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS status_note         TEXT;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS delay_minutes       INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS postponed_to        DATE;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS is_archived         BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS sort_order          INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.doctors DROP CONSTRAINT IF EXISTS doctors_status_check;
ALTER TABLE public.doctors ADD CONSTRAINT doctors_status_check
  CHECK (status IN ('available', 'delayed', 'postponed', 'off'));

-- 1.3 BOOKINGS ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id     UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id      UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  booking_date   DATE NOT NULL DEFAULT public.clinic_today(),
  queue_number   INTEGER NOT NULL CHECK (queue_number >= 1),
  status         TEXT NOT NULL DEFAULT 'waiting',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (doctor_id, booking_date, queue_number)
);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS ticket_code      TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS source           TEXT NOT NULL DEFAULT 'online';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS is_priority      BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS checked_in_at    TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS called_at        TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS notified_near_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS qr_image_url     TEXT;
ALTER TABLE public.bookings ALTER COLUMN booking_date SET DEFAULT public.clinic_today();

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('waiting', 'in_progress', 'completed', 'cancelled', 'no_show'));
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_payment_status_check
  CHECK (payment_status IN ('pending', 'paid', 'refunded', 'rejected', 'void'));
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_source_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_source_check
  CHECK (source IN ('online', 'walk_in'));
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_ticket_code ON public.bookings(ticket_code);

-- 1.4 TRANSACTIONS -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  booking_id        UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  amount            NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  payment_method    TEXT NOT NULL,
  receipt_image_url TEXT,
  type              TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_payment_method_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_payment_method_check
  CHECK (payment_method IN ('kpay', 'wavepay', 'ayapay', 'credit_points', 'cash', 'refund'));
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('payment', 'refund', 'credit_topup', 'adjustment'));

-- 1.5 MESSAGES (automated + manual notices shown in the Patient Portal) ------
--   Targeting:  patient_id -> one patient | booking_id -> that booking's patient
--               doctor_id  -> everyone booked with that doctor on message_date
--               all NULL   -> everyone (broadcast)
CREATE TABLE IF NOT EXISTS public.messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id    UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
  booking_id   UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  patient_id   UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL DEFAULT 'manual' CHECK (kind IN ('manual', 'automated')),
  category     TEXT NOT NULL DEFAULT 'info',
  title_en     TEXT NOT NULL,
  body_en      TEXT NOT NULL,
  title_my     TEXT NOT NULL,
  body_my      TEXT NOT NULL,
  message_date DATE NOT NULL DEFAULT public.clinic_today(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_category_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_category_check
  CHECK (category IN ('info', 'turn_near', 'your_turn', 'recall', 'delay', 'available',
                      'postponed', 'cancelled', 'payment'));

-- 1.6 OTP CODES (SMS login; server-only) -------------------------------------
CREATE TABLE IF NOT EXISTS public.otp_codes (
  phone        TEXT PRIMARY KEY,
  code_hash    TEXT NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  attempts     INTEGER NOT NULL DEFAULT 0,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bookings_doctor_date ON public.bookings(doctor_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_patient     ON public.bookings(patient_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date_status ON public.bookings(booking_date, status);
CREATE INDEX IF NOT EXISTS idx_transactions_booking ON public.transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_transactions_patient ON public.transactions(patient_id);
CREATE INDEX IF NOT EXISTS idx_messages_date        ON public.messages(message_date);

-- ============================================================================
-- 2. ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.patients     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_codes    ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('patients', 'doctors', 'bookings', 'transactions', 'messages', 'otp_codes')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

CREATE POLICY "public_read_doctors"  ON public.doctors  FOR SELECT USING (true);
CREATE POLICY "public_read_bookings" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "public_read_messages" ON public.messages FOR SELECT USING (true);
-- patients / transactions / otp_codes: no anon policies => service_role only.

-- ============================================================================
-- 3. ATOMIC RPCs (service_role only)
--    Queue order everywhere: VIP (is_priority) first, then queue_number.
-- ============================================================================

-- 3.1 Create booking ---------------------------------------------------------
DROP FUNCTION IF EXISTS public.create_booking(UUID, UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_booking(UUID, UUID, TEXT, TEXT, TEXT, BOOLEAN);
CREATE FUNCTION public.create_booking(
  p_patient_id     UUID,
  p_doctor_id      UUID,
  p_payment_method TEXT,
  p_receipt_url    TEXT DEFAULT NULL,
  p_source         TEXT DEFAULT 'online',
  p_priority       BOOLEAN DEFAULT FALSE
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_today   DATE := public.clinic_today();
  v_doc     public.doctors%ROWTYPE;
  v_pat     public.patients%ROWTYPE;
  v_fee     NUMERIC;
  v_next    INTEGER;
  v_count   INTEGER;
  v_code    TEXT;
  v_paid    BOOLEAN := FALSE;
  v_booking public.bookings%ROWTYPE;
BEGIN
  IF p_payment_method NOT IN ('kpay', 'wavepay', 'ayapay', 'credit_points', 'cash') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_METHOD';
  END IF;

  SELECT * INTO v_doc FROM public.doctors
  WHERE id = p_doctor_id AND is_archived = FALSE FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'DOCTOR_NOT_FOUND'; END IF;

  IF NOT v_doc.is_active
     OR (v_doc.status IN ('postponed', 'off') AND v_doc.status_date = v_today) THEN
    RAISE EXCEPTION 'DOCTOR_UNAVAILABLE';
  END IF;

  SELECT * INTO v_pat FROM public.patients WHERE id = p_patient_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PATIENT_NOT_FOUND'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE patient_id = p_patient_id AND doctor_id = p_doctor_id
      AND booking_date = v_today AND status IN ('waiting', 'in_progress')
  ) THEN
    RAISE EXCEPTION 'ALREADY_BOOKED';
  END IF;

  IF COALESCE(p_source, 'online') = 'online' THEN
    SELECT COUNT(*) INTO v_count FROM public.bookings
    WHERE doctor_id = p_doctor_id AND booking_date = v_today AND status <> 'cancelled';
    IF v_count >= v_doc.max_patients THEN RAISE EXCEPTION 'DOCTOR_FULL'; END IF;
  END IF;

  SELECT GREATEST(
           COALESCE(MAX(queue_number), 0),
           CASE WHEN v_doc.queue_date = v_today THEN v_doc.current_queue_number ELSE 0 END
         ) + 1
  INTO v_next
  FROM public.bookings WHERE doctor_id = p_doctor_id AND booking_date = v_today;

  v_fee := v_doc.consultation_fee;

  IF p_payment_method = 'credit_points' THEN
    IF v_pat.credit_points < v_fee THEN RAISE EXCEPTION 'INSUFFICIENT_POINTS'; END IF;
    UPDATE public.patients SET credit_points = credit_points - v_fee, updated_at = NOW()
      WHERE id = p_patient_id;
    v_paid := TRUE;
  ELSIF p_payment_method = 'cash' THEN
    v_paid := TRUE;
  END IF;

  LOOP
    v_code := UPPER(SUBSTRING(md5(gen_random_uuid()::TEXT) FROM 1 FOR 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.bookings WHERE ticket_code = v_code);
  END LOOP;

  INSERT INTO public.bookings (
    patient_id, doctor_id, booking_date, queue_number, status, payment_status,
    ticket_code, source, is_priority, checked_in_at
  ) VALUES (
    p_patient_id, p_doctor_id, v_today, v_next, 'waiting',
    CASE WHEN v_paid THEN 'paid' ELSE 'pending' END,
    v_code, COALESCE(p_source, 'online'), COALESCE(p_priority, FALSE),
    CASE WHEN p_source = 'walk_in' THEN NOW() ELSE NULL END
  )
  RETURNING * INTO v_booking;

  INSERT INTO public.transactions (patient_id, booking_id, amount, payment_method, receipt_image_url, type)
  VALUES (p_patient_id, v_booking.id, v_fee, p_payment_method, p_receipt_url, 'payment');

  RETURN to_jsonb(v_booking);
END;
$$;

-- 3.2 Next patient: complete current, call the next PAID waiting patient -----
DROP FUNCTION IF EXISTS public.advance_doctor_queue(UUID);
CREATE FUNCTION public.advance_doctor_queue(p_doctor_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_today DATE := public.clinic_today();
  v_doc   public.doctors%ROWTYPE;
  v_next  public.bookings%ROWTYPE;
BEGIN
  SELECT * INTO v_doc FROM public.doctors WHERE id = p_doctor_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'DOCTOR_NOT_FOUND'; END IF;

  UPDATE public.bookings SET status = 'completed', updated_at = NOW()
    WHERE doctor_id = p_doctor_id AND booking_date = v_today AND status = 'in_progress';

  SELECT * INTO v_next FROM public.bookings
  WHERE doctor_id = p_doctor_id AND booking_date = v_today
    AND status = 'waiting' AND payment_status = 'paid'
  ORDER BY is_priority DESC, queue_number ASC
  LIMIT 1 FOR UPDATE;

  IF NOT FOUND THEN
    UPDATE public.doctors SET
      current_queue_number = CASE WHEN queue_date = v_today THEN current_queue_number ELSE 0 END,
      queue_date = v_today, updated_at = NOW()
    WHERE id = p_doctor_id;
    RETURN jsonb_build_object('has_next', FALSE);
  END IF;

  UPDATE public.bookings SET status = 'in_progress', called_at = NOW(), updated_at = NOW()
    WHERE id = v_next.id;
  UPDATE public.doctors SET current_queue_number = v_next.queue_number, queue_date = v_today, updated_at = NOW()
    WHERE id = p_doctor_id;

  RETURN jsonb_build_object('has_next', TRUE, 'booking_id', v_next.id,
                            'queue_number', v_next.queue_number, 'patient_id', v_next.patient_id);
END;
$$;

-- 3.3 Call a specific patient now (manual override / recall a no-show) ------
DROP FUNCTION IF EXISTS public.call_booking(UUID);
CREATE FUNCTION public.call_booking(p_booking_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_today DATE := public.clinic_today();
  v_b     public.bookings%ROWTYPE;
BEGIN
  SELECT * INTO v_b FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;
  IF v_b.booking_date <> v_today OR v_b.status NOT IN ('waiting', 'no_show') THEN
    RAISE EXCEPTION 'INVALID_STATE';
  END IF;
  PERFORM 1 FROM public.doctors WHERE id = v_b.doctor_id FOR UPDATE;

  UPDATE public.bookings SET status = 'completed', updated_at = NOW()
    WHERE doctor_id = v_b.doctor_id AND booking_date = v_today AND status = 'in_progress';
  UPDATE public.bookings SET status = 'in_progress', called_at = NOW(), updated_at = NOW()
    WHERE id = p_booking_id;
  UPDATE public.doctors SET current_queue_number = v_b.queue_number, queue_date = v_today, updated_at = NOW()
    WHERE id = v_b.doctor_id;

  RETURN jsonb_build_object('booking_id', v_b.id, 'queue_number', v_b.queue_number,
                            'doctor_id', v_b.doctor_id, 'patient_id', v_b.patient_id);
END;
$$;

-- 3.4 Set today's "now serving" / starting number (manual override) --------
DROP FUNCTION IF EXISTS public.set_doctor_queue(UUID, INTEGER);
CREATE FUNCTION public.set_doctor_queue(p_doctor_id UUID, p_number INTEGER)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_number < 0 THEN RAISE EXCEPTION 'INVALID_NUMBER'; END IF;
  UPDATE public.doctors
    SET current_queue_number = p_number, queue_date = public.clinic_today(), updated_at = NOW()
    WHERE id = p_doctor_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'DOCTOR_NOT_FOUND'; END IF;
  RETURN jsonb_build_object('current_queue_number', p_number);
END;
$$;

-- 3.5 Cancel booking -> refund to CREDIT POINTS (no cash refunds) ------------
--     Only paid bookings get points back. p_reject => receipt rejected.
DROP FUNCTION IF EXISTS public.cancel_booking_and_refund(UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.cancel_booking(UUID, BOOLEAN);
CREATE FUNCTION public.cancel_booking(p_booking_id UUID, p_reject BOOLEAN DEFAULT FALSE)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_b       public.bookings%ROWTYPE;
  v_amount  NUMERIC := 0;
  v_points  NUMERIC;
  v_new_pay TEXT;
BEGIN
  SELECT * INTO v_b FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;
  IF v_b.status IN ('cancelled', 'completed') THEN RAISE EXCEPTION 'INVALID_STATE'; END IF;

  IF v_b.payment_status = 'paid' AND NOT p_reject THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_amount FROM public.transactions
      WHERE booking_id = p_booking_id AND type = 'payment';
    UPDATE public.patients SET credit_points = credit_points + v_amount, updated_at = NOW()
      WHERE id = v_b.patient_id RETURNING credit_points INTO v_points;
    INSERT INTO public.transactions (patient_id, booking_id, amount, payment_method, type)
      VALUES (v_b.patient_id, p_booking_id, v_amount, 'refund', 'refund');
    v_new_pay := 'refunded';
  ELSIF p_reject THEN
    v_new_pay := 'rejected';
  ELSE
    v_new_pay := 'void';
  END IF;

  UPDATE public.bookings SET status = 'cancelled', payment_status = v_new_pay, updated_at = NOW()
    WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'booking_id', p_booking_id, 'patient_id', v_b.patient_id, 'doctor_id', v_b.doctor_id,
    'queue_number', v_b.queue_number, 'refunded_amount', v_amount,
    'payment_status', v_new_pay, 'new_credit_points', v_points);
END;
$$;

-- 3.6 Postpone today's session: move waiting bookings to a new date ---------
DROP FUNCTION IF EXISTS public.postpone_doctor_session(UUID, DATE, TEXT);
CREATE FUNCTION public.postpone_doctor_session(p_doctor_id UUID, p_new_date DATE, p_note TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_today DATE := public.clinic_today();
  v_base  INTEGER;
  r       RECORD;
  v_moved JSONB := '[]'::JSONB;
BEGIN
  IF p_new_date <= v_today THEN RAISE EXCEPTION 'INVALID_DATE'; END IF;
  PERFORM 1 FROM public.doctors WHERE id = p_doctor_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'DOCTOR_NOT_FOUND'; END IF;

  SELECT COALESCE(MAX(queue_number), 0) INTO v_base FROM public.bookings
    WHERE doctor_id = p_doctor_id AND booking_date = p_new_date;

  FOR r IN
    SELECT id, patient_id, queue_number FROM public.bookings
    WHERE doctor_id = p_doctor_id AND booking_date = v_today AND status = 'waiting'
    ORDER BY is_priority DESC, queue_number
  LOOP
    v_base := v_base + 1;
    UPDATE public.bookings
      SET booking_date = p_new_date, queue_number = v_base, notified_near_at = NULL, updated_at = NOW()
      WHERE id = r.id;
    v_moved := v_moved || jsonb_build_object(
      'booking_id', r.id, 'patient_id', r.patient_id,
      'old_queue_number', r.queue_number, 'new_queue_number', v_base);
  END LOOP;

  UPDATE public.doctors
    SET status = 'postponed', status_date = v_today, postponed_to = p_new_date,
        status_note = p_note, delay_minutes = 0, updated_at = NOW()
    WHERE id = p_doctor_id;

  RETURN jsonb_build_object('moved', v_moved, 'new_date', p_new_date);
END;
$$;

-- 3.7 Cancel today's whole session (doctor absent): cancel + points refund --
DROP FUNCTION IF EXISTS public.cancel_doctor_session(UUID, TEXT);
CREATE FUNCTION public.cancel_doctor_session(p_doctor_id UUID, p_note TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_today   DATE := public.clinic_today();
  r         RECORD;
  v_results JSONB := '[]'::JSONB;
BEGIN
  PERFORM 1 FROM public.doctors WHERE id = p_doctor_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'DOCTOR_NOT_FOUND'; END IF;

  FOR r IN
    SELECT id FROM public.bookings
    WHERE doctor_id = p_doctor_id AND booking_date = v_today AND status IN ('waiting', 'in_progress')
  LOOP
    v_results := v_results || public.cancel_booking(r.id, FALSE);
  END LOOP;

  UPDATE public.doctors
    SET status = 'off', status_date = v_today, status_note = p_note,
        delay_minutes = 0, postponed_to = NULL, updated_at = NOW()
    WHERE id = p_doctor_id;

  RETURN jsonb_build_object('cancelled', v_results);
END;
$$;

-- Lock down RPCs: only the server (service_role) may execute them.
DO $$
DECLARE f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.create_booking(UUID, UUID, TEXT, TEXT, TEXT, BOOLEAN)',
    'public.advance_doctor_queue(UUID)',
    'public.call_booking(UUID)',
    'public.set_doctor_queue(UUID, INTEGER)',
    'public.cancel_booking(UUID, BOOLEAN)',
    'public.postpone_doctor_session(UUID, DATE, TEXT)',
    'public.cancel_doctor_session(UUID, TEXT)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
  END LOOP;
END $$;

-- ============================================================================
-- 4. REALTIME (only tables the browser may read)
-- ============================================================================
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.doctors;  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.messages; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 5. STORAGE (receipts / QR tickets when Cloudinary is not configured)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Receipt images are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Patients can upload payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Public Receipts" ON storage.objects;
DROP POLICY IF EXISTS "Upload Receipts" ON storage.objects;
CREATE POLICY "Public Receipts" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');

-- ============================================================================
-- 6. SEED DATA (sample doctors — edit / remove them from /reception)
-- ============================================================================
INSERT INTO public.doctors
  (id, name, name_my, specialty, specialty_my, room_number, consultation_fee,
   start_time, end_time, max_patients, avg_consult_minutes, sort_order)
VALUES
  ('11111111-1111-4111-8111-111111111101', 'Dr. Aung Kyaw Moe', 'ဒေါက်တာ အောင်ကျော်မိုး',
   'Heart Specialist (Cardiology)', 'နှလုံးအထူးကု', '101', 15000, '09:00', '12:00', 30, 10, 1),
  ('11111111-1111-4111-8111-111111111102', 'Dr. May Thuzar Win', 'ဒေါက်တာ မေသူဇာဝင်း',
   'General Physician & Elderly Care', 'အထွေထွေရောဂါ နှင့် သက်ကြီးရွယ်အို ကုသမှု', '102', 15000, '09:00', '13:00', 40, 8, 2),
  ('11111111-1111-4111-8111-111111111103', 'Dr. Zaw Min Tun', 'ဒေါက်တာ ဇော်မင်းထွန်း',
   'Bone & Joint Specialist (Orthopedics)', 'အရိုးနှင့် အဆစ်အထူးကု', '105', 20000, '13:00', '16:00', 25, 12, 3),
  ('11111111-1111-4111-8111-111111111104', 'Dr. Khin Myat Noe', 'ဒေါက်တာ ခင်မြတ်နိုး',
   'Eye Specialist (Ophthalmology)', 'မျက်စိအထူးကု', '201', 20000, '14:00', '17:00', 25, 10, 4)
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
