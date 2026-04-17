# Smart Budget Estimator — Manual Test Plan

## Prerequisites

- Local dev stack running: `npm run dev` in both `client/` and `server/`
- Supabase Studio accessible at your project dashboard
- A valid organiser account signed in on `http://localhost:3000`
- At least one existing Event ID and Fest ID available in your database

---

## 1. Load the Estimator with a Mock Event ID

1. Mount `<SmartBudgetEstimator>` on an existing page (e.g., the edit event page or a test route):
   ```tsx
   import SmartBudgetEstimator from "@/app/_components/Admin/SmartBudgetEstimator";

   // Inside your page/component:
   <SmartBudgetEstimator entityId="YOUR_EVENT_ID_HERE" entityType="event" />
   ```
2. Navigate to that page in the browser.
3. **Expected result:** The component renders with a single blank row, an empty "₹0.00" total, and the pre-flight card shows the slate info box ("Add expense items to see the required approval pipeline."). The "Submit for Approval" button is disabled.

---

## 2. Add Items and Verify Running Total

### Test 2a — Single item

1. Click inside the first row's "Item description..." field and type `Venue Rental (Main Hall)`.
2. Set Quantity to `1` and Unit Price to `50000`.
3. **Expected result:**
   - Row total shows `₹50,000.00`
   - Estimated Total in the Pre-Flight card updates to `₹50,000.00`

### Test 2b — Multiple items

1. Click **+ Add Expense Item** to add a second row.
2. Enter `Catering (Per Pax)`, Quantity `150`, Unit Price `800`.
3. **Expected result:**
   - Second row total: `₹1,20,000.00`
   - Grand total: `₹1,70,000.00`

### Test 2c — Remove an item

1. Hover over any row; the trash icon appears on the right.
2. Click the trash icon to remove it.
3. **Expected result:** Row disappears and the total recalculates correctly. Removing the last row has no effect (minimum 1 row enforced).

---

## 3. Verify Threshold / Badge Logic

### Test 3a — Under ₹25,000 (HOD only)

1. Clear or edit items so the total is `₹10,000` (e.g., 1 × ₹10,000).
2. **Expected Pre-Flight state:**
   - Alert text: *"At ₹10,000.00, this event will require HOD approvals before publishing."*
   - Badges shown: **Accounts**, **HOD**

### Test 3b — Between ₹25,001 and ₹1,00,000 (HOD + Dean)

1. Edit total to `₹60,000` (e.g., 1 × ₹60,000).
2. **Expected Pre-Flight state:**
   - Alert text: *"…require HOD and Dean approvals before publishing."*
   - Badges: **Accounts**, **HOD**, **Dean**

### Test 3c — Over ₹1,00,000 (HOD + Dean + CFO)

1. Edit total to `₹1,70,000` (matching the design screenshot).
2. **Expected Pre-Flight state:**
   - Alert text: *"…require HOD, Dean and CFO approvals before publishing."*
   - Badges: **Accounts**, **HOD**, **Dean**, **CFO**

### Test 3d — Zero total

1. Clear all unit prices to `0`.
2. **Expected:** Badges disappear, slate info box shown, Submit button disabled.

---

## 4. Save Draft

1. Add items and click **Save Draft**.
2. **Expected:** Toast "Budget estimate saved." appears.
3. **Verify in Supabase Studio** (event):
   ```sql
   SELECT event_id, total_estimated_expense, updated_at
   FROM event_budgets
   WHERE event_id = 'YOUR_EVENT_ID_HERE';
   ```
   Confirm `total_estimated_expense` matches your entered total.

4. **Verify for fests** (use `entityType="fest"`):
   ```sql
   SELECT fest_id, total_estimated_expense, updated_at
   FROM fests
   WHERE fest_id = 'YOUR_FEST_ID_HERE';
   ```

---

## 5. Submit for Approval

### Test 5a — Trigger submission

1. Ensure total is > ₹0.
2. Click **Submit for Approval**.
3. **Expected:** Button shows spinner + "Submitting..." label, then toast "Submitted for approval successfully!".

### Test 5b — Verify approval_request row created

Run in Supabase Studio:
```sql
SELECT
  ar.request_id,
  ar.entity_type,
  ar.entity_ref,
  ar.status,
  ar.is_budget_related,
  ar.submitted_at
FROM approval_requests ar
WHERE ar.entity_ref = 'YOUR_EVENT_ID_HERE'
ORDER BY ar.created_at DESC
LIMIT 5;
```
**Expected:** A row with `status = 'UNDER_REVIEW'`, `is_budget_related = true`, `entity_type = 'STANDALONE_EVENT'`.

### Test 5c — Verify approval_steps row created

```sql
SELECT
  ars.step_code,
  ars.role_code,
  ars.status,
  ars.sequence_order,
  ars.step_group
FROM approval_steps ars
JOIN approval_requests ar ON ar.id = ars.approval_request_id
WHERE ar.entity_ref = 'YOUR_EVENT_ID_HERE'
ORDER BY ars.sequence_order;
```
**Expected:** One row with `step_code = 'HOD_REVIEW'`, `role_code = 'HOD'`, `status = 'PENDING'`.

### Test 5d — Verify event workflow advanced

```sql
SELECT
  event_id,
  workflow_phase,
  status,
  is_budget_related,
  approval_request_id
FROM events
WHERE event_id = 'YOUR_EVENT_ID_HERE';
```
**Expected:** `workflow_phase = 'dept_approval'`, `status = 'pending_approvals'`, `is_budget_related = true`, `approval_request_id` is non-null.

### Test 5e — Verify fest workflow advanced (fest flow)

```sql
SELECT
  fest_id,
  workflow_phase,
  status,
  is_budget_related,
  approval_request_id
FROM fests
WHERE fest_id = 'YOUR_FEST_ID_HERE';
```
**Expected:** Same fields advanced as above.

---

## 6. Edge Cases

| Scenario | Expected Behaviour |
|---|---|
| Submit with total = 0 | Server action returns error; toast shows "Budget total must be greater than zero to submit." |
| Unauthenticated user | Server action throws; toast shows "Authentication required." |
| Duplicate submission (entity already UNDER_REVIEW) | Supabase UNIQUE constraint fires; toast shows the constraint error message |
| Non-numeric input in Quantity/Price | Input coerces to 0; total stays correct |
| Single item, long name | Table scrolls horizontally on small screens; no layout break |
