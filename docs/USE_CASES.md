# Use Cases - Seat Reservation Platform for Study Cafés

**Project:** Seat Reservation Platform for Study Cafés  
**Focus:** Backend Engineering & System Design  
**Tech Stack:** Node.js + Express, PostgreSQL + Prisma, Redis, BullMQ, JWT, Docker  
**Document Version:** 1.0  
**Last Updated:** June 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Guest Use Cases](#guest-use-cases)
3. [Customer Use Cases](#customer-use-cases)
4. [Café Owner Use Cases](#café-owner-use-cases)
5. [Admin Use Cases](#admin-use-cases)
6. [Backend Concerns & Technical Considerations](#backend-concerns--technical-considerations)

---

## Overview

### System Actors

- **Guest**: Unauthenticated users browsing the platform
- **Customer**: Authenticated students who make reservations
- **Café Owner**: Business owner managing their study café
- **Admin**: System administrator managing the entire platform

### Core Business Rules

- Each café has multiple seats organized by zones (sections)
- Seats can be reserved in time slots (e.g., 2-hour slots)
- One customer can have maximum N active bookings per time period
- Reservations require check-in within 15 minutes of start time
- Cancellation must be done 1 hour before booking time (or with penalty)
- Real-time seat availability must be accurate
- Overbooking is not allowed

---

## Guest Use Cases

### UC001: Browse All Cafés

**Actor:** Guest  
**Precondition:** Guest is on the platform (unauthenticated)  
**Main Flow:**

1. Guest navigates to `/api/v1/cafes` endpoint
2. System returns list of all active cafés with basic info:
   - Café name, address, city
   - Average rating & review count
   - Operating hours
   - Number of total seats
   - Distance from guest's location (if location is provided)
3. System applies pagination (default 20 items/page)
4. Results are sorted by relevance (rating, distance, popularity)

**Postcondition:** Guest views café list without authentication

**Technical Concerns:**
- **Caching**: Cache café list for 5-10 minutes (Redis)
- **Pagination**: Implement cursor-based pagination for large datasets
- **Search Optimization**: Index on city, name, rating for fast queries
- **Response Time**: Target < 200ms

**API Endpoint:**
```
GET /api/v1/cafes
Query Params: page, limit, city, sort_by, lat, lng
Response: { cafes: [], total, page, limit, hasMore }
```

---

### UC002: Search & Filter Cafés

**Actor:** Guest  
**Precondition:** Guest is browsing cafés  
**Main Flow:**

1. Guest applies filters: city, price range, distance, amenities (WiFi, power outlets)
2. Guest optionally sets a date/time to check availability
3. System queries database with filters
4. System returns filtered café list with availability summary for selected time

**Postcondition:** Guest sees filtered results matching criteria

**Technical Concerns:**
- **Multi-field Indexing**: Create composite indexes on (city, is_active)
- **Availability Calculation**: Complex query - optimize with materialized views or aggregates
- **Real-time Data**: Consider caching availability snapshots
- **Performance**: Use database query optimization techniques

**API Endpoint:**
```
GET /api/v1/cafes/search
Query Params: 
  - city (required)
  - price_min, price_max
  - amenities (array: wifi, power, parking)
  - date (ISO format)
  - time_from, time_to
  - distance_km, lat, lng
Response: { cafes: [], filters: {}, total }
```

---

### UC003: View Café Details & Seat Map

**Actor:** Guest  
**Precondition:** Guest selected a café from list  
**Main Flow:**

1. Guest clicks on a café to view details
2. System returns café information:
   - Name, address, phone, email
   - Operating hours (weekly schedule)
   - Amenities & services
   - Customer reviews & ratings
   - Seat layout map with zones
3. Guest optionally views seat availability for a specific date/time
4. System displays which seats are available/booked for that time slot

**Postcondition:** Guest sees complete café details and real-time seat availability

**Technical Concerns:**
- **Real-time Availability**: Cache seat status with TTL based on booking changes
- **Seat Map Data**: Store as JSON or specialized data structure
- **Consistency**: Ensure seat availability is eventually consistent (within seconds)
- **Load**: Optimize queries for frequent access

**API Endpoint:**
```
GET /api/v1/cafes/{cafeId}
Response: {
  id, name, address, phone, email,
  operatingHours: {},
  amenities: [],
  rating, reviewCount,
  seatMap: { zones: [...] }
}

GET /api/v1/cafes/{cafeId}/availability
Query Params: date, timeFrom, timeTo
Response: {
  cafeId,
  timeSlot: { from, to },
  zones: [
    { zoneId, zoneName, seats: [...] }
  ]
}
```

---

### UC004: View Café Reviews & Ratings

**Actor:** Guest  
**Precondition:** Guest is viewing café details  
**Main Flow:**

1. Guest views customer reviews for the café
2. System returns reviews sorted by newest/helpful
3. Reviews include: rating (1-5), text, author, timestamp, helpful count
4. Guest can filter reviews by rating or sort by date/helpfulness

**Postcondition:** Guest can make informed decision based on community feedback

**Technical Concerns:**
- **Caching**: Cache aggregated ratings (average, count) separately
- **Sorting**: Use database indexes for efficient sorting
- **Pagination**: Implement cursor-based pagination for reviews

**API Endpoint:**
```
GET /api/v1/cafes/{cafeId}/reviews
Query Params: page, limit, sort_by (newest, helpful, rating)
Response: { reviews: [], total, avgRating, distribution }
```

---

## Customer Use Cases

### UC005: Register as Customer

**Actor:** Guest → Customer  
**Precondition:** User is unregistered  
**Main Flow:**

1. User submits registration form with:
   - Email (unique)
   - Password (hashed with bcrypt)
   - Full name
   - Phone number
   - Preferred city/location
2. System validates email format and password strength
3. System checks email uniqueness in database
4. System creates user account with status "active"
5. System sends verification email (background job)
6. User receives JWT token for immediate login
7. System returns tokens (access + refresh)

**Postcondition:** User account is created and verified, tokens issued

**Technical Concerns:**
- **Idempotency**: Prevent duplicate accounts if registration request retried
- **Email Verification**: Use BullMQ job for async email sending
- **Password Security**: Never log passwords, use bcrypt with salt rounds ≥ 10
- **Token Management**: Issue both access (15min) and refresh (7d) tokens
- **Race Condition**: Handle concurrent registration with same email using DB constraint
- **Error Handling**: Clear error messages without exposing system details

**API Endpoint:**
```
POST /api/v1/auth/register
Body: { email, password, fullName, phone, preferredCity }
Response: { 
  user: { id, email, fullName, status },
  tokens: { accessToken, refreshToken, expiresIn }
}

POST /api/v1/auth/verify-email
Body: { email, token }
Response: { success: true }
```

---

### UC006: Login & Authentication

**Actor:** Customer  
**Precondition:** Customer account exists  
**Main Flow:**

1. Customer submits login credentials (email + password)
2. System queries database for user by email
3. System validates password against hashed value
4. System generates JWT tokens (access + refresh)
5. System stores refresh token in database/Redis
6. System returns tokens to client

**Alternative Flow (Token Expired):**
- Client sends refresh token to `/api/v1/auth/refresh`
- System validates refresh token and issues new access token

**Postcondition:** Customer is authenticated with valid JWT tokens

**Technical Concerns:**
- **Brute Force Protection**: Implement rate limiting on login endpoint
- **Account Lockout**: Lock account after N failed attempts
- **Token Security**: Store refresh tokens in secure HTTP-only cookies
- **Token Validation**: Validate JWT signature and expiration on every request
- **Logout**: Blacklist token on logout (store in Redis with TTL)

**API Endpoint:**
```
POST /api/v1/auth/login
Body: { email, password }
Response: { 
  user: { id, email, fullName },
  tokens: { accessToken, refreshToken, expiresIn }
}

POST /api/v1/auth/refresh
Body: { refreshToken }
Response: { accessToken, expiresIn }

POST /api/v1/auth/logout
Response: { success: true }
```

---

### UC007: View Seat Availability for Time Slot

**Actor:** Customer  
**Precondition:** Customer is authenticated and browsing a café  
**Main Flow:**

1. Customer selects a date and time slot
2. System queries available seats in database for that time slot
3. System applies filters (zone, seat type if applicable)
4. System returns available seats with their details (location, amenities)
5. System caches result for 30 seconds

**Postcondition:** Customer sees accurate real-time seat availability

**Technical Concerns:**
- **Concurrency**: Multiple customers viewing availability simultaneously
- **Caching Strategy**: Use Redis with invalidation on bookings
- **Query Optimization**: Optimize seat status queries (use materialized views or aggregates)
- **Data Freshness**: Cache TTL should be short (30-60 seconds)
- **Race Condition**: Handle between view and booking (solved by row-level locking)

**API Endpoint:**
```
GET /api/v1/cafes/{cafeId}/seats/availability
Query Params: date, timeFrom, timeTo, zoneId
Response: {
  timeSlot: { from, to },
  availableSeats: [
    { seatId, seatNumber, zone, type, price, amenities }
  ],
  totalAvailable, totalSeats, occupancy
}
```

---

### UC008: Create Booking (Reserve Seat)

**Actor:** Customer  
**Precondition:** Customer is authenticated, selected a seat  
**Main Flow:**

1. Customer clicks "Book This Seat"
2. System acquires row-level lock on seat record
3. System verifies:
   - Seat exists and belongs to correct café
   - Time slot is valid (not in past, within café hours)
   - Seat is NOT already booked for this time
   - Customer doesn't have conflicting bookings
   - Customer account is active (no suspension)
4. System creates booking record with status "CONFIRMED"
5. System releases row lock
6. System decrements available seat count in cache
7. System sends confirmation email (async job)
8. System returns booking details with confirmation number

**Postcondition:** Booking is created, customer receives confirmation

**Technical Concerns:**
- **Race Condition (CRITICAL)**: Use pessimistic locking (SELECT ... FOR UPDATE)
- **Idempotency**: Use unique constraint on (customerId, cafeId, timeSlotId) to prevent double-booking
- **Transaction**: Must be ACID compliant - all or nothing
- **Row-level Locking**: Lock seat during transaction to prevent overselling
- **Isolation Level**: Use SERIALIZABLE or READ_COMMITTED with explicit locking
- **Timeout**: Set transaction timeout to prevent deadlocks
- **Cache Invalidation**: Invalidate availability cache immediately
- **Notification**: Send async email via BullMQ

**API Endpoint:**
```
POST /api/v1/bookings
Body: {
  cafeId,
  seatId,
  date,
  timeFrom,
  timeTo,
  notes (optional)
}
Response: {
  bookingId,
  confirmationNumber,
  status,
  seatInfo: { number, zone },
  timeSlot: { from, to },
  price,
  createdAt
}
```

**SQL Example (Pseudocode):**
```sql
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- Lock the seat
SELECT * FROM seats WHERE id = :seatId FOR UPDATE;

-- Check if seat is available
SELECT * FROM bookings 
WHERE seatId = :seatId 
  AND date = :date
  AND timeFrom = :timeFrom;
-- If result exists, throw ConflictError

-- Create booking
INSERT INTO bookings (customerId, seatId, date, ...) 
VALUES (...);

COMMIT;
```

---

### UC009: Cancel Booking

**Actor:** Customer  
**Precondition:** Customer has active booking  
**Main Flow:**

1. Customer selects booking to cancel
2. System verifies:
   - Booking belongs to authenticated customer
   - Booking status is "CONFIRMED" or "CHECKED_IN"
   - Current time is > 1 hour before booking start
3. System calculates refund:
   - Full refund if cancelled > 1 hour before
   - No refund if cancelled < 1 hour before
4. System updates booking status to "CANCELLED"
5. System processes refund (if applicable)
6. System invalidates seat availability cache
7. System sends cancellation confirmation email

**Postcondition:** Booking is cancelled, seat becomes available again

**Technical Concerns:**
- **Time-based Logic**: Must handle time zone differences
- **Refund Logic**: Implement clear refund rules in business logic layer
- **Idempotency**: Allow cancelling already-cancelled booking (return same response)
- **Cache Invalidation**: Must immediately invalidate availability cache
- **Soft Delete**: Keep cancelled bookings for audit trail
- **Async Notification**: Send emails via BullMQ

**API Endpoint:**
```
DELETE /api/v1/bookings/{bookingId}
Query Params: reason (optional)
Response: {
  bookingId,
  status: "CANCELLED",
  refundAmount,
  refundStatus: "PROCESSED",
  message
}
```

---

### UC010: Check-in to Booking

**Actor:** Customer  
**Precondition:** Customer has confirmed booking, is at café  
**Main Flow:**

1. Customer initiates check-in (via app or at café kiosk)
2. System verifies:
   - Booking exists and belongs to customer
   - Booking status is "CONFIRMED"
   - Current time is within ±15 minutes of booking start time
3. System updates booking status to "CHECKED_IN"
4. System records check-in timestamp
5. System updates seat status to "OCCUPIED"
6. System sends check-in confirmation notification

**Alternative Flow (Late Check-in):**
- If check-in is > 15 minutes late:
  - System cancels booking automatically
  - Seat becomes available
  - System notifies customer with reason

**Postcondition:** Booking is active, customer is checked in

**Technical Concerns:**
- **Time Validation**: Validate current time against booking time with buffer
- **Idempotency**: Multiple check-in attempts should be safe
- **Soft Deadlines**: Implement automatic cancellation for late check-ins
- **Background Job**: Use BullMQ for late check-in checks
- **Notifications**: Send real-time notifications (WebSocket or polling)
- **Data Consistency**: Update seat occupancy synchronously

**API Endpoint:**
```
POST /api/v1/bookings/{bookingId}/check-in
Body: { location (optional) }
Response: {
  bookingId,
  status: "CHECKED_IN",
  seatInfo: { number, zone },
  checkInTime,
  remainingTime: minutes
}
```

---

### UC011: View Booking History

**Actor:** Customer  
**Precondition:** Customer is authenticated  
**Main Flow:**

1. Customer navigates to booking history page
2. System queries all bookings for customer
3. System returns bookings grouped by status:
   - Upcoming (CONFIRMED, CHECKED_IN)
   - Past (CHECKED_OUT, CANCELLED)
4. Results are paginated and sorted by date (newest first)
5. Each booking shows: café, seat, date/time, status, price

**Postcondition:** Customer views complete booking history

**Technical Concerns:**
- **Pagination**: Implement cursor-based pagination for large datasets
- **Caching**: Cache user's active bookings separately from historical
- **Sorting**: Index on (customerId, date) for efficient queries
- **Data Privacy**: Ensure customer only sees their own bookings
- **Denormalization**: Consider caching active bookings count

**API Endpoint:**
```
GET /api/v1/customers/bookings
Query Params: page, limit, status, sortBy (date, status)
Response: {
  bookings: [
    {
      bookingId,
      cafe: { id, name },
      seat: { number, zone },
      timeSlot: { from, to },
      status,
      price,
      createdAt
    }
  ],
  total, page, limit
}
```

---

### UC012: Update User Profile

**Actor:** Customer  
**Precondition:** Customer is authenticated  
**Main Flow:**

1. Customer submits updated profile information:
   - Full name, phone number, preferred city
   - Notification preferences (email, SMS)
2. System validates input data
3. System updates user record in database
4. System returns updated profile
5. System invalidates relevant caches

**Postcondition:** Customer profile is updated

**Technical Concerns:**
- **Validation**: Validate all input fields before update
- **Idempotency**: Safe to call multiple times with same data
- **Authorization**: Ensure customer can only update their own profile
- **Email Change**: If email changes, require re-verification
- **Cache Invalidation**: Invalidate user cache after update

**API Endpoint:**
```
PUT /api/v1/customers/profile
Body: { fullName, phone, preferredCity, notifications: {} }
Response: { user: { id, email, fullName, ... } }
```

---

## Café Owner Use Cases

### UC013: Register Café & Create Profile

**Actor:** Café Owner (new)  
**Precondition:** Owner is unregistered  
**Main Flow:**

1. Owner registers as café owner:
   - Email, password (same as UC005)
   - Café name
   - Address, phone, email
   - Operating hours (weekly schedule)
   - Amenities (WiFi, power outlets, parking, etc.)
2. System validates café information
3. System creates owner account and café record (status: "PENDING_VERIFICATION")
4. System requires owner to verify email
5. System sends verification email with approval instructions
6. Admin must approve café before it's visible (UC026)
7. Owner receives dashboard access

**Postcondition:** Café profile is created, pending admin approval

**Technical Concerns:**
- **Business Rules**: Validate operating hours format
- **Document Verification**: May require business license upload
- **Status Management**: Implement café status workflow (PENDING → ACTIVE → SUSPENDED)
- **Audit Trail**: Log all café modifications for compliance
- **Notifications**: Notify admin of new café registration

**API Endpoint:**
```
POST /api/v1/auth/register-owner
Body: {
  email, password, fullName,
  cafeName, address, city, phone,
  operatingHours: { monday: {...}, ... },
  amenities: []
}
Response: { 
  owner: { id, email },
  cafe: { id, name, status: "PENDING_VERIFICATION" },
  tokens: { accessToken, refreshToken }
}
```

---

### UC014: Manage Café Seat Layout

**Actor:** Café Owner  
**Precondition:** Owner is authenticated, café is active  
**Main Flow:**

1. Owner accesses seat management dashboard
2. Owner creates/edits café seat layout:
   - Define zones (sections): "Study Area", "Quiet Corner", etc.
   - Define seats per zone with properties:
     - Seat number/label
     - Type (single desk, group table, etc.)
     - Amenities (plug, USB, window view)
     - Price tier (premium, standard)
   - Upload or draw seat map visually
3. System validates layout:
   - No duplicate seat numbers
   - Zones must have ≥ 1 seat
   - Valid price ranges
4. System stores layout in database (as JSON structure)
5. System creates availability records for each seat
6. System invalidates availability cache

**Alternative Flow (Modify Layout):**
- Owner can modify existing layout
- System warns if changes affect existing bookings
- Owner confirms changes (may cancel affected bookings)

**Postcondition:** Café seat layout is created/updated

**Technical Concerns:**
- **Data Structure**: Store seat layout as JSON for flexibility
- **Validation**: Complex validation for seat layout
- **Migrations**: Handle seat layout changes affecting existing bookings
- **Cache Invalidation**: Invalidate all availability caches for café
- **Audit Trail**: Log all layout changes with timestamps
- **Concurrency**: Prevent simultaneous edits of same café

**API Endpoint:**
```
POST /api/v1/cafe/{cafeId}/seat-layout
Body: {
  zones: [
    {
      zoneId, zoneName,
      seats: [
        { seatId, seatNumber, type, amenities, price }
      ]
    }
  ]
}
Response: { cafeId, layout: {...}, updatedAt }

GET /api/v1/cafe/{cafeId}/seat-layout
Response: { cafeId, layout: {...}, lastUpdated }

PUT /api/v1/cafe/{cafeId}/seat-layout
Body: { zones: [...] }
Response: { cafeId, layout: {...} }
```

---

### UC015: Manage Café Operating Hours & Policies

**Actor:** Café Owner  
**Precondition:** Owner is authenticated  
**Main Flow:**

1. Owner sets operating hours:
   - Weekly schedule (Monday-Sunday)
   - Opening time, closing time
   - Lunch break, maintenance hours
2. Owner sets booking policies:
   - Time slot duration (e.g., 2 hours, 30 minutes)
   - Minimum advance booking (e.g., 15 minutes)
   - Maximum advance booking (e.g., 30 days)
   - Cancellation deadline (e.g., 1 hour before)
   - Max concurrent bookings per customer
   - No-show penalty
3. System validates policies:
   - Slot duration must be valid
   - Times must be within operating hours
   - Deadlines must be reasonable
4. System stores policies in database
5. System invalidates relevant caches

**Postcondition:** Café policies are configured

**Technical Concerns:**
- **Time Zone Handling**: Store times in UTC, convert for display
- **Validation**: Complex business logic validation
- **Effective Dating**: Support policy changes with future effective dates
- **Cache Invalidation**: Invalidate booking availability caches
- **Audit Trail**: Log all policy changes

**API Endpoint:**
```
PUT /api/v1/cafe/{cafeId}/settings
Body: {
  operatingHours: { monday: { open, close }, ... },
  policies: {
    slotDuration: minutes,
    minAdvanceBooking: minutes,
    maxAdvanceBooking: days,
    cancellationDeadline: minutes,
    maxConcurrentBookings: number,
    noShowPenalty: boolean
  }
}
Response: { cafeId, settings: {...}, updatedAt }
```

---

### UC016: View & Manage Bookings (Owner Dashboard)

**Actor:** Café Owner  
**Precondition:** Owner is authenticated  
**Main Flow:**

1. Owner views bookings dashboard with filters:
   - Date range, status (CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELLED)
   - Seat/zone
   - Customer name (search)
2. System returns bookings sorted by time with key metrics:
   - Total bookings, check-in rate, occupancy rate
   - Revenue (if paid system)
   - Cancellation rate
3. Owner can view/edit individual booking details
4. Owner can manually mark check-in/check-out
5. Owner can cancel bookings (with reason)

**Alternative Flow (Handle No-show):**
- Owner marks booking as "NO_SHOW"
- System applies no-show penalty to customer
- System records incident for customer account

**Postcondition:** Owner views booking analytics and manages reservations

**Technical Concerns:**
- **Real-time Updates**: Use WebSocket or polling for live updates
- **Analytics**: Pre-aggregate common metrics
- **Search Performance**: Index on (cafeId, date, status)
- **Authorization**: Ensure owner only sees own café's bookings
- **Audit Trail**: Log all manual operations by owner

**API Endpoint:**
```
GET /api/v1/cafe/{cafeId}/bookings
Query Params: dateFrom, dateTo, status, seatId, page, limit
Response: {
  bookings: [...],
  metrics: {
    totalBookings, checkInRate, occupancyRate,
    revenue, cancellationRate
  }
}

PUT /api/v1/cafe/{cafeId}/bookings/{bookingId}
Body: { status, notes }
Response: { bookingId, status, updatedAt }
```

---

### UC017: View Financial Reports & Analytics

**Actor:** Café Owner  
**Precondition:** Owner is authenticated  
**Main Flow:**

1. Owner accesses analytics dashboard
2. System provides reports:
   - Revenue by date/period
   - Occupancy rate by time slot
   - Popular seats/zones
   - Customer retention metrics
   - Peak hours analysis
3. Owner can export reports (CSV, PDF)
4. Owner can set date range for reports

**Postcondition:** Owner views business analytics

**Technical Concerns:**
- **Data Aggregation**: Use materialized views or pre-computed aggregates
- **Performance**: Run heavy queries asynchronously
- **Caching**: Cache daily/weekly aggregates
- **Accuracy**: Ensure data consistency across reports
- **Background Jobs**: Use BullMQ for report generation

**API Endpoint:**
```
GET /api/v1/cafe/{cafeId}/analytics/revenue
Query Params: dateFrom, dateTo, groupBy (daily, weekly, monthly)
Response: { report: [...], total, average }

GET /api/v1/cafe/{cafeId}/analytics/occupancy
Query Params: dateFrom, dateTo
Response: { timeSlots: [...], avgOccupancy, peakHours: [...] }

GET /api/v1/cafe/{cafeId}/analytics/export
Query Params: type, format (csv, pdf), dateFrom, dateTo
Response: File download
```

---

## Admin Use Cases

### UC018: Approve/Reject Café Registration

**Actor:** Admin  
**Precondition:** New café pending verification (status: PENDING_VERIFICATION)  
**Main Flow:**

1. Admin views list of pending café registrations
2. Admin reviews café information:
   - Café details, address
   - Owner information
   - Documentation (if required)
3. Admin approves or rejects café:
   - **Approve**: Status becomes "ACTIVE", café appears in search
   - **Reject**: Status becomes "REJECTED", owner is notified with reason
4. System sends notification email to owner
5. System logs admin action for audit trail

**Postcondition:** Café registration is approved/rejected, owner is notified

**Technical Concerns:**
- **Workflow**: Implement café status state machine
- **Notifications**: Send async email notifications
- **Audit Trail**: Log all admin decisions
- **Authorization**: Only admin can approve cafés
- **Batch Operations**: Support bulk approval/rejection

**API Endpoint:**
```
GET /api/v1/admin/cafes/pending
Query Params: page, limit, sortBy
Response: { cafes: [...], total }

PUT /api/v1/admin/cafes/{cafeId}/approve
Body: { notes (optional) }
Response: { cafeId, status: "ACTIVE" }

PUT /api/v1/admin/cafes/{cafeId}/reject
Body: { reason }
Response: { cafeId, status: "REJECTED" }
```

---

### UC019: Manage Users & Accounts

**Actor:** Admin  
**Precondition:** Admin is authenticated  
**Main Flow:**

1. Admin accesses user management dashboard
2. Admin can:
   - Search/filter users (by email, name, registration date)
   - View user details:
     - Profile information
     - Booking history
     - Suspension status
     - Account activity
   - Suspend/unsuspend user accounts:
     - Suspend: Block further bookings, show reason
     - Unsuspend: Restore full access
   - Reset user passwords (send reset link)
3. Admin logs all actions for audit trail

**Postcondition:** Users are managed, actions are logged

**Technical Concerns:**
- **Authorization**: Only admin can modify users
- **Data Privacy**: Don't expose sensitive user data unnecessarily
- **Audit Trail**: Log all admin actions with timestamps
- **Soft Deletes**: Don't hard-delete users, soft-delete with reason
- **Notifications**: Notify users of account changes

**API Endpoint:**
```
GET /api/v1/admin/users
Query Params: page, limit, search, role, status
Response: { users: [...], total }

GET /api/v1/admin/users/{userId}
Response: { user: {...}, bookingHistory: [...], suspensions: [...] }

PUT /api/v1/admin/users/{userId}/suspend
Body: { reason }
Response: { userId, status: "SUSPENDED" }

PUT /api/v1/admin/users/{userId}/unsuspend
Response: { userId, status: "ACTIVE" }

POST /api/v1/admin/users/{userId}/reset-password
Response: { resetLink, expiresIn }
```

---

### UC020: Monitor System Health & Logs

**Actor:** Admin  
**Precondition:** Admin is authenticated  
**Main Flow:**

1. Admin accesses monitoring dashboard
2. System displays:
   - Server health (CPU, memory, disk usage)
   - API performance metrics (response times, error rates)
   - Database connection pool status
   - Cache hit/miss rates
   - Job queue status (pending, processing, failed jobs)
   - Error logs with severity levels
3. Admin can:
   - View detailed logs (filter by date, level, service)
   - Set up alerts for critical issues
   - Manually trigger system tasks (cache clearing, job retries)

**Postcondition:** Admin monitors system health and performance

**Technical Concerns:**
- **Logging**: Centralized logging with Pino + Morgan
- **Monitoring**: Integration with monitoring tools (optional)
- **Metrics**: Expose Prometheus metrics
- **Alerting**: Implement alerting for critical issues
- **Log Retention**: Implement log rotation and archival
- **Performance**: Don't block with heavy monitoring queries

**API Endpoint:**
```
GET /api/v1/admin/health
Response: { status, uptime, services: {...} }

GET /api/v1/admin/metrics
Query Params: service, dateFrom, dateTo
Response: { metrics: {...} }

GET /api/v1/admin/logs
Query Params: page, limit, level, service, dateFrom, dateTo
Response: { logs: [...], total }

POST /api/v1/admin/tasks/clear-cache
Body: { pattern (optional) }
Response: { cleared: number, message }
```

---

### UC021: Manage Disputes & Customer Support

**Actor:** Admin  
**Precondition:** Customer reports issue or dispute  
**Main Flow:**

1. Customer submits dispute/complaint:
   - Issue type (double booking, wrong seat, owner issue, etc.)
   - Description and evidence
   - Affected booking
2. Admin views dispute dashboard with filters
3. Admin investigates:
   - Review booking details
   - Check customer/owner history
   - Review booking timeline
4. Admin resolves dispute:
   - Refund customer (full or partial)
   - Warn/suspend owner
   - Dismiss claim
5. Admin sends resolution to both parties
6. System logs all dispute details

**Postcondition:** Dispute is resolved, parties are notified

**Technical Concerns:**
- **Refund Management**: Implement refund transaction workflow
- **Audit Trail**: Log all dispute details and decisions
- **Notifications**: Send dispute updates to both parties
- **Workflow**: Implement dispute status state machine
- **SLA**: Track dispute resolution time

**API Endpoint:**
```
POST /api/v1/disputes
Body: { bookingId, type, description, evidence }
Response: { disputeId, status: "PENDING", createdAt }

GET /api/v1/admin/disputes
Query Params: page, limit, status, type, dateFrom, dateTo
Response: { disputes: [...], total }

PUT /api/v1/admin/disputes/{disputeId}
Body: { resolution, refundAmount, notes }
Response: { disputeId, status: "RESOLVED" }
```

---

## Backend Concerns & Technical Considerations

### 1. Concurrency & Race Conditions

#### Problem
Multiple customers booking the same seat simultaneously.

#### Solutions

**Pessimistic Locking (Recommended for this project):**
```sql
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
SELECT * FROM seats WHERE id = :seatId FOR UPDATE;
-- Check availability
SELECT COUNT(*) FROM bookings 
WHERE seatId = :seatId AND dateSlot = :dateSlot;
-- Create booking if available
INSERT INTO bookings (...);
COMMIT;
```

**Optimistic Locking:**
- Add `version` column to seats table
- Check version before update
- Retry if version mismatch
- Better for read-heavy scenarios

#### Implementation
- Use Prisma's raw SQL for explicit locking
- Set transaction timeout (e.g., 5 seconds)
- Implement retry logic with exponential backoff
- Monitor for deadlocks

---

### 2. Cache Strategy

#### Data to Cache
- Café list (5-10 minutes)
- Café details (10 minutes)
- Seat availability (30-60 seconds)
- User profile (15 minutes)

#### Cache Invalidation
- **Time-based (TTL)**: Most suitable for this project
- **Event-based**: Invalidate on booking/cancellation
- **Cache-aside pattern**: Load from DB on miss

#### Implementation
```javascript
// Cache café availability
const cacheKey = `cafe:${cafeId}:availability:${date}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

// Query database if miss
const availability = await queryAvailability(cafeId, date);
await redis.setex(cacheKey, 60, JSON.stringify(availability));
return availability;
```

---

### 3. Idempotency

#### Why It's Important
- Prevent duplicate bookings if request is retried
- Safe to retry failed requests without side effects
- Essential for distributed systems

#### Implementation
- Use idempotent keys in requests
- Store request metadata (userId + request hash)
- Check if request was already processed
- Return cached response for duplicate requests

```javascript
async createBooking(req) {
  const idempotencyKey = req.headers['x-idempotency-key'];
  
  // Check if request already processed
  const existingResult = await redis.get(idempotencyKey);
  if (existingResult) return JSON.parse(existingResult);
  
  // Process booking
  const booking = await processBooking(...);
  
  // Cache result
  await redis.setex(idempotencyKey, 3600, JSON.stringify(booking));
  return booking;
}
```

---

### 4. Background Jobs (BullMQ)

#### Use Cases
- Send confirmation emails
- Send cancellation emails
- Handle late check-in cancellations
- Generate analytics reports
- Send scheduled notifications
- Retry failed operations

#### Implementation
```javascript
// Create queue
const emailQueue = new Queue('send-email', { connection: redis });

// Process jobs
emailQueue.process(async (job) => {
  await sendEmail(job.data);
});

// Add job
await emailQueue.add({
  to: customer.email,
  subject: 'Booking Confirmation',
  template: 'booking-confirmation'
}, {
  delay: 1000,
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 }
});
```

---

### 5. Error Handling & Validation

#### HTTP Status Codes
- `200 OK`: Successful GET
- `201 Created`: Successful POST (resource created)
- `204 No Content`: Successful DELETE
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Missing authentication
- `403 Forbidden`: Insufficient permission
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (e.g., seat already booked)
- `422 Unprocessable Entity`: Validation error
- `429 Too Many Requests`: Rate limiting
- `500 Internal Server Error`: Server error

#### Error Response Format
```javascript
{
  error: {
    code: "SEAT_ALREADY_BOOKED",
    message: "This seat is already booked for the selected time slot",
    statusCode: 409,
    timestamp: "2024-01-15T10:30:00Z",
    requestId: "uuid",
    details: { seatId, timeSlot }
  }
}
```

---

### 6. Authentication & Authorization

#### JWT Strategy
- **Access Token**: Short-lived (15 minutes), contains user claims
- **Refresh Token**: Long-lived (7 days), used to get new access token
- Store refresh tokens in database for revocation

#### Role-Based Access Control (RBAC)
```javascript
// Middleware
app.use('/api/v1/admin', requireRole(['ADMIN']));
app.use('/api/v1/cafe', requireRole(['OWNER', 'ADMIN']));
app.use('/api/v1/bookings', requireAuth());
```

#### Password Security
- Hash with bcrypt (salt rounds ≥ 10)
- Never log passwords
- Enforce strong password policy
- Implement account lockout after N failed attempts

---

### 7. Database Design Patterns

#### Indexes (Performance)
```sql
-- Frequently queried combinations
CREATE INDEX idx_bookings_customer_date ON bookings(customerId, date);
CREATE INDEX idx_bookings_seat_slot ON bookings(seatId, dateSlot);
CREATE INDEX idx_cafes_city ON cafes(city) WHERE isActive = true;
CREATE INDEX idx_seats_cafe ON seats(cafeId);
```

#### Soft Deletes
```javascript
// Mark records as deleted instead of removing
model User {
  id String @id @default(cuid())
  email String @unique
  deletedAt DateTime?
  
  @@index([email, deletedAt])
}

// Query excludes deleted
const users = await db.user.findMany({
  where: { deletedAt: null }
});
```

#### Audit Trail
```javascript
model AuditLog {
  id String @id @default(cuid())
  userId String
  action String
  resourceType String
  resourceId String
  changes Json
  createdAt DateTime @default(now())
  
  @@index([userId, createdAt])
  @@index([resourceType, resourceId])
}
```

---

### 8. API Design Best Practices

#### Versioning
- Use URL versioning: `/api/v1/`, `/api/v2/`
- Support multiple versions during transition period
- Deprecate old versions gradually

#### Pagination
```javascript
// Cursor-based (recommended for large datasets)
GET /api/v1/bookings?cursor=abc123&limit=20
Response: { data: [...], nextCursor, hasMore }

// Offset-based (simpler, acceptable for small datasets)
GET /api/v1/bookings?page=2&limit=20
Response: { data: [...], page, total, hasMore }
```

#### Filtering & Sorting
```javascript
GET /api/v1/cafes?city=hanoi&status=active&sort=-rating,+name
// Filter by city AND status, sort by rating DESC then name ASC
```

#### Rate Limiting
```javascript
// Per user: 1000 requests per hour
// Per IP: 10000 requests per hour
// Endpoint-specific: 100 requests per minute for booking endpoint
```

---

### 9. Monitoring & Logging

#### Logging Strategy (Pino + Morgan)
```javascript
// HTTP request logging (Morgan)
app.use(morgan(':method :url :status :response-time ms'));

// Application logging (Pino)
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

logger.info({ bookingId, customerId }, 'Booking created');
logger.error({ err }, 'Booking failed');
```

#### Key Metrics
- API response time (p50, p95, p99)
- Error rate by endpoint
- Database query performance
- Cache hit/miss rate
- Job queue depth and processing time
- Active connections

---

### 10. Testing Strategy

#### Unit Tests (Jest)
- Test business logic, validators, utilities
- Mock external dependencies
- Target: 80%+ coverage

#### Integration Tests (Supertest)
- Test API endpoints with actual database
- Test transaction handling
- Test concurrent operations

#### Load Testing (k6)
- Test booking endpoint under load
- Identify performance bottlenecks
- Measure response times under stress

```javascript
// k6 example
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  vus: 100, // virtual users
  duration: '30s'
};

export default function () {
  let res = http.post('http://localhost:3000/api/v1/bookings', {
    cafeId: 'cafe1',
    seatId: 'seat1'
  });
  
  check(res, {
    'status is 201': (r) => r.status === 201,
    'response time < 500ms': (r) => r.timings.duration < 500
  });
}
```

---

### 11. Deployment & Infrastructure

#### Docker Configuration
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

#### Environment Management
```
.env.development
.env.test
.env.production

DATABASE_URL=
REDIS_URL=
JWT_SECRET=
NODE_ENV=
```

#### CI/CD Pipeline (GitHub Actions)
1. Run tests (unit + integration)
2. Run linter (ESLint)
3. Check code coverage
4. Build Docker image
5. Push to registry
6. Deploy to Render (or other hosting)

---

### 12. Security Considerations

#### CORS
```javascript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
```

#### Input Validation
```javascript
// Use Zod or Joi for validation
const bookingSchema = z.object({
  cafeId: z.string().cuid(),
  seatId: z.string().cuid(),
  date: z.string().datetime(),
  timeFrom: z.string().time(),
  timeTo: z.string().time()
});

app.post('/api/v1/bookings', (req, res) => {
  const result = bookingSchema.safeParse(req.body);
  if (!result.success) return res.status(422).json({ errors: result.error });
});
```

#### SQL Injection Prevention
- Always use parameterized queries (Prisma handles this)
- Never concatenate user input into SQL strings
- Use ORM/query builders

#### XSS Protection
- Sanitize HTML input
- Use Content Security Policy headers
- Escape output in templates

---

## Summary: Key Takeaways for Backend Engineering

| Concern | Solution | Tool/Tech |
|---------|----------|-----------|
| Concurrency | Row-level locking (pessimistic) | PostgreSQL + Prisma |
| Race Conditions | SERIALIZABLE isolation, explicit locks | Database transactions |
| Caching | Redis with TTL + event invalidation | Redis |
| Background Jobs | Async job processing | BullMQ |
| Idempotency | Request deduplication | Redis + unique constraints |
| Error Handling | Structured error responses | Express middleware |
| Logging | Centralized logging | Pino + Morgan |
| Performance | Indexing, query optimization, pagination | PostgreSQL + Prisma |
| Testing | Unit, integration, load tests | Jest + Supertest + k6 |
| Deployment | Docker + GitHub Actions CI/CD | Docker + GitHub Actions |

---

## File Structure (Recommended)

```
seat-reservation-platform/
├── src/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── cafes.ts
│   │   │   ├── bookings.ts
│   │   │   ├── customers.ts
│   │   │   └── admin.ts
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   └── validators/
│   ├── services/
│   │   ├── booking.service.ts
│   │   ├── cafe.service.ts
│   │   └── auth.service.ts
│   ├── database/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── jobs/
│   │   ├── send-email.job.ts
│   │   └── handle-late-checkin.job.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── cache.ts
│   │   └── errors.ts
│   ├── config/
│   └── app.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── k6/
│   └── booking-load-test.js
├── .github/
│   └── workflows/
│       └── ci-cd.yml
├── docker-compose.yml
├── Dockerfile
├── package.json
├── .env.example
└── README.md
```

---

**Version:** 1.0  
**Last Updated:** June 2026  
**Status:** Use Cases Complete
