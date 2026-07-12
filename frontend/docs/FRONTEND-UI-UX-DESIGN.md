# Frontend UI/UX Design — Seat Reservation Platform for Study Cafés

**Phạm vi:** Thiết kế UI/UX cơ bản cho demo frontend, khớp 100% với `API-SPECIFICATION.md` (33 endpoints) và `FRONTEND-ARCHITECTURE.md`.
**Stack:** React 19 · Vite · TypeScript · MUI · React Router · Axios · TanStack Query · React Hook Form · Zod
**Last Updated:** July 2026

> ⚠️ **Điểm cần xác nhận lại với Backend:** Brief và `FRONTEND-ARCHITECTURE.md` đều nhắc đến `PATCH /customers/profile` (form Edit Profile), nhưng bảng Endpoint Index (mục 12) trong `API-SPECIFICATION.md` không liệt kê endpoint này trong 33 endpoint đã implement. Thiết kế bên dưới vẫn giữ form Edit Profile theo đúng brief, nhưng UI nên có fallback (disable nút Save + thông báo "Tính năng đang cập nhật") nếu endpoint thực tế chưa tồn tại khi tích hợp thật.

---

## 1. Design Principles & Scope

### 1.1 Nguyên tắc thiết kế
| Nguyên tắc | Áp dụng |
|---|---|
| **Functional over decorative** | Đây là demo backend, không cần animation/illustration phức tạp. Ưu tiên rõ ràng luồng nghiệp vụ. |
| **1:1 với API** | Không có field, trạng thái, hay nút bấm nào không map được tới 1 endpoint/response field trong API-SPECIFICATION.md. |
| **Nhất quán component** | Dùng lại `StatusChip`, `ConfirmDialog`, `EmptyState`, `LoadingSpinner` xuyên suốt 4 layout thay vì tạo biến thể riêng mỗi trang. |
| **Desktop-first, responsive cơ bản** | Thiết kế chính cho ≥1280px; tablet/mobile là "graceful degradation" chứ không phải thiết kế song song. |
| **Ấm áp vừa phải (cafe vibe nhẹ)** | Bảng màu tông cà phê (nâu/be/cam đất), nhưng UI chrome (bảng, form, dashboard) vẫn giữ tối giản, không dùng texture/hình nền gây rối. |
| **Light mode only** | Không có dark mode trong scope demo này. |

### 1.2 Ngoài phạm vi (Out of scope)
Không thiết kế: thanh toán, review/rating, coupon, chat, đa ngôn ngữ, dark mode, email verification page, trang xem lịch sử chi tiết ngoài booking (không có analytics nâng cao ngoài field BE trả về).

### 1.3 4 Layout chính
```
GuestLayout     → Navbar đơn giản (Logo, Login/Register hoặc user menu)
CustomerLayout  → Navbar + NotificationDropdown (bell icon)
OwnerLayout     → Sidebar trái (icon + label) + Navbar trên cùng
AdminLayout     → Sidebar trái (icon + label) + Navbar trên cùng
```

---

## 2. Sitemap

```
/                          Landing (Guest)
├── /login                 Login
├── /register              Register (toggle Customer ↔ Owner)
├── /cafes                 Browse Cafés (search + filter)
│   └── /cafes/:cafeId     Café Detail (+ Booking Dialog overlay nếu đã login CUSTOMER)
│
├── [CUSTOMER — cần login]
│   ├── /bookings          Booking History
│   └── /profile           Profile (view + edit)
│
├── [OWNER — cần login]
│   └── /owner/dashboard   Owner Dashboard
│       ├── Tab: Overview
│       ├── Tab: My Cafés & Layout  (bao gồm Seat Layout Editor)
│       └── Tab: Bookings
│
└── [ADMIN — cần login]
    └── /admin/dashboard   Admin Dashboard
        ├── Tab: Overview
        ├── Tab: Users
        └── Tab: Café Approvals
```

---

## 3. User Flows theo Role

### 3.1 Guest Flow
```
Landing → Browse Cafés → Café Detail
                              │
                    Click "Book This Seat"
                              │
                  Chưa login? → redirect /login?next=/cafes/:id
                              │
                         Login thành công
                              │
                  Quay lại Café Detail → mở Booking Dialog
```
**Error states:** `CAFE_NOT_FOUND`/`CAFE_NOT_AVAILABLE` → EmptyState "Café không tồn tại hoặc đã ngừng hoạt động" + nút quay lại `/cafes`.

