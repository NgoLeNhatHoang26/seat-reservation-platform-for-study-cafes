# API Specification — Seat Reservation Platform for Study Cafés

**Project:** Seat Reservation Platform for Study Cafés  
**Approach:** API First Design  
**Base URL:** `/api/v1`  
**Stack:** Node.js, Express, PostgreSQL, Prisma, Redis, BullMQ, JWT  
**Document Version:** 2.0  
**Last Updated:** June 2026

---

## Document Purpose

REST API contract for implementation. **33 endpoints** — no payment, reviews, coupons, or OpenAPI files.

**Related:** `DATABASE-DESIGN.md`, `REQUEST-FLOW.md`, `QUEUE-DESIGN.md`, `CACHE-DESIGN.md`

---

## Table of Contents

1. [API Conventions](#1-api-conventions)
2. [Response Format](#2-response-format)
3. [Error Codes](#3-error-codes)
4. [Global Middleware](#4-global-middleware)
5. [Endpoint Documentation Guide](#5-endpoint-documentation-guide)
6. [Authentication](#6-authentication)
7. [Cafés & Seats](#7-cafés--seats)
8. [Booking & Check-in](#8-booking--check-in)
9. [Notifications](#9-notifications)
10. [Café Owner](#10-café-owner)
11. [Admin](#11-admin)
12. [Endpoint Index](#12-endpoint-index)
13. [Authorization Matrix](#13-authorization-matrix)

---

## 1. API Conventions

### 1.1 URL Naming

| Rule | Example |
|------|---------|
| Base path versioned | `/api/v1/...` |
| Lowercase, kebab-case for multi-word resources | `/seat-layout`, `/check-in` |
| Plural nouns for collections | `/cafes`, `/bookings` |
| Nested resources when scoped | `/cafes/{cafeId}/seats/availability` |
| Actions as sub-resources (not verbs in URL) | `POST /bookings/{id}/check-in` |
| Owner/admin scoped prefixes | `/owner/...`, `/admin/...` |

### 1.2 HTTP Methods

| Method | Usage |
|--------|-------|
| `GET` | Read resource(s); idempotent |
| `POST` | Create resource or trigger action (check-in, login) |
| `PUT` | Full replace of a resource |
| `PATCH` | Partial update |
| `DELETE` | Cancel/remove (soft delete or status change where applicable) |

### 1.3 Authentication Header

```
Authorization: Bearer <access_token>
```

Refresh token is sent in request body (`POST /auth/refresh`).

### 1.4 Idempotency Header

Required on `POST /bookings` and recommended on `DELETE /bookings/{id}`:

```
Idempotency-Key: <uuid-v4>
```

Redis TTL 1 hour. Duplicate key returns cached response.

### 1.5 Request Correlation

Every response includes `X-Request-Id` header (UUID). Error responses may include the same value in `meta.requestId`.

### 1.6 Pagination

Cursor-based pagination for all list endpoints.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | integer | `20` | Items per page (max `100`) |
| `cursor` | string | — | Opaque cursor from previous response |

**Pagination envelope (inside `data`):** `items`, `nextCursor`, `hasMore`

### 1.7 Filtering

Filter via query string: `?city=hanoi&status=ACTIVE`. Multiple values: comma-separated.

### 1.8 Sorting

`sort` query param; prefix `-` for descending. Example: `sort=-createdAt`

### 1.9 Timestamp Format

ISO 8601 UTC — `2026-06-28T10:00:00.000Z`. Display uses café `timezone` (IANA).

### 1.10 Identifiers

Resource IDs: **UUID v4**. Confirmation numbers: human-readable (e.g. `BK-20260628-A1B2C3`).

### 1.11 Naming Convention (JSON)

| Context | Convention | Example |
|---------|------------|---------|
| JSON fields | camelCase | `startTime`, `cafeId` |
| URL segments | kebab-case | `/seat-layout` |
| Enums | SCREAMING_SNAKE_CASE | `CONFIRMED`, `CUSTOMER` |

### 1.12 Roles

| Role | Description |
|------|-------------|
| `CUSTOMER` | Student who browses and books seats |
| `OWNER` | Café owner managing cafés and seats |
| `ADMIN` | Platform administrator |

---

## 2. Response Format

### 2.1 Success Response

```json
{
  "success": true,
  "message": "<human-readable summary>",
  "data": { }
}
```

List endpoints: `data.items`, `data.nextCursor`, `data.hasMore`.

### 2.2 Error Response

```json
{
  "success": false,
  "error": "<BUSINESS_ERROR_CODE>",
  "message": "<human-readable explanation>",
  "meta": { "requestId": "<uuid>", "details": { } }
}
```

---

## 3. Error Codes

### 3.1 Authentication & Authorization

| Code | HTTP | Description |
|------|------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid access token |
| `AUTH_INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `AUTH_TOKEN_EXPIRED` | 401 | Access token expired |
| `AUTH_REFRESH_TOKEN_INVALID` | 401 | Refresh token invalid or revoked |
| `FORBIDDEN` | 403 | Insufficient permission |
| `ACCOUNT_SUSPENDED` | 403 | Account suspended |
| `ACCOUNT_LOCKED` | 403 | Account locked after failed logins |
| `EMAIL_ALREADY_REGISTERED` | 409 | Email already in use |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |

### 3.2 Validation

| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | 422 | Request failed validation |
| `IDEMPOTENCY_KEY_REQUIRED` | 400 | Required header missing |

### 3.3 Cafés & Seats

| Code | HTTP | Description |
|------|------|-------------|
| `CAFE_NOT_FOUND` | 404 | Café does not exist |
| `CAFE_NOT_AVAILABLE` | 404 | Café not active |
| `SEAT_NOT_FOUND` | 404 | Seat does not exist |
| `DUPLICATE_SEAT_NUMBER` | 422 | Duplicate seat label in zone |
| `LAYOUT_CONFLICT` | 409 | Layout conflicts with active bookings |

### 3.4 Bookings

| Code | HTTP | Description |
|------|------|-------------|
| `BOOKING_NOT_FOUND` | 404 | Booking not found |
| `SEAT_ALREADY_BOOKED` | 409 | Seat unavailable for slot |
| `BOOKING_CONFLICT` | 409 | Customer overlapping booking |
| `BOOKING_LIMIT_EXCEEDED` | 409 | Max concurrent bookings reached |
| `BOOKING_CANNOT_CANCEL` | 409 | Not cancellable |
| `BOOKING_INVALID_STATUS` | 409 | Invalid status transition |
| `BOOKING_EXPIRED` | 409 | No-show expired |
| `INVALID_TIME_SLOT` | 422 | Invalid slot for policy |
| `TIME_SLOT_IN_PAST` | 422 | Slot in the past |
| `CHECKIN_TOO_EARLY` | 422 | Before check-in window |
| `CHECKIN_WINDOW_EXPIRED` | 409 | Grace period passed |
| `BOOKING_TIMEOUT` | 503 | Transaction timeout |

### 3.5 Notifications

| Code | HTTP | Description |
|------|------|-------------|
| `NOTIFICATION_NOT_FOUND` | 404 | Notification not found |

### 3.6 Admin

| Code | HTTP | Description |
|------|------|-------------|
| `USER_NOT_FOUND` | 404 | User not found |
| `CANNOT_SUSPEND_ADMIN` | 403 | Cannot suspend admin |
| `CANNOT_SUSPEND_SELF` | 403 | Cannot suspend self |

### 3.7 System

| Code | HTTP | Description |
|------|------|-------------|
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected error |
| `SERVICE_UNAVAILABLE` | 503 | Dependency unavailable |

---

## 4. Global Middleware

Applied to every request (in order):

1. Request ID (`X-Request-Id`)
2. HTTP logging (Morgan)
3. Rate limiting (Redis)
4. JWT authentication (where required)
5. RBAC role check
6. Request validation (Zod/Joi)
7. Global error handler

### Background Jobs (BullMQ)

| Queue | Worker | Purpose |
|-------|--------|---------|
| `booking` | `BookingWorker` | Delayed reminder, auto-expire |
| `email` | `EmailWorker` | Outbound emails |

Jobs enqueued **after** DB commit only. See `QUEUE-DESIGN.md`.

---

## 5. Endpoint Documentation Guide

| Level | Endpoints | Sections |
|-------|-----------|----------|
| **A — Critical** | Register, Login, Refresh, Create/Cancel Booking, Check-in, Create Café, Update Seat Layout | Full: purpose, auth, request, validation, business rules, response, + transaction / cache / jobs / rate limit / idempotency **only when applicable** |
| **B — Simple** | All other endpoints | Compact: endpoint, purpose, auth, request, response, business rules (+ cache line only for cached reads/updates) |

Sections omitted when not applicable — no placeholder "N/A" rows.

---

## 6. Authentication

### 6.1 Register Customer — Level A

`POST /api/v1/auth/register` · **Public**

**Purpose:** Create customer account + profile; issue JWT; enqueue verification email.

**Request body:**

| Field | Required | Notes |
|-------|----------|-------|
| `email` | Yes | Unique |
| `password` | Yes | Min 8 chars, letter + number |
| `fullName` | Yes | 2–150 chars |
| `phone`, `preferredCity` | No | |

**Validation:** Email format; password strength; `fullName` not blank.

**Response:** `201` — `data.user`, `data.tokens` · Errors: `409 EMAIL_ALREADY_REGISTERED`, `422`, `429`

**Business rules:**

- Role `CUSTOMER`; status `PENDING_EMAIL_VERIFICATION`
- Booking requires `ACTIVE`; login allowed before email verified
- Concurrent duplicate email → DB unique constraint → `409`

**Concurrency:** Unique index on `email` prevents duplicate registration.

**Rate limit:** 5 req/hour/IP

---

### 6.2 Login — Level A

`POST /api/v1/auth/login` · **Public**

**Request body:** `email`, `password` (required)

**Response:** `200` — `data.user`, `data.tokens` · Errors: `401 AUTH_INVALID_CREDENTIALS`, `403 ACCOUNT_LOCKED` / `ACCOUNT_SUSPENDED`, `429`

**Business rules:**

- Same error message for wrong email vs password
- Lock after 5 failed attempts (15 min); counter in Redis
- Soft-deleted users cannot login

**Concurrency:** Redis atomic `INCR` on failed attempts.

**Rate limit:** 10 req/15 min/IP

---

### 6.3 Refresh Token — Level A

`POST /api/v1/auth/refresh` · **Public**

**Request body:** `refreshToken` (required)

**Response:** `200` — `data.tokens` · Error: `401 AUTH_REFRESH_TOKEN_INVALID`

**Business rules:**

- Token must exist in Redis `refresh:{userId}:{tokenId}`
- User not `SUSPENDED` or soft-deleted
- Optional refresh token rotation on success

**Rate limit:** 30 req/hour/user

---

### 6.4 Register Café Owner — Level B

`POST /api/v1/auth/register-owner` · **Public**

| | |
|--|--|
| **Purpose** | Register owner + first café (`PENDING_VERIFICATION`); issue JWT |
| **Request** | `email`, `password`, `fullName`, `phone`, `cafe` object (name, address, city, `operatingHours`, optional amenities) |
| **Response** | `201` — `data.user`, `data.cafe`, `data.tokens` |
| **Business rules** | Role `OWNER`; café hidden until admin approves; TX: user + café + audit |

---

### 6.5 Logout — Level B

`POST /api/v1/auth/logout` · **Any authenticated**

| | |
|--|--|
| **Purpose** | Revoke refresh token |
| **Request** | Body: `refreshToken` |
| **Response** | `200` — `{ loggedOut: true }` |
| **Business rules** | Delete Redis refresh key; optional access token blacklist |

---

### 6.6 Get Current User — Level B

`GET /api/v1/auth/me` · **Any authenticated**

| | |
|--|--|
| **Purpose** | Return authenticated user profile |
| **Response** | `200` — `data.user`; `data.profile` only when `role = CUSTOMER` |
| **Business rules** | Customer profile includes `preferredCity`, notification prefs |

---

## 7. Cafés & Seats

### 7.1 Browse Cafés — Level B

`GET /api/v1/cafes` · **Public**

| | |
|--|--|
| **Purpose** | Paginated list of active cafés |
| **Request** | Query: `city`, `limit`, `cursor`, `sort` (default `-createdAt`) |
| **Response** | `200` — `data.items[]` (`id`, `name`, `slug`, `city`, `amenities`, `totalSeats`), pagination |
| **Business rules** | Only `status = ACTIVE` cafés |
| **Cache** | Read `cafes:list:{paramsHash}`; write on miss TTL 5 min |

---

### 7.2 Search Cafés — Level B

`GET /api/v1/cafes/search` · **Public**

| | |
|--|--|
| **Purpose** | Filter cafés by city, amenities, optional date/time |
| **Request** | Query: `city` (required), `amenities`, `date`, `startTime`, `endTime`, pagination |
| **Response** | `200` — same pagination shape as browse; optional `availableSeatsCount` when time params set |
| **Business rules** | Only `ACTIVE` cafés; shares cache key pattern with browse |
| **Cache** | `cafes:list:{paramsHash}` TTL 5 min |

---

### 7.3 Get Café Detail — Level B

`GET /api/v1/cafes/{cafeId}` · **Public**

| | |
|--|--|
| **Purpose** | Full public café profile + booking policies |
| **Request** | Path: `cafeId` |
| **Response** | `200` — `data.cafe`, `data.policies` · Errors: `404 CAFE_NOT_FOUND` / `CAFE_NOT_AVAILABLE` |
| **Business rules** | Public endpoint returns only `ACTIVE` cafés |
| **Cache** | `cafe:detail:{cafeId}` TTL 10 min |

---

### 7.4 Get Seat Layout — Level B

`GET /api/v1/cafes/{cafeId}/seats/layout` · **Public**

| | |
|--|--|
| **Purpose** | Zones and seats (no booking status) |
| **Request** | Path: `cafeId` |
| **Response** | `200` — `data.zones[]` with `seats[]` (`id`, `seatNumber`, `seatType`, `amenities`) |
| **Business rules** | Active café only; inactive/deleted seats omitted |
| **Cache** | `cafe:layout:{cafeId}` TTL 10 min |

---

### 7.5 Get Seat Availability — Level B

`GET /api/v1/cafes/{cafeId}/seats/availability` · **Public**

| | |
|--|--|
| **Purpose** | Real-time seat availability for a time window |
| **Request** | Path: `cafeId`; Query: `startTime`, `endTime` (required), `zoneId` (optional) |
| **Response** | `200` — `data.timeSlot`, `data.zones[]` (seat `AVAILABLE` \| `BOOKED`), `data.summary` |
| **Business rules** | Overlap with `CONFIRMED`/`CHECKED_IN` bookings → `BOOKED`; snapshot may be briefly stale — write path authoritative |
| **Cache** | `availability:{cafeId}:{date}:{slotHash}` TTL 30 sec |

---

## 8. Booking & Check-in

### 8.1 Create Booking — Level A

`POST /api/v1/bookings` · **Customer** (`ACTIVE`)

**Headers:** `Idempotency-Key` (required, UUID v4)

**Request body:**

| Field | Required |
|-------|----------|
| `cafeId`, `seatId`, `startTime`, `endTime` | Yes |
| `notes` | No (max 500) |

**Validation:** Valid UUIDs; `endTime > startTime`; `startTime` future; slot matches café duration & hours.

**Response:** `201` — `data.booking`, `data.seat`, `data.cafe`  
**Errors:** `400 IDEMPOTENCY_KEY_REQUIRED`, `409 SEAT_ALREADY_BOOKED` / `BOOKING_CONFLICT` / `BOOKING_LIMIT_EXCEEDED`, `422 INVALID_TIME_SLOT`, `503 BOOKING_TIMEOUT`

**Business rules:**

- Seat must be free for the time window (no overlapping active booking)
- Cannot book in the past or outside café operating hours
- Customer ≤ café `maxConcurrentBookings` active bookings
- No overlapping booking for same customer in same window
- Status created as `CONFIRMED` immediately

**Transaction:** `READ COMMITTED` — `FOR UPDATE` seat → overlap check → insert booking → audit → commit. No Redis/BullMQ inside TX.

**Concurrency:** Row lock on seat; partial unique index backup; idempotency key for client retries.

**Cache:** Read idempotency key pre-TX; write response post-commit; invalidate `availability:{cafeId}:*`

**Background jobs (post-commit):**

| Job | Queue | Delay |
|-----|-------|-------|
| `BOOKING_CONFIRMATION` | `email` | 1s |
| `BOOKING_REMINDER` | `booking` | Until 30 min before start |
| `AUTO_EXPIRE_BOOKING` | `booking` | Until start + grace |

**Rate limit:** 20 req/min/user

**Idempotency:** Required — same key returns cached `201` for 1 hour.

---

### 8.2 Cancel Booking — Level A

`DELETE /api/v1/bookings/{bookingId}` · **Customer** (owner)

**Request:** Path `bookingId`; Query `reason` (optional); Header `Idempotency-Key` (recommended)

**Validation:** Valid UUID; `reason` max 255 chars.

**Response:** `200` — `data.booking` (`CANCELLED`), `data.policy`  
**Errors:** `404`, `403`, `409 BOOKING_CANNOT_CANCEL`

**Business rules:**

- Only owner; only when status `CONFIRMED`
- Already `CANCELLED` → idempotent `200`
- Seat released for the slot after cancel

**Transaction:** Conditional `UPDATE WHERE status = 'CONFIRMED'` → history → audit.

**Concurrency:** Race with check-in/expire — conditional update; first writer wins.

**Cache:** Invalidate `availability:{cafeId}:*`

**Background jobs:**

| Job | Action |
|-----|--------|
| `BOOKING_CANCELLATION` | Enqueue to `email` queue |
| Cancel scheduled | Remove `{bookingId}:reminder`, `{bookingId}:expire` from `booking` queue |

**Rate limit:** 30 req/min/user

**Idempotency:** Recommended — duplicate cancel returns same `200`.

---

### 8.3 Check-in — Level A

`POST /api/v1/bookings/{bookingId}/check-in` · **Customer** (owner of booking)

**Request:** Path `bookingId`; Body `{}`

**Response:** `200` — `data.booking` (`CHECKED_IN`, `checkedInAt`), `data.seat`  
**Errors:** `404`, `403`, `409 BOOKING_INVALID_STATUS` / `CHECKIN_WINDOW_EXPIRED`, `422 CHECKIN_TOO_EARLY`

**Business rules:**

- Status must be `CONFIRMED`
- Time within `± checkinGraceMinutes` of `startTime`
- Already `CHECKED_IN` → idempotent `200`
- Race with auto-expire → conditional update

**Transaction:** `UPDATE ... WHERE status = 'CONFIRMED'` + `checkedInAt` + audit.

**Concurrency:** Same conditional update as cancel/expire worker.

**Background jobs:** Remove `{bookingId}:expire` from `booking` queue.

**Rate limit:** 10 req/min/user

---

### 8.4 Get Booking Details — Level B

`GET /api/v1/bookings/{bookingId}` · **Customer** (own) / **Owner** / **Admin**

| | |
|--|--|
| **Purpose** | Single booking with café and seat summary |
| **Response** | `200` — `data.booking`, `data.cafe`, `data.seat` |
| **Business rules** | Customer: own bookings only; Owner: own café's bookings only |

---

### 8.5 Booking History — Level B

`GET /api/v1/bookings` · **Customer**

| | |
|--|--|
| **Purpose** | Paginated customer booking list |
| **Request** | Query: `status`, `upcoming`, `cafeId`, `sort` (default `-startTime`), pagination |
| **Response** | `200` — `data.items[]` with café/seat summary |
| **Business rules** | `upcoming=true` → future + status `CONFIRMED`/`CHECKED_IN` |

---

## 9. Notifications

### 9.1 Get Notifications — Level B

`GET /api/v1/notifications` · **Any authenticated**

| | |
|--|--|
| **Purpose** | In-app notifications (from `notification_logs`, channel `IN_APP`) |
| **Request** | Query: `isRead`, `type`, pagination |
| **Response** | `200` — `data.items[]`, `data.unreadCount`, pagination |
| **Business rules** | User sees own notifications only |

---

### 9.2 Mark Notification as Read — Level B

`PATCH /api/v1/notifications/{notificationId}/read` · **Any authenticated**

| | |
|--|--|
| **Purpose** | Mark one notification read |
| **Response** | `200` — `data.notification` (`isRead: true`) · Errors: `404`, `403` |
| **Business rules** | Idempotent if already read |

---

## 10. Café Owner

### 10.1 Create Café — Level A

`POST /api/v1/owner/cafes` · **Owner**

**Request body:** Café fields — `name`, `address`, `city`, `operatingHours`, optional `phone`, `email`, `description`, `amenities`

**Validation:** `name` 2–200 chars; valid `operatingHours`; known amenity enums.

**Response:** `201` — `data.cafe` (`PENDING_VERIFICATION`)

**Business rules:**

- Additional café for existing owner (first café via §6.4)
- Public visibility after admin approval

**Transaction:** Café insert + audit log.

**Rate limit:** 10 req/hour/owner

---

### 10.2 Update Seat Layout — Level A

`PUT /api/v1/owner/cafes/{cafeId}/seats/layout` · **Owner** (owns café)

**Request body:**

| Field | Notes |
|-------|-------|
| `zones[]` | `name`, `displayOrder`, `seats[]` (`seatNumber`, `seatType`, `amenities`) |
| `force` | Optional — bypass conflict check; cancels affected bookings |

**Validation:** ≥1 zone with ≥1 seat; unique `seatNumber` per zone; enum `seatType`.

**Response:** `200` — `data.layout`, `data.summary` · Errors: `409 LAYOUT_CONFLICT`, `422 DUPLICATE_SEAT_NUMBER`

**Business rules:**

- Cannot remove/renumber seats with active future bookings unless `force=true`
- Removed seats soft-deleted

**Transaction:** Zone + seat upsert + audit; rollback on failure.

**Cache:** Invalidate `cafe:layout:{cafeId}`, `cafe:detail:{cafeId}`, `availability:{cafeId}:*`

**Background jobs:** If `force=true` → `BOOKING_CANCELLATION` per affected booking (`email` queue)

**Rate limit:** 10 req/hour/café

---

### 10.3 List Owner Cafés — Level B

`GET /api/v1/owner/cafes` · **Owner**

| | |
|--|--|
| **Purpose** | All owner's cafés (any status) |
| **Request** | Query: `status`, pagination |
| **Response** | `200` — paginated café list |
| **Business rules** | `ownerId` must match authenticated user |

---

### 10.4 Get Owner Café — Level B

`GET /api/v1/owner/cafes/{cafeId}` · **Owner**

| | |
|--|--|
| **Purpose** | Full café detail including non-public status |
| **Response** | `200` — full café + policies · Errors: `404`, `403` |
| **Business rules** | Owner must own café |

---

### 10.5 Update Café — Level B

`PUT /api/v1/owner/cafes/{cafeId}` · **Owner**

| | |
|--|--|
| **Purpose** | Update profile (name, address, hours, amenities) |
| **Request** | Path `cafeId`; body: café profile fields |
| **Response** | `200` — updated café |
| **Business rules** | Cannot change `status` via this endpoint |
| **Cache** | Invalidate `cafes:list:*`, `cafe:detail:{cafeId}` |

---

### 10.6 Update Café Settings — Level B

`PATCH /api/v1/owner/cafes/{cafeId}/settings` · **Owner**

| | |
|--|--|
| **Purpose** | Booking policies (slot duration, grace, limits, timezone) |
| **Request** | Body: `slotDurationMinutes`, `checkinGraceMinutes`, `maxConcurrentBookings`, etc. |
| **Response** | `200` — `data.policies` |
| **Business rules** | Applies to new bookings only |

---

### 10.7 Get Seat Layout (Owner) — Level B

`GET /api/v1/owner/cafes/{cafeId}/seats/layout` · **Owner**

| | |
|--|--|
| **Purpose** | Layout including inactive seats |
| **Request** | Query: `includeInactive=true` (optional) |
| **Response** | `200` — same shape as §7.4 with extended visibility |
| **Business rules** | Owner must own café |

---

### 10.8 View Café Bookings — Level B

`GET /api/v1/owner/cafes/{cafeId}/bookings` · **Owner**

| | |
|--|--|
| **Purpose** | Owner booking dashboard |
| **Request** | Query: `status`, `startDate`, `endDate`, `seatId`, `search`, pagination |
| **Response** | `200` — `data.items[]`, optional `data.summary` |
| **Business rules** | Customer email masked in list |

---

### 10.9 Owner Manual Check-in — Level B

`POST /api/v1/owner/cafes/{cafeId}/bookings/{bookingId}/check-in` · **Owner**

| | |
|--|--|
| **Purpose** | Owner checks in customer booking |
| **Response** | Same as §8.3 |
| **Business rules** | Booking must belong to café; same time window rules as customer check-in |

---

## 11. Admin

### 11.1 List Users — Level B

`GET /api/v1/admin/users` · **Admin**

| | |
|--|--|
| **Purpose** | Search/list users |
| **Request** | Query: `search`, `role`, `status`, pagination |
| **Response** | `200` — `data.items[]` (`id`, `email`, `fullName`, `role`, `status`) |

---

### 11.2 Get User Details — Level B

`GET /api/v1/admin/users/{userId}` · **Admin**

| | |
|--|--|
| **Purpose** | User detail + summary stats |
| **Response** | `200` — user + `bookingCount` or `cafeCount` by role · Error: `404` |

---

### 11.3 Suspend User — Level B

`PUT /api/v1/admin/users/{userId}/suspend` · **Admin**

| | |
|--|--|
| **Purpose** | Suspend account; revoke sessions |
| **Request** | Body: `reason` (required, 5–500 chars) |
| **Response** | `200` — `data.user` (`SUSPENDED`) · Errors: `403 CANNOT_SUSPEND_ADMIN` / `CANNOT_SUSPEND_SELF` |
| **Business rules** | Cannot suspend admin or self; idempotent if already suspended |

---

### 11.4 Unsuspend User — Level B

`PUT /api/v1/admin/users/{userId}/unsuspend` · **Admin**

| | |
|--|--|
| **Purpose** | Restore `ACTIVE` status |
| **Response** | `200` — `data.user` |
| **Business rules** | Clears suspension fields; idempotent if already active |

---

### 11.5 List Pending Cafés — Level B

`GET /api/v1/admin/cafes/pending` · **Admin**

| | |
|--|--|
| **Purpose** | Cafés awaiting approval |
| **Response** | `200` — paginated `PENDING_VERIFICATION` cafés with owner summary |

---

### 11.6 Approve Café — Level B

`PUT /api/v1/admin/cafes/{cafeId}/approve` · **Admin**

| | |
|--|--|
| **Purpose** | Approve café → `ACTIVE` |
| **Request** | Body: `notes?` |
| **Response** | `200` — `data.cafe` (`ACTIVE`, `approvedAt`) |
| **Business rules** | Only from `PENDING_VERIFICATION`; invalidate `cafes:list:*`, `cafe:detail:{cafeId}` |

---

### 11.7 Reject Café — Level B

`PUT /api/v1/admin/cafes/{cafeId}/reject` · **Admin**

| | |
|--|--|
| **Purpose** | Reject with reason |
| **Request** | Body: `reason` (required) |
| **Response** | `200` — `data.cafe` (`REJECTED`) |

---

## 12. Endpoint Index

| Method | Path | Auth | Level | Module |
|--------|------|------|-------|--------|
| POST | `/auth/register` | Public | A | Auth |
| POST | `/auth/register-owner` | Public | B | Auth |
| POST | `/auth/login` | Public | A | Auth |
| POST | `/auth/refresh` | Public | A | Auth |
| POST | `/auth/logout` | Any | B | Auth |
| GET | `/auth/me` | Any | B | Auth |
| GET | `/cafes` | Public | B | Cafés |
| GET | `/cafes/search` | Public | B | Cafés |
| GET | `/cafes/{cafeId}` | Public | B | Cafés |
| GET | `/cafes/{cafeId}/seats/layout` | Public | B | Seats |
| GET | `/cafes/{cafeId}/seats/availability` | Public | B | Seats |
| POST | `/bookings` | Customer | A | Booking |
| GET | `/bookings` | Customer | B | Booking |
| GET | `/bookings/{bookingId}` | Customer/Owner/Admin | B | Booking |
| DELETE | `/bookings/{bookingId}` | Customer | A | Booking |
| POST | `/bookings/{bookingId}/check-in` | Customer | A | Check-in |
| GET | `/notifications` | Any | B | Notifications |
| PATCH | `/notifications/{notificationId}/read` | Any | B | Notifications |
| GET | `/owner/cafes` | Owner | B | Owner |
| POST | `/owner/cafes` | Owner | A | Owner |
| GET | `/owner/cafes/{cafeId}` | Owner | B | Owner |
| PUT | `/owner/cafes/{cafeId}` | Owner | B | Owner |
| PATCH | `/owner/cafes/{cafeId}/settings` | Owner | B | Owner |
| GET | `/owner/cafes/{cafeId}/seats/layout` | Owner | B | Owner |
| PUT | `/owner/cafes/{cafeId}/seats/layout` | Owner | A | Owner |
| GET | `/owner/cafes/{cafeId}/bookings` | Owner | B | Owner |
| POST | `/owner/cafes/{cafeId}/bookings/{bookingId}/check-in` | Owner | B | Owner |
| GET | `/admin/users` | Admin | B | Admin |
| GET | `/admin/users/{userId}` | Admin | B | Admin |
| PUT | `/admin/users/{userId}/suspend` | Admin | B | Admin |
| PUT | `/admin/users/{userId}/unsuspend` | Admin | B | Admin |
| GET | `/admin/cafes/pending` | Admin | B | Admin |
| PUT | `/admin/cafes/{cafeId}/approve` | Admin | B | Admin |
| PUT | `/admin/cafes/{cafeId}/reject` | Admin | B | Admin |

**Total: 33 endpoints**

---

## 13. Authorization Matrix

| Endpoint | Public | Customer | Owner | Admin |
|----------|:------:|:--------:|:-----:|:-----:|
| Register / Login / Refresh | ✓ | — | — | — |
| Logout / Me / Notifications | — | ✓ | ✓ | ✓ |
| Browse / Search / Café detail / Layout / Availability | ✓ | ✓ | ✓ | ✓ |
| Create / List / Cancel own booking | — | ✓ | — | — |
| Check-in own booking | — | ✓ | — | — |
| Get booking by ID | — | ✓* | ✓* | ✓ |
| Owner café CRUD / layout / bookings | — | — | ✓* | — |
| Owner manual check-in | — | — | ✓* | — |
| Admin users / café approval | — | — | — | ✓ |

\* Scoped to own resource or owned café.

---

## Appendix: HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Successful read/update/delete (cancel) |
| 201 | Resource created |
| 400 | Bad request (missing idempotency key) |
| 401 | Authentication failure |
| 403 | Authorization / account blocked |
| 404 | Not found |
| 409 | Business conflict |
| 422 | Validation error |
| 429 | Rate limit |
| 500 | Server error |
| 503 | Timeout / unavailable |

---

**End of API Specification**

*See `REQUEST-FLOW.md` for processing flows, `QUEUE-DESIGN.md` for BullMQ, `CACHE-DESIGN.md` for Redis cache.*
