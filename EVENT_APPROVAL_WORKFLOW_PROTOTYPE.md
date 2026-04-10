# Event Approval Workflow Prototype (No Database)

## 1) Goal

This is a product and flow prototype only.
It is intentionally database-agnostic and can be implemented using any backend stack later.

The prototype covers:
- Budget-based approval levels (1/2/3)
- Mandatory Accounts approval (Level 4) for financial transactions
- Campus-wise configurable limits
- End-to-end process from event creation to closure and archiving

## 2) Approval Rules (Prototype)

### 2.1 Budget Levels

- Level 1 (HOD/Event Manager): budget < Rs 25,000
- Level 2 (Dean/Director): Rs 25,000 to Rs 100,000
- Level 3 (Campus Director/CFO): budget > Rs 100,000
- Level 4 (Accounts): required if financial transaction is true, regardless of budget

### 2.2 Campus Configurable Limits

Each campus has independent limits:

```json
{
  "approvalThresholdsByCampus": {
    "Bangalore Central": {
      "level1Max": 25000,
      "level2Max": 100000,
      "currency": "INR"
    },
    "Delhi NCR": {
      "level1Max": 30000,
      "level2Max": 120000,
      "currency": "INR"
    }
  }
}
```

## 3) Roles and Responsibilities

| Role | Responsibility |
|---|---|
| Event Manager (faculty/HOD) | Strategic planning, oversight, primary department-level approval |
| Event Coordinator (student/faculty) | Create/edit/cancel request, coordinate approvals, upload and reporting |
| Event Primary Volunteer | Upload attendance/photos/docs, write report, edit upload section |
| Event Secondary Volunteer | Support primary volunteers, view all event sections |
| HOD | Approve events in department |
| Dean/Director | Approve events in school |
| Campus Director/CFO | Approve high-value events in campus |
| IQAC | View events across campus/university |
| Finance/Accounts | Budget approval, advances, payments, settlement and reconciliation |
| Facility Managers | Approve venue and service requests (IT/audio/catering/etc.) |

## 4) Core Request Model (In-Memory/DTO Prototype)

```json
{
  "requestId": "REQ-2026-000145",
  "eventTitle": "Inter-Department Innovation Summit",
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
    {
      "level": 2,
      "label": "Dean/Director",
      "status": "PENDING"
    },
    {
      "level": 4,
      "label": "Accounts",
      "status": "PENDING"
    }
  ],
  "timeline": [
    {
      "at": "2026-04-10T12:30:00Z",
      "action": "REQUEST_SUBMITTED",
      "by": "coordinator@christ.edu"
    }
  ]
}
```

## 5) Prototype Logic (Pseudo Code)

```ts
type CampusConfig = {
  level1Max: number;
  level2Max: number;
  currency: string;
};

type ApprovalStep = {
  level: 1 | 2 | 3 | 4;
  label: string;
  role: string;
};

function resolveApprovalSteps(
  budgetAmount: number,
  hasFinancialTransaction: boolean,
  campusConfig: CampusConfig
): ApprovalStep[] {
  const steps: ApprovalStep[] = [];

  if (budgetAmount < campusConfig.level1Max) {
    steps.push({ level: 1, label: "Level 1", role: "HOD_EVENT_MANAGER" });
  } else if (budgetAmount <= campusConfig.level2Max) {
    steps.push({ level: 2, label: "Level 2", role: "DEAN_DIRECTOR" });
  } else {
    steps.push({ level: 3, label: "Level 3", role: "CAMPUS_DIRECTOR_CFO" });
  }

  if (hasFinancialTransaction) {
    steps.push({ level: 4, label: "Level 4", role: "ACCOUNTS" });
  }

  return steps;
}
```

## 6) Process Flow Prototype

### 6.1 Event Creation and Management

Actor: Event Coordinator

- Submit event request
- Edit event request (until final approval or rejection)
- Cancel event request
- Trigger extensions:
  - Venue approval request (if venue needed)
  - Facility/service approvals (IT/audio/catering/etc.)
  - Finance approval request

### 6.2 Approval Management

Actors: Facility Managers, HOD/Dean/CFO/Accounts

- Approve or reject request
- Add decision note
- Notify requestor after each decision
- Event Manager can send manual reminders to pending approvers

### 6.3 Registration Management

Actors: Student/Faculty/Staff/Research Scholar

- Register if event is published and registration enabled
- If fee exists, route through payment processing flow

### 6.4 Event Execution

- Finance can issue vendor advance payments
- Attendance can be uploaded by authorized volunteers/coordinator

### 6.5 Post-Event

- Collect feedback and survey data
- Generate consolidated event report
- Reconcile income/expense
- Complete settlement and close event
- Archive all event artifacts (proposal, approvals, media, finance, reports)

## 7) State Machine (Prototype)

```text
DRAFT
 -> SUBMITTED
 -> UNDER_REVIEW
 -> APPROVED
 -> IN_EXECUTION
 -> SETTLEMENT_PENDING
 -> CLOSED
 -> ARCHIVED

UNDER_REVIEW -> REJECTED
UNDER_REVIEW -> CANCELLED
SUBMITTED -> CANCELLED
```

## 8) UI/Wireframe Scope (Prototype)

### 8.1 Event Coordinator Menu

- Create Event
- Edit/Postpone/Cancel Event
- Request Facility Approvals
- Request Finance Approval
- Request Vendor Advance
- Request Final Settlement
- Upload Attendance
- Upload Photos/Videos
- Write Event Report
- Generate Consolidated Report

### 8.2 Event Manager (Department) Screens

- Approve Events (mandatory department gate)
- Track cross-department approval status
- Send manual reminders

### 8.3 Facility Manager Screens

- Approve/Reject facility requests
- Request advance payment
- Request final settlement

### 8.4 Level 1/2/3/4 Approver Screens

- View full event details (facilities, finance, guest details, attachments)
- Approve/Reject with note
- See pending queue sorted by due date/priority

## 9) Prototype API Contract (Optional)

Use this only as interface design, not implementation:

- POST /prototype/event-requests
- PATCH /prototype/event-requests/{id}
- POST /prototype/event-requests/{id}/submit
- POST /prototype/event-requests/{id}/cancel
- GET /prototype/event-requests/{id}/approvals
- POST /prototype/event-requests/{id}/approvals/{level}/decision
- POST /prototype/event-requests/{id}/facility-approvals
- POST /prototype/event-requests/{id}/finance/advance
- POST /prototype/event-requests/{id}/finance/settlement
- POST /prototype/event-requests/{id}/reports/generate

## 10) Prototype Acceptance Checklist

- Campus admin can edit approval thresholds per campus
- Approval chain is generated correctly from budget + financial flag
- Accounts approval appears whenever financial transaction is true
- Coordinator can submit/edit/cancel request
- Approval decisions trigger notifications to requestor
- Facility and finance sub-flows can proceed independently
- Event can be closed only after settlement flow completes
- Event data can be marked archived after closure

---

This document is a functional prototype blueprint only.
It avoids schema design and can be implemented in UI mocks, in-memory services, or a staged backend later.