### 3.2 Customer Flow — Đặt chỗ (happy path)
```
1. Café Detail: chọn ngày/giờ → GET seats/availability (30s cache)
2. SeatGrid render: xanh (AVAILABLE) / xám (BOOKED)
3. Click ghế trống → mở BookingDialog (đã có Idempotency-Key sinh sẵn khi mở dialog)
4. Điền notes (optional) → Submit → POST /bookings
5. 201 → Dialog đóng, Toast "Đặt chỗ thành công — mã BK-YYYYMMDD-XXXXXX"
6. Booking History tự động invalidate & hiển thị booking mới (CONFIRMED)
```
**Error states trong Booking Dialog:**
- `SEAT_ALREADY_BOOKED` / `BOOKING_CONFLICT` → inline error trong dialog: *"Ghế này vừa được đặt, vui lòng chọn ghế khác"* → tự động refetch availability, không đóng dialog.
- `BOOKING_LIMIT_EXCEEDED` → inline error: *"Bạn đã đạt số lượng đặt chỗ tối đa cho phép"*.
- `INVALID_TIME_SLOT` / `TIME_SLOT_IN_PAST` → field-level error dưới ô giờ.
- `503 BOOKING_TIMEOUT` → Toast: *"Hệ thống đang bận, vui lòng thử lại"*, giữ nguyên Idempotency-Key để retry an toàn.

### 3.3 Customer Flow — Check-in & Cancel
```
Booking History → mục booking CONFIRMED sắp tới
   ├── Click "Check-in" (chỉ hiện trong khung checkinGraceMinutes)
   │      → POST /bookings/:id/check-in
   │      → 200 → StatusChip đổi CHECKED_IN
   │      → lỗi CHECKIN_TOO_EARLY (422) → Toast "Chưa đến giờ check-in"
   │      → lỗi CHECKIN_WINDOW_EXPIRED (409) → Toast "Đã quá giờ check-in cho phép"
   └── Click "Cancel" → ConfirmDialog "Bạn chắc chắn muốn hủy đặt chỗ này?"
          → Confirm → DELETE /bookings/:id
          → 200 → StatusChip đổi CANCELLED
          → lỗi BOOKING_CANNOT_CANCEL (409) → Toast "Không thể hủy đặt chỗ này"
```

### 3.4 Owner Flow — Tạo café & quản lý layout
```
Register Owner (kèm café đầu tiên, PENDING_VERIFICATION)
        │
Owner Dashboard → Tab "My Cafés & Layout"
        │
   ┌────┴─────────────────────────────┐
   │                                   │
POST /owner/cafes                GET .../seats/layout (load)
(tạo thêm café mới, PENDING)           │
                                  SeatLayoutEditor: thêm/sửa/xóa zone & ghế
                                        │
                                  Save Layout → PUT .../seats/layout
                                        │
                          Nếu xóa ghế có booking tương lai
                                        │
                              409 LAYOUT_CONFLICT
                                        │
                    ConfirmDialog: "Một số ghế đang có booking trong
                    tương lai. Xác nhận sẽ hủy các booking này?"
                                        │
                              Confirm → PUT lại với force=true
```
**Chờ Admin duyệt:** café mới hiển thị StatusChip `PENDING_VERIFICATION` (amber) trong danh sách café của Owner cho đến khi Admin approve → chuyển `ACTIVE` (green) và mới xuất hiện ở public `/cafes`.

### 3.5 Owner Flow — Xem & check-in booking
```
Owner Dashboard → Tab "Bookings" → GET .../bookings (filter status/date/seat/search)
        │
Danh sách booking (email khách được mask)
        │
Click "Check-in" trên booking CONFIRMED
        │
POST .../bookings/:id/check-in → 200 → StatusChip CHECKED_IN
```

### 3.6 Admin Flow — Duyệt café & quản lý user
```
Admin Dashboard → Tab "Café Approvals" → GET /admin/cafes/pending
        │
   ┌────┴────┐
Approve      Reject
   │            │
PUT approve   PUT reject (bắt buộc nhập reason)
(notes tùy chọn)    │
   │            ConfirmDialog + textarea reason (required, ≥ ký tự hợp lệ)
café → ACTIVE      café → REJECTED
```
```
Admin Dashboard → Tab "Users" → GET /admin/users (search/role/status filter)
        │
Click user → GET /admin/users/:id (detail + bookingCount/cafeCount)
        │
   ┌────┴─────────────┐
Suspend             Unsuspend
   │                    │
ConfirmDialog +      PUT unsuspend
textarea "reason"    → 200 → StatusChip ACTIVE
(required, 5–500 ký tự)
   │
PUT suspend
   │
Lỗi 403 CANNOT_SUSPEND_ADMIN / CANNOT_SUSPEND_SELF
→ Toast "Không thể thực hiện thao tác này"
```

---

## 4. Wireframes (13 màn hình)

