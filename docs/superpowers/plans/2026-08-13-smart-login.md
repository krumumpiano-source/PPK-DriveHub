# Smart Login & First-Time Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Combine login and first-time registration into an intelligent Single Smart Box UI (`login.html`) and backend endpoint, enabling single-click identity checks and zero-friction auto-login onboarding.

**Architecture:** A new `POST /api/auth/check-identity` endpoint checks D1 database by email/username. The frontend `login.html` dynamically transitions between Identity Check -> Password Input (Login) OR First-Time Onboarding (Register & Auto-login).

**Tech Stack:** Vanilla HTML/CSS/JS, Cloudflare Workers API (`functions/api/auth/[[path]].js`), Cloudflare D1 Database, Playwright test suite.

## Global Constraints
- Minimal fields for new school emails (`@ppk.ac.th`).
- Auto-login after registration (return JWT token).
- Backwards compatible with existing login and API authentication.

---

### Task 1: Backend Identity Check Endpoint (`POST /api/auth/check-identity`)

**Files:**
- Modify: `functions/api/auth/[[path]].js`
- Test: `tests/api-integration.test.mjs`

**Interfaces:**
- Consumes: Request `{ identity: string }`
- Produces: JSON response `{ exists: boolean, is_school_email: boolean, user?: { username, full_name, email } }`

- [ ] **Step 1: Write integration test for check-identity endpoint**

```javascript
// Add test in tests/api-integration.test.mjs
test('POST /api/auth/check-identity checks user existence', async ({ request }) => {
  const res = await request.post('/api/auth/check-identity', {
    data: { identity: 'admin' }
  });
  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.exists).toBeDefined();
});
```

- [ ] **Step 2: Run test to verify it fails initially**

Run: `npx playwright test tests/api-integration.test.mjs`

- [ ] **Step 3: Implement `check-identity` route handler in `functions/api/auth/[[path]].js`**

Add endpoint logic:
```javascript
if (path === 'check-identity' && req.method === 'POST') {
  const body = await req.json();
  const identity = (body.identity || '').trim().toLowerCase();
  if (!identity) {
    return jsonResponse({ error: 'กรุณาระบุอีเมลหรือชื่อผู้ใช้' }, 400);
  }
  const isSchoolEmail = identity.endsWith('@ppk.ac.th');
  const user = await env.DB.prepare(
    'SELECT id, username, full_name, email, role FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?'
  ).bind(identity, identity).first();

  if (user) {
    return jsonResponse({
      exists: true,
      is_school_email: isSchoolEmail,
      user: { username: user.username, full_name: user.full_name, email: user.email }
    });
  }

  // Parse suggested name from email prefix e.g. somchai.j -> สมชาย
  let suggestedName = '';
  if (isSchoolEmail) {
    const prefix = identity.split('@')[0];
    suggestedName = prefix.split('.')[0].replace(/[^a-zA-Z]/g, '');
    if (suggestedName) {
      suggestedName = suggestedName.charAt(0).toUpperCase() + suggestedName.slice(1);
    }
  }

  return jsonResponse({
    exists: false,
    is_school_email: isSchoolEmail,
    suggested_username: identity.includes('@') ? identity.split('@')[0] : identity,
    suggested_name: suggestedName
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx playwright test tests/api-integration.test.mjs`

- [ ] **Step 5: Commit backend endpoint changes**

```bash
git add functions/api/auth/[[path]].js tests/api-integration.test.mjs
git commit -m "feat(api): add check-identity endpoint for smart login workflow"
```

---

### Task 2: Frontend Smart Login UI & Workflow (`login.html`)

**Files:**
- Modify: `frontend/login.html`
- Modify: `frontend/js/api.js`

**Interfaces:**
- Consumes: `POST /api/auth/check-identity`, `POST /api/auth/login`, `POST /api/auth/register`
- Produces: Single Smart Box Card UI with auto-login on first-time registration.

- [ ] **Step 1: Add `checkIdentity` method in `frontend/js/api.js`**

```javascript
checkIdentity: function(identity) {
  return API.post('/api/auth/check-identity', { identity: identity });
}
```

- [ ] **Step 2: Update `login.html` structure & CSS styling for 2-step card**

Modify `login.html` body to include:
- Step 1 container: Input identity + "ถัดไป ➔" button
- Step 2A container (Existing user): User preview + Password input + "เข้าสู่ระบบ" button + "ไม่ใช่บัญชีนี้? เปลี่ยน" link
- Step 2B container (First-time user): Welcome badge + Full name input + Password input + "🚀 สมัครและเริ่มใช้งานทันที" button
- Add smooth CSS animations (`slideLeft`, `fadeIn`).

- [ ] **Step 3: Implement client-side JS logic for Step 1 -> Step 2A/2B transitions & Auto-Login**

Add event handlers:
- On Step 1 submit: call `API.checkIdentity(identity)`. If exists -> show Step 2A. If not -> show Step 2B with pre-filled name/username.
- On Step 2B submit: call `API.register(...)`, store token, show toast, and redirect immediately to `dashboard.html`.

- [ ] **Step 4: Manual & Playwright UI verification**

Verify flow in browser and run Playwright tests.

- [ ] **Step 5: Commit frontend UI changes**

```bash
git add frontend/login.html frontend/js/api.js
git commit -m "feat(frontend): implement Single Smart Box UI and onboarding flow in login.html"
```

---

### Task 3: Deployment & Git Push

**Files:**
- Modify: `frontend/sw.js` (bump cache version)

- [ ] **Step 1: Bump Service Worker cache version**
- [ ] **Step 2: Deploy to Cloudflare Pages via `npx wrangler pages deploy ./frontend --project-name ppk-drivehub`**
- [ ] **Step 3: Execute `git add .`, `git commit -m "..."`, `git push`**
