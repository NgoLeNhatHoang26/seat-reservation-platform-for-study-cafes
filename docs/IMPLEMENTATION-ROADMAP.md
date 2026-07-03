# Implementation Roadmap — Seat Reservation Platform for Study Cafés

**Audience:** Backend Intern / Fresher  
**Project:** Seat Reservation Platform for Study Cafés  
**Architecture:** Modular Monolith · Layered Architecture (Controller → Service → Repository)  
**Stack:** Node.js 20 · Express 4 · TypeScript · PostgreSQL 16 · Prisma ORM · Redis 7 · BullMQ · SendGrid  
**Document Version:** 1.0  
**Last Updated:** June 2026

---

> **Cara đọc roadmap này:**
> - Đọc task trước khi code.
> - Mỗi task chỉ làm MỘT mục tiêu.
> - Chạy Validation Checklist trước khi đánh dấu xong.
> - Không nhảy phase. Dependencies phải được hoàn thành trước.

---

## Tổng quan các Phase

| Phase | Tên | Số Task |
|-------|-----|---------|
| 0 | Project Initialization | 8 |
| 1 | Environment & Configuration | 5 |
| 2 | Database Schema (Prisma) | 9 |
| 3 | Shared / Common Layer | 5 |
| 4 | Middleware | 4 |
| 5 | Auth Module | 9 |
| 6 | Café Module — Public Read Paths | 7 |
| 7 | Booking Module — Create Booking | 8 |
| 8 | Booking Module — Cancel & Check-in | 5 |
| 9 | Owner Module | 6 |
| 10 | BullMQ Workers | 6 |
| 11 | Notification & Customer Modules | 4 |
| 12 | Admin Module | 5 |
| 13 | Testing | 6 |
| 14 | Docker & CI/CD | 4 |
| **Total** | | **~91 Tasks** |

---

---

# Phase 0 — Project Initialization

**Goal:** Khởi tạo project Node.js với TypeScript, ESLint, folder structure chuẩn, và chạy được Hello World.

---

## Task 0.1 — Initialize Node Project

### Goal
Tạo `package.json` và khởi tạo git repository cho project.

### Related Docs
- `SYSTEM-OVERVIEW.md` §13 (Technology Stack)

### Files Created
- `package.json`
- `.gitignore`
- `README.md`

### Functions
_(không có — task này chỉ khởi tạo project)_

### Dependencies
_(không có — đây là task đầu tiên)_

### Expected Result
- Thư mục project có `package.json` với `name`, `version`, `description`
- `.gitignore` loại trừ `node_modules/`, `.env`, `dist/`
- Git repository được khởi tạo (nếu dùng git)

### Validation Checklist
- [ ] `package.json` tồn tại và có `"name"` field
- [ ] `node_modules/` không bị commit (có trong `.gitignore`)
- [ ] `.env` không bị commit (có trong `.gitignore`)
- [ ] `dist/` không bị commit (có trong `.gitignore`)

---

## Task 0.2 — Install Backend Dependencies

### Goal
Cài đặt tất cả dependencies cần thiết: runtime, dev, và type definitions.

### Related Docs
- `SYSTEM-OVERVIEW.md` §13 (Technology Stack)

### Files Created
- `package.json` (updated với dependencies)
- `package-lock.json`

### Functions
_(không có)_

### Dependencies
- Task 0.1

### Expected Result
`package.json` có đủ các dependencies sau:

**Production dependencies:**
- `express`
- `@prisma/client`
- `ioredis`
- `bullmq`
- `jsonwebtoken`
- `bcryptjs`
- `zod`
- `morgan`
- `pino`
- `pino-http`
- `dotenv`
- `express-rate-limit`
- `@sendgrid/mail`
- `nanoid` (hoặc `uuid`)

**Dev dependencies:**
- `typescript`
- `ts-node`
- `tsx`
- `prisma`
- `@types/express`
- `@types/node`
- `@types/jsonwebtoken`
- `@types/bcryptjs`
- `@types/morgan`
- `vitest`
- `supertest`
- `@types/supertest`
- `eslint`
- `@typescript-eslint/eslint-plugin`
- `@typescript-eslint/parser`
- `prettier`

### Validation Checklist
- [ ] `node_modules/` tồn tại sau khi install
- [ ] Không có error khi chạy `npm install`
- [ ] Tất cả packages trong danh sách trên đã có trong `package.json`

---

## Task 0.3 — Configure TypeScript

### Goal
Tạo `tsconfig.json` chuẩn cho Node.js Express project với strict mode.

### Related Docs
- `SYSTEM-OVERVIEW.md` §13

### Files Created
- `tsconfig.json`

### Functions
_(không có)_

### Dependencies
- Task 0.2

### Expected Result
- `tsconfig.json` có `target: "ES2022"`, `module: "commonjs"`, `outDir: "./dist"`, `rootDir: "./src"`, `strict: true`
- Path aliases (optional): `"@/*": ["./src/*"]`

### Validation Checklist
- [ ] `tsconfig.json` tồn tại
- [ ] `npx tsc --noEmit` không báo lỗi trên file rỗng
- [ ] `strict: true` được bật

---

## Task 0.4 — Setup ESLint & Prettier

### Goal
Cài đặt linting và formatting để code nhất quán.

### Related Docs
_(không có — tooling setup)_

### Files Created
- `.eslintrc.json` (hoặc `eslint.config.js`)
- `.prettierrc`
- `.eslintignore`

### Functions
_(không có)_

### Dependencies
- Task 0.2

### Expected Result
- ESLint nhận diện TypeScript files
- Prettier format tự động
- `npm run lint` và `npm run format` hoạt động

**Scripts cần thêm vào `package.json`:**
- `"lint": "eslint src --ext .ts"`
- `"format": "prettier --write src/**/*.ts"`
- `"build": "tsc"`
- `"start": "node dist/server.js"`
- `"dev": "tsx watch src/server.ts"`

### Validation Checklist
- [ ] `npm run lint` chạy không lỗi trên project rỗng
- [ ] `npm run format` chạy không lỗi
- [ ] ESLint biết parse TypeScript

---

## Task 0.5 — Create Folder Structure

### Goal
Tạo toàn bộ cấu trúc thư mục của project theo kiến trúc đã thiết kế.

### Related Docs
- `SYSTEM-OVERVIEW.md` §12 (Project Structure)
- `SYSTEM_ARCHITECTURE.md` §4

### Files Created
Tạo các thư mục sau (dùng `.gitkeep` nếu cần):

```
src/
├── app.ts                  (sẽ tạo ở Task 0.6)
├── server.ts               (sẽ tạo ở Task 0.7)
├── config/
├── common/
├── middleware/
├── modules/
│   ├── auth/
│   ├── cafe/
│   ├── booking/
│   ├── customer/
│   ├── notification/
│   └── admin/
├── workers/
└── routes/
prisma/
tests/
├── unit/
│   ├── auth/
│   ├── booking/
│   └── cafe/
├── integration/
├── helpers/
└── load/
    └── k6/
```

### Functions
_(không có)_

### Dependencies
- Task 0.1

### Expected Result
Tất cả thư mục trên tồn tại.

### Validation Checklist
- [ ] Tất cả thư mục trong danh sách trên đã được tạo
- [ ] Cấu trúc khớp với `SYSTEM-OVERVIEW.md §12`

---

## Task 0.6 — Create `app.ts`

### Goal
Tạo file khởi tạo Express app với các middleware cơ bản nhất (JSON parser, CORS).

### Related Docs
- `SYSTEM_ARCHITECTURE.md` §3 (API Gateway Layer)

### Files Created
- `src/app.ts`

### Functions
_(function duy nhất sẽ là export default `app` — không đặt tên function riêng)_

### Dependencies
- Task 0.5

### Expected Result
- `app.ts` export một Express app instance
- App đã có `express.json()` middleware
- App chưa có routes (placeholder)

### Validation Checklist
- [ ] `app.ts` export được `app`
- [ ] Không có TypeScript error
- [ ] Import `express` hoạt động

---

## Task 0.7 — Create `server.ts`

### Goal
Tạo entry point của server: import `app`, bind port, và start listening.

### Related Docs
- `SYSTEM_ARCHITECTURE.md` §6.1 (Runtime Topology — port 3000)

### Files Created
- `src/server.ts`

### Functions
- `startServer()`

### Dependencies
- Task 0.6

### Expected Result
- `startServer()` start Express trên port 3000 (hoặc từ env)
- Log ra console "Server running on port 3000"

### Validation Checklist
- [ ] `npm run dev` không lỗi
- [ ] Server start thành công

---

## Task 0.8 — Verify Hello World

### Goal
Thêm một route `/health` để xác nhận server chạy đúng end-to-end.

### Related Docs
_(không có)_

### Files Created
_(không tạo file mới — edit `app.ts`)_

### Functions
_(không có — inline route handler)_

### Dependencies
- Task 0.7

### Expected Result
- `GET /health` trả về `{ "status": "ok" }`
- Status code `200`

### Validation Checklist
- [ ] `npm run dev` khởi động không lỗi
- [ ] `GET http://localhost:3000/health` trả về `{ "status": "ok" }`
- [ ] Không có TypeScript error
- [ ] Không có ESLint error
- [ ] Có thể commit code

---

---

# Phase 1 — Environment & Configuration

**Goal:** Tạo lớp config tập trung để đọc biến môi trường và khởi tạo kết nối tới PostgreSQL và Redis.

---

## Task 1.1 — Create Environment Files

### Goal
Tạo `.env` và `.env.example` với đầy đủ các biến cần thiết.

### Related Docs
- `SYSTEM-OVERVIEW.md` §1 (Project Snapshot)
- `CACHE-DESIGN.md` §2 (Redis Usage Boundaries)

### Files Created
- `.env` (không commit — đã có trong `.gitignore`)
- `.env.example` (commit — template không có giá trị thật)

### Functions
_(không có)_

### Dependencies
- Task 0.1

### Expected Result
`.env.example` có đủ các key sau (không có giá trị thật):

```
NODE_ENV=
PORT=
DATABASE_URL=
REDIS_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES_IN=
JWT_REFRESH_EXPIRES_IN=
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=
```

### Validation Checklist
- [ ] `.env.example` được commit
- [ ] `.env` không được commit (có trong `.gitignore`)
- [ ] Tất cả key cần thiết có mặt trong `.env.example`

---

## Task 1.2 — Create `config/env.ts`

### Goal
Đọc và validate biến môi trường khi app khởi động. Fail fast nếu thiếu biến quan trọng.

### Related Docs
- `SYSTEM-OVERVIEW.md` §1

### Files Created
- `src/config/env.ts`

### Functions
- `validateEnv()` — gọi khi app start, throw error nếu thiếu biến

### Dependencies
- Task 1.1

### Expected Result
- `config/env.ts` export một object với tất cả env vars đã typed
- Nếu `DATABASE_URL` hoặc `JWT_ACCESS_SECRET` thiếu → throw Error khi import

### Validation Checklist
- [ ] Import `env` từ `config/env.ts` không lỗi TypeScript
- [ ] Thiếu `DATABASE_URL` trong `.env` → app crash với message rõ ràng
- [ ] Không hardcode giá trị mặc định cho secrets

---

## Task 1.3 — Create `config/prisma.ts`

### Goal
Tạo Prisma Client singleton và export để dùng trong toàn bộ project.

### Related Docs
- `DATABASE-DESIGN.md` §11 (Prisma Considerations)
- `SYSTEM-OVERVIEW.md` §1

### Files Created
- `src/config/prisma.ts`

### Functions
_(không có function — chỉ export `prisma` instance)_

### Dependencies
- Task 1.2
- Task 2.6 (migration chạy trước khi dùng được — nhưng file này cần tạo sớm)

### Expected Result
- `src/config/prisma.ts` export `prisma` (instance của `PrismaClient`)
- Pattern singleton: tránh tạo nhiều connection trong development (hot reload)

### Validation Checklist
- [ ] `import { prisma } from '@/config/prisma'` không lỗi TypeScript
- [ ] Chỉ có một instance `PrismaClient` trong cả app

---

## Task 1.4 — Create `config/redis.ts`

### Goal
Tạo Redis client singleton (ioredis) và export để dùng chung.

### Related Docs
- `CACHE-DESIGN.md` §1
- `CONCURRENCY-DESIGN.md` §7 (Idempotency — Redis key pattern)

### Files Created
- `src/config/redis.ts`

### Functions
_(không có function — chỉ export `redis` instance)_

### Dependencies
- Task 1.2

### Expected Result
- `src/config/redis.ts` export `redis` (instance của `Redis` từ `ioredis`)
- Kết nối tới URL từ `env.REDIS_URL`
- Xử lý event `error` cơ bản (log error, không crash)

### Validation Checklist
- [ ] Import `redis` từ `config/redis.ts` không lỗi TypeScript
- [ ] Khi Redis không chạy: app log error nhưng không crash ngay khi import

---

## Task 1.5 — Verify Infrastructure Connections

### Goal
Kiểm tra kết nối thực tế tới PostgreSQL và Redis khi app khởi động.

### Related Docs
- `SYSTEM-OVERVIEW.md` §1

### Files Created
_(edit `src/server.ts`)_

### Functions
- `checkDatabaseConnection()` — gọi `prisma.$connect()`
- `checkRedisConnection()` — gọi `redis.ping()`

### Dependencies
- Task 1.3
- Task 1.4
- Task 0.7

### Expected Result
- Khi `npm run dev`, console log:
  - "Database connected successfully"
  - "Redis connected successfully"
- Nếu kết nối fail → log lỗi và process.exit(1)

### Validation Checklist
- [ ] PostgreSQL đang chạy → log "Database connected"
- [ ] Redis đang chạy → log "Redis connected"
- [ ] Tắt PostgreSQL → app exit với message lỗi rõ ràng

---

---

# Phase 2 — Database Schema (Prisma)

**Goal:** Định nghĩa toàn bộ 9 tables trong `schema.prisma`, chạy migration, và seed dữ liệu mẫu.

---

## Task 2.1 — Initialize Prisma

### Goal
Chạy `prisma init` để tạo `prisma/schema.prisma` và cấu hình provider PostgreSQL.

