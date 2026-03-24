# SYSTEM TRAINING — TEACHER HOUSING MANAGEMENT SYSTEM

You are building a **TEACHER HOUSING MANAGEMENT SYSTEM** for a **public school**.

This is **NOT** a commercial hotel system.  
This is **NOT** a rental business.

The system **MUST** be as strict and reliable as professional dormitory and property management software.

---

## CORE CONTEXT

- **Housing units** = **GOVERNMENT ASSETS**
- **Residents** = teachers and staff (not customers)
- **Money collected** = **NOT revenue** — pass-through funds only
- **Transparency and auditability** = mandatory

---

## FUNDAMENTAL PRINCIPLES

### 1. Unit-first design
- Houses and flats are **permanent entities**
- Residents change; units do not
- (See entity model in PROPERTY_MANAGEMENT_MINDSET.md: Property, Building, Unit, Occupancy, etc.)

### 2. Rights-based occupancy
- Occupancy is a **granted right**, not a commercial lease
- **Must track:** start date, end date, and **authorization** (who granted, by what rule/policy)
- Status lifecycle: vacant → reserved → occupied → temporarily unavailable → released

### 3. Financial neutrality
- **Water and electricity** = collected to pay utilities (pass-through; no profit)
- **Central fund** = covers common expenses and losses (operating account)
- **Rounding differences** must be **recorded explicitly** (allocation rule or adjustment with reason)
- Never treat resident payments as school revenue

### 4. Role flexibility
- **Operational roles** (e.g. meter reader, collector, approver) are **assigned to residents** (staff)
- Roles can be **reassigned** without breaking the system
- No hardcoded “only user X can do Y”; use role/permission tables and backend checks

### 5. PDPA compliance
- **Access only by necessity** (need-to-know)
- **Executives** see **statistics and patterns**, not personal details or gossip
- Log access to personal data where required by policy

---

## OPERATIONAL REALITY

The system must reflect reality, not hide it:

- **Master meters ≠ sum of sub-meters** (loss exists; allocate and document)
- **Empty units** may still incur **service fees** (policy-defined)
- **Late payments** occur — support partial payment, reminder, and reconciliation
- **Manual verification** is sometimes required — allow it and **log** who verified and when

**The system MUST expose discrepancies, not hide them.**  
Show mismatches; require explanation or chosen resolution; log the decision.

---

## AUDIT REQUIREMENTS

Every action must be traceable:

- **who** (user/role)
- **when** (timestamp)
- **what** (entity, old value, new value or outcome)
- **why** (if overridden or exception; reason required and stored)

Assume **future audits** by:
- school administrators
- inspectors (e.g. government, audit office)

Audit log must be **immutable** and **reviewable** by authorized roles only.

---

## RELATION TO OTHER SPECS

- **PRODUCTION_APPLICATION_MODE.md** — All features must do real work; backend enforces permissions; every CUD is logged; no demo/placeholder.
- **PROPERTY_MANAGEMENT_MINDSET.md** — Entity model (Unit, Occupancy, Resident, Utility Meter/Reading/Bill, Payment, Receipt, etc.), workflow separation (Reservation ≠ Occupancy, Billing ≠ Payment, etc.), failure handling (show discrepancy, require explanation, log).

Apply both when building teacher housing features.

---

## FINAL DIRECTIVE

Build this system to **survive**:

- **Staff rotation** — someone else can take over with documentation and clear workflows
- **Policy changes** — allocation rules, fees, and approvals are configurable or explainable, not hardcoded
- **Leadership changes** — roles and access are role-based; no dependency on a single person
- **Long-term operational use** — stable data model, audit trail, and operational reality (discrepancies visible, not hidden)

If you simplify away government-asset accountability or auditability, **you are doing it wrong.**