### 4.1 Landing Page (`/`)
```
┌──────────────────────────────────────────────────────────┐
│ [Logo] Study Café Booking          [Đăng nhập] [Đăng ký]  │ Navbar (Guest)
├──────────────────────────────────────────────────────────┤
│                                                            │
│        Tìm chỗ ngồi học yên tĩnh gần bạn                  │
│        [ Nhập thành phố...        ] [ Tìm quán ]          │
│                                                            │
│   ┌────────────┐  ┌────────────┐  ┌────────────┐          │
│   │ Café Card  │  │ Café Card  │  │ Café Card  │  ← nổi bật│
│   └────────────┘  └────────────┘  └────────────┘          │
│                       [Xem tất cả quán →]                  │
└──────────────────────────────────────────────────────────┘
```
Gọi `GET /cafes?limit=6&sort=-createdAt` để hiển thị café nổi bật (tái dùng CafeCard + query giống Browse).

### 4.2 Login (`/login`)
```
┌───────────────────────────────┐
│         Đăng nhập             │
│  Email     [______________]   │
│  Mật khẩu  [______________]   │
│  [ inline error nếu sai ]     │
│         [ Đăng nhập ]         │
│  Chưa có tài khoản? Đăng ký   │
└───────────────────────────────┘
```
- Lỗi `AUTH_INVALID_CREDENTIALS` → text đỏ dưới form: "Email hoặc mật khẩu không đúng."
- Lỗi `ACCOUNT_LOCKED` (403) → Toast: "Tài khoản tạm khóa do đăng nhập sai quá 5 lần, thử lại sau 15 phút."
- Lỗi `ACCOUNT_SUSPENDED` (403) → Toast: "Tài khoản đã bị đình chỉ."
- Submit thành công → `POST /auth/login` → `GET /auth/me` → redirect theo role hoặc `?next=`.

### 4.3 Register (`/register`)
```
┌─────────────────────────────────────────────┐
│   ( Khách hàng )  |  ( Chủ quán )   ← Toggle │
├─────────────────────────────────────────────┤
│ Email        [___________________]          │
│ Mật khẩu     [___________________]          │
│ Họ tên       [___________________]          │
│ SĐT (tùy chọn) [_________________]          │
│                                               │
│  -- Nếu chọn "Chủ quán", hiện thêm: --        │
│ Tên café     [___________________]          │
│ Địa chỉ      [___________________]          │
│ Thành phố    [___________________]          │
│ Giờ mở cửa (7 ngày)  [08:00]–[22:00] mỗi ngày│
│ Tiện ích (chips chọn nhiều, tùy chọn)         │
│                                               │
│            [ Tạo tài khoản ]                 │
└─────────────────────────────────────────────┘
```
- Customer → `POST /auth/register`. Owner → `POST /auth/register-owner` (kèm object `cafe`).
- Lỗi `EMAIL_ALREADY_REGISTERED` (409) → inline error dưới ô email.
- Lỗi `VALIDATION_ERROR` (422) → map `meta.details` → lỗi từng field qua RHF `setError`.
- Thành công (201) → tự động login (nhận `tokens`) → redirect theo role.

### 4.4 Browse Cafés (`/cafes`)
```
┌──────────────────────────────────────────────────────────┐
│ Navbar                                                     │
├──────────────────────────────────────────────────────────┤
│ [Tìm theo thành phố▾] [Tiện ích▾] [Ngày/giờ (tùy chọn)]   │ ← SearchBar + filter
├──────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│ │ CafeCard │ │ CafeCard │ │ CafeCard │ │ CafeCard │       │ Grid 4 cột desktop
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                     [ Xem thêm ]  (cursor pagination)      │
└──────────────────────────────────────────────────────────┘
```
- Không filter → `GET /cafes`. Có filter → `GET /cafes/search?city=...`.
- Empty state: "Không tìm thấy quán cà phê phù hợp" + gợi ý xóa bộ lọc.
- Loading: 4 CafeCard skeleton hoặc `LoadingSpinner` giữa trang.

### 4.5 Café Detail (`/cafes/:cafeId`)
```
┌──────────────────────────────────────────────────────────┐
│ ← Quay lại danh sách                                       │
│  Study Hub Hanoi          [StatusChip: ACTIVE]             │
│  📍 123 Đường ABC, Hanoi   🕐 08:00–22:00                  │
│  Tiện ích: [wifi] [power_outlet] [quiet_zone]              │
├──────────────────────────────────────────────────────────┤
│ Chọn ngày [ 06/07/2026 ▾ ]  giờ [09:00]–[11:00]           │
├──────────────────────────────────────────────────────────┤
│  Zone: Quiet Zone                                          │
│  [A-01 🟩][A-02 🟩][A-03 ⬛][A-04 🟩] ...                   │ SeatGrid
│  Zone: Window Zone                                          │
│  [B-01 🟩][B-02 ⬛][B-03 🟩] ...                            │
├──────────────────────────────────────────────────────────┤
│  Chính sách: hủy trước 30 phút · tối đa 3 booking cùng lúc │
└──────────────────────────────────────────────────────────┘
     ↓ Click ghế trống (🟩) khi đã login CUSTOMER
┌──────────────────────────────┐
│   Đặt chỗ — Ghế A-01          │  BookingDialog (MUI Dialog)
│   Ngày/giờ: 09:00–11:00       │
│   Ghi chú (tùy chọn) [_____]  │
│   [ inline error nếu có ]     │
│        [ Xác nhận đặt ]       │
└──────────────────────────────┘
```
- Load: `GET /cafes/:id` + `GET .../seats/layout` + `GET .../seats/availability?startTime&endTime`.
- Đổi ngày/giờ → refetch availability (không cần load lại layout).
- Chưa login → click ghế → redirect `/login?next=/cafes/:id`.

