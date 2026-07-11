# System Architecture — Seat Reservation Platform

**Project:** Seat Reservation Platform for Study Cafés  
**Architecture Pattern:** Modular Monolith (future-proof for microservices)  
**Document Version:** 2.0  
**Last Updated:** June 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Design Principles](#2-design-principles)
3. [High-Level Architecture](#3-high-level-architecture)
4. [Module Overview](#4-module-overview)
5. [Module Communication](#5-module-communication)
6. [Infrastructure](#6-infrastructure)
7. [External Services](#7-external-services)
8. [Design Decisions (Summary)](#8-design-decisions-summary)

---

## 1. Overview

### Purpose of This Document

This document answers one question: **what components does the system consist of, and how do they relate?**

It describes the structural decomposition of the platform — layers, modules, infrastructure, and external integrations — without going into API contracts, database schemas, concurrency mechanics, or operational runbooks. Those topics live in dedicated documents.

### System Summary

| Attribute | Value |
|-----------|-------|
| **Pattern** | Modular Monolith (single deployable unit) |
| **Runtime** | Node.js + Express |
| **Persistence** | PostgreSQL (source of truth) + Prisma ORM |
| **Cache & sessions** | Redis |
| **Background jobs** | BullMQ (Redis-backed) |
| **Auth** | JWT (access + refresh tokens) |
| **Deployment** | Docker → Render |
| **Primary actors** | Student (customer), Café owner, Admin |

### Related Documents

| Topic | Document |
|-------|----------|
| Use cases & business rules | [USE_CASES.md](./USE_CASES.md) |
| Cache design | [CACHE-DESIGN.md](./CACHE-DESIGN.md) |
| Queue design | [QUEUE-DESIGN.md](./QUEUE-DESIGN.md) |
| Concurrency | [CONCURRENCY-DESIGN.md](./CONCURRENCY-DESIGN.md) |
| API specification | [API-SPECIFICATION.md](./API-SPECIFICATION.md) |
| Database schema | [DATABASE-DESIGN.md](./DATABASE-DESIGN.md) |
| Overview index | [SYSTEM-OVERVIEW.md](./SYSTEM-OVERVIEW.md) |
| Backend overview (short) | [BACKEND-OVERVIEW.md](./BACKEND-OVERVIEW.md) |

---

## 2. Design Principles

### 2.1 Modular Monolith

A **Modular Monolith** is a single deployable process organized into self-contained, loosely coupled modules. Each module owns a bounded area of the domain and can be extracted into a microservice later without major refactoring.

**Why this pattern for this project:**

- **Solo-developer friendly** — one codebase, one database, one Redis instance; no service discovery or inter-process RPC.
- **Future scalability** — clear module boundaries and internal contracts make extraction straightforward when traffic or team size grows.
- **Maintainability** — each module has its own controllers, services, and repositories; changes stay localized.

**Accepted trade-offs:** vertical scaling until extraction; all modules share one process; deployment is all-or-nothing.

### 2.2 Core Principles

1. **Single Responsibility** — each module, service, and function has one reason to change.
2. **Dependency Inversion** — modules depend on abstractions (interfaces), not concrete implementations.
3. **Explicit module boundaries** — cross-module calls go through public service interfaces, not direct repository access.
4. **ACID where it matters** — booking and payment paths use explicit database transactions.
5. **Eventual consistency elsewhere** — cache and async jobs may lag briefly; strong consistency is not required for notifications or analytics.
6. **Fail-safe defaults** — failed jobs retry; missing cache entries regenerate from the database.
7. **Idempotency on critical writes** — booking creation accepts idempotency keys so client retries are safe.

---

## 3. High-Level Architecture

### 3.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│                    (Web, Mobile, Third-party API Clients)                    │
└──────────────────────────────────────────┬──────────────────────────────────┘
                                          │
                                  (HTTP/REST API)
                                          │
┌─────────────────────────────────────────▼──────────────────────────────────┐
│                          API GATEWAY LAYER                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Express.js Server (Single Entry Point)                             │   │
│  │  ├─ Request Validation    ├─ Authentication (JWT)                   │   │
│  │  ├─ Authorization (RBAC) ├─ Rate Limiting                         │   │
│  │  └─ Error Handling                                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  Router Layer: directs requests to the appropriate module                    │
└──────────────────┬──────────────┬──────────────┬──────────────┬─────────────┘
                   │              │              │              │
        ┌──────────▼──┐   ┌──────▼────┐   ┌───▼────────┐  ┌──▼────────────┐
        │  Auth       │   │  Cafe     │   │  Booking   │  │  Customer    │
        │  Module     │   │  Module   │   │  Module    │  │  Module      │
        └──────────┬──┘   └──────┬────┘   └────┬───────┘  └──┬───────────┘
                   │             │             │             │
        ┌──────────▼─────────────▼─────────────▼─────────────▼──────────┐
        │         MODULAR MONOLITH CORE (Business Logic Layer)            │
        │  Service Layer  →  Repository / Data Access Layer (Prisma)      │
        └──────────────┬──────────────────────────────────────────────┘
                       │
        ┌──────────────▼──────────────────────────────────────────────┐
        │          INFRASTRUCTURE & EXTERNAL SERVICES                  │
        │  PostgreSQL  │  Redis  │  BullMQ  │  Logging (Pino/Morgan)   │
        │  Email (SendGrid)  │  SMS (Twilio)  │  [Payment — optional]  │
        └──────────────────────────────────────────────────────────────┘
```

### 3.2 Layer Summary

| Layer | Technology | Responsibility |
|-------|-----------|----------------|
| **API Gateway** | Express.js | Single entry point; routing, auth, validation, rate limiting |
| **Module Layer** | Isolated TypeScript modules | Domain boundaries: Auth, Cafe, Booking, Customer, Notification, Admin |
| **Service Layer** | TypeScript classes | Business logic, orchestration, validation |
| **Data Access Layer** | Prisma ORM + repositories | Type-safe queries, migrations |
| **Cache Layer** | Redis | Sessions, availability snapshots, rate-limit counters |
| **Queue Layer** | BullMQ | Async email, SMS, scheduled jobs |
| **Persistence** | PostgreSQL | Transactional source of truth |
| **Logging** | Pino + Morgan | Structured application and HTTP logs |
| **Runtime** | Node.js | Single stateless process |

---

## 4. Module Overview

The monolith is divided into **6 modules**. Each module contains:

- **Controllers** — HTTP request handling
- **Services** — business logic
- **Repositories** — data access abstraction
- **Types / Interfaces** — contracts
- **Validators** — input validation

### 4.1 Module Dependency Graph

```
┌─────────────┐
│   Auth      │  ← Foundational (no dependencies on other modules)
└──────┬──────┘
       │
       └────────────────────────────┐
                                    │
        ┌───────────┬───────────────┤
        │           │               │
    ┌───▼──┐  ┌────▼────┐  ┌──────▼────┐
    │Cafe  │  │Booking  │  │ Customer  │  ← Depend on Auth
    └───┬──┘  └────┬────┘  └──────┬────┘
        │          │              │
        └──────┬───┼──────────┬───┘
               │   │          │
        ┌──────▼─┬─▼───┬──────▼────┐
        │Notification │ ← Cross-cutting; called by multiple modules
        └──────┬──────┘
               │
        ┌──────▼──────┐
        │   Admin     │  ← System-level; read access across all modules
        └─────────────┘
```

### 4.2 Module Responsibilities

| Module | Primary Responsibility | Depends On |
|--------|------------------------|------------|
| **Auth** | Registration, login, JWT issuance/refresh, password reset, RBAC enforcement | — |
| **Cafe** | Café CRUD, seat layout, operating hours, availability queries | Auth |
| **Booking** | Seat reservation, cancellation, check-in/out, idempotency | Auth, Cafe |
| **Customer** | Profile, preferences, booking history | Auth |
| **Notification** | Email, SMS, in-app notifications (async, cross-cutting) | Auth, Cafe, Booking, Customer |
| **Admin** | User management, café approval, system health & metrics | All modules |

### 4.3 Module Dependency Matrix

```
         Auth  Cafe  Booking  Customer  Notification  Admin
Auth      -     -       -        -           -          -
Cafe      ✓     -       -        -           -          -
Booking   ✓     ✓       -        -           -          -
Customer  ✓     -       -        -           -          -
Notify    ✓     ✓       ✓        ✓           -          -
Admin     ✓     ✓       ✓        ✓           ✓          -

Legend: ✓ = depends on   - = no dependency
```

**Rule:** a module may depend only on modules at or below its level in the hierarchy. Modules must not reach into another module's repository layer directly.

---

## 5. Module Communication

Modules interact through three patterns, chosen based on consistency requirements and latency tolerance.

### 5.1 Synchronous (Service-to-Service)

**When:** immediate response required; operation must be consistent within the same request.

**Examples:** Booking validates a seat via `CafeService`; any module checks permissions via `AuthService`.

```
API Request → Module A Service → Module B Service → response
(same request lifecycle, same transaction context when needed)
```

**Trade-off:** simple and predictable, but increases coupling if overused.

### 5.2 Asynchronous (BullMQ Queues)

**When:** work can be deferred; eventual consistency is acceptable.

**Examples:** send booking confirmation email, late check-in cancellation, report generation.

```
API Request → Service → enqueue job → return response
                              ↓
                        Worker processes job (retries on failure)
```

**Trade-off:** non-blocking and resilient, but the caller does not wait for completion.

### 5.3 Event Broadcast (Redis Pub/Sub)

**When:** multiple subscribers must react to the same event in near real time.

**Examples:** invalidate availability cache after a booking; stream analytics events.

```
Module A publishes event → Redis channel → Module B, C, … subscribe
```

**Trade-off:** decoupled and fast, but fire-and-forget (no delivery guarantee).

### 5.4 Communication Summary

| Pattern | Mechanism | Consistency | Typical Use |
|---------|-----------|-------------|-------------|
| Synchronous | Direct service call | Strong (same request) | Validation, authorization, reads in critical path |
| Asynchronous | BullMQ job | Eventual | Email, SMS, cleanup, reports |
| Event broadcast | Redis pub/sub | Eventual | Cache invalidation, real-time fan-out |

---

## 6. Infrastructure

### 6.1 Runtime Topology

```
┌─────────────────────────────────────────────────────────────────┐
│                    Docker Container (Render)                     │
│                                                                  │
│  Node.js Process (single, stateless)                            │
│  ├─ Express HTTP Server (port 3000)                               │
│  ├─ 6 Business Modules (in-process)                             │
│  └─ Embedded BullMQ Workers (email, SMS, scheduled jobs)        │
│                                                                  │
│  External connections:                                          │
│  ├─ PostgreSQL (Render Postgres)                                │
│  ├─ Redis (Render Redis)                                        │
│  └─ Third-party APIs (SendGrid, Twilio)                         │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Infrastructure Components

| Component | Role in Architecture |
|-----------|---------------------|
| **PostgreSQL** | Source of truth for all persistent data; ACID transactions for booking |
| **Redis** | Session store, cache layer, rate-limit counters, BullMQ backing store |
| **BullMQ** | Reliable async job processing with retries and dead-letter handling |
| **Pino** | Structured JSON application logging |
| **Morgan** | HTTP request/response logging |
| **Docker** | Consistent build artifact for local dev and production |
| **GitHub Actions** | CI: lint, test (Jest + Supertest), build; CD: deploy to Render |
| **Render** | Managed hosting for the app container, Postgres, and Redis |

### 6.3 Stateless Application Design

The application process holds no durable in-memory state between requests:

- Sessions and refresh tokens live in **Redis** (shared across instances).
- No sticky sessions required — any container can serve any request.
- Horizontal scaling (Phase 2) adds load-balanced containers behind a shared database and Redis without code changes.

---

## 7. External Services

| Service | Provider (default) | Used By | Purpose |
|---------|-------------------|---------|---------|
| **Email** | SendGrid (SMTP fallback) | Notification Module | Booking confirmations, password reset, reminders |
| **SMS** | Twilio (Vietnam VAS as alternative) | Notification Module | Check-in reminders, late-arrival alerts |
| **Payment** | TBD *(optional)* | Booking Module | Deposit or prepayment if required by café policy |

All external calls are made **asynchronously** via BullMQ workers so API response time is not tied to third-party latency or availability.

---

## 8. Design Decisions (Summary)

Architectural choices and their rationale at a glance. Implementation details (locking strategy, cache TTLs, retry policies) are documented in [CONCURRENCY-DESIGN.md](./CONCURRENCY-DESIGN.md), [CACHE-DESIGN.md](./CACHE-DESIGN.md), and [QUEUE-DESIGN.md](./QUEUE-DESIGN.md).

| # | Decision | Chosen Option | Rationale |
|---|----------|---------------|-----------|
| 1 | Application structure | **Modular Monolith** | Right complexity for solo developer; clear extraction path later |
| 2 | Database | **PostgreSQL + Prisma** | ACID transactions and row-level locking required for bookings |
| 3 | Cache & sessions | **Redis** | Atomic ops, pub/sub for invalidation, shared session store |
| 4 | Job queue | **BullMQ** | Redis-backed; retries, visibility, no extra infrastructure |
| 5 | Booking concurrency | **Pessimistic locking** (`SELECT FOR UPDATE`) | Simpler correctness model under seat contention |
| 6 | Transaction isolation | **READ COMMITTED + explicit locks** | Balance between safety and throughput vs. SERIALIZABLE |
| 7 | Client retries | **Idempotency keys** on booking creation | Safe retries without duplicate reservations |
| 8 | Notifications | **Async via BullMQ** | Fast API responses; delivery failures don't block bookings |
| 9 | Cache freshness | **Event-based invalidation + TTL fallback** | Immediate consistency after writes; TTL catches missed events |
| 10 | Process model | **Single Node.js process** | Matches monolith scope; event loop handles I/O concurrency |

### Key Trade-offs

| Decision | Benefit | Trade-off |
|----------|---------|-----------|
| Modular Monolith | Simple ops, fast development | Vertical scaling ceiling before extraction |
| Single process | Easy debugging and deployment | Restart affects all traffic |
| Pessimistic locking | Guaranteed no double-booking | Lock contention under high concurrency |
| Async notifications | Low API latency | Notification delivery is eventually consistent |
| Redis sessions | Fast, horizontally scalable | Requires Redis availability for auth |

### Scaling Roadmap (High Level)

| Phase | Topology | Trigger |
|-------|----------|---------|
| **1 — Current** | Single container + managed DB/Redis | Project launch, portfolio scope |
| **2 — Horizontal** | Load-balanced containers, shared state | Sustained traffic growth |
| **3 — Microservices** | Extract Notification → Admin → Cafe → Booking | Team growth or per-module scaling need |

Recommended extraction order: Notification (already async) → Admin (read-heavy) → Cafe → Booking (most complex; requires Saga for distributed transactions).

---

**End of System Architecture Document**
