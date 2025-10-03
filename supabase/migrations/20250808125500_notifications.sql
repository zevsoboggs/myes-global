-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text,
  meta jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Notifications select" ON notifications;
CREATE POLICY "Notifications select" ON notifications
FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Notifications insert" ON notifications;
CREATE POLICY "Notifications insert" ON notifications
FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Notifications update" ON notifications;
CREATE POLICY "Notifications update" ON notifications
FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Helper to create notification
CREATE OR REPLACE FUNCTION public.create_notification(p_user_id uuid, p_title text, p_message text, p_meta jsonb)
RETURNS void AS $$
BEGIN
  INSERT INTO notifications(user_id, title, message, meta) VALUES (p_user_id, p_title, p_message, p_meta);
END;$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto set payment_pending after invoice issued
CREATE OR REPLACE FUNCTION public.on_invoice_insert_set_pending()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE sales_requests SET status = 'payment_pending' WHERE id = NEW.sales_request_id;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_invoice_insert_set_pending ON invoices;
CREATE TRIGGER trg_invoice_insert_set_pending
AFTER INSERT ON invoices
FOR EACH ROW EXECUTE PROCEDURE public.on_invoice_insert_set_pending();

-- Notify buyer & realtor on invoice issued/updated
CREATE OR REPLACE FUNCTION public.on_invoice_change_notify()
RETURNS TRIGGER AS $$
DECLARE s sales_requests;
BEGIN
  SELECT * INTO s FROM sales_requests WHERE id = NEW.sales_request_id;
  IF TG_OP = 'INSERT' THEN
    PERFORM public.create_notification(s.buyer_id, 'Выставлен счет', 'Оплата в USDT: проверьте инструкции', jsonb_build_object('invoice_id', NEW.id, 'amount_usdt', NEW.amount_usdt, 'status', NEW.status));
    PERFORM public.create_notification(s.realtor_id, 'Выставлен счет покупателю', 'Ожидается оплата', jsonb_build_object('invoice_id', NEW.id, 'amount_usdt', NEW.amount_usdt, 'status', NEW.status));
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.create_notification(s.buyer_id, 'Обновление счета', COALESCE('Статус: '||NEW.status, ''), jsonb_build_object('invoice_id', NEW.id, 'status', NEW.status));
    PERFORM public.create_notification(s.realtor_id, 'Обновление счета', COALESCE('Статус: '||NEW.status, ''), jsonb_build_object('invoice_id', NEW.id, 'status', NEW.status));
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_invoice_change_notify ON invoices;
CREATE TRIGGER trg_invoice_change_notify
AFTER INSERT OR UPDATE ON invoices
FOR EACH ROW EXECUTE PROCEDURE public.on_invoice_change_notify();

-- Notify participants on sales_request status change
CREATE OR REPLACE FUNCTION public.on_sales_request_update_notify()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.create_notification(NEW.buyer_id, 'Статус сделки', COALESCE('Статус: '||NEW.status, ''), jsonb_build_object('sales_request_id', NEW.id, 'status', NEW.status));
    PERFORM public.create_notification(NEW.realtor_id, 'Статус сделки', COALESCE('Статус: '||NEW.status, ''), jsonb_build_object('sales_request_id', NEW.id, 'status', NEW.status));
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sales_request_update_notify ON sales_requests;
CREATE TRIGGER trg_sales_request_update_notify
AFTER UPDATE ON sales_requests
FOR EACH ROW EXECUTE PROCEDURE public.on_sales_request_update_notify(); 