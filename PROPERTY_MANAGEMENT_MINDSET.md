# SYSTEM TRAINING — PROPERTY MANAGEMENT MINDSET

You are building a **PROPERTY MANAGEMENT SYSTEM** with the same rigor as:
- dormitory management software
- hotel / resort PMS
- rental property management systems

This is **NOT** a school project. This is **NOT** a custom form app.

---

## CORE INDUSTRY PRINCIPLES (MANDATORY)

Adopt **real-world** property management logic:

1. **Unit-first thinking**
   - Every room / house / unit is a **PRIMARY ENTITY**
   - People come and go; units persist

2. **Occupancy lifecycle**
   - vacant  
   - reserved  
   - occupied  
   - temporarily unavailable  
   - released  

3. **Financial separation**
   - Utility charges = **pass-through** (resident pays cost, not profit)
   - Central fund = **operating account**
   - **Never** mix resident money with operating profit

4. **Auditability**
   - Assume inspections, disputes, staff turnover
   - Every material change must be traceable and explainable

---

## DATA MODEL RULES

Think in **entities**, not screens:

| Entity | Purpose |
|--------|--------|
| Property | Top-level (e.g. site, campus) |
| Building | Within property |
| Unit | Room/house — PRIMARY; people come and go, units persist |
| Occupancy | Link resident ↔ unit for a period; has status, dates |
| Resident | Person (tenant, guest); linked via Occupancy |
| Utility Meter | Master or sub-meter; links to unit/building |
| Utility Reading | Raw reading at a date; source for billing |
| Utility Bill | Master bill or unit bill; calculated, not payment |
| Allocation / Adjustment | How shared cost (e.g. loss, rounding) is distributed |
| Payment | Money received; may be partial, late, or over |
| Receipt | Proof/record issued after verification |
| Operating Fund | Central account; expenses and non-pass-through items |
| Expense | Outflow from operating fund; categorized |
| Request | Resident or staff request (maintenance, exception, etc.) |
| Maintenance Ticket | Work order; has status, assignee, completion |
| Queue / Waitlist | For units or services; ordered, fair policy |
| Audit Log | Who, when, what, why (immutable) |

**If data is not traceable across these entities, THE MODEL IS WRONG.**

---

## REAL-WORLD CONSTRAINTS TO RESPECT

### 1. Utility reality
- **Master meter ≠ sum of sub-meters** (loss exists)
- **Loss MUST be accounted for** (allocation method, documented)
- **Rounding differences MUST go somewhere** (explicit rule, not silent)
- **Empty units** may still incur service fees (policy-driven)

### 2. Payment behavior
- Late payments happen
- Partial payments happen
- Overpayments happen
- Staff must **reconcile manually** sometimes — system must support it and log it

### 3. Human operations
- Data entry mistakes occur
- Someone else may take over the job tomorrow
- Prefer **explanations and overrides with reason** over blocking when policy allows

### 4. Legal & policy limits
- Data access follows **PDPA** and **need-to-know**
- Executives see **patterns and reports**, not gossip or unnecessary detail

---

## WORKFLOW DESIGN RULES

Design workflows like a **hotel/PMS** system. Separate steps; each step is a state transition:

- **Reservation ≠ Occupancy** (reserved vs moved-in)
- **Billing ≠ Payment** (invoice vs money received)
- **Payment ≠ Verification** (received vs confirmed)
- **Verification ≠ Receipt** (confirmed vs document issued)
- **Request ≠ Approval** (submitted vs approved)
- **Approval ≠ Execution** (approved vs done)

**Every step must have:**
- **status**
- **timestamp**
- **responsible role** (who did it / who must do it)

---

## USER EXPERIENCE EXPECTATIONS

**Do NOT oversimplify.**

A good management system:
- reduces human error (validation, defaults, warnings)
- shows **what needs attention** (exceptions, discrepancies, pending tasks)
- **explains discrepancies** (why numbers don’t match, what was adjusted)
- allows **overrides WITH reasons** (and logs them)
- leaves a **paper trail** (audit log, receipts, notes)

**If a process is unclear to a new staff member, IT IS NOT COMPLETE.**

---

## FAILURE HANDLING (IMPORTANT)

When something **does not match** (e.g. meter total ≠ sum of units, payment ≠ bill):

- **DO NOT** hide it  
- **DO NOT** auto-fix silently  

**Instead:**
- **Show** the discrepancy clearly
- **Require** explanation or chosen resolution (e.g. allocation rule, adjustment)
- **Log** the decision (who, when, reason)

---

## WHEN THIS APPLIES

Use this mindset when designing or implementing features that involve:

- **Property / Building / Unit** (master data, status, lifecycle)
- **Occupancy** (who stays where, when; reserved / occupied / released)
- **Residents** (tenants, guests; linked via occupancy)
- **Utility meters, readings, bills** (including loss and allocation)
- **Payments, receipts, reconciliation**
- **Operating fund, expenses**
- **Requests, maintenance tickets**
- **Queue / waitlist** for units or services
- **Audit and reporting** for inspections, disputes, handover

---

## FINAL DIRECTIVE

Build this system as if:
- it **will be audited**
- it **will be inherited** by someone else
- it **must survive** policy changes

**If you simplify away reality, YOU ARE DOING IT WRONG.**

Proceed with this mindset in **all** property-management features.

---

**School-specific:** For **teacher / staff housing** at a public school (government assets, residents = teachers/staff, pass-through funds, rights-based occupancy, PDPA), see **TEACHER_HOUSING_MANAGEMENT_SYSTEM.md** and `.cursor/rules/teacher-housing-system.mdc`.
