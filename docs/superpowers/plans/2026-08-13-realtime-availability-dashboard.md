# Real-time Availability & Date-based Calendar Checker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real-time availability indicator for today and an interactive date/time calendar availability checker on the PPK DriveHub Dashboard (`dashboard.html`).

**Architecture:** Extend backend `/api/queue/suggest` endpoint to compute available vehicles and drivers for any date/time window based on active queues, QR trip checkouts (`cars-out`), and approved driver leaves. On the frontend (`dashboard.html`), render real-time today counters and a date picker widget that dynamically displays available vehicle and driver cards with direct "📝 ขอใช้รถคันนี้" booking actions.

**Tech Stack:** JavaScript (ES6+), HTML5, CSS3, Cloudflare Workers / D1 Database.

## Global Constraints

- Preserve all existing permissions and role-based views.
- Mobile-first responsive design matching PPK DriveHub theme (`#6366f1` primary color, `Kanit` font).
- Frequency of commits: Commit code after completing each task.

---

### Task 1: Backend API Enhancement for Queue Suggestion & Availability

**Files:**
- Modify: `functions/api/queue/suggest.js:15-60`
- Modify: `frontend/js/api.js:260-270`

**Interfaces:**
- Consumes: `GET /api/queue/suggest?date=YYYY-MM-DD&time_start=HH:MM&time_end=HH:MM`
- Produces: JSON envelope `{ success: true, data: { available_cars, available_drivers, available_cars_count, available_drivers_count } }`

- [ ] **Step 1: Update `functions/api/queue/suggest.js` to return full vehicle and driver data**

```javascript
// Ensure cars query selects id, license_plate, brand, model, vehicle_type, current_mileage
// Ensure drivers query selects id, name, phone, fatigue_flag, discipline_score
```

- [ ] **Step 2: Add `checkAvailability` alias in `frontend/js/api.js` `ACTION_MAP`**

```javascript
'checkAvailability': (d) => API.get('/api/queue/suggest' + _q(d)),
```

- [ ] **Step 3: Test API endpoint**

Run node command to test `/api/queue/suggest` response format.

- [ ] **Step 4: Commit Task 1 changes**

```bash
git add functions/api/queue/suggest.js frontend/js/api.js
git commit -m "feat(api): enhance suggest API to return full vehicle and driver availability data"
```

---

### Task 2: Frontend Dashboard Real-time Today Indicator & Date Checker Widget

**Files:**
- Modify: `frontend/dashboard.html:420-435`
- Modify: `frontend/dashboard.html:1078-1131`

**Interfaces:**
- Consumes: `API.get('/api/queue/suggest')`, `API.get('/api/usage/cars-out')`
- Produces: Live rendered HTML elements `#driversAvailableList` and `#vehiclesAvailableList` on `dashboard.html`.

- [ ] **Step 1: Add Date/Time Picker Control UI to `dashboard.html`**

Inject date input (`#checkerDate`), time start (`#checkerTimeStart`), time end (`#checkerTimeEnd`), and reset button above the availability lists.

- [ ] **Step 2: Implement `checkAvailabilityLive(selectedDate, timeStart, timeEnd)` in `dashboard.html`**

Fetch availability data from API, compute real-time today status including `carsOut` QR checkout deductions, and render interactive cards.

- [ ] **Step 3: Add "📝 ขอใช้รถคันนี้" direct booking button on vehicle cards**

Redirect to `vehicle-request.html?v=2&date=...&time_start=...&time_end=...&car_id=...`.

- [ ] **Step 4: Manual & UI Verification**

Verify date picker change updates the list dynamically and mobile responsiveness works seamlessly.

- [ ] **Step 5: Commit Task 2 changes**

```bash
git add frontend/dashboard.html
git commit -m "feat(frontend): add real-time today availability indicator and date checker widget on dashboard"
```
