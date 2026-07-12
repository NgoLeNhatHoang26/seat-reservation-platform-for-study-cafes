# Backend Documentation

Tài liệu cho **Cafe Reservation Backend API** — nền tảng đặt chỗ ngồi học tại quán cà phê.

> Đọc theo thứ tự: **Overview → Features → Design Notes**, rồi tới các tài liệu chi tiết bên dưới khi cần.

---

## Bắt đầu nhanh (overview)

| Tài liệu | Nội dung |
| -------- | -------- |
| [BACKEND-OVERVIEW.md](./BACKEND-OVERVIEW.md) | Kiến trúc, stack, module map |
| [BACKEND-FEATURES.md](./BACKEND-FEATURES.md) | Tính năng theo role + API chính |
| [BACKEND-DESIGN-NOTES.md](./BACKEND-DESIGN-NOTES.md) | Quyết định thiết kế (auth, booking, queue, cache) |

---

## Tài liệu hệ thống (chi tiết)

| Tài liệu | Nội dung |
| -------- | -------- |
| [SYSTEM-OVERVIEW.md](./SYSTEM-OVERVIEW.md) | Index kỹ thuật / blueprint |
| [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) | Components, layers, module dependencies |
| [USE_CASES.md](./USE_CASES.md) | Business rules, actors, use cases |
| [API-SPECIFICATION.md](./API-SPECIFICATION.md) | REST endpoints, request/response, error codes |
| [REQUEST-FLOW.md](./REQUEST-FLOW.md) | Luồng xử lý từng request (controller → worker) |
| [DATABASE-DESIGN.md](./DATABASE-DESIGN.md) | Schema, ERD, constraints, indexes |
| [CONCURRENCY-DESIGN.md](./CONCURRENCY-DESIGN.md) | Transaction, locking, idempotency |
| [CACHE-DESIGN.md](./CACHE-DESIGN.md) | Cache keys, TTL, invalidation |
| [QUEUE-DESIGN.md](./QUEUE-DESIGN.md) | BullMQ topology, jobs, delays |
| [TESTING.md](./TESTING.md) | Unit, integration, load test strategy |
| [IMPLEMENTATION-ROADMAP.md](./IMPLEMENTATION-ROADMAP.md) | Roadmap triển khai theo phase |

Frontend docs ở [`../../frontend/docs/`](../../frontend/docs/README.md) (overview, architecture, UI/UX).

---

## Quick Start

### Cách 1 — Docker (full stack)

Từ thư mục gốc repo:

```bash
# Tuỳ chọn: cp .env.docker.example .env
docker compose up -d --build
```

| Service  | URL |
| -------- | --- |
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000/api/v1 |
| Health | http://localhost:3000/health |

Postgres (`5434`) và Redis (`6381`) vẫn expose ra host để debug. Backend tự chạy `prisma migrate deploy`; seed khi `RUN_SEED=true` (mặc định trong compose).

### Cách 2 — Local development

#### Yêu cầu

- Node.js ≥ 20
- Docker Desktop (Postgres + Redis)
- npm

### 1. Khởi động hạ tầng

Từ thư mục gốc repo:

```bash
docker compose up -d
```

| Service  | Host port |
| -------- | --------- |
| Postgres | 5434      |
| Redis    | 6381      |

### 2. Cấu hình môi trường

```bash
cd backend
cp .env.example .env
npm install
```

Chỉnh `.env` nếu cần. Các biến bắt buộc: `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`.

### 3. Database

```bash
npx prisma migrate deploy
npx prisma db seed
```

### 4. Chạy API

```bash
npm run dev
```

- Health check: `GET http://localhost:3000/health`
- API base path: `/api/v1`

Workers (BullMQ) khởi động **cùng process** với HTTP server — phù hợp môi trường development local, đơn giản và dễ debug.

---

## Tài khoản seed (local development)

| Role     | Email                  | Password      |
| -------- | ---------------------- | ------------- |
| Admin    | `admin@example.com`    | `Admin123!`   |
| Owner    | `owner@example.com`    | `Owner123!`   |
| Customer | `customer@example.com` | `Customer123!` |

Owner seed có `OwnerProfile` trạng thái **APPROVED** và café **Study Hub Hanoi** (ACTIVE).

---

## Scripts hữu ích

| Script | Mô tả |
| ------ | ----- |
| `npm run dev` | Chạy API + workers (hot reload) |
| `npm run build` | Compile TypeScript |
| `npm run test` | Chạy toàn bộ tests |
| `npm run test:unit` | Unit tests |
| `npm run test:integration` | Integration tests (cần DB test) |
| `npm run load:smoke` | k6 smoke test (cần chuẩn bị token trước) |

Integration test dùng `docker-compose.test.yml` (Postgres `5433`, Redis `6380`) và file `.env.test`.

---

## Cấu trúc source chính

```
backend/
├── src/
│   ├── app.ts              # Express app, middleware, routes mount
│   ├── server.ts           # DB/Redis connect, workers, graceful shutdown
│   ├── config/             # env, prisma, redis
│   ├── middleware/         # auth, RBAC, validate, rate limit, errors
│   ├── modules/            # auth, cafe, booking, customer, notification, admin, upload
│   ├── workers/            # BullMQ booking + email workers
│   └── common/             # errors, response helpers, cache
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── load/
└── docs/                   # ← toàn bộ tài liệu backend (thư mục này)
```