### Related Docs
- `DATABASE-DESIGN.md` §11 (Prisma Considerations)

### Files Created
- `prisma/schema.prisma` (generated + edited)

### Functions
_(không có)_

### Dependencies
- Task 1.2 (cần `DATABASE_URL` trong `.env`)

### Expected Result
- `prisma/schema.prisma` có `provider = "postgresql"` và `url = env("DATABASE_URL")`
- `generator client` block đúng

### Validation Checklist
- [ ] `prisma/schema.prisma` tồn tại
- [ ] `npx prisma validate` không báo lỗi

---

## Task 2.2 — Define Prisma Enums

### Goal
Định nghĩa tất cả Prisma enums khớp với các enum trong `DATABASE-DESIGN.md`.

### Related Docs
- `DATABASE-DESIGN.md` §11 (Enum mapping)
- `DATABASE-DESIGN.md` §9 (Booking State Machine)

### Files Created
_(edit `prisma/schema.prisma`)_

### Functions
_(không có)_

### Dependencies
- Task 2.1

### Expected Result
`schema.prisma` có các enums:
- `UserRole` — `CUSTOMER`, `OWNER`, `ADMIN`
- `UserStatus` — `PENDING_EMAIL_VERIFICATION`, `ACTIVE`, `SUSPENDED`
- `CafeStatus` — `PENDING_VERIFICATION`, `ACTIVE`, `SUSPENDED`, `REJECTED`
- `SeatType` — `STANDARD`, `PREMIUM`, `GROUP`
- `BookingStatus` — `CONFIRMED`, `CHECKED_IN`, `COMPLETED`, `CANCELLED`, `EXPIRED`
- `NotificationChannel` — `EMAIL`, `SMS`, `IN_APP`
- `NotificationType` — `BOOKING_CONFIRMATION`, `BOOKING_REMINDER`, `BOOKING_CANCELLATION`, `BOOKING_EXPIRED`, `EMAIL_VERIFICATION`, `ACCOUNT_SUSPENDED`
- `NotificationStatus` — `PENDING`, `SENT`, `FAILED`, `SKIPPED`

### Validation Checklist
- [ ] `npx prisma validate` không báo lỗi
- [ ] Tất cả 8 enums có mặt trong file

---

## Task 2.3 — Define `users` & `customer_profiles` Models

### Goal
Định nghĩa Prisma model cho `users` và `customer_profiles` bao gồm tất cả fields, relations, và unique constraints.

### Related Docs
- `DATABASE-DESIGN.md` §3.1 (users), §3.2 (customer_profiles)
- `DATABASE-DESIGN.md` §4 (Relationships — 1:1)
- `DATABASE-DESIGN.md` §7 (Soft Delete — `deletedAt` trên users)

### Files Created
_(edit `prisma/schema.prisma`)_

### Functions
_(không có)_

### Dependencies
- Task 2.2

### Expected Result
- `User` model: tất cả columns từ §3.1, `@@map("users")`, unique `email`, soft delete `deletedAt`
- `CustomerProfile` model: tất cả columns từ §3.2, `@@map("customer_profiles")`, `@unique userId`
- Relation `User.customerProfile CustomerProfile?` và `CustomerProfile.user User @relation(fields: [userId])`
- `onDelete: Cascade` trên `CustomerProfile.userId`

### Validation Checklist
- [ ] `npx prisma validate` không báo lỗi
- [ ] `User` có `id`, `email`, `passwordHash`, `role`, `status`, `deletedAt`
- [ ] `CustomerProfile` có `userId` unique

---

## Task 2.4 — Define `cafes`, `zones`, `seats` Models

### Goal
Định nghĩa models cho café, zone, seat với đầy đủ fields, relations, và soft delete.

### Related Docs
- `DATABASE-DESIGN.md` §3.3 (cafes), §3.4 (zones), §3.5 (seats)
- `DATABASE-DESIGN.md` §4 (Relationships — 1:M)
- `DATABASE-DESIGN.md` §7 (Soft Delete — zones, seats)

### Files Created
_(edit `prisma/schema.prisma`)_

### Functions
_(không có)_

### Dependencies
- Task 2.3

### Expected Result
- `Cafe` model: tất cả columns từ §3.3, `@@map("cafes")`, `Json` type cho `operatingHours` và `amenities`
- `Zone` model: tất cả columns từ §3.4, soft delete `deletedAt`
- `Seat` model: tất cả columns từ §3.5, soft delete `deletedAt`
- Relations: `Cafe → User (owner)`, `Zone → Cafe`, `Seat → Zone`
- `onDelete: Restrict` trên `Cafe.ownerId` và `Zone.cafeId`, `Seat.zoneId`

### Validation Checklist
- [ ] `npx prisma validate` không báo lỗi
- [ ] `Cafe` có `operatingHours Json`, `amenities Json`
- [ ] `Zone` và `Seat` có `deletedAt DateTime?`

---

## Task 2.5 — Define `bookings`, `booking_history`, `notification_logs`, `audit_logs` Models

### Goal
Định nghĩa models cho booking lifecycle và observability tables.

### Related Docs
- `DATABASE-DESIGN.md` §3.6 (bookings), §3.7 (booking_history), §3.8 (notification_logs), §3.9 (audit_logs)
- `DATABASE-DESIGN.md` §5 (Constraints — partial unique trên bookings)
- `DATABASE-DESIGN.md` §9 (Booking State Machine)

### Files Created
_(edit `prisma/schema.prisma`)_

### Functions
_(không có)_

### Dependencies
- Task 2.4

### Expected Result
- `Booking` model: tất cả columns từ §3.6, unique `confirmationNumber`, relations tới `User`, `Seat`, `Cafe`
- `BookingHistory` model: append-only (không có `updatedAt`), relation tới `Booking`
- `NotificationLog` model: tất cả columns từ §3.8, `isRead Boolean` cho in-app
- `AuditLog` model: tất cả columns từ §3.9, immutable
- `onDelete: Cascade` trên `BookingHistory.bookingId`
- `onDelete: SetNull` trên `AuditLog.actorId`

### Validation Checklist
- [ ] `npx prisma validate` không báo lỗi
- [ ] `Booking` có `confirmationNumber String @unique`
- [ ] `BookingHistory` không có `updatedAt`
- [ ] Tất cả 9 models được định nghĩa

---

## Task 2.6 — Run Initial Migration

### Goal
Chạy `prisma migrate dev` để tạo database schema từ `schema.prisma`.

### Related Docs
- `DATABASE-DESIGN.md` §11 (Migrations workflow)

### Files Created
- `prisma/migrations/` (auto-generated)

### Functions
_(không có)_

### Dependencies
- Task 2.5
- Task 1.3 (Prisma client)

### Expected Result
- Migration file được tạo trong `prisma/migrations/`
- Tất cả 9 tables được tạo trong PostgreSQL
- `npx prisma studio` mở được và thấy tất cả tables

### Validation Checklist
- [ ] `npx prisma migrate dev --name init` chạy thành công
- [ ] `prisma/migrations/` có file migration
- [ ] Kết nối psql và `\dt` thấy đủ 9 tables

---

## Task 2.7 — Add Partial Indexes via Raw SQL Migration

### Goal
Thêm các partial unique indexes mà Prisma không hỗ trợ native (đặc biệt là double-booking prevention index).

### Related Docs
- `DATABASE-DESIGN.md` §5 (Constraints — Partial unique indexes)
- `DATABASE-DESIGN.md` §6 (Index Strategy)
- `CONCURRENCY-DESIGN.md` §6 (Database Constraints)

### Files Created
- `prisma/migrations/<timestamp>_add_partial_indexes/migration.sql` (tạo bằng `--create-only` rồi edit thủ công)

### Functions
_(không có)_

### Dependencies
- Task 2.6

### Expected Result
Migration SQL chứa các indexes sau:

**Critical (double-booking prevention):**
```
uq_bookings_seat_active_slot ON bookings (seat_id, start_time, end_time) 
WHERE (status IN ('CONFIRMED', 'CHECKED_IN'))
```

**Query performance indexes (từ §6):**
- `idx_users_email_active` — partial index on `users(email)` where `deleted_at IS NULL`
- `idx_cafes_city_status` — partial index on `cafes(city, status)` where `status = 'ACTIVE'`
- `idx_bookings_seat_active_time` — partial index on `bookings(seat_id, start_time, end_time)` where active statuses
- `idx_bookings_customer_status` — on `bookings(customer_id, status, start_time DESC)`
- `idx_bookings_cafe_start` — on `bookings(cafe_id, start_time)`

### Validation Checklist
- [ ] Migration chạy thành công: `npx prisma migrate deploy`
- [ ] `SELECT indexname FROM pg_indexes WHERE tablename = 'bookings'` thấy `uq_bookings_seat_active_slot`
- [ ] Không có lỗi SQL

---

## Task 2.8 — Write Seed Script

### Goal
Tạo seed script để khởi tạo dữ liệu mẫu cho local development.

### Related Docs
- `DATABASE-DESIGN.md` §11 (Seed script)
- `USE_CASES.md` (business rules — active accounts)

### Files Created
- `prisma/seed.ts`

### Functions
- `main()` — entry point của seed
- `seedAdmin()` — tạo một admin user
- `seedCafeOwner()` — tạo một owner user
- `seedCafe()` — tạo café với zones và seats
- `seedCustomer()` — tạo một customer user

### Dependencies
- Task 2.6

### Expected Result
Sau khi chạy `npx prisma db seed`:
- 1 admin user: `admin@example.com` / `Admin123!`
- 1 owner user: `owner@example.com` / `Owner123!`
- 1 café `ACTIVE` với 2 zones và 5 seats mỗi zone
- 1 customer user: `customer@example.com` / `Customer123!`

**Script trong `package.json`:**
```
"prisma": { "seed": "tsx prisma/seed.ts" }
```

### Validation Checklist
- [ ] `npx prisma db seed` chạy không lỗi
- [ ] `npx prisma studio` thấy đủ dữ liệu seed
- [ ] Chạy seed lần 2 không tạo duplicate (dùng `upsert`)

---

## Task 2.9 — Verify Full Schema

### Goal
Kiểm tra toàn bộ schema đã đúng bằng cách query trực tiếp và kiểm tra Prisma types.

### Related Docs
- `DATABASE-DESIGN.md` (toàn bộ)

### Files Created
_(không có)_

### Functions
_(không có)_

### Dependencies
- Task 2.8

### Expected Result
- `npx prisma generate` thành công
- TypeScript types cho tất cả models được generate trong `node_modules/.prisma/client`
- Có thể import `Prisma.BookingCreateInput` và các types khác

### Validation Checklist
- [ ] `npx prisma generate` không lỗi
- [ ] `npx prisma validate` không lỗi
- [ ] Có thể import Prisma types trong TypeScript
- [ ] Tất cả 9 tables tồn tại trong DB với đúng columns

---

---

# Phase 3 — Shared / Common Layer

**Goal:** Tạo các utilities dùng chung: error classes, response format, pagination, và global error handler.

---

## Task 3.1 — Create Error Classes

### Goal
Tạo class `AppError` và các subclass cho từng loại lỗi business. Đây là cách throw lỗi thống nhất trong toàn project.

### Related Docs
- `API-SPECIFICATION.md` §3 (Error Codes)
- `API-SPECIFICATION.md` §2.2 (Error Response format)

### Files Created
- `src/common/errors.ts`

### Functions
- `class AppError` — base class với `statusCode`, `errorCode`, `message`
- `class ValidationError` — 422
- `class NotFoundError` — 404
- `class UnauthorizedError` — 401
- `class ForbiddenError` — 403
- `class ConflictError` — 409
- `class RateLimitError` — 429

### Dependencies
- Task 0.5

### Expected Result
- `throw new NotFoundError('BOOKING_NOT_FOUND')` hoạt động
- Mỗi class extend `AppError`
- `AppError` có `isOperational: true` để phân biệt với unexpected errors

### Validation Checklist
- [ ] Tất cả error classes có `statusCode` đúng
- [ ] `AppError` có `message`, `statusCode`, `errorCode`
- [ ] Không có TypeScript error

---

## Task 3.2 — Create HTTP Response Helpers

### Goal
Tạo helper functions để trả về response JSON theo đúng format của `API-SPECIFICATION.md`.

### Related Docs
- `API-SPECIFICATION.md` §2.1 (Success Response)
- `API-SPECIFICATION.md` §2.2 (Error Response)

### Files Created
- `src/common/response.ts`

### Functions
- `sendSuccess(res, data, message, statusCode)` — trả về `{ success: true, message, data }`
- `sendPaginatedSuccess(res, items, nextCursor, hasMore, message)` — trả về paginated format

### Dependencies
- Task 3.1

### Expected Result
- Tất cả controller dùng `sendSuccess()` thay vì gọi `res.json()` trực tiếp
- Format response luôn nhất quán

### Validation Checklist
- [ ] `sendSuccess(res, { id: '1' }, 'Created')` trả về đúng format theo §2.1
- [ ] Không có TypeScript error

---

## Task 3.3 — Create Pagination Helpers

### Goal
Tạo helper để build cursor-based pagination từ Prisma query results.

### Related Docs
- `API-SPECIFICATION.md` §1.6 (Pagination — cursor-based)

### Files Created
- `src/common/pagination.ts`

### Functions
- `parsePaginationParams(query)` — parse `limit` và `cursor` từ query params
- `buildCursorPaginationResult(items, limit)` — trả về `{ items, nextCursor, hasMore }`

### Dependencies
- Task 3.2

### Expected Result
- `parsePaginationParams({ limit: '20', cursor: 'xyz' })` → `{ limit: 20, cursor: 'xyz' }`
- `buildCursorPaginationResult(items, limit)` → tự tính `nextCursor` và `hasMore`

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] `hasMore: false` khi items < limit
- [ ] `hasMore: true` khi items == limit (có thêm dữ liệu)

---

## Task 3.4 — Create Global Error Handler Middleware

### Goal
Tạo Express error handler middleware để catch tất cả errors và trả về response chuẩn.

