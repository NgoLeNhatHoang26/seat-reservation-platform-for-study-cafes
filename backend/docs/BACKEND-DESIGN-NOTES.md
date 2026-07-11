# Backend Design Notes

Chi tiết đầy đủ → các tài liệu cùng thư mục này (xem [README.md](./README.md)).

---

## 1. Modular Monolith

**Quyết định:** Một codebase, một process deploy, chia module theo domain (auth, booking, cafe, …).

**Lý do:**

- Giảm độ phức tạp vận hành — một codebase, một database, không cần service mesh hay RPC giữa các service
- Module boundary rõ → dễ test, dễ bảo trì, dễ tách microservice sau này nếu traffic tăng
- Shared database + transaction cross-entity đơn giản (booking + history trong một transaction)

**Trade-off:** Scale vertical; deploy all-or-nothing.

→ Chi tiết: [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)

---

## 2. Layered Architecture

```
Routes → Controller → Service → Repository → Prisma
```

| Layer | Trách nhiệm |
| ----- | ----------- |
| Controller | HTTP I/O, không chứa business logic |
| Service | Rules, orchestration, transaction, enqueue |
| Repository | Query/ mutation DB, không biết HTTP |

Validation (Zod) ở middleware; error mapping tập trung ở `errorHandler`.

---

## 3. Authentication & Authorization

### JWT access + refresh

- **Access token** — ngắn hạn (mặc định 15 phút), stateless verify
- **Refresh token** — dài hạn (7 ngày), lưu **Redis** với `tokenId` để revoke/rotate

**Rotate on refresh:** Mỗi lần refresh, token cũ bị revoke, cấp cặp token mới — giảm rủi ro token bị lộ.

**Revoke all:** Khi admin suspend user, xóa toàn bộ refresh token của user đó.

### RBAC

Roles: `CUSTOMER`, `OWNER`, `ADMIN`. Middleware `authorize(...roles)` trên từng route.

Owner thêm bước `requireApprovedOwner` — phải có `OwnerProfile.verificationStatus = APPROVED`.

### Account protection

- Bcrypt hash password (cost 12)
- Khóa tạm sau 5 lần login sai (15 phút)
- Rate limit register / login / booking create

→ Chi tiết: [REQUEST-FLOW.md](./REQUEST-FLOW.md) (auth flows)

---

## 4. Booking Concurrency

**Vấn đề:** Hai customer cùng book một ghế, cùng khung giờ → double booking.

**Giải pháp:**

1. Transaction Prisma bao toàn bộ create booking
2. `SELECT … FOR UPDATE` trên seat row — khóa ghế trong transaction
3. Kiểm tra overlap booking (CONFIRMED / CHECKED_IN) trước khi insert
4. **Idempotency-Key** (header bắt buộc) — client retry an toàn, trả lại booking cũ nếu key trùng

**Kết quả:** Strong consistency tại thời điểm ghi; phù hợp workload đặt chỗ (write không cực cao).

→ Chi tiết: [CONCURRENCY-DESIGN.md](./CONCURRENCY-DESIGN.md)

---

## 5. Background Jobs (BullMQ)

### Hai queue

| Queue | Mục đích |
| ----- | -------- |
| `booking` | Lifecycle: reminder, auto-expire, auto-complete |
| `email` | Gửi email qua SendGrid + ghi notification log |

### Job scheduling

Sau khi tạo booking CONFIRMED:

- **Reminder** — 30 phút trước `startTime`
- **Auto-expire** — sau `startTime + gracePeriod` nếu chưa check-in
- **Auto-complete** — sau `endTime` nếu đã CHECKED_IN

Job ID deterministic (`{bookingId}:reminder`, …) — tránh duplicate job khi retry.

Hủy/check-in → remove các job liên quan.

### Retry & failure

- Retry 3 lần, exponential backoff
- Email fail hết retry → log `NotificationStatus.FAILED`
- Workers chạy **cùng process** với API trong môi trường development — đơn giản triển khai local, dễ debug; production nên tách worker process riêng

→ Chi tiết: [QUEUE-DESIGN.md](./QUEUE-DESIGN.md)

---

## 6. Caching (Redis)

Cache read-heavy, không cache write path:

| Key pattern | Dữ liệu | TTL (approx) |
| ----------- | ------- | ------------ |
| Cafe list / search | Danh sách café ACTIVE | ~5 phút |
| Cafe detail | Thông tin café | ~10 phút |
| Seat layout | Zones + seats | ~5 phút |
| Availability | Ghế trống theo slot | ~1–2 phút |

