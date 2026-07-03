-- Critical: prevent duplicate active slot on same seat
CREATE UNIQUE INDEX "uq_bookings_seat_active_slot"
ON "bookings" ("seat_id", "start_time", "end_time")
WHERE "status" IN ('CONFIRMED', 'CHECKED_IN');

-- Active users by email (ignore soft-deleted rows)
CREATE INDEX "idx_users_email_active"
ON "users" ("email")
WHERE "deleted_at" IS NULL;

-- Active cafes for browse/filter
CREATE INDEX "idx_cafes_city_status_active"
ON "cafes" ("city", "status")
WHERE "status" = 'ACTIVE';

-- Active booking overlap lookup path
CREATE INDEX "idx_bookings_seat_active_time"
ON "bookings" ("seat_id", "start_time", "end_time")
WHERE "status" IN ('CONFIRMED', 'CHECKED_IN');