### Related Docs
- `API-SPECIFICATION.md` §2.2 (Error Response format)
- `API-SPECIFICATION.md` §3.7 (System errors — 500)
- `SYSTEM_ARCHITECTURE.md` §3 (Gateway Layer — error handling)

### Files Created
- `src/middleware/errorHandler.ts`

### Functions
- `errorHandler(err, req, res, next)` — Express error handler (4 params)

### Dependencies
- Task 3.1
- Task 3.2

### Expected Result
- `AppError` → trả về `{ success: false, error: err.errorCode, message: err.message }`
- Unexpected errors (non-`AppError`) → trả về `{ success: false, error: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong' }`
- Không lộ stack trace trong production (`NODE_ENV !== 'development'`)
- Log tất cả errors

### Validation Checklist
- [ ] `throw new NotFoundError('BOOKING_NOT_FOUND')` từ controller → response `{ success: false, error: 'BOOKING_NOT_FOUND' }` status 404
- [ ] Unexpected `throw new Error('oops')` → response status 500 không lộ details

---

## Task 3.5 — Create Request ID Middleware

### Goal
Gán `X-Request-Id` unique cho mỗi request để phục vụ tracing và debug.

### Related Docs
- `API-SPECIFICATION.md` §1.5 (Request Correlation)

### Files Created
- `src/middleware/requestId.ts`

### Functions
- `requestIdMiddleware(req, res, next)` — gán `req.id` và set response header `X-Request-Id`

### Dependencies
- Task 0.5

### Expected Result
- Mỗi response có header `X-Request-Id` là UUID

### Validation Checklist
- [ ] `GET /health` response có header `X-Request-Id`
- [ ] Mỗi request có ID khác nhau

---

---

# Phase 4 — Middleware

**Goal:** Tạo các middleware quan trọng: JWT authentication, RBAC authorization, rate limiting. Đăng ký tất cả vào `app.ts`.

---

## Task 4.1 — Create JWT Auth Middleware

### Goal
Tạo middleware để extract và verify JWT access token từ `Authorization: Bearer <token>` header.

### Related Docs
- `API-SPECIFICATION.md` §1.3 (Authentication Header)
- `API-SPECIFICATION.md` §3.1 (Auth errors)
- `REQUEST-FLOW.md` (HTTP middleware chain)

### Files Created
- `src/middleware/authenticate.ts`

### Functions
- `authenticate(req, res, next)` — verify JWT, gán `req.user = { id, email, role }`
- `optionalAuthenticate(req, res, next)` — như `authenticate` nhưng không throw nếu không có token

### Dependencies
- Task 3.1 (UnauthorizedError)

### Expected Result
- Valid token → `req.user` được set, gọi `next()`
- Invalid token → throw `UnauthorizedError('UNAUTHORIZED')`
- Missing token → throw `UnauthorizedError('UNAUTHORIZED')`
- Expired token → throw `UnauthorizedError('AUTH_TOKEN_EXPIRED')`

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] `req.user` có type đúng (`{ id: string, email: string, role: UserRole }`)

---

## Task 4.2 — Create RBAC Middleware

### Goal
Tạo middleware để kiểm tra role của user có đủ quyền truy cập endpoint không.

### Related Docs
- `API-SPECIFICATION.md` §13 (Authorization Matrix)
- `API-SPECIFICATION.md` §3.1 (FORBIDDEN error)
- `SYSTEM-OVERVIEW.md` §1 (RBAC: CUSTOMER, OWNER, ADMIN)

### Files Created
- `src/middleware/authorize.ts`

### Functions
- `authorize(...roles)` — factory function trả về middleware, check `req.user.role in roles`

### Dependencies
- Task 4.1
- Task 3.1 (ForbiddenError)

### Expected Result
- `authorize('ADMIN')` trên route → non-admin user → 403 FORBIDDEN
- `authorize('CUSTOMER', 'OWNER')` → admin bị reject

### Validation Checklist
- [ ] `authorize('ADMIN')` + CUSTOMER token → 403
- [ ] `authorize('ADMIN')` + ADMIN token → next()

---

## Task 4.3 — Create Rate Limiter Middleware

### Goal
Tạo rate limiter dùng Redis để giới hạn request theo IP hoặc user.

### Related Docs
- `API-SPECIFICATION.md` §6.1 (5 req/hour/IP cho register)
- `API-SPECIFICATION.md` §6.2 (10 req/15 min/IP cho login)
- `API-SPECIFICATION.md` §8.1 (20 req/min/user cho create booking)
- `CONCURRENCY-DESIGN.md` §2 (Rate limit counters — Redis INCR)

### Files Created
- `src/middleware/rateLimiter.ts`

### Functions
- `createRateLimiter(options)` — factory function tạo rate limiter middleware với `windowMs` và `max`
- `registerRateLimiter` — preset cho register endpoint
- `loginRateLimiter` — preset cho login endpoint
- `bookingRateLimiter` — preset cho create booking

### Dependencies
- Task 1.4 (redis client)
- Task 3.1 (RateLimitError)

### Expected Result
- Vượt quá limit → `429 RATE_LIMIT_EXCEEDED`
- Dùng `express-rate-limit` với Redis store, hoặc implement đơn giản với `ioredis INCR + EXPIRE`

### Validation Checklist
- [ ] Gọi endpoint hơn `max` lần trong window → nhận được 429
- [ ] Sau khi window reset → có thể gọi tiếp

---

## Task 4.4 — Register All Middleware in `app.ts`

### Goal
Đăng ký tất cả middleware toàn cục vào `app.ts` theo đúng thứ tự.

### Related Docs
- `REQUEST-FLOW.md` (HTTP middleware chain: Morgan → Request ID → Rate Limiter → Auth → RBAC → Validator → Error Handler)
- `API-SPECIFICATION.md` §4 (Global Middleware)

### Files Created
_(edit `src/app.ts`)_

### Functions
_(không có)_

### Dependencies
- Task 3.4 (errorHandler)
- Task 3.5 (requestId)
- Task 4.1 (authenticate)
- Task 4.3 (rateLimiter)

### Expected Result
`app.ts` register middleware theo thứ tự:
1. `requestIdMiddleware`
2. `morgan` (HTTP logging)
3. `express.json()`
4. Global rate limiter (optional — có thể defer)
5. Routes (sẽ add dần)
6. `errorHandler` (phải là middleware cuối cùng)

### Validation Checklist
- [ ] `GET /health` trả về `X-Request-Id` header
- [ ] Morgan log HTTP requests ra console
- [ ] `errorHandler` là middleware cuối cùng trong `app.ts`

---

---

# Phase 5 — Auth Module

**Goal:** Implement đầy đủ Authentication: register, login, refresh token, logout, và get current user.

---

## Task 5.1 — Create `auth.dto.ts` & `auth.validator.ts`

### Goal
Định nghĩa TypeScript types cho Auth requests/responses và Zod schemas để validate input.

### Related Docs
- `API-SPECIFICATION.md` §6.1 (Register — validation rules)
- `API-SPECIFICATION.md` §6.2 (Login)
- `API-SPECIFICATION.md` §6.3 (Refresh)
- `API-SPECIFICATION.md` §6.4 (Register Owner)

### Files Created
- `src/modules/auth/auth.dto.ts`
- `src/modules/auth/auth.validator.ts`

### Functions
**auth.dto.ts — types/interfaces:**
- `RegisterCustomerDto`
- `RegisterOwnerDto`
- `LoginDto`
- `RefreshTokenDto`
- `AuthTokensResponse`
- `UserResponse`

**auth.validator.ts — Zod schemas:**
- `registerCustomerSchema`
- `registerOwnerSchema`
- `loginSchema`
- `refreshTokenSchema`

### Dependencies
- Task 0.5

### Expected Result
- `registerCustomerSchema` validate: email format, password min 8 chars + letter + number, fullName 2-150 chars
- Types match API-SPECIFICATION.md response shapes

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] `registerCustomerSchema.parse({ email: 'bad' })` throw ZodError

---

## Task 5.2 — Create `auth.repository.ts`

### Goal
Tạo tầng data access cho Auth module — tất cả Prisma queries liên quan đến users và customer_profiles.

### Related Docs
- `DATABASE-DESIGN.md` §3.1 (users), §3.2 (customer_profiles)
- `REQUEST-FLOW.md` RF-01, RF-02

### Files Created
- `src/modules/auth/auth.repository.ts`

### Functions
- `findUserByEmail(email)` — tìm user active (deletedAt IS NULL)
- `findUserById(id)` — tìm user theo ID
- `createUserWithProfile(data)` — tạo user + customer_profile trong transaction
- `createOwnerUser(data)` — tạo user với role OWNER
- `updateUserLoginAttempts(userId, attempts)` — cập nhật failed attempts
- `updateUserLockedUntil(userId, lockedUntil)` — set lock
- `updateUserStatus(userId, status)` — update status
- `updateEmailVerifiedAt(userId)` — set email verified

### Dependencies
- Task 1.3 (prisma client)

### Expected Result
- Tất cả functions trả về Prisma types
- `createUserWithProfile` dùng `prisma.$transaction()`

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] `findUserByEmail` filter `deletedAt: null`
- [ ] `createUserWithProfile` wrap trong transaction

---

## Task 5.3 — Create `password.service.ts` & `jwt.service.ts`

### Goal
Tạo hai service nhỏ cho password hashing và JWT issuance/verification.

### Related Docs
- `API-SPECIFICATION.md` §6.2 (login — hash compare)
- `API-SPECIFICATION.md` §6.3 (refresh token flow)
- `CACHE-DESIGN.md` §2 (Redis — refresh tokens, JWT blacklist)
- `SYSTEM-OVERVIEW.md` §1 (JWT access + refresh tokens)

### Files Created
- `src/modules/auth/password.service.ts`
- `src/modules/auth/jwt.service.ts`

### Functions
**password.service.ts:**
- `hashPassword(plaintext)` — bcryptjs hash (rounds = 12)
- `comparePassword(plaintext, hash)` — bcryptjs compare

**jwt.service.ts:**
- `signAccessToken(payload)` — sign JWT với secret + expiry
- `signRefreshToken(payload)` — sign refresh JWT
- `verifyAccessToken(token)` — verify và trả về payload
- `verifyRefreshToken(token)` — verify refresh token
- `storeRefreshToken(userId, tokenId, token)` — lưu vào Redis: key `refresh:{userId}:{tokenId}`
- `getRefreshToken(userId, tokenId)` — đọc từ Redis
- `revokeRefreshToken(userId, tokenId)` — DEL khỏi Redis
- `revokeAllUserTokens(userId)` — SCAN + DEL `refresh:{userId}:*`

### Dependencies
- Task 1.2 (env config — JWT secrets)
- Task 1.4 (redis client)

### Expected Result
- `hashPassword('password123')` → bcrypt hash string
- `comparePassword('password123', hash)` → true
- `signAccessToken({ id, role })` → JWT string
- `storeRefreshToken` lưu được vào Redis với TTL

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] `comparePassword('wrong', hash)` → false
- [ ] `verifyAccessToken(expiredToken)` throw error

---

## Task 5.4 — Create `auth.service.ts` — Register

### Goal
Implement logic đăng ký Customer theo RF-01: validate uniqueness, hash password, tạo user + profile trong TX, issue JWT, enqueue verification email.

### Related Docs
- `REQUEST-FLOW.md` RF-01 (Register)
- `DATABASE-DESIGN.md` §3.1 (users), §3.2
- `API-SPECIFICATION.md` §6.1 (business rules)
- `QUEUE-DESIGN.md` §5 (`SEND_VERIFICATION_EMAIL`)

### Files Created
- `src/modules/auth/auth.service.ts`

### Functions
- `registerCustomer(dto)` — main register flow
  1. Check email uniqueness (gọi repository)
  2. Hash password
  3. TX: create user + customer_profile + audit_log
  4. Issue access + refresh tokens
  5. Store refresh token in Redis
  6. Enqueue `SEND_VERIFICATION_EMAIL` (post-commit)
  7. Return user + tokens

### Dependencies
- Task 5.2 (auth.repository)
- Task 5.3 (password.service, jwt.service)
- Task 3.1 (ConflictError — EMAIL_ALREADY_REGISTERED)

### Expected Result
- Duplicate email → throw `ConflictError('EMAIL_ALREADY_REGISTERED')`
- Success → user created in DB với status `PENDING_EMAIL_VERIFICATION`
- Tokens trả về đúng format

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] Gọi `registerCustomer` với email trùng → ConflictError
- [ ] Transaction rollback nếu DB fail

---

## Task 5.5 — Create `auth.service.ts` — Register Owner

### Goal
Implement logic đăng ký Owner: tạo user OWNER + café PENDING_VERIFICATION trong cùng một transaction.

### Related Docs
- `REQUEST-FLOW.md` RF-10 (Create Café — owner registration path)
- `API-SPECIFICATION.md` §6.4 (Register Owner)
- `DATABASE-DESIGN.md` §3.3 (cafes — PENDING_VERIFICATION default)
- `QUEUE-DESIGN.md` §5 (`ADMIN_NEW_CAFE_PENDING`)

### Files Created
_(edit `src/modules/auth/auth.service.ts`)_

### Functions
- `registerOwner(dto)` — tạo owner user + café trong TX, issue JWT, enqueue admin notification email

### Dependencies
- Task 5.4

### Expected Result
- User với role `OWNER` và café với status `PENDING_VERIFICATION` được tạo trong cùng TX
- Enqueue email `ADMIN_NEW_CAFE_PENDING` post-commit

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] User role = OWNER sau khi tạo
- [ ] Café status = PENDING_VERIFICATION

---

## Task 5.6 — Create `auth.service.ts` — Login, Refresh, Logout

### Goal
Implement login (với lockout), refresh token, và logout.

### Related Docs
- `REQUEST-FLOW.md` RF-02 (Login)
- `API-SPECIFICATION.md` §6.2 (Login — lock after 5 attempts)
- `API-SPECIFICATION.md` §6.3 (Refresh Token)
- `API-SPECIFICATION.md` §6.5 (Logout)
- `CONCURRENCY-DESIGN.md` §2 (Concurrent registration — Redis atomic INCR)

### Files Created
_(edit `src/modules/auth/auth.service.ts`)_