### 4.6 Booking History (`/bookings`)
```
┌──────────────────────────────────────────────────────────┐
│ Lịch sử đặt chỗ của tôi                                    │
│ [ Tất cả ▾ ] [ Sắp tới ▾ ]                                 │ filter status/upcoming
├──────────────────────────────────────────────────────────┤
│ Study Hub Hanoi · Ghế A-01 · 06/07 09:00–11:00             │
│ Mã: BK-20260706-A1B2C3      [StatusChip: CONFIRMED]        │
│                          [Check-in]  [Hủy]                  │
├──────────────────────────────────────────────────────────┤
│ ... (danh sách các booking khác, cursor pagination)        │
└──────────────────────────────────────────────────────────┘
```
- Empty: "Bạn chưa có đặt chỗ nào" + nút "Tìm quán ngay" → `/cafes`.
- Nút Check-in chỉ hiện khi status = CONFIRMED và trong khung giờ hợp lệ (FE tự tính từ `startTime`/`checkinGraceMinutes` lấy từ café policies).
- Nút Hủy chỉ hiện khi status = CONFIRMED.

### 4.7 Profile (`/profile`)
```
┌───────────────────────────────────────────┐
│  Thông tin cá nhân                          │
│  Email        customer@example.com (readonly)│
│  Họ tên       [___________________]        │
│  SĐT          [___________________]        │
│  Thành phố ưu thích [_______________]       │
│  ☐ Nhận thông báo qua Email                 │
│  ☐ Nhận thông báo qua SMS                   │
│              [ Lưu thay đổi ]               │
└───────────────────────────────────────────┘
```
- Load qua `GET /auth/me` (chỉ role CUSTOMER có `data.profile`).
- Save → `PATCH /customers/profile` *(⚠️ xem lưu ý đầu file)* — body cần ≥1 field.
- Owner/Admin: trang này chỉ hiển thị thông tin cơ bản (fullName, email, role) ở dạng read-only, không có form edit (vì API hiện chỉ định nghĩa update cho customer profile).

### 4.8 Owner Dashboard — Tab Overview
```
┌──────────────────────────────────────────────────────────┐
│ [Sidebar]  │  Owner Dashboard                              │
│ Overview   │  ┌─────────────┐ ┌─────────────┐              │
│ My Cafés   │  │ Tổng số café │ │ Café đang    │             │
│ Bookings   │  │      3       │ │ chờ duyệt: 1 │             │
│            │  └─────────────┘ └─────────────┘              │
│            │  Danh sách café: [StatusChip mỗi dòng]         │
└──────────────────────────────────────────────────────────┘
```
- `GET /owner/cafes` — hiển thị mọi status (ACTIVE/PENDING_VERIFICATION/SUSPENDED/REJECTED).

### 4.9 Owner Dashboard — Tab My Cafés & Layout
```
┌──────────────────────────────────────────────────────────┐
│ [Sidebar] │ Chọn café: [ Study Hub Hanoi ▾ ] [+ Café mới]  │
│           │ ┌─ Thông tin café ──────────────────────────┐ │
│           │ │ Tên/Địa chỉ/TP/Giờ mở cửa/Tiện ích         │ │
│           │ │                          [ Lưu café ]      │ │
│           │ └────────────────────────────────────────────┘ │
│           │ ┌─ Chính sách đặt chỗ (settings) ────────────┐ │
│           │ │ Slot (phút) / Grace check-in / Max concurrent│
│           │ │                        [ Lưu chính sách ]  │ │
│           │ └────────────────────────────────────────────┘ │
│           │ ┌─ Seat Layout Editor ───────────────────────┐ │
│           │ │ Zone: [Quiet Zone ▾] [+ Zone mới]           │ │
│           │ │ [A-01][A-02][A-03] [+ Ghế mới] [Xóa ghế]    │ │
│           │ │                        [ Lưu Layout ]       │ │
│           │ └────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```
- Tạo café mới → `POST /owner/cafes` (PENDING). Update → `PUT /owner/cafes/:id`.
- Settings → `PATCH /owner/cafes/:id/settings`.
- Layout load → `GET .../seats/layout?includeInactive=true`; save → `PUT .../seats/layout`.
- `LAYOUT_CONFLICT` (409) → ConfirmDialog cảnh báo hủy booking tương lai → resubmit `force=true`.
- `DUPLICATE_SEAT_NUMBER` (422) → inline error tại ô seatNumber trùng trong zone.

