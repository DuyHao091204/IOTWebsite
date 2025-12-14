-- A) FK từ Rfid → ReceiptItem
ALTER TABLE "Rfid" ADD COLUMN IF NOT EXISTS "receiptItemId" INTEGER;
CREATE INDEX IF NOT EXISTS "Rfid_receiptItemId_idx" ON "Rfid"("receiptItemId");
DO $$
BEGIN
  BEGIN
    ALTER TABLE "Rfid"
      ADD CONSTRAINT "Rfid_receiptItemId_fkey"
      FOREIGN KEY ("receiptItemId") REFERENCES "ReceiptItem"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Constraint Rfid_receiptItemId_fkey already exists, skipping.';
  END;
END;
$$;

-- B) Ràng buộc: RFID gán cho ReceiptItem phải cùng product
CREATE OR REPLACE FUNCTION enforce_product_match_on_rfid()
RETURNS TRIGGER AS $$
DECLARE
  item_product_id INTEGER;
BEGIN
  IF (NEW."receiptItemId" IS NOT NULL) THEN
    SELECT "productId" INTO item_product_id
    FROM "ReceiptItem" WHERE id = NEW."receiptItemId";

    IF item_product_id IS NULL THEN
      RAISE EXCEPTION 'ReceiptItem % không tồn tại', NEW."receiptItemId";
    END IF;

    IF NEW."productId" <> item_product_id THEN
      RAISE EXCEPTION 'RFID % (productId=%) không khớp ReceiptItem % (productId=%)',
        NEW."uid", NEW."productId", NEW."receiptItemId", item_product_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_product_match_on_rfid ON "Rfid";
CREATE TRIGGER trg_enforce_product_match_on_rfid
BEFORE INSERT OR UPDATE OF "receiptItemId", "productId" ON "Rfid"
FOR EACH ROW EXECUTE FUNCTION enforce_product_match_on_rfid();

-- C) Ràng buộc: số RFID gán cho ReceiptItem không vượt quá qty
CREATE OR REPLACE FUNCTION enforce_qty_cap_on_receiptitem()
RETURNS TRIGGER AS $$
DECLARE
  assigned_count INTEGER;
  item_qty       INTEGER;
BEGIN
  IF (TG_OP IN ('INSERT','UPDATE')) AND (NEW."receiptItemId" IS NOT NULL) THEN
    SELECT COUNT(*) INTO assigned_count
    FROM "Rfid"
    WHERE "receiptItemId" = NEW."receiptItemId"
      AND "uid" <> NEW."uid";

    SELECT "qty" INTO item_qty FROM "ReceiptItem" WHERE id = NEW."receiptItemId";

    IF item_qty IS NULL THEN
      RAISE EXCEPTION 'ReceiptItem % không tồn tại', NEW."receiptItemId";
    END IF;

    IF (assigned_count + 1) > item_qty THEN
      RAISE EXCEPTION 'Số RFID gán cho ReceiptItem % vượt quá qty (%)',
        NEW."receiptItemId", item_qty;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_qty_cap_on_receiptitem ON "Rfid";
CREATE TRIGGER trg_enforce_qty_cap_on_receiptitem
BEFORE INSERT OR UPDATE OF "receiptItemId" ON "Rfid"
FOR EACH ROW EXECUTE FUNCTION enforce_qty_cap_on_receiptitem();