### Functions
- `login(dto)` — validate credentials, handle lockout, issue tokens, write audit log
- `refreshToken(refreshToken)` — verify + rotate tokens
- `logout(userId, tokenId)` — revoke refresh token
- `getCurrentUser(userId)` — load user + customer profile

### Dependencies
- Task 5.4
- Task 5.3 (jwt.service, password.service)

### Expected Result
- Wrong password 5 lần → `AccountLockedError`
- `logout` → Redis refresh key bị DEL
- `refreshToken` với token không tồn tại → `AUTH_REFRESH_TOKEN_INVALID`

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] Login với wrong credentials → AUTH_INVALID_CREDENTIALS
- [ ] Login với locked account → ACCOUNT_LOCKED

---

## Task 5.7 — Create `auth.controller.ts`

### Goal
Tạo controller xử lý HTTP layer cho Auth module: parse request, gọi service, trả response.

### Related Docs
- `API-SPECIFICATION.md` §6 (tất cả auth endpoints)
- `API-SPECIFICATION.md` §2 (Response format)

### Files Created
- `src/modules/auth/auth.controller.ts`

### Functions
- `register(req, res, next)` — POST /auth/register
- `registerOwner(req, res, next)` — POST /auth/register-owner
- `login(req, res, next)` — POST /auth/login
- `refresh(req, res, next)` — POST /auth/refresh
- `logout(req, res, next)` — POST /auth/logout
- `getMe(req, res, next)` — GET /auth/me

### Dependencies
- Task 5.6 (auth.service)
- Task 3.2 (sendSuccess)

### Expected Result
- Controller chỉ lo request/response — không chứa business logic
- Tất cả errors đều gọi `next(err)` để errorHandler xử lý

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] Controller không chứa Prisma queries trực tiếp

---

## Task 5.8 — Create `auth.routes.ts` & Register Routes

### Goal
Tạo Express router cho Auth module và đăng ký vào `app.ts`.

### Related Docs
- `API-SPECIFICATION.md` §12 (Endpoint Index — auth routes)
- `API-SPECIFICATION.md` §4 (Global Middleware — validation)

### Files Created
- `src/modules/auth/auth.routes.ts`
- `src/routes/index.ts`

### Functions
_(không có — chỉ Express router setup)_

### Dependencies
- Task 5.7 (auth.controller)
- Task 4.3 (rateLimiter)