### 4.10 Owner Dashboard — Tab Bookings
```
┌──────────────────────────────────────────────────────────┐
│ [Sidebar] │ Bộ lọc: [Status▾][Từ ngày][Đến ngày][Ghế▾][Tìm]│
│           │ ┌──────────────────────────────────────────┐  │
│           │ │ ng***@gmail.com · A-01 · 09:00–11:00       │ │
│           │ │ [StatusChip CONFIRMED]     [Check-in]      │ │
│           │ └──────────────────────────────────────────┘  │
│           │ ... (danh sách, cursor pagination)            │
└──────────────────────────────────────────────────────────┘
```
- `GET .../bookings` — email khách bị mask theo business rule BE.
- Check-in → `POST .../bookings/:id/check-in`.

### 4.11 Admin Dashboard — Tab Overview
```
┌──────────────────────────────────────────────────────────┐
│ [Sidebar] │ ┌───────────┐ ┌───────────────────┐           │
│ Overview  │ │ Café chờ   │ │ (tổng user — nếu   │          │
│ Users     │ │ duyệt: 4   │ │  cần, đếm từ list) │          │
│ Approvals │ └───────────┘ └───────────────────┘            │
│           │ Danh sách café chờ duyệt gần nhất (rút gọn)    │
└──────────────────────────────────────────────────────────┘
```
- `GET /admin/cafes/pending` (+ có thể gọi `GET /admin/users` để đếm nhanh nếu cần tổng quan).

### 4.12 Admin Dashboard — Tab Users
```
┌──────────────────────────────────────────────────────────┐
│ [Sidebar] │ [Tìm kiếm] [Role▾] [Status▾]                  │
│           │ ┌──────────────────────────────────────────┐  │
│           │ │ Nguyễn Văn A · a@x.com · CUSTOMER · ACTIVE│  │
│           │ │                    [Xem chi tiết]         │  │
│           │ └──────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
        ↓ click "Xem chi tiết"
┌───────────────────────────────────────────┐
│ Chi tiết user: Nguyễn Văn A                 │
│ Email / Role / Status / Số booking (nếu    │
│ CUSTOMER) hoặc số café (nếu OWNER)          │
│         [ Đình chỉ ]  hoặc  [ Bỏ đình chỉ ] │
└───────────────────────────────────────────┘
```
- List: `GET /admin/users`. Detail: `GET /admin/users/:id`.
- Suspend → ConfirmDialog + textarea `reason` (bắt buộc, 5–500 ký tự) → `PUT .../suspend`.
- Unsuspend → `PUT .../unsuspend` (không cần reason).
- Lỗi `CANNOT_SUSPEND_ADMIN` / `CANNOT_SUSPEND_SELF` (403) → Toast, nút Suspend nên tự ẩn/disable khi biết trước user đó là admin hoặc chính mình.

### 4.13 Admin Dashboard — Tab Café Approvals
```
┌──────────────────────────────────────────────────────────┐
│ [Sidebar] │ ┌──────────────────────────────────────────┐  │
│           │ │ Coffee Corner · Hanoi · Owner: Trần B     │  │
│           │ │ [StatusChip PENDING_VERIFICATION]         │  │
│           │ │            [ Duyệt ]   [ Từ chối ]        │  │
│           │ └──────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
   Duyệt → dialog notes tùy chọn → PUT approve → StatusChip ACTIVE, biến mất khỏi list pending
   Từ chối → dialog textarea reason bắt buộc → PUT reject → StatusChip REJECTED, biến mất khỏi list pending
```

---

## 5. Component Inventory + States

| Component | Mô tả | Loading | Empty | Error |
|---|---|---|---|---|
| `Navbar` | Logo, nav links, user menu, bell icon (nếu login) | — | — | — |
| `Sidebar` | Nav Owner/Admin, collapsible tablet | — | — | — |
| `NotificationDropdown` | Popover từ bell icon | Spinner nhỏ trong popover | "Không có thông báo mới" | Toast lỗi nếu fetch fail |
| `CafeCard` | Tên, địa chỉ, giờ, StatusChip | Skeleton card | — | — |
| `SeatGrid` | Grid ghế theo zone, màu theo trạng thái | Skeleton grid | "Quán chưa cấu hình ghế" | Toast + nút retry nếu availability fetch fail |
| `BookingDialog` | Form đặt chỗ | Nút Submit disabled + spinner khi đang gửi | — | Inline error trong dialog (không đóng dialog khi lỗi nghiệp vụ) |
| `SeatLayoutEditor` | Editor zone/ghế | Spinner khi load layout | "Chưa có zone nào — thêm zone đầu tiên" | Inline error theo field (seatNumber trùng) + ConfirmDialog cho LAYOUT_CONFLICT |
| `StatusChip` | Chip màu theo enum status | — | — | — |
| `SearchBar` | Input debounce | — | — | — |
| `ConfirmDialog` | Modal xác nhận dùng chung | Nút Confirm disabled + spinner khi đang submit | — | Có thể hiển thị lỗi ngay trong dialog trước khi đóng |
| `EmptyState` | Icon + message + optional CTA | — | (chính nó là empty state) | — |
| `LoadingSpinner` | `CircularProgress` giữa khu vực nội dung | (chính nó là loading state) | — | — |
| `ProtectedRoute` | Route guard theo AuthContext | Spinner toàn trang khi đang xác thực init | — | Redirect `/login` hoặc `/` |