**Invalidate** khi: owner đổi layout, booking create/cancel/expire (ảnh hưởng availability).

Redis lỗi → degrade gracefully (query DB trực tiếp), không crash request.

→ Chi tiết: [CACHE-DESIGN.md](./CACHE-DESIGN.md)

---

## 7. Notifications

Hai kênh ghi vào `NotificationLog`:

| Channel | Nguồn | API đọc |
| ------- | ----- | ------- |
| `EMAIL` | Email worker (SendGrid) | Không expose trực tiếp |
| `IN_APP` | Worker tạo song song khi gửi email booking | `GET /notifications` |

Customer thấy notification bell qua channel `IN_APP`. Mark read qua `PATCH /notifications/:id/read`.

---

## 8. Validation & Error Handling

### Validation

Zod schemas trong `*.validator.ts`, middleware `validateBody` / `validateQuery` / `validateParams`.

Lỗi validation → HTTP 422, code `VALIDATION_ERROR`, chi tiết field errors.

### Error model

Hierarchy `AppError` → `NotFoundError`, `ConflictError`, `UnauthorizedError`, `ForbiddenError`, `RateLimitError`, …

Global `errorHandler` map sang HTTP status + JSON format thống nhất. Mọi response có `requestId`.

---

## 9. Rate Limiting

Custom Redis-based limiter (`middleware/rateLimiter.ts`):

| Limiter | Scope | Giới hạn (approx) |
| ------- | ----- | ----------------- |
| Register | IP | 5 / giờ |
| Login | IP | 10 / 15 phút |
| Booking create | User (hoặc IP) | 20 / phút |
| Registration upload | IP | 20 / giờ |

**Fail-closed:** Redis lỗi → trả `RateLimitError`, không bypass limit.

---

## 10. Database & Audit

- **PostgreSQL** — source of truth
- **Prisma** — schema, migrations, type-safe client
- **BookingHistory** — mọi chuyển trạng thái booking
- **AuditLog** — hành động quan trọng (register, approve, suspend, …)

Soft delete trên `User` (`deletedAt`) — query luôn filter `deletedAt: null`.

→ Chi tiết: [DATABASE-DESIGN.md](./DATABASE-DESIGN.md)

---

## 11. Testing Strategy

| Loại | Công cụ | Phạm vi |
| ---- | ------- | ------- |
| Unit | Vitest | Service logic, JWT, password, worker handlers (mock) |
| Integration | Vitest + Supertest | Auth, booking E2E qua HTTP |
| Load | k6 | Smoke + booking load (chuẩn bị token trước) |

Test DB riêng qua `docker-compose.test.yml` + `.env.test`.

→ Chi tiết: [TESTING.md](./TESTING.md)

---

## 12. External Services (Optional)

| Service | Khi thiếu config |
| ------- | ---------------- |
| SendGrid | Skip gửi email, log warning |
| Cloudinary | Upload signature trả lỗi / disabled |

Giúp dev chạy local không cần API key thật.

---

## 13. Tóm tắt quyết định thiết kế

| Chủ đề | Lý do / cách làm |
| ------ | ---------------- |
| Tại sao monolith? | Đơn giản triển khai và kiểm soát; module boundary rõ, sẵn sàng tách khi cần scale |
| Tránh double booking? | Transaction + row lock + overlap check + idempotency |
| Refresh token ở đâu? | Redis — revoke được, rotate mỗi refresh |
| Worker scale? | Hiện cùng process (local dev); production tách worker + horizontal scale queue |
| Email verify? | Owner có gửi email; endpoint verify token chưa triển khai |

---

## 14. Liên kết tài liệu

| File | Nội dung |
| ---- | -------- |
| [README.md](./README.md) | Quick start |
| [BACKEND-OVERVIEW.md](./BACKEND-OVERVIEW.md) | Kiến trúc |
| [BACKEND-FEATURES.md](./BACKEND-FEATURES.md) | API & features |
| [API-SPECIFICATION.md](./API-SPECIFICATION.md) | Contract đầy đủ |
| [CONCURRENCY-DESIGN.md](./CONCURRENCY-DESIGN.md) | Booking lock deep dive |
| [QUEUE-DESIGN.md](./QUEUE-DESIGN.md) | Queue deep dive |