### Expected Result
Routes được đăng ký:
- `POST /api/v1/auth/register` + `registerRateLimiter` + Zod validation
- `POST /api/v1/auth/register-owner`
- `POST /api/v1/auth/login` + `loginRateLimiter`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout` + `authenticate`
- `GET /api/v1/auth/me` + `authenticate`

### Validation Checklist
- [ ] `routes/index.ts` mount `/api/v1` prefix
- [ ] Auth routes đăng ký trong `routes/index.ts`
- [ ] `app.ts` import và use `routes/index.ts`

---

## Task 5.9 — Verify Auth Endpoints

### Goal
Test tất cả auth endpoints hoạt động đúng bằng HTTP client (Postman / curl / Thunder Client).

### Related Docs
- `API-SPECIFICATION.md` §6 (tất cả auth endpoints)

### Files Created
_(không có)_

### Functions
_(không có)_

### Dependencies
- Task 5.8

### Expected Result
Manual test thành công:
- `POST /api/v1/auth/register` → 201 + tokens
- `POST /api/v1/auth/login` → 200 + tokens
- `GET /api/v1/auth/me` với valid token → 200 + user info
- `GET /api/v1/auth/me` không có token → 401
- `POST /api/v1/auth/refresh` → 200 + new tokens
- `POST /api/v1/auth/logout` → 200

### Validation Checklist
- [ ] Register trả về `201` với `data.tokens`
- [ ] Login sai password → `401 AUTH_INVALID_CREDENTIALS`
- [ ] `/auth/me` không có token → `401 UNAUTHORIZED`
- [ ] Refresh với invalid token → `401 AUTH_REFRESH_TOKEN_INVALID`
- [ ] Không có TypeScript error
- [ ] Không có ESLint error
- [ ] Có thể commit code

---

---

# Phase 6 — Café Module — Public Read Paths

**Goal:** Implement tất cả public read endpoints cho cafés và seats, bao gồm Redis cache.

---

## Task 6.1 — Create `cafe.repository.ts`

### Goal
Tạo tầng data access cho Café module — read queries.

### Related Docs
- `DATABASE-DESIGN.md` §3.3–3.5 (cafes, zones, seats)
- `DATABASE-DESIGN.md` §6 (Index Strategy — city/status index)
- `REQUEST-FLOW.md` RF-03, RF-13, RF-14, RF-15

### Files Created
- `src/modules/cafe/cafe.repository.ts`

### Functions
- `findManyActive(params)` — paginated list of ACTIVE cafés với city filter
- `searchActive(params)` — filter by city + amenities + optional time
- `findById(cafeId)` — full café profile, trả về null nếu không tìm thấy
- `findZonesWithSeats(cafeId)` — zones + active seats (deletedAt IS NULL, isActive = true)
- `countTotalSeats(cafeId)` — đếm số seat active của café

### Dependencies
- Task 1.3 (prisma client)
- Task 2.9 (schema đã migration)

### Expected Result
- `findManyActive` chỉ trả về cafés với `status = 'ACTIVE'`
- `findZonesWithSeats` filter `Zone.deletedAt IS NULL` và `Seat.isActive = true`, `Seat.deletedAt IS NULL`

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] `findManyActive` không trả về PENDING hoặc SUSPENDED cafés

---

## Task 6.2 — Create `cache.service.ts`

### Goal
Tạo service chung để đọc/ghi/xóa Redis cache theo pattern cache-aside đã thiết kế.

### Related Docs
- `CACHE-DESIGN.md` §3 (4 cache types)
- `CACHE-DESIGN.md` §4 (Cache Key Registry)
- `CACHE-DESIGN.md` §6 (Cache Flow)
- `CACHE-DESIGN.md` §7 (Write Path & Invalidation)

### Files Created
- `src/common/cache.service.ts`

### Functions
- `getFromCache<T>(key)` — GET từ Redis, parse JSON, trả về T hoặc null
- `setToCache(key, value, ttlSeconds)` — SETEX với TTL
- `deleteFromCache(key)` — DEL key
- `deleteByPattern(pattern)` — SCAN + UNLINK cho wildcard keys (e.g. `availability:{cafeId}:*`)
- `buildCafeListKey(paramsHash)` — trả về `cafes:list:{paramsHash}`
- `buildCafeDetailKey(cafeId)` — trả về `cafe:detail:{cafeId}`
- `buildCafeLayoutKey(cafeId)` — trả về `cafe:layout:{cafeId}`
- `buildAvailabilityKey(cafeId, date, slotHash)` — trả về `availability:{cafeId}:{date}:{slotHash}`
- `buildParamsHash(params)` — hash query params thành string ngắn

### Dependencies
- Task 1.4 (redis client)

### Expected Result
- `getFromCache('nonexistent')` → null (không throw)
- Redis down → tất cả operations return null/ignore error (degrade gracefully)
- `deleteByPattern('availability:cafe-1:*')` → xóa tất cả key match

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] Redis down → `getFromCache` return null, không crash app
- [ ] `deleteByPattern` xóa đúng keys

---

## Task 6.3 — Create `cafe.service.ts` — List & Search

### Goal
Implement business logic cho browse cafés và search cafés với cache-aside pattern.

### Related Docs
- `REQUEST-FLOW.md` RF-03 (Browse Cafés), RF-13 (Search Cafés)
- `CACHE-DESIGN.md` §5 (Cache Read/Write Matrix)
- `API-SPECIFICATION.md` §7.1, §7.2

### Files Created
- `src/modules/cafe/cafe.service.ts`

### Functions
- `listCafes(params)` — browse với pagination + city filter + cache
- `searchCafes(params)` — filter + optional time window + cache

### Dependencies
- Task 6.1 (cafe.repository)
- Task 6.2 (cache.service)

### Expected Result
- Cache hit → trả về cached data, không query DB
- Cache miss → query DB, set cache với TTL 5 min, trả về data
- Redis down → query DB trực tiếp, không fail

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] Gọi `listCafes` 2 lần với cùng params → lần 2 từ cache
- [ ] `status` param không được để filter PENDING/SUSPENDED cafés

---

## Task 6.4 — Create `cafe.service.ts` — Detail & Layout

### Goal
Implement `getCafeDetail` và `getCafeLayout` với cache.

### Related Docs
- `REQUEST-FLOW.md` RF-14 (Get Café Detail), RF-15 (Get Seat Layout)
- `CACHE-DESIGN.md` §4 (Cache Key Registry — TTL 10 min)
- `API-SPECIFICATION.md` §7.3, §7.4

### Files Created
_(edit `src/modules/cafe/cafe.service.ts`)_

### Functions
- `getCafeDetail(cafeId)` — trả về café profile + policies, cache 10 min
- `getCafeLayout(cafeId)` — trả về zones + seats, cache 10 min

### Dependencies
- Task 6.3

### Expected Result
- `getCafeDetail` với cafeId không tồn tại → throw `NotFoundError('CAFE_NOT_FOUND')`
- `getCafeDetail` với PENDING café → throw `NotFoundError('CAFE_NOT_AVAILABLE')`

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] PENDING café → 404 CAFE_NOT_AVAILABLE
- [ ] Cache được set sau miss

---

## Task 6.5 — Create `seat-availability.service.ts`

### Goal
Implement seat availability: load seats, overlay với active bookings, trả về trạng thái `AVAILABLE` / `BOOKED` cho từng seat.

### Related Docs
- `REQUEST-FLOW.md` RF-04 (View Seat Availability)
- `CACHE-DESIGN.md` §4 (availability key — TTL 30 sec)
- `API-SPECIFICATION.md` §7.5
- `DATABASE-DESIGN.md` §10 (Overlap detection query)

### Files Created
- `src/modules/cafe/seat-availability.service.ts`

### Functions
- `getSeatAvailability(cafeId, startTime, endTime, zoneId?)` — main function
- `buildAvailabilitySnapshot(seats, bookings)` — merge seats với bookings thành availability map

### Dependencies
- Task 6.2 (cache.service)
- Task 6.1 (cafe.repository)

### Expected Result
- Seat có active booking overlapping → `status: 'BOOKED'`
- Seat không có overlapping booking → `status: 'AVAILABLE'`
- Cache 30 sec
- Kết quả có thể stale tối đa 30 sec (chấp nhận được — booking TX là authoritative)

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] Seed 1 booking CONFIRMED → seat đó BOOKED, các seat khác AVAILABLE
- [ ] Cache được set, hit lần 2 không query DB

---

## Task 6.6 — Create `cafe.controller.ts` & `cafe.routes.ts`

### Goal
Tạo controller và routes cho tất cả public café endpoints.

### Related Docs
- `API-SPECIFICATION.md` §7 (Cafés & Seats endpoints)
- `API-SPECIFICATION.md` §12 (Endpoint Index)

### Files Created
- `src/modules/cafe/cafe.controller.ts`
- `src/modules/cafe/cafe.routes.ts`

### Functions
**cafe.controller.ts:**
- `listCafes(req, res, next)`
- `searchCafes(req, res, next)`
- `getCafeDetail(req, res, next)`
- `getSeatLayout(req, res, next)`
- `getSeatAvailability(req, res, next)`

### Dependencies
- Task 6.3, Task 6.4, Task 6.5

### Expected Result
Routes đăng ký:
- `GET /api/v1/cafes`
- `GET /api/v1/cafes/search`
- `GET /api/v1/cafes/:cafeId`
- `GET /api/v1/cafes/:cafeId/seats/layout`
- `GET /api/v1/cafes/:cafeId/seats/availability`

Tất cả public — không cần authenticate.

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] Tất cả 5 routes hoạt động

---

## Task 6.7 — Verify Café Read Endpoints

### Goal
Manual test tất cả public café endpoints.

### Related Docs
- `API-SPECIFICATION.md` §7

### Files Created
_(không có)_

### Functions
_(không có)_

### Dependencies
- Task 6.6

### Expected Result
- `GET /api/v1/cafes` → 200 + paginated list
- `GET /api/v1/cafes/search?city=hanoi` → 200 + filtered list
- `GET /api/v1/cafes/{id}` → 200 + café detail
- `GET /api/v1/cafes/{id}/seats/layout` → 200 + zones/seats
- `GET /api/v1/cafes/{id}/seats/availability?startTime=...&endTime=...` → 200 + availability

### Validation Checklist
- [ ] Tất cả 5 endpoints trả về đúng response shape
- [ ] Cache hoạt động (kiểm tra Redis với `redis-cli KEYS *`)
- [ ] Không có TypeScript error
- [ ] Không có ESLint error
- [ ] Có thể commit code

---

---

# Phase 7 — Booking Module — Create Booking (Critical)

**Goal:** Implement `POST /api/v1/bookings` — luồng quan trọng nhất với transaction, row lock, idempotency, và cache invalidation.

---

## Task 7.1 — Create `booking.dto.ts` & `booking.validator.ts`

### Goal
Định nghĩa TypeScript types và Zod schemas cho Booking requests/responses.

### Related Docs
- `API-SPECIFICATION.md` §8.1 (Create Booking — request body, validation rules)
- `DATABASE-DESIGN.md` §9 (BookingStatus)

### Files Created
- `src/modules/booking/booking.dto.ts`
- `src/modules/booking/booking.validator.ts`

### Functions
**booking.dto.ts — types:**
- `CreateBookingDto`
- `BookingResponse`
- `BookingSummary`

**booking.validator.ts — Zod schemas:**
- `createBookingSchema` — validate `cafeId`, `seatId`, `startTime`, `endTime`, `notes`

### Dependencies
- Task 0.5

### Expected Result
- `createBookingSchema` validate: valid UUIDs, `endTime > startTime`, `startTime` is ISO 8601, `notes` max 500 chars
- `BookingResponse` có đủ fields từ `API-SPECIFICATION.md §8.1` response

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] `createBookingSchema.parse({ cafeId: 'invalid' })` → ZodError

---

## Task 7.2 — Create `booking.repository.ts`

### Goal
Tạo tầng data access cho Booking module với các queries đặc biệt cần thiết cho concurrency.

### Related Docs
- `DATABASE-DESIGN.md` §10 (Database Concurrency Support — row lock, overlap query)
- `DATABASE-DESIGN.md` §11 (Row-level locking — `$queryRaw` + `FOR UPDATE`)
- `CONCURRENCY-DESIGN.md` §5 (Locking Strategy)

### Files Created
- `src/modules/booking/booking.repository.ts`

### Functions
- `findById(bookingId)` — load booking với seat + café summary
- `findByIdWithLock(bookingId, tx)` — `SELECT ... FOR UPDATE` bên trong transaction
- `lockSeatForUpdate(seatId, tx)` — `SELECT ... FROM seats ... FOR UPDATE` trong TX
- `findOverlappingBookings(seatId, startTime, endTime, tx)` — overlap check trong TX
- `countActiveBookingsByCustomer(customerId, cafeId)` — đếm CONFIRMED+CHECKED_IN bookings
- `createBooking(data, tx)` — insert booking row
- `createBookingHistoryEntry(data, tx)` — insert vào booking_history
- `createAuditLog(data)` — insert vào audit_logs
- `updateBookingStatus(bookingId, status, data, tx)` — conditional UPDATE WHERE status = current
- `findByCustomer(customerId, params)` — paginated booking history

### Dependencies
- Task 1.3 (prisma client)

### Expected Result
- `lockSeatForUpdate` dùng `prisma.$queryRaw` với `SELECT ... FOR UPDATE`
- `findOverlappingBookings` dùng overlap query: `start_time < requestedEnd AND end_time > requestedStart`
- `updateBookingStatus` là conditional update: trả về số rows affected

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] `lockSeatForUpdate` dùng raw SQL với `FOR UPDATE`
- [ ] Overlap query logic đúng

---

## Task 7.3 — Create `booking-queue.service.ts`

### Goal
Tạo service để enqueue BullMQ jobs sau khi DB commit — confirmation email, reminder, auto-expire.

### Related Docs
- `QUEUE-DESIGN.md` §4 (Booking Queue — job types, delay formulas)
- `QUEUE-DESIGN.md` §5 (Email Queue — BOOKING_CONFIRMATION)
- `QUEUE-DESIGN.md` §6 (Enqueue Rules — post-commit only)
- `QUEUE-DESIGN.md` §7 (Delayed Jobs per Booking)

### Files Created
- `src/workers/queues.ts` — BullMQ queue definitions
- `src/modules/booking/booking-queue.service.ts`

### Functions
**queues.ts:**
- `bookingQueue` — BullMQ Queue instance cho `booking` queue
- `emailQueue` — BullMQ Queue instance cho `email` queue

**booking-queue.service.ts:**
- `enqueueBookingConfirmationEmail(bookingId, customerId)` — email queue, delay 1s
- `enqueueBookingReminderJob(bookingId, startTime)` — booking queue, delay = startTime - 30min - now, jobId = `{bookingId}:reminder`
- `enqueueAutoExpireJob(bookingId, startTime, graceMinutes)` — booking queue, delay = startTime + grace - now, jobId = `{bookingId}:expire`
- `cancelReminderJob(bookingId)` — remove job `{bookingId}:reminder`
- `cancelExpireJob(bookingId)` — remove job `{bookingId}:expire`
- `enqueueCancellationEmail(bookingId, customerId, reason?)` — email queue

### Dependencies
- Task 1.4 (redis client)

### Expected Result
- BullMQ queues kết nối đúng Redis
- `enqueueAutoExpireJob` set delay đúng (milliseconds từ now)
- Job IDs deterministic để có thể cancel

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] Enqueue không throw khi Redis có dữ liệu hợp lệ
- [ ] Job ID `{bookingId}:expire` được set đúng

---

## Task 7.4 — Create `booking.service.ts` — Validation Helpers

### Goal
Implement các validation functions được gọi TRƯỚC transaction để kiểm tra business rules.

### Related Docs
- `API-SPECIFICATION.md` §8.1 (Create Booking — business rules)
- `REQUEST-FLOW.md` RF-05 (Steps 5-8 — verify customer, café, slot rules)
- `USE_CASES.md` (Core Business Rules — slot validation, operating hours)

### Files Created
- `src/modules/booking/booking.service.ts`

### Functions
- `validateTimeSlot(cafeId, startTime, endTime)` — kiểm tra slot hợp lệ:
  - endTime > startTime
  - startTime trong tương lai
  - slot duration match café's `slotDurationMinutes`
  - trong operating hours của café
  - không vượt `maxAdvanceBookingDays`
  - đủ trước `minAdvanceBookingMinutes`
- `validateCustomerActiveBookings(customerId, cafeId, maxConcurrent)` — check không vượt `maxConcurrentBookings`
- `validateCustomerNoOverlap(customerId, startTime, endTime)` — check customer không có booking overlapping khác

### Dependencies
- Task 7.2 (booking.repository)
- Task 3.1 (error classes)

### Expected Result
- `validateTimeSlot` với startTime trong quá khứ → throw `TIME_SLOT_IN_PAST`
- `validateTimeSlot` với slot không match slotDuration → throw `INVALID_TIME_SLOT`
- `validateCustomerActiveBookings` vượt limit → throw `BOOKING_LIMIT_EXCEEDED`

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] Tất cả validation errors là đúng error code

---

## Task 7.5 — Create `booking.service.ts` — `createBooking` (Transaction)

### Goal
Implement `createBooking` — luồng quan trọng nhất: idempotency check → validation → TX (lock seat → overlap check → insert) → post-commit side effects.

### Related Docs
- `REQUEST-FLOW.md` RF-05 (Create Booking — full flow)
- `CONCURRENCY-DESIGN.md` §3 (Double Booking scenario)
- `CONCURRENCY-DESIGN.md` §7 (Idempotency Strategy)
- `DATABASE-DESIGN.md` §10 (Transaction Boundary)
- `CACHE-DESIGN.md` §7 (Write Path — COMMIT → invalidate → enqueue)

### Files Created
_(edit `src/modules/booking/booking.service.ts`)_

### Functions
- `createBooking(customerId, dto, idempotencyKey)` — main create flow:
  1. Check idempotency key in Redis → return cached response if hit
  2. Load café + seat, verify they exist and belong together
  3. Validate time slot (gọi `validateTimeSlot`)
  4. Validate customer limits (gọi `validateCustomerActiveBookings`, `validateCustomerNoOverlap`)
  5. `prisma.$transaction()`:
     - `lockSeatForUpdate(seatId)` — `SELECT FOR UPDATE`
     - `findOverlappingBookings(seatId, start, end)` — kiểm tra trong TX
     - `createBooking(data)` — insert với `status: CONFIRMED`, generate `confirmationNumber`
     - `createBookingHistoryEntry(...)` — log status transition
     - `createAuditLog(...)` — log BOOKING_CREATED
  6. **Post-commit** (sau khi TX commit):
     - `cacheService.deleteByPattern(availabilityKey)` — invalidate
     - `setIdempotencyKey(key, response)` — cache response
     - `enqueueBookingConfirmationEmail(bookingId)`
     - `enqueueBookingReminderJob(bookingId, startTime)`
     - `enqueueAutoExpireJob(bookingId, startTime, graceMinutes)`
  7. Return booking response

### Dependencies
- Task 7.2 (booking.repository)
- Task 7.3 (booking-queue.service)
- Task 7.4 (validation helpers)
- Task 6.2 (cache.service)

### Expected Result
- Hai concurrent requests cùng seat+slot → một 201, một 409 SEAT_ALREADY_BOOKED
- Idempotency key trùng → trả về cached 201
- Redis/BullMQ fail post-commit → booking vẫn 201 (chỉ log warning)
- Không có Redis/BullMQ calls bên trong `prisma.$transaction()`

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] `FOR UPDATE` được gọi trước overlap check
- [ ] Post-commit operations nằm NGOÀI `prisma.$transaction()`
- [ ] Idempotency check nằm TRƯỚC transaction

---

## Task 7.6 — Create `booking.controller.ts` — POST /bookings Handler

### Goal
Tạo controller handler cho create booking, extract idempotency key từ header.

### Related Docs
- `API-SPECIFICATION.md` §8.1 (Create Booking — Level A, Idempotency-Key required)

### Files Created
- `src/modules/booking/booking.controller.ts`

### Functions
- `createBooking(req, res, next)` — extract `Idempotency-Key` header, validate, gọi service

### Dependencies
- Task 7.5 (booking.service)
- Task 3.2 (sendSuccess)

### Expected Result
- Missing `Idempotency-Key` header → `400 IDEMPOTENCY_KEY_REQUIRED`
- Valid request → 201 + booking data

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] Thiếu `Idempotency-Key` → 400

---

## Task 7.7 — Create `booking.routes.ts` & Register

### Goal
Tạo router cho booking module và đăng ký vào routes index.

### Related Docs
- `API-SPECIFICATION.md` §12 (Endpoint Index — booking routes)

### Files Created
- `src/modules/booking/booking.routes.ts`
- _(edit `src/routes/index.ts`)_

### Functions
_(không có)_

### Dependencies
- Task 7.6

### Expected Result
- `POST /api/v1/bookings` đăng ký với `authenticate` + `authorize('CUSTOMER')` + `bookingRateLimiter` + Zod validation

### Validation Checklist
- [ ] Route được mount đúng
- [ ] Không có token → 401
- [ ] OWNER token → 403

---

## Task 7.8 — Verify Create Booking

### Goal
Test `POST /api/v1/bookings` end-to-end: happy path, idempotency, double booking, validation errors.

### Related Docs
- `API-SPECIFICATION.md` §8.1
- `CONCURRENCY-DESIGN.md` §3

### Files Created
_(không có)_

### Functions
_(không có)_

### Dependencies
- Task 7.7

### Expected Result
Manual test:
- Valid request → 201 + `status: CONFIRMED`
- Gửi lại cùng `Idempotency-Key` → 201 (cached, không insert mới)
- Thiếu `Idempotency-Key` → 400
- Seat đã có booking → 409 SEAT_ALREADY_BOOKED
- `startTime` trong quá khứ → 422 INVALID_TIME_SLOT

### Validation Checklist
- [ ] Create booking trả về `confirmationNumber` dạng `BK-YYYYMMDD-XXXXXX`
- [ ] DB có đúng 1 booking row
- [ ] `booking_history` có entry CONFIRMED
- [ ] `audit_logs` có BOOKING_CREATED
- [ ] Redis `availability:{cafeId}:*` keys bị DEL
- [ ] BullMQ có 2 delayed jobs (reminder + expire) và 1 email job
- [ ] Không có TypeScript error
- [ ] Có thể commit code

---

---

# Phase 8 — Booking Module — Cancel & Check-in

**Goal:** Implement cancel booking, check-in, booking history, và booking detail.

---

## Task 8.1 — Create `cancellation.service.ts`

### Goal
Implement `cancelBooking`: kiểm tra ownership + policy → TX conditional update → post-commit side effects.

### Related Docs
- `REQUEST-FLOW.md` RF-06 (Cancel Booking)
- `API-SPECIFICATION.md` §8.2 (Cancel Booking — Level A)
- `CONCURRENCY-DESIGN.md` §3 (Cancel vs Auto-Expire scenario)
- `QUEUE-DESIGN.md` §8 (Job Cancellation)

### Files Created
- `src/modules/booking/cancellation.service.ts`

### Functions
- `cancelBooking(bookingId, customerId, reason?)` — cancel flow:
  1. Load booking, verify ownership (`customerId` match)
  2. Nếu status `CANCELLED` → idempotent 200 (return current booking)
  3. Nếu status không phải `CONFIRMED` → throw `BOOKING_CANNOT_CANCEL`
  4. TX: `updateBookingStatus(id, CANCELLED, WHERE status = CONFIRMED)` + history + audit
  5. Nếu 0 rows updated → status đã thay đổi (race) → load lại và throw conflict
  6. **Post-commit:** invalidate availability cache → `cancelReminderJob` + `cancelExpireJob` → enqueue cancellation email

### Dependencies
- Task 7.2 (booking.repository)
- Task 7.3 (booking-queue.service)
- Task 6.2 (cache.service)
- Task 3.1 (error classes)

### Expected Result
- Cancel `CONFIRMED` booking → `status: CANCELLED`
- Cancel `CHECKED_IN` booking → 409 BOOKING_CANNOT_CANCEL
- Cancel đã `CANCELLED` → idempotent 200
- Conditional update prevents race with auto-expire worker

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] 0 rows updated từ conditional update → không crash, xử lý gracefully

---

## Task 8.2 — Create `checkin.service.ts`

### Goal
Implement `checkIn`: kiểm tra time window → TX conditional update → cancel expire job.

### Related Docs
- `REQUEST-FLOW.md` RF-07 (Check-in)
- `API-SPECIFICATION.md` §8.3 (Check-in — Level A)
- `CONCURRENCY-DESIGN.md` §3 (Check-in vs Auto-Expire scenario)

### Files Created
- `src/modules/booking/checkin.service.ts`

### Functions
- `checkIn(bookingId, userId)` — check-in flow:
  1. Load booking, verify ownership
  2. Nếu `CHECKED_IN` → idempotent 200
  3. Nếu không phải `CONFIRMED` → throw `BOOKING_INVALID_STATUS`
  4. Kiểm tra time window: `now < startTime - graceMinutes` → throw `CHECKIN_TOO_EARLY`
  5. Kiểm tra time window: `now > startTime + graceMinutes` → throw `CHECKIN_WINDOW_EXPIRED`
  6. TX: `UPDATE WHERE status = CONFIRMED` + set `checkedInAt = now` + audit
  7. **Post-commit:** `cancelExpireJob(bookingId)`

### Dependencies
- Task 7.2 (booking.repository)
- Task 7.3 (booking-queue.service)
- Task 3.1 (error classes)

### Expected Result
- Check-in trong window → `status: CHECKED_IN`
- Check-in quá sớm (> `graceMinutes` trước start) → 422 CHECKIN_TOO_EARLY
- Check-in quá muộn (> `graceMinutes` sau start) → 409 CHECKIN_WINDOW_EXPIRED
- Expire job bị cancel sau check-in thành công

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] `checkedInAt` được set trong DB sau check-in
- [ ] Expire job bị remove khỏi BullMQ

---

## Task 8.3 — Add Remaining Booking Queries to `booking.service.ts`

### Goal
Thêm `listByCustomer` và `getBookingById` vào booking service.

### Related Docs
- `REQUEST-FLOW.md` RF-16 (Booking History)
- `API-SPECIFICATION.md` §8.4 (Get Booking Details), §8.5 (Booking History)

### Files Created
_(edit `src/modules/booking/booking.service.ts`)_

### Functions
- `getBookingById(bookingId, requesterId, requesterRole)` — load booking, check ownership (CUSTOMER own only, OWNER own café only, ADMIN any)
- `listBookingsByCustomer(customerId, params)` — paginated list với filters (status, upcoming)

### Dependencies
- Task 7.5

### Expected Result
- Customer cố access booking của người khác → 403 FORBIDDEN
- `upcoming=true` → chỉ trả về future bookings với status CONFIRMED/CHECKED_IN

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] RBAC cho getBookingById đúng theo §13

---

## Task 8.4 — Expand `booking.controller.ts` & `booking.routes.ts`

### Goal
Thêm tất cả remaining booking handlers và routes: cancel, check-in, list, get detail.

### Related Docs
- `API-SPECIFICATION.md` §8 (tất cả booking endpoints)
- `API-SPECIFICATION.md` §12 (Endpoint Index)

### Files Created
_(edit `src/modules/booking/booking.controller.ts`)_
_(edit `src/modules/booking/booking.routes.ts`)_

### Functions
**booking.controller.ts thêm:**
- `cancelBooking(req, res, next)`
- `checkIn(req, res, next)`
- `getBooking(req, res, next)`
- `listBookings(req, res, next)`

**Routes thêm:**
- `GET /api/v1/bookings` — Customer only
- `GET /api/v1/bookings/:bookingId` — Customer/Owner/Admin
- `DELETE /api/v1/bookings/:bookingId` — Customer only
- `POST /api/v1/bookings/:bookingId/check-in` — Customer only

### Dependencies
- Task 8.1, Task 8.2, Task 8.3

### Expected Result
Tất cả 5 booking routes hoạt động.

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] Tất cả routes đúng authentication + authorization

---

## Task 8.5 — Verify Cancel & Check-in

### Goal
Test end-to-end cancel và check-in flows.

### Related Docs
- `API-SPECIFICATION.md` §8.2, §8.3

### Files Created
_(không có)_

### Functions
_(không có)_

### Dependencies
- Task 8.4

### Expected Result
Manual test:
- Create booking → cancel → 200 `status: CANCELLED`
- Create booking → check-in trong window → 200 `status: CHECKED_IN`
- Cancel `CHECKED_IN` booking → 409 BOOKING_CANNOT_CANCEL
- Check-in booking của người khác → 403 FORBIDDEN

### Validation Checklist
- [ ] `booking_history` có entry CONFIRMED → CANCELLED
- [ ] BullMQ expire + reminder jobs bị remove khi cancel
- [ ] BullMQ expire job bị remove khi check-in
- [ ] Không có TypeScript error
- [ ] Có thể commit code

---

---

# Phase 9 — Owner Module

**Goal:** Implement Owner APIs: create café, update café, seat layout management, view bookings.

---

## Task 9.1 — Create `owner.repository.ts`

### Goal
Tạo tầng data access cho Owner module — các queries cần thiết cho café và seat management.

### Related Docs
- `DATABASE-DESIGN.md` §3.3–3.5 (cafes, zones, seats — upsert pattern)
- `REQUEST-FLOW.md` RF-10, RF-11, RF-18, RF-19

### Files Created
- `src/modules/cafe/owner.repository.ts`

### Functions
- `findCafesByOwner(ownerId, params)` — paginated cafés owned by this user
- `findCafeByIdAndOwner(cafeId, ownerId)` — verify ownership
- `createCafe(data, tx)` — insert café row
- `updateCafe(cafeId, data)` — update café profile
- `findZonesWithSeatsForOwner(cafeId)` — zones + tất cả seats (kể cả inactive)
- `upsertZone(zoneData, tx)` — create or update zone
- `upsertSeat(seatData, tx)` — create or update seat
- `softDeleteSeat(seatId, tx)` — set `deletedAt`, `isActive: false`
- `softDeleteZone(zoneId, tx)` — set `deletedAt`
- `findActiveFutureBookingsForSeats(seatIds)` — detect layout conflicts

### Dependencies
- Task 1.3 (prisma client)

### Expected Result
- `findActiveFutureBookingsForSeats` chỉ trả về CONFIRMED/CHECKED_IN bookings với `startTime > now`
- `softDeleteSeat` không hard delete

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] `findActiveFutureBookingsForSeats` filter đúng active statuses và future time

---

## Task 9.2 — Create `owner.service.ts` — Café CRUD

### Goal
Implement create café và update café cho Owner.

### Related Docs
- `REQUEST-FLOW.md` RF-10 (Create Café)
- `REQUEST-FLOW.md` RF-18 (Update Café)
- `API-SPECIFICATION.md` §10.1, §10.3–10.5

### Files Created
- `src/modules/cafe/owner.service.ts`

### Functions
- `createCafe(ownerId, dto)` — insert café + audit, enqueue admin notification email
- `updateCafe(cafeId, ownerId, dto)` — update + audit, invalidate `cafes:list:*` + `cafe:detail:{cafeId}`
- `getOwnerCafes(ownerId, params)` — paginated list
- `getOwnerCafeById(cafeId, ownerId)` — verify ownership

### Dependencies
- Task 9.1 (owner.repository)
- Task 7.3 (email queue enqueue)
- Task 6.2 (cache.service)
- Task 3.1 (NotFoundError, ForbiddenError)

### Expected Result
- `createCafe` trả về café với status `PENDING_VERIFICATION`
- `updateCafe` với cafeId không thuộc owner → throw `ForbiddenError`
- Cache được invalidate sau update

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] Café mới có status `PENDING_VERIFICATION`
- [ ] Cache invalidated sau update

---

## Task 9.3 — Create `owner.service.ts` — Seat Layout

### Goal
Implement `updateSeatLayout` với conflict detection và `force=true` support.

### Related Docs
- `REQUEST-FLOW.md` RF-11 (Update Seat Layout), RF-19 (Create Seat Layout)
- `API-SPECIFICATION.md` §10.2 (Update Seat Layout — Level A)
- `CONCURRENCY-DESIGN.md` §3 (Owner Soft-Delete Seat vs Active Booking)
- `CACHE-DESIGN.md` §7 (Invalidation — layout update)

### Files Created
_(edit `src/modules/cafe/owner.service.ts`)_

### Functions
- `updateSeatLayout(cafeId, ownerId, dto)` — full layout update flow:
  1. Verify ownership
  2. Validate: ≥1 zone, ≥1 seat per zone, no duplicate `seatNumber` within zone
  3. Find seats being removed (diff between current và new layout)
  4. **Conflict check:** query active future bookings cho removed seats
  5. Nếu conflict và `force = false` → throw `LAYOUT_CONFLICT`
  6. Nếu `force = true` → cancel affected bookings trong TX
  7. TX: upsert zones + seats, soft-delete removed zones/seats + audit
  8. Post-commit: invalidate `cafe:layout`, `cafe:detail`, `availability:*` caches
  9. Nếu `force = true`: enqueue cancellation emails for affected bookings

### Dependencies
- Task 9.1, Task 9.2
- Task 7.3 (booking-queue.service — cancellation email)

### Expected Result
- Remove seat có active booking, `force=false` → 409 LAYOUT_CONFLICT
- Remove seat có active booking, `force=true` → 200, bookings CANCELLED
- Removed seats soft-deleted (không hard delete)

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] `force=false` với conflict → 409 LAYOUT_CONFLICT
- [ ] `force=true` → bookings bị cancel trong DB
- [ ] Cache invalidated sau update

---

## Task 9.4 — Create `owner.service.ts` — Bookings & Manual Check-in

### Goal
Implement owner dashboard: view café bookings và manual check-in.

### Related Docs
- `API-SPECIFICATION.md` §10.8 (View Café Bookings), §10.9 (Owner Manual Check-in)
- `REQUEST-FLOW.md` RF-07 (Check-in — Owner path)

### Files Created
_(edit `src/modules/cafe/owner.service.ts`)_

### Functions
- `viewCafeBookings(cafeId, ownerId, params)` — paginated bookings của café với filters
- `ownerCheckIn(cafeId, bookingId, ownerId)` — manual check-in (skip customer ownership check)

### Dependencies
- Task 9.3
- Task 8.2 (checkin.service — reuse logic)

### Expected Result
- `viewCafeBookings` chỉ trả về bookings của café thuộc owner đó
- `ownerCheckIn` reuse `checkin.service` nhưng skip customer ownership verification

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] Owner không thể view bookings của café khác

---

## Task 9.5 — Create `owner.controller.ts` & `owner.routes.ts`

### Goal
Tạo controller và routes cho tất cả Owner endpoints.

### Related Docs
- `API-SPECIFICATION.md` §10 (Café Owner endpoints)
- `API-SPECIFICATION.md` §12 (Endpoint Index)

### Files Created
- `src/modules/cafe/owner.controller.ts`
- `src/modules/cafe/owner.routes.ts`

### Functions
**owner.controller.ts:**
- `createCafe(req, res, next)`
- `listOwnerCafes(req, res, next)`
- `getOwnerCafe(req, res, next)`
- `updateCafe(req, res, next)`
- `updateSeatLayout(req, res, next)`
- `viewCafeBookings(req, res, next)`
- `ownerCheckIn(req, res, next)`

### Dependencies
- Task 9.2, Task 9.3, Task 9.4

### Expected Result
Routes với `authenticate` + `authorize('OWNER')`:
- `POST /api/v1/owner/cafes`
- `GET /api/v1/owner/cafes`
- `GET /api/v1/owner/cafes/:cafeId`
- `PUT /api/v1/owner/cafes/:cafeId`
- `PUT /api/v1/owner/cafes/:cafeId/seats/layout`
- `GET /api/v1/owner/cafes/:cafeId/bookings`
- `POST /api/v1/owner/cafes/:cafeId/bookings/:bookingId/check-in`

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] CUSTOMER token → 403 trên tất cả owner routes

---

## Task 9.6 — Verify Owner Endpoints

### Goal
Manual test Owner module.

### Related Docs
- `API-SPECIFICATION.md` §10

### Files Created
_(không có)_

### Functions
_(không có)_

### Dependencies
- Task 9.5

### Expected Result
- Create café → 201 `status: PENDING_VERIFICATION`
- Update café → 200 + cache invalidated
- Update seat layout → 200
- Remove seat với active booking → 409 LAYOUT_CONFLICT
- View café bookings → paginated list

### Validation Checklist
- [ ] Tất cả owner endpoints hoạt động
- [ ] CUSTOMER không thể access owner routes
- [ ] Không có TypeScript error
- [ ] Có thể commit code

---

---

# Phase 10 — BullMQ Workers

**Goal:** Implement BookingWorker (reminder + auto-expire) và EmailWorker (SendGrid delivery).

---

## Task 10.1 — Setup Worker Infrastructure

### Goal
Tạo cấu trúc cơ bản cho workers: BullMQ Worker classes, connection config, và job type definitions.

### Related Docs
- `QUEUE-DESIGN.md` §3 (Architecture)
- `QUEUE-DESIGN.md` §4 (Booking Queue — concurrency: 3)
- `QUEUE-DESIGN.md` §5 (Email Queue — concurrency: 5)

### Files Created
- `src/workers/worker.types.ts`

### Functions
**worker.types.ts — TypeScript interfaces:**
- `BookingReminderJobData` — `{ bookingId: string }`
- `AutoExpireBookingJobData` — `{ bookingId: string }`
- `BookingConfirmationEmailJobData` — `{ bookingId: string, customerId: string }`
- `BookingCancellationEmailJobData` — `{ bookingId: string, customerId: string, reason?: string }`
- `BookingReminderEmailJobData` — `{ bookingId: string }`
- `SendVerificationEmailJobData` — `{ userId: string, email: string, token: string }`
- `AccountSuspendedEmailJobData` — `{ userId: string, reason: string }`

### Dependencies
- Task 7.3 (queues.ts đã tạo)

### Expected Result
- Tất cả job data types được defined và export
- Không có TypeScript error

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] Types match với payload trong `QUEUE-DESIGN.md §4-5`

---

## Task 10.2 — Create `email.worker.ts`

### Goal
Implement EmailWorker: process email jobs từ queue → gọi SendGrid → write `notification_logs`.

### Related Docs
- `QUEUE-DESIGN.md` §5 (Email Queue — job types, retry strategy)
- `QUEUE-DESIGN.md` §11 (EmailWorker stateless)
- `DATABASE-DESIGN.md` §3.8 (notification_logs)

### Files Created
- `src/workers/email.worker.ts`

### Functions
- `processEmailJob(job)` — main job processor, dispatch theo job name
- `sendBookingConfirmationEmail(data)` — load booking + user → format + send via SendGrid
- `sendBookingCancellationEmail(data)` — tương tự
- `sendBookingReminderEmail(data)` — tương tự
- `sendVerificationEmail(data)` — send verification link email
- `sendAccountSuspendedEmail(data)` — send suspension notification
- `logNotification(data)` — insert vào `notification_logs` table

### Dependencies
- Task 10.1 (worker.types)
- Task 7.3 (queues.ts)
- Task 1.3 (prisma — write notification_logs)
- Task 1.2 (env — SENDGRID_API_KEY)

### Expected Result
- Worker process jobs từ `email` queue
- Mỗi successful send → insert `notification_logs` với `status: SENT`
- SendGrid failure → retry (BullMQ tự handle), sau 3 lần → DLQ
- SendGrid mock trong test environment (khi `NODE_ENV = test`)

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] `logNotification` write đúng vào DB
- [ ] Worker không crash khi SendGrid fail (retry thay vào đó)

---

## Task 10.3 — Create `booking.worker.ts` — Reminder Logic

### Goal
Implement BookingWorker cho `BOOKING_REMINDER` job: verify booking còn CONFIRMED → enqueue reminder email.

### Related Docs
- `QUEUE-DESIGN.md` §4 (BOOKING_REMINDER job — verify CONFIRMED → enqueue email)
- `REQUEST-FLOW.md` RF-09 (Booking Reminder)

### Files Created
- `src/workers/booking.worker.ts`

### Functions
- `processBookingJob(job)` — dispatch theo job name
- `handleBookingReminder(data)` — load booking → verify `status = CONFIRMED` → enqueue `BOOKING_REMINDER` email → complete job; if not CONFIRMED → no-op

### Dependencies
- Task 10.1 (worker.types)
- Task 7.3 (queues.ts)
- Task 7.2 (booking.repository — findById)

### Expected Result
- Reminder fires → booking CONFIRMED → email job enqueued
- Reminder fires → booking CANCELLED → no-op, job completes

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] Booking đã cancel → reminder no-op (không enqueue email)

---

## Task 10.4 — Expand `booking.worker.ts` — Auto-Expire Logic

### Goal
Implement `AUTO_EXPIRE_BOOKING` job: conditional update CONFIRMED → EXPIRED trong transaction.

### Related Docs
- `REQUEST-FLOW.md` RF-08 (Auto Expire Booking)
- `CONCURRENCY-DESIGN.md` §3 (Check-in vs Auto-Expire scenario)
- `QUEUE-DESIGN.md` §4 (AUTO_EXPIRE_BOOKING — failure handling)

### Files Created
_(edit `src/workers/booking.worker.ts`)_

### Functions
- `handleAutoExpireBooking(data)` — auto-expire flow:
  1. Load booking, verify `status = CONFIRMED` và `startTime + graceMinutes < now`
  2. Nếu status đã thay đổi → no-op, complete job
  3. TX: `updateBookingStatus(EXPIRED, WHERE status = CONFIRMED)` + history(`NO_SHOW`) + audit
  4. Nếu 0 rows updated (race với check-in/cancel) → no-op
  5. Post-commit: invalidate `availability:{cafeId}:*` → enqueue cancellation email

### Dependencies
- Task 10.3
- Task 6.2 (cache.service)
- Task 7.2 (booking.repository)

### Expected Result
- Booking còn CONFIRMED sau grace period → EXPIRED
- Booking đã CHECKED_IN khi worker chạy → 0 rows updated → no-op
- Seat freed (availability cache invalidated)

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] Conditional update: chỉ expire khi `status = CONFIRMED`
- [ ] Cache invalidated sau expire

---

## Task 10.5 — Register Workers in `server.ts`

### Goal
Khởi động BookingWorker và EmailWorker khi app start.

### Related Docs
- `SYSTEM_ARCHITECTURE.md` §6.1 (Embedded BullMQ Workers)
- `QUEUE-DESIGN.md` §3 (2 workers in one process)

### Files Created
_(edit `src/server.ts`)_

### Functions
- `startWorkers()` — khởi tạo cả 2 workers

### Dependencies
- Task 10.2, Task 10.3, Task 10.4

### Expected Result
- Workers start khi `npm run dev`
- Log ra console "BookingWorker started", "EmailWorker started"
- Workers tự reconnect nếu Redis restart

### Validation Checklist
- [ ] Console log workers started
- [ ] Workers không crash khi start

---

## Task 10.6 — Verify Worker Behavior

### Goal
Test end-to-end worker behavior: tạo booking → verify jobs enqueued → manually trigger → verify side effects.

### Related Docs
- `QUEUE-DESIGN.md` §10 (Testing Strategy)

### Files Created
_(không có)_

### Functions
_(không có)_

### Dependencies
- Task 10.5

### Expected Result
- Create booking → Redis có 2 delayed jobs (`{bookingId}:reminder`, `{bookingId}:expire`) + 1 email job
- Cancel booking → reminder + expire jobs bị remove
- Check-in → expire job bị remove
- Manually trigger expire job (set delay = 0) → booking EXPIRED, cache invalidated

### Validation Checklist
- [ ] BullMQ dashboard (hoặc Redis CLI) thấy đúng jobs
- [ ] Cancel xóa đúng jobs
- [ ] Expire worker cập nhật DB và invalidate cache
- [ ] Email worker write vào `notification_logs`
- [ ] Có thể commit code

---

---

# Phase 11 — Notification & Customer Modules

**Goal:** Implement in-app notifications list và customer profile management.

---

## Task 11.1 — Create Notification Module

### Goal
Implement notification list và mark-as-read cho `notification_logs` (channel = IN_APP).

### Related Docs
- `REQUEST-FLOW.md` RF-17 (Notifications)
- `API-SPECIFICATION.md` §9 (Notifications endpoints)
- `DATABASE-DESIGN.md` §3.8 (notification_logs — `isRead` field)

### Files Created
- `src/modules/notification/notification.repository.ts`
- `src/modules/notification/notification.service.ts`

### Functions
**notification.repository.ts:**
- `findByUser(userId, params)` — paginated IN_APP notifications với filter `isRead`
- `countUnread(userId)` — count unread IN_APP notifications
- `markAsRead(notificationId, userId)` — update `isRead = true`

**notification.service.ts:**
- `listNotifications(userId, params)` — list + unreadCount
- `markNotificationRead(notificationId, userId)` — idempotent mark read

### Dependencies
- Task 1.3 (prisma)

### Expected Result
- `listNotifications` chỉ trả về `channel = IN_APP` notifications
- `markNotificationRead` với wrong userId → 403
- Đã read → idempotent 200

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] Filter `channel = IN_APP` đúng

---

## Task 11.2 — Create Notification Controller & Routes

### Goal
Tạo HTTP layer cho Notification module.

### Related Docs
- `API-SPECIFICATION.md` §9 (Notifications)
- `API-SPECIFICATION.md` §12 (Endpoint Index)

### Files Created
- `src/modules/notification/notification.controller.ts`
- `src/modules/notification/notification.routes.ts`

### Functions
**notification.controller.ts:**
- `listNotifications(req, res, next)`
- `markRead(req, res, next)`

### Dependencies
- Task 11.1

### Expected Result
Routes:
- `GET /api/v1/notifications` — `authenticate`
- `PATCH /api/v1/notifications/:notificationId/read` — `authenticate`

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] Không có auth → 401

---

## Task 11.3 — Create Customer Profile Module

### Goal
Implement customer profile get và update (notification preferences, city, name).

### Related Docs
- `API-SPECIFICATION.md` §6.6 (GET /auth/me — trả về profile cho CUSTOMER)
- `DATABASE-DESIGN.md` §3.2 (customer_profiles)

### Files Created
- `src/modules/customer/customer.repository.ts`
- `src/modules/customer/customer.service.ts`

### Functions
**customer.repository.ts:**
- `findByUserId(userId)` — load customer profile
- `updateProfile(userId, data)` — update name, phone, city, preferences

**customer.service.ts:**
- `getProfile(userId)` — load profile
- `updateProfile(userId, dto)` — validate + update

### Dependencies
- Task 1.3 (prisma)

### Expected Result
- OWNER/ADMIN không có customer profile → handled gracefully

### Validation Checklist
- [ ] Không có TypeScript error

---

## Task 11.4 — Register Customer Routes (optional)

### Goal
Thêm `PATCH /api/v1/customers/profile` endpoint cho Customer để cập nhật preferences.

### Related Docs
- `API-SPECIFICATION.md` §6.6 (GET /auth/me — `data.profile`)

### Files Created
- `src/modules/customer/customer.controller.ts`
- `src/modules/customer/customer.routes.ts`

### Functions
- `updateProfile(req, res, next)`

### Dependencies
- Task 11.3

### Expected Result
- `PATCH /api/v1/customers/profile` với CUSTOMER token → update thành công
- OWNER/ADMIN → 403

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] Route hoạt động

---

---

# Phase 12 — Admin Module

**Goal:** Implement Admin APIs: user management và café approval workflow.

---

## Task 12.1 — Create `admin.repository.ts`

### Goal
Tạo data access layer cho Admin module.

### Related Docs
- `DATABASE-DESIGN.md` §3.1, §3.3 (users, cafes — admin queries)
- `API-SPECIFICATION.md` §11 (Admin endpoints)

### Files Created
- `src/modules/admin/admin.repository.ts`

### Functions
- `findUsers(params)` — paginated user list với search/role/status filter
- `findUserById(userId)` — user detail + summary stats
- `updateUserStatus(userId, status, data)` — suspend/unsuspend
- `findPendingCafes(params)` — cafés với status PENDING_VERIFICATION
- `updateCafeStatus(cafeId, status, data)` — approve/reject

### Dependencies
- Task 1.3 (prisma)

### Expected Result
- `findUsers` support search by email/name, filter by role, filter by status

### Validation Checklist
- [ ] Không có TypeScript error

---

## Task 12.2 — Create `admin.service.ts` — User Management

### Goal
Implement suspend/unsuspend user với session revocation.

### Related Docs
- `REQUEST-FLOW.md` RF-12 (Admin Manages Users)
- `API-SPECIFICATION.md` §11.3 (Suspend User), §11.4 (Unsuspend)
- `CACHE-DESIGN.md` §2 (refresh tokens — Redis)
- `QUEUE-DESIGN.md` §5 (ACCOUNT_SUSPENDED email)

### Files Created
- `src/modules/admin/admin.service.ts`

### Functions
- `listUsers(params)` — paginated + search
- `getUserById(userId)` — detail + stats
- `suspendUser(targetUserId, adminId, reason)` — suspend flow:
  1. Load target user
  2. Guard: không suspend admin (`CANNOT_SUSPEND_ADMIN`)
  3. Guard: không suspend self (`CANNOT_SUSPEND_SELF`)
  4. TX: update `status = SUSPENDED`, `suspendedAt`, `suspensionReason` + audit
  5. Post-commit: `revokeAllUserTokens(userId)` — xóa tất cả Redis refresh keys
  6. Enqueue `ACCOUNT_SUSPENDED` email
- `unsuspendUser(targetUserId, adminId)` — restore ACTIVE + audit

### Dependencies
- Task 12.1 (admin.repository)
- Task 5.3 (jwt.service — revokeAllUserTokens)
- Task 7.3 (email queue enqueue)
- Task 3.1 (error classes)

### Expected Result
- Suspend ADMIN → 403 CANNOT_SUSPEND_ADMIN
- Suspend self → 403 CANNOT_SUSPEND_SELF
- Sau suspend: user's refresh tokens bị revoke từ Redis

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] Redis refresh keys cleared sau suspend

---

## Task 12.3 — Create `admin.service.ts` — Café Approval

### Goal
Implement approve và reject café.

### Related Docs
- `API-SPECIFICATION.md` §11.5–11.7 (Admin Café endpoints)
- `CACHE-DESIGN.md` §7 (Invalidation — approve café invalidates cache)

### Files Created
_(edit `src/modules/admin/admin.service.ts`)_

### Functions
- `listPendingCafes(params)` — paginated PENDING_VERIFICATION cafés
- `approveCafe(cafeId, adminId, notes?)` — update status → ACTIVE + audit, invalidate `cafes:list:*` + `cafe:detail:{cafeId}`
- `rejectCafe(cafeId, adminId, reason)` — update status → REJECTED + audit

### Dependencies
- Task 12.2
- Task 6.2 (cache.service — invalidate on approve)

### Expected Result
- Approve → café `status: ACTIVE`, `approvedAt` set
- Cache invalidated sau approve (café sẽ xuất hiện trong public list)

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] Cache invalidated sau approve

---

## Task 12.4 — Create `admin.controller.ts` & `admin.routes.ts`

### Goal
Tạo HTTP layer cho Admin module.

### Related Docs
- `API-SPECIFICATION.md` §11 (Admin endpoints)
- `API-SPECIFICATION.md` §12 (Endpoint Index)

### Files Created
- `src/modules/admin/admin.controller.ts`
- `src/modules/admin/admin.routes.ts`

### Functions
**admin.controller.ts:**
- `listUsers(req, res, next)`
- `getUserDetail(req, res, next)`
- `suspendUser(req, res, next)`
- `unsuspendUser(req, res, next)`
- `listPendingCafes(req, res, next)`
- `approveCafe(req, res, next)`
- `rejectCafe(req, res, next)`

### Dependencies
- Task 12.2, Task 12.3

### Expected Result
Routes với `authenticate` + `authorize('ADMIN')`:
- `GET /api/v1/admin/users`
- `GET /api/v1/admin/users/:userId`
- `PUT /api/v1/admin/users/:userId/suspend`
- `PUT /api/v1/admin/users/:userId/unsuspend`
- `GET /api/v1/admin/cafes/pending`
- `PUT /api/v1/admin/cafes/:cafeId/approve`
- `PUT /api/v1/admin/cafes/:cafeId/reject`

### Validation Checklist
- [ ] Không có TypeScript error
- [ ] CUSTOMER/OWNER token → 403 trên tất cả admin routes

---

## Task 12.5 — Verify Admin Endpoints

### Goal
Manual test Admin module.

### Related Docs
- `API-SPECIFICATION.md` §11

### Files Created
_(không có)_

### Functions
_(không có)_

### Dependencies
- Task 12.4

### Expected Result
- List users → paginated list
- Suspend user → 200, user status SUSPENDED
- Approve café → 200, café ACTIVE, xuất hiện trong `GET /cafes`
- Suspend admin user → 403 CANNOT_SUSPEND_ADMIN

### Validation Checklist
- [ ] Tất cả admin endpoints hoạt động
- [ ] CUSTOMER không thể access admin routes
- [ ] Café approved → cache invalidated → xuất hiện trong `GET /api/v1/cafes`
- [ ] Không có TypeScript error
- [ ] Có thể commit code

---

---

# Phase 13 — Testing

**Goal:** Viết unit tests cho business logic và integration tests cho critical APIs.

---

## Task 13.1 — Testing Environment Setup

### Goal
Cấu hình Vitest, setup test database, và tạo test helpers.

### Related Docs
- `TESTING.md` §4 (Test Environment)
- `TESTING.md` §2 (Test Directory Layout)

### Files Created
- `vitest.config.ts`
- `.env.test`
- `tests/helpers/db.ts` — setup/teardown test DB
- `tests/helpers/auth.ts` — get auth token helper
- `tests/helpers/factories.ts` — tạo test data (user, café, booking)
- `docker-compose.test.yml` — Postgres + Redis cho test

### Functions
**tests/helpers/db.ts:**
- `setupTestDatabase()` — migrate + seed minimal test data
- `cleanupTables()` — truncate booking-related tables sau mỗi test

**tests/helpers/auth.ts:**
- `getCustomerToken()` — login và trả về access token
- `getOwnerToken()` — login owner
- `getAdminToken()` — login admin

**tests/helpers/factories.ts:**
- `createTestUser(role)` — tạo user trong test DB
- `createTestCafe(ownerId)` — tạo café với zones/seats
- `createTestBooking(customerId, seatId)` — tạo booking

### Dependencies
- Task 5.9 (auth module phải hoạt động)

### Expected Result
- `npm run test:unit` chạy được với Vitest
- Test DB được migrate trước khi integration tests chạy

**Scripts cần thêm vào `package.json`:**
- `"test:unit": "vitest run tests/unit"`
- `"test:integration": "vitest run tests/integration"`
- `"test": "vitest run"`

### Validation Checklist
- [ ] `npm run test:unit` không crash (0 tests ban đầu là OK)
- [ ] `docker-compose.test.yml` start được Postgres + Redis
- [ ] Helper functions không có TypeScript error

---

## Task 13.2 — Unit Tests — Auth Services

### Goal
Viết unit tests cho `AuthService`, `JWTService`, `PasswordService` với mocked dependencies.

### Related Docs
- `TESTING.md` §5 (Unit Testing — Auth module test cases)

### Files Created
- `tests/unit/auth/auth.service.test.ts`
- `tests/unit/auth/jwt.service.test.ts`
- `tests/unit/auth/password.service.test.ts`

### Functions
_(test functions — sẽ test các functions trong auth services)_

**Test cases cần cover (từ `TESTING.md §5`):**
- `AuthService`: reject duplicate email, lock after N failed attempts
- `JWTService`: issue token, verify expiry, reject invalid signature
- `PasswordService`: hash + compare round-trip

### Dependencies
- Task 5.3, Task 5.4, Task 5.6

### Expected Result
- Tất cả test cases pass
- Repository và Redis được mock (không hit real DB/Redis)

### Validation Checklist
- [ ] `npm run test:unit` → tất cả auth tests pass
- [ ] Tests dùng `vi.mock()` để mock repository
- [ ] Không có TypeScript error trong test files

---

## Task 13.3 — Unit Tests — Booking Services

### Goal
Viết unit tests cho `BookingService`, `CancellationService`, `CheckinService`, `SeatAvailabilityService`.

### Related Docs
- `TESTING.md` §5 (Unit Testing — Booking module test cases)

### Files Created
- `tests/unit/booking/booking.service.test.ts`
- `tests/unit/booking/cancellation.service.test.ts`
- `tests/unit/booking/checkin.service.test.ts`
- `tests/unit/cafe/seat-availability.service.test.ts`

### Functions
_(test functions)_

**Test cases cần cover (từ `TESTING.md §5`):**
- `BookingService`: reject overlapping slot, enforce maxConcurrentBookings, reject past slot
- `CancellationService`: full refund >1h, reject cancel when CHECKED_IN, idempotent cancel
- `CheckinService`: accept within window, reject too early, reject too late, reject wrong status
- `SeatAvailabilityService`: merge AVAILABLE/BOOKED, handle empty café, zone filter
- `BookingService.expireIfNoCheckin`: expire when CONFIRMED + past grace, no-op when CHECKED_IN

### Dependencies
- Task 7.5, Task 8.1, Task 8.2, Task 6.5

### Expected Result
- Tất cả test cases pass
- Services được test với mocked repositories

### Validation Checklist
- [ ] `npm run test:unit` → tất cả booking tests pass
- [ ] Business rule tests cover các edge cases từ `TESTING.md §5`

---

## Task 13.4 — Integration Tests — Auth APIs

### Goal
Viết integration tests cho auth endpoints chạy với real DB + Redis.

### Related Docs
- `TESTING.md` §6 (Integration Testing — Auth API Test Matrix)

### Files Created
- `tests/integration/auth.integration.test.ts`

### Functions
_(test functions)_

**Test cases từ `TESTING.md §6`:**
- `POST /auth/register` valid payload → 201 + tokens
- `POST /auth/register` duplicate email → 409
- `POST /auth/login` valid credentials → 200 + tokens
- `POST /auth/login` wrong password → 401
- `POST /auth/refresh` valid token → 200 + new token
- `POST /auth/refresh` revoked token → 401

### Dependencies
- Task 13.1 (test setup)

### Expected Result
- Tất cả auth integration tests pass với real DB + Redis

### Validation Checklist
- [ ] `npm run test:integration` → tất cả auth tests pass
- [ ] Tests dùng Supertest để gọi Express app
- [ ] DB được clean giữa các tests

---

## Task 13.5 — Integration Tests — Booking Critical Paths

### Goal
Viết integration tests cho booking APIs bao gồm concurrency test.

### Related Docs
- `TESTING.md` §6 (Integration Testing — Booking API Test Matrix)
- `CONCURRENCY-DESIGN.md` §11 (Testing Strategy)

### Files Created
- `tests/integration/booking.integration.test.ts`

### Functions
_(test functions)_

**Test cases từ `TESTING.md §6`:**
- `POST /bookings` valid + Idempotency-Key → 201
- `POST /bookings` same seat + slot concurrent → 1×201, 1×409 SEAT_ALREADY_BOOKED
- `POST /bookings` missing Idempotency-Key → 400
- `POST /bookings` duplicate idempotency key → 201 cached (no double insert)
- `DELETE /bookings/{id}` owner cancels → 200 CANCELLED
- `DELETE /bookings/{id}` cancel CHECKED_IN → 409
- `POST /bookings/{id}/check-in` within window → 200 CHECKED_IN
- `POST /bookings/{id}/check-in` too early → 422

### Dependencies
- Task 13.4
- Task 7.8, Task 8.5

### Expected Result
- Concurrency test: `Promise.all([bookingA, bookingB])` cùng seat → 1 success, 1 fail

### Validation Checklist
- [ ] `npm run test:integration` → tất cả booking tests pass
- [ ] Concurrency test: exactly 1×201, 1×409
- [ ] DB state sau test là clean

---

## Task 13.6 — Load Tests — Smoke & Booking

### Goal
Tạo k6 load test scripts theo `TESTING.md`.

### Related Docs
- `TESTING.md` §7 (Load Testing)

### Files Created
- `tests/load/k6/smoke.js` — smoke test
- `tests/load/k6/booking-load.js` — booking load test
- `tests/load/k6/helpers.js` — shared auth + data helpers

### Functions
_(k6 JavaScript — không phải TypeScript)_

**smoke.js:** test với 1-5 VUs trong 30s: health check, login, browse cafés
**booking-load.js:** test với 20-50 VUs: login → read availability → create booking; check `201` vs `409` ratio

### Dependencies
- Phase 12 (full app deployed)

### Expected Result
- Smoke test: `http_req_failed < 1%`, `p95 < 500ms`
- Load test: chạy được không crash server

### Validation Checklist
- [ ] `k6 run tests/load/k6/smoke.js` pass với thresholds
- [ ] Load test không gây server crash
- [ ] `tests/load/reports/` được gitignore

---

---

# Phase 14 — Docker & CI/CD

**Goal:** Container hóa app, setup GitHub Actions CI, và chuẩn bị deploy lên Render.

---

## Task 14.1 — Create Dockerfile

### Goal
Tạo multi-stage Dockerfile cho production build.

### Related Docs
- `SYSTEM_ARCHITECTURE.md` §6 (Docker container)
- `SYSTEM-OVERVIEW.md` §1 (Deployment: Docker → Render)

### Files Created
- `Dockerfile`
- `.dockerignore`

### Functions
_(không có)_

### Dependencies
- Task 0.4 (build script)

### Expected Result
**Multi-stage build:**
1. Stage `builder`: `node:20-alpine`, `npm ci`, `npm run build`
2. Stage `production`: copy `dist/`, `node_modules` (production only), `prisma/schema.prisma`

`.dockerignore` loại trừ: `node_modules/`, `src/`, `.env`, `tests/`, `.git/`

### Validation Checklist
- [ ] `docker build -t cafe-reservation .` thành công
- [ ] `docker run` start server
- [ ] Image size < 500MB

---

## Task 14.2 — Create `docker-compose.yml` for Local Dev

### Goal
Tạo `docker-compose.yml` để chạy PostgreSQL + Redis locally.

### Related Docs
- `TESTING.md` §4 (Docker Compose cho test)

### Files Created
- `docker-compose.yml` — dev environment (Postgres + Redis)
- `docker-compose.test.yml` — test environment (separate DB)

### Functions
_(không có)_

### Dependencies
- Task 14.1

### Expected Result
- `docker-compose up -d` → Postgres + Redis chạy
- Dev: DB port 5432, Redis port 6379
- Test: DB port 5433, Redis DB index 1

### Validation Checklist
- [ ] `docker-compose up -d` không lỗi
- [ ] `npm run dev` connect được vào Docker Postgres + Redis

---

## Task 14.3 — Create GitHub Actions CI Workflow

### Goal
Tạo CI workflow chạy lint + unit tests + integration tests trên mỗi push/PR.

### Related Docs
- `TESTING.md` §8 (CI Pipeline)

### Files Created
- `.github/workflows/test.yml`

### Functions
_(không có — YAML workflow)_

### Dependencies
- Task 13.5

### Expected Result
Workflow jobs:
1. `test`:
   - Checkout
   - Setup Node 20
   - `npm ci`
   - Start Postgres + Redis service containers
   - `npx prisma migrate deploy`
   - `npm run test`
   - `npm run build`

### Validation Checklist
- [ ] Push to GitHub → Actions workflow triggered
- [ ] Workflow pass trên branch `main`
- [ ] Fail khi unit/integration tests fail

---

## Task 14.4 — Final Review & README

### Goal
Viết README hoàn chỉnh và tổng hợp final review checklist.

### Related Docs
- `SYSTEM-OVERVIEW.md` (tất cả sections)

### Files Created
- `README.md` (update từ Task 0.1)

### Functions
_(không có)_

### Dependencies
- Tất cả phases trước

### Expected Result
README có:
- Project description
- Tech stack
- Setup instructions (clone, install, .env, migrate, seed, run)
- API overview (link tới API-SPECIFICATION.md)
- Test instructions
- Docker instructions

### Validation Checklist
- [ ] README đủ để dev mới clone repo và chạy trong < 10 phút
- [ ] Tất cả endpoints hoạt động với seed data
- [ ] `npm run test` pass
- [ ] `npm run build` không lỗi
- [ ] `docker build` không lỗi
- [ ] Không có TypeScript error toàn project
- [ ] Không có ESLint error toàn project
- [ ] Final commit

---

---

## Tổng Kết Roadmap

### Dependency Map (Phase Order)

```
0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14
                                  ↑
                             (Phase 3+4 phải xong trước Phase 5)