---

## 6. Form Fields Map (đúng field API)

| Form | Field | Bắt buộc | Ghi chú validation | Submit tới |
|---|---|---|---|---|
| **Login** | `email` | ✓ | format email | `POST /auth/login` |
| | `password` | ✓ | — | |
| **Register (Customer)** | `email` | ✓ | unique, format | `POST /auth/register` |
| | `password` | ✓ | ≥8 ký tự, có chữ + số | |
| | `fullName` | ✓ | 2–150 ký tự | |
| | `phone` | — | — | |
| | `preferredCity` | — | — | |
| **Register (Owner)** | `email`, `password`, `fullName`, `phone` | ✓ | như Customer | `POST /auth/register-owner` |
| | `cafe.name` | ✓ | 2–200 ký tự | |
| | `cafe.address`, `cafe.city` | ✓ | — | |
| | `cafe.operatingHours` | ✓ | object 7 ngày `{open, close}` | |
| | `cafe.amenities` | — | mảng string | |
| **Booking Dialog** | `cafeId`, `seatId` | ✓ | UUID, lấy từ context (không cho user gõ tay) | `POST /bookings` |
| | `startTime`, `endTime` | ✓ | ISO 8601; `endTime > startTime`; không ở quá khứ; khớp slot duration & giờ mở cửa | |
| | `notes` | — | tối đa 500 ký tự | |
| | Header `Idempotency-Key` | ✓ | UUID v4, sinh 1 lần khi mở dialog | |
| **Cancel Booking** | `reason` (query) | — | tối đa 255 ký tự | `DELETE /bookings/:id` |
| **Profile** ⚠️ | `fullName` | — | ít nhất 1 field | `PATCH /customers/profile` |
| | `phone`, `preferredCity` | — | — | |
| | `emailNotifications`, `smsNotifications` | — | boolean | |
| **Café Form (Owner)** | `name` | ✓ | 2–200 ký tự | `POST/PUT /owner/cafes[/:id]` |
| | `address`, `city` | ✓ | — | |
| | `operatingHours` | ✓ | 7 ngày `{open, close}` | |
| | `phone`, `email`, `description`, `amenities` | — | — | |
| **Café Settings** | `slotDurationMinutes`, `minAdvanceBookingMinutes`, `maxAdvanceBookingDays`, `cancellationDeadlineMinutes`, `maxConcurrentBookings`, `checkinGraceMinutes`, `timezone` | — (≥1 field) | số nguyên dương hợp lệ | `PATCH /owner/cafes/:id/settings` |
| **Seat Layout** | `zones[].name` | ✓ | không rỗng | `PUT /owner/cafes/:id/seats/layout` |
| | `zones[].displayOrder`, `isActive` | — | — | |
| | `zones[].seats[].seatNumber` | ✓ | duy nhất trong zone | |
| | `zones[].seats[].seatType` | ✓ | enum `STANDARD/PREMIUM/GROUP` | |
| | `zones[].seats[].amenities`, `isActive` | — | — | |
| | `force` | — | boolean, dùng khi resubmit sau `LAYOUT_CONFLICT` | |
| **Suspend User** | `reason` | ✓ | 5–500 ký tự | `PUT /admin/users/:id/suspend` |
| **Reject Café** | `reason` | ✓ | không rỗng | `PUT /admin/cafes/:id/reject` |
| **Approve Café** | `notes` | — | — | `PUT /admin/cafes/:id/approve` |

---

## 7. Navigation & Route Table

| Route | Layout | Auth | Role | Ghi chú |
|---|---|---|---|---|
| `/` | Guest | Không | — | Landing |
| `/login` | Guest | Không | — | hỗ trợ `?next=` |
| `/register` | Guest | Không | — | toggle Customer/Owner |
| `/cafes` | Guest | Không | — | Browse |
| `/cafes/:cafeId` | Guest | Không (dialog cần login) | — | Café Detail |
| `/bookings` | Customer | Có | CUSTOMER | Booking History |
| `/profile` | Customer | Có | CUSTOMER | Profile — Owner/Admin xem read-only nếu truy cập (không chặn nhưng ẩn form edit) |
| `/owner/dashboard` | Owner | Có | OWNER | 3 tab |
| `/admin/dashboard` | Admin | Có | ADMIN | 3 tab |

