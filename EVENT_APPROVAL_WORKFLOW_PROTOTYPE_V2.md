# Event Approval Workflow Prototype (No Database)

## Purpose

This is a functional prototype document only.
It does not define database schema or migrations.

## 1) Approval Logic

### Budget-based approval levels

- Level 1: HOD/Event Manager for budget below Rs 25,000
- Level 2: Dean/Director for budget from Rs 25,000 to Rs 100,000
- Level 3: Campus Director/CFO for budget above Rs 100,000
- Level 4: Accounts is mandatory when the event has financial transactions, regardless of budget

### Campus-wise configurable thresholds

Each campus can override limits:

```json
{
  "campusThresholds": {
    "Bangalore Central": { "level1Max": 25000, "level2Max": 100000, "currency": "INR" },
    "Delhi NCR": { "level1Max": 30000, "level2Max": 120000, "currency": "INR" }
  }
}
```

## 2) Users and Responsibilities

| Role | Responsibility |
|---|---|
| Event Coordinator | Create, edit, postpone, cancel event requests; initiate approvals |
| Event Manager / HOD | Strategic oversight and department-level approval |
| Primary Volunteer | Upload attendance, files, photos/videos, report; edit upload sections |
| Secondary Volunteer | View access and support uploads |
| Dean / Director | School-level approvals |
| Campus Director / CFO | Campus-level high-budget approvals |
| Finance / Accounts | Budget review, advance release, settlement, reconciliation |
| Facility Managers | Venue and service approvals (IT, audio, catering, etc.) |
| IQAC | View events at campus/university scope |

## 3) Prototype Request Object

```json
{
  "requestId": "REQ-2026-000201",
  "eventTitle": "Innovation Expo",
  "campus": "Bangalore Central",
  "department": "Computer Science",
  "school": "School of Sciences",
  "createdBy": "coordinator@christ.edu",
  "estimatedBudget": 84000,
  "hasFinancialTransaction": true,
  "needsVenueApproval": true,
  "needsFacilityApprovals": ["it", "audio", "catering"],
  "status": "UNDER_REVIEW",
  "approvalSteps": [
    { "level": 2, "label": "Dean/Director", "status": "PENDING" },
    { "level": 4, "label": "Accounts", "status": "PENDING" }
  ]
}
```

## 4) Pseudo Logic

```ts
type CampusConfig = { level1Max: number; level2Max: number; currency: string };

type ApprovalStep = {
  level: 1 | 2 | 3 | 4;
  role: "HOD_EVENT_MANAGER" | "DEAN_DIRECTOR" | "CAMPUS_DIRECTOR_CFO" | "ACCOUNTS";
};

function buildApprovalFlow(
  budget: number,
  hasFinancialTransaction: boolean,
  campusConfig: CampusConfig
): ApprovalStep[] {
  const steps: ApprovalStep[] = [];

  if (budget < campusConfig.level1Max) {
    steps.push({ level: 1, role: "HOD_EVENT_MANAGER" });
  } else if (budget <= campusConfig.level2Max) {
    steps.push({ level: 2, role: "DEAN_DIRECTOR" });
  } else {
    steps.push({ level: 3, role: "CAMPUS_DIRECTOR_CFO" });
  }

  if (hasFinancialTransaction) {
    steps.push({ level: 4, role: "ACCOUNTS" });
  }

  return steps;
}
```

## 5) Process Flow

### Event creation and management

- Event Coordinator submits event request
- Coordinator can edit request before final approval/rejection
- Coordinator can cancel request with reason
- Extensions:
  - Venue approval if venue needed
  - Facility approvals (IT/audio/catering/security/transport)
  - Finance approval when needed

### Approval handling

- Approvers can approve/reject with notes
- Event Manager can send manual reminders to pending approvers
- Requestor gets notification for each decision

### Registration

- Participants register when event is published and registration is enabled
- Fee events trigger payment flow

### Execution

- Finance can release vendor advance
- Attendance upload by authorized users

### Post-event

- Feedback/surveys captured
- Consolidated report generated
- Financial reconciliation and final settlement
- Formal closure and archiving

## 6) State Model

```text
DRAFT -> SUBMITTED -> UNDER_REVIEW -> APPROVED -> IN_EXECUTION -> SETTLEMENT_PENDING -> CLOSED -> ARCHIVED
UNDER_REVIEW -> REJECTED
SUBMITTED -> CANCELLED
UNDER_REVIEW -> CANCELLED
```

## 7) UI Scope (Wireframe-ready)

### Event Coordinator menus

- Create event
- Edit/Postpone/Cancel event
- Request all facility approvals
- Request finance approval
- Request vendor advance
- Request final settlement
- Upload attendance
- Upload photos/videos
- Write report
- Generate consolidated report

### Event Manager screens

- Approve events (department gate)
- Track approval status across all approvers
- Send reminders

### Facility manager screens

- Approve/Reject facility request
- Raise advance request
- Raise final settlement request

### Level approver screens

- View event details including facilities and finance
- Approve/Reject with comments
- Pending queue view

## 8) Optional Prototype API Endpoints

- POST /prototype/event-requests
- PATCH /prototype/event-requests/{id}
- POST /prototype/event-requests/{id}/submit
- POST /prototype/event-requests/{id}/cancel
- GET /prototype/event-requests/{id}/approval-flow
- POST /prototype/event-requests/{id}/approvals/{level}/decision
- POST /prototype/event-requests/{id}/facility-requests
- POST /prototype/event-requests/{id}/finance/advance
- POST /prototype/event-requests/{id}/finance/settlement
- POST /prototype/event-requests/{id}/reports/generate

## 9) Acceptance Checklist

- Campus thresholds are configurable independently
- Correct level (1/2/3) is selected from budget amount
- Accounts step appears whenever financial transaction is true
- Coordinator can create/edit/cancel requests
- Approvals produce notifications
- Facility and finance flows can run in parallel
- Event can be closed only after settlement workflow
- Closed event can be archived with complete artifact set