```

### Module Build Order

```
Shared Layer (Phase 3+4)
     ↓
Auth Module (Phase 5)     ← không phụ thuộc module nào khác
     ↓
Café Module (Phase 6)     ← phụ thuộc Auth
     ↓
Booking Module (Phase 7+8) ← phụ thuộc Auth + Café
     ↓
Owner Module (Phase 9)    ← phụ thuộc Booking + Café
     ↓
Workers (Phase 10)        ← phụ thuộc Booking + Email infrastructure
     ↓
Notification + Customer (Phase 11) ← phụ thuộc Auth
     ↓
Admin Module (Phase 12)   ← phụ thuộc tất cả
```

### Critical Paths (phải đúng 100%)

| Flow | Phase | Tại sao Critical |
|------|-------|-----------------|
| Create Booking | 7 | Transaction + row lock + idempotency — không được sai |
| Cancel Booking | 8 | Conditional update + race condition |
| Check-in | 8 | Race với auto-expire worker |
| Auto-Expire Worker | 10 | Conditional update + cache invalidation |

### Files Summary

| Module | Files chính |
|--------|------------|
| Auth | `auth.repository.ts`, `auth.service.ts`, `password.service.ts`, `jwt.service.ts`, `auth.controller.ts`, `auth.routes.ts` |
| Café | `cafe.repository.ts`, `cafe.service.ts`, `seat-availability.service.ts`, `cafe.controller.ts`, `cafe.routes.ts` |
| Owner | `owner.repository.ts`, `owner.service.ts`, `owner.controller.ts`, `owner.routes.ts` |
| Booking | `booking.repository.ts`, `booking.service.ts`, `cancellation.service.ts`, `checkin.service.ts`, `booking-queue.service.ts`, `booking.controller.ts`, `booking.routes.ts` |
| Notification | `notification.repository.ts`, `notification.service.ts`, `notification.controller.ts`, `notification.routes.ts` |
| Customer | `customer.repository.ts`, `customer.service.ts` |
| Admin | `admin.repository.ts`, `admin.service.ts`, `admin.controller.ts`, `admin.routes.ts` |
| Workers | `queues.ts`, `booking.worker.ts`, `email.worker.ts`, `worker.types.ts` |
| Common | `errors.ts`, `response.ts`, `pagination.ts`, `cache.service.ts` |
| Middleware | `authenticate.ts`, `authorize.ts`, `rateLimiter.ts`, `errorHandler.ts`, `requestId.ts` |
| Config | `env.ts`, `prisma.ts`, `redis.ts` |

---

**End of Implementation Roadmap**

*Bám sát roadmap này. Không nhảy task. Mỗi task là một commit riêng.*  
*Khi gặp khó khăn, đọc lại Related Docs trước khi hỏi.*