**Route guard rules:**
- Chưa login vào route yêu cầu auth → redirect `/login?next=<path>`.
- Sai role (VD: CUSTOMER vào `/owner/*`) → redirect `/` + Toast "Bạn không có quyền truy cập".
- Sau login → redirect theo `user.role` hoặc `next` nếu có.

---

## 8. Responsive Breakpoints

Thiết kế **desktop-first**, breakpoint theo MUI mặc định:

| Breakpoint | Range | Hành vi chính |
|---|---|---|
| **Desktop (lg+)** | ≥ 1280px | Layout chuẩn thiết kế: Sidebar full (icon+label), CafeCard grid 4 cột, SeatGrid nhiều cột theo zone |
| **Tablet (md)** | 900–1279px | Sidebar thu gọn còn icon (tooltip khi hover); CafeCard grid 2–3 cột; form 1 cột nhưng vẫn giữ layout dialog |
| **Mobile (xs–sm)** | < 900px | Sidebar ẩn, thay bằng Drawer mở qua icon hamburger trên Navbar; CafeCard/booking list xếp 1 cột; SeatGrid scroll ngang theo zone; BookingDialog full-screen trên mobile |

Không tối ưu sâu cho màn hình < 375px (ngoài phạm vi demo).

---

## 9. Theme Tokens (MUI) — Tông cà phê, Light Mode

```ts
// theme.ts
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#6F4E37',      // Coffee Brown — nút chính, link, active state
      light: '#8D6E63',
      dark: '#4E342E',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#C9A66B',      // Caramel Gold — accent, highlight, badge phụ
      contrastText: '#3E2723',
    },
    success: {
      main: '#4B7B4E',       // CONFIRMED / ACTIVE
    },
    error: {
      main: '#A94442',       // CANCELLED / EXPIRED / SUSPENDED / REJECTED
    },
    warning: {
      main: '#C77B2E',       // PENDING_VERIFICATION / PENDING_EMAIL_VERIFICATION
    },
    info: {
      main: '#6D8B94',       // CHECKED_IN hoặc trạng thái trung tính khác
    },
    background: {
      default: '#FAF6F1',    // Cream — nền toàn trang
      paper: '#FFFFFF',      // Card, Dialog, Paper
    },
    text: {
      primary: '#3E2723',    // Espresso — text chính
      secondary: '#6D4C41',
    },
    divider: '#E4D9CC',
  },
  typography: {
    fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: { fontWeight: 600 },
    h2: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 500 },
  },
  shape: {
    borderRadius: 8,
  },
  spacing: 8, // giữ base 8px của MUI
});
```

**StatusChip color mapping:**

| Status | Màu (palette key) |
|---|---|
| `CONFIRMED`, `ACTIVE` | `success` |
| `CHECKED_IN` | `info` |
| `COMPLETED` | `secondary` (nhạt hơn, mang tính "đã xong") |
| `CANCELLED`, `EXPIRED`, `SUSPENDED`, `REJECTED` | `error` |
| `PENDING_VERIFICATION`, `PENDING_EMAIL_VERIFICATION` | `warning` |

---

## 10. Error/Feedback Patterns

| Kiểu | Khi dùng | Cách hiển thị |
|---|---|---|
| **Toast** (Snackbar + Alert) | Lỗi hệ thống, rate limit, suspend/lock, thành công của action không cần giữ context (VD: unsuspend) | Góc dưới/trên phải, tự ẩn sau ~4–6s, màu theo severity |
| **Inline (field-level)** | `VALIDATION_ERROR` (422) → map `meta.details` vào từng field qua React Hook Form `setError()` | Text đỏ nhỏ ngay dưới input |
| **Inline (form-level, trong Dialog)** | `SEAT_ALREADY_BOOKED`, `BOOKING_CONFLICT`, `EMAIL_ALREADY_REGISTERED` — lỗi nghiệp vụ cần giữ user ở lại form để sửa | Alert nhỏ phía trên nút Submit trong dialog/form, không đóng dialog |
| **ConfirmDialog** | Hành động phá hủy/không thể hoàn tác: Cancel booking, Suspend user, Reject café, `LAYOUT_CONFLICT` (force=true) | Modal với `title`, `message`, nút Confirm/Cancel |
| **EmptyState** | Danh sách rỗng: booking, café, notification, user | Icon + message + optional CTA (VD: "Tìm quán ngay") |
| **LoadingSpinner** | Đang fetch dữ liệu chính của trang | `CircularProgress` giữa khu vực nội dung, không che toàn màn hình trừ lúc app init (auth check) |

**Bảng chi tiết Error Code → UI (tổng hợp từ API spec):**

| Code | HTTP | UI |
|---|---|---|
| `AUTH_TOKEN_EXPIRED` | 401 | Interceptor tự refresh, người dùng không thấy gì |
| `AUTH_INVALID_CREDENTIALS` | 401 | Inline form error (Login) |
| `AUTH_REFRESH_TOKEN_INVALID` | 401 | Clear state → redirect `/login` |
| `ACCOUNT_LOCKED` | 403 | Toast |
| `ACCOUNT_SUSPENDED` | 403 | Toast + force logout |
| `FORBIDDEN` | 403 | Toast + redirect `/` |
| `EMAIL_ALREADY_REGISTERED` | 409 | Inline (Register) |
| `SEAT_ALREADY_BOOKED` / `BOOKING_CONFLICT` | 409 | Inline trong BookingDialog + refetch availability |
| `BOOKING_LIMIT_EXCEEDED` | 409 | Inline trong BookingDialog |
| `BOOKING_CANNOT_CANCEL` | 409 | Toast |
| `CHECKIN_TOO_EARLY` | 422 | Toast |
| `CHECKIN_WINDOW_EXPIRED` | 409 | Toast |
| `LAYOUT_CONFLICT` | 409 | ConfirmDialog (force=true) |
| `DUPLICATE_SEAT_NUMBER` | 422 | Inline field error trong SeatLayoutEditor |
| `CANNOT_SUSPEND_ADMIN` / `CANNOT_SUSPEND_SELF` | 403 | Toast |
| `VALIDATION_ERROR` | 422 | Inline field errors (mọi form) |
| `IDEMPOTENCY_KEY_REQUIRED` | 400 | Dev bug — không hiển thị cho user, log console |
| `RATE_LIMIT_EXCEEDED` | 429 | Toast |
| `INTERNAL_SERVER_ERROR` / `SERVICE_UNAVAILABLE` | 500/503 | Toast chung "Có lỗi xảy ra, vui lòng thử lại" |

---

## 11. Page → API Mapping

| Trang | Endpoint gọi | Method |
|---|---|---|
| Landing | `GET /cafes` (limit nhỏ, café nổi bật) | GET |
| Login | `POST /auth/login` | POST |
| Register | `POST /auth/register` hoặc `POST /auth/register-owner` | POST |
| App init (mọi trang) | `POST /auth/refresh` → `GET /auth/me` | POST/GET |
| Browse Cafés | `GET /cafes`, `GET /cafes/search` | GET |
| Café Detail | `GET /cafes/:id`, `GET .../seats/layout`, `GET .../seats/availability` | GET |
| Booking Dialog | `POST /bookings` (+ header `Idempotency-Key`) | POST |
| Booking History | `GET /bookings`, `DELETE /bookings/:id`, `POST /bookings/:id/check-in` | GET/DELETE/POST |
| Profile | `GET /auth/me`, `PATCH /customers/profile` ⚠️ | GET/PATCH |
| Notification Dropdown | `GET /notifications`, `PATCH /notifications/:id/read` | GET/PATCH |
| Owner — Overview | `GET /owner/cafes` | GET |
| Owner — My Cafés & Layout | `POST /owner/cafes`, `GET/PUT /owner/cafes/:id`, `PATCH .../settings`, `GET/PUT .../seats/layout` | POST/GET/PUT/PATCH |
| Owner — Bookings | `GET /owner/cafes/:id/bookings`, `POST .../bookings/:id/check-in` | GET/POST |
| Admin — Overview | `GET /admin/cafes/pending` | GET |
| Admin — Users | `GET /admin/users`, `GET /admin/users/:id`, `PUT .../suspend`, `PUT .../unsuspend` | GET/PUT |
| Admin — Café Approvals | `GET /admin/cafes/pending`, `PUT .../approve`, `PUT .../reject` | GET/PUT |
| Logout (mọi trang có Navbar user menu) | `POST /auth/logout` | POST |

---

## 12. Ghi chú tổng hợp

- Không có tính năng nào ngoài phạm vi 33 endpoint đã spec (không payment, review, coupon, chat).
- Màu sắc: tông cà phê (`#6F4E37` primary), light mode duy nhất, giữ Roboto + spacing 8px của MUI để không tốn công tùy biến sâu.
- Idempotency-Key sinh **1 lần khi mở BookingDialog**, giữ nguyên xuyên suốt các lần retry của cùng 1 lần submit (theo đúng `utils/idempotencyKey.ts`).
- Trước khi code thật, cần đội BE xác nhận lại endpoint `PATCH /customers/profile` (mục 6 & 11 có đánh dấu ⚠️).
