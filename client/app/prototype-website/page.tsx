"use client";

import { useMemo, useState } from "react";
import { Fraunces, Space_Grotesk } from "next/font/google";

type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
type RequestStatus =
  | "DRAFT"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "SETTLEMENT_PENDING"
  | "CLOSED";

type ApprovalStep = {
  level: 1 | 2 | 3 | 4;
  label: string;
  roleCode: "HOD_EVENT_MANAGER" | "DEAN_DIRECTOR" | "CAMPUS_DIRECTOR_CFO" | "ACCOUNTS";
  status: ApprovalStatus;
};

type EventRequest = {
  id: string;
  title: string;
  campus: string;
  department: string;
  school: string;
  budget: number;
  hasFinancialTransaction: boolean;
  facilities: string[];
  status: RequestStatus;
  steps: ApprovalStep[];
  lastAction: string;
};

type CampusConfig = {
  level1Max: number;
  level2Max: number;
  currency: "INR";
};

const headline = Fraunces({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-fraunces",
});

const body = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
});

const campusThresholds: Record<string, CampusConfig> = {
  "Bangalore Central": { level1Max: 25000, level2Max: 100000, currency: "INR" },
  "Delhi NCR": { level1Max: 30000, level2Max: 120000, currency: "INR" },
  "Lavasa": { level1Max: 20000, level2Max: 90000, currency: "INR" },
};

const facilityOptions = [
  "Venue",
  "IT",
  "Audio",
  "Catering",
  "Security",
  "Transport",
];

function formatInr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function makeRequestId(): string {
  const randomPart = Math.floor(Math.random() * 9000) + 1000;
  return `REQ-2026-${randomPart}`;
}

function buildApprovalFlow(
  budget: number,
  hasFinancialTransaction: boolean,
  config: CampusConfig
): ApprovalStep[] {
  const steps: ApprovalStep[] = [];

  if (budget < config.level1Max) {
    steps.push({
      level: 1,
      label: "Level 1 - HOD / Event Manager",
      roleCode: "HOD_EVENT_MANAGER",
      status: "PENDING",
    });
  } else if (budget <= config.level2Max) {
    steps.push({
      level: 2,
      label: "Level 2 - Dean / Director",
      roleCode: "DEAN_DIRECTOR",
      status: "PENDING",
    });
  } else {
    steps.push({
      level: 3,
      label: "Level 3 - Campus Director / CFO",
      roleCode: "CAMPUS_DIRECTOR_CFO",
      status: "PENDING",
    });
  }

  if (hasFinancialTransaction) {
    steps.push({
      level: 4,
      label: "Level 4 - Accounts",
      roleCode: "ACCOUNTS",
      status: "PENDING",
    });
  }

  return steps;
}

function nextPendingStepIndex(steps: ApprovalStep[]): number {
  return steps.findIndex((step) => step.status === "PENDING");
}

function countByStatus(requests: EventRequest[]) {
  return {
    total: requests.length,
    underReview: requests.filter((r) => r.status === "UNDER_REVIEW").length,
    approved: requests.filter((r) => r.status === "APPROVED").length,
    rejected: requests.filter((r) => r.status === "REJECTED").length,
    closed: requests.filter((r) => r.status === "CLOSED").length,
  };
}

export default function PrototypeWebsitePage() {
  const [campus, setCampus] = useState<string>("Bangalore Central");
  const [title, setTitle] = useState<string>("Inter-Department Innovation Summit");
  const [department, setDepartment] = useState<string>("Computer Science");
  const [school, setSchool] = useState<string>("School of Sciences");
  const [budget, setBudget] = useState<number>(84000);
  const [hasFinancialTransaction, setHasFinancialTransaction] =
    useState<boolean>(true);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([
    "Venue",
    "IT",
    "Audio",
  ]);

  const [requests, setRequests] = useState<EventRequest[]>([]);

  const campusConfig = campusThresholds[campus];

  const liveFlow = useMemo(
    () => buildApprovalFlow(budget, hasFinancialTransaction, campusConfig),
    [budget, hasFinancialTransaction, campusConfig]
  );

  const dashboard = useMemo(() => countByStatus(requests), [requests]);

  const toggleFacility = (facility: string) => {
    setSelectedFacilities((prev) =>
      prev.includes(facility)
        ? prev.filter((item) => item !== facility)
        : [...prev, facility]
    );
  };

  const submitPrototypeRequest = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const flow = buildApprovalFlow(budget, hasFinancialTransaction, campusConfig);
    const newRequest: EventRequest = {
      id: makeRequestId(),
      title,
      campus,
      department,
      school,
      budget,
      hasFinancialTransaction,
      facilities: selectedFacilities,
      status: "UNDER_REVIEW",
      steps: flow,
      lastAction: "Submitted by Event Coordinator",
    };

    setRequests((prev) => [newRequest, ...prev]);
    setTitle("Prototype New Event");
    setBudget(20000);
  };

  const approveCurrentStep = (requestId: string) => {
    setRequests((prev) =>
      prev.map((request) => {
        if (request.id !== requestId || request.status !== "UNDER_REVIEW") {
          return request;
        }

        const updatedSteps = request.steps.map((step) => ({ ...step }));
        const idx = nextPendingStepIndex(updatedSteps);
        if (idx === -1) {
          return request;
        }

        updatedSteps[idx].status = "APPROVED";
        const hasPending = updatedSteps.some((step) => step.status === "PENDING");

        return {
          ...request,
          steps: updatedSteps,
          status: hasPending ? "UNDER_REVIEW" : "APPROVED",
          lastAction: hasPending
            ? `${updatedSteps[idx].label} approved`
            : "All required approvals completed",
        };
      })
    );
  };

  const rejectCurrentStep = (requestId: string) => {
    setRequests((prev) =>
      prev.map((request) => {
        if (request.id !== requestId || request.status !== "UNDER_REVIEW") {
          return request;
        }

        const updatedSteps = request.steps.map((step) => ({ ...step }));
        const idx = nextPendingStepIndex(updatedSteps);
        if (idx === -1) {
          return request;
        }

        updatedSteps[idx].status = "REJECTED";

        return {
          ...request,
          steps: updatedSteps,
          status: "REJECTED",
          lastAction: `${updatedSteps[idx].label} rejected the request`,
        };
      })
    );
  };

  const moveToSettlement = (requestId: string) => {
    setRequests((prev) =>
      prev.map((request) =>
        request.id === requestId && request.status === "APPROVED"
          ? {
              ...request,
              status: "SETTLEMENT_PENDING",
              lastAction: "Moved to finance settlement",
            }
          : request
      )
    );
  };

  const closeAndArchive = (requestId: string) => {
    setRequests((prev) =>
      prev.map((request) =>
        request.id === requestId && request.status === "SETTLEMENT_PENDING"
          ? {
              ...request,
              status: "CLOSED",
              lastAction: "Event closed and archived",
            }
          : request
      )
    );
  };

  return (
    <main className={`${headline.variable} ${body.variable} proto-page`}>
      <div className="backdrop-grid" aria-hidden="true" />

      <section className="hero reveal">
        <p className="kicker">SOCIO Prototype Website</p>
        <h1>Event Approval Studio</h1>
        <p className="intro">
          Interactive prototype for campus event approvals with configurable budget
          thresholds, mandatory accounts validation, and closure workflow.
        </p>
        <div className="threshold-row">
          <span>{campus}</span>
          <span>Level 1: below {formatInr(campusConfig.level1Max)}</span>
          <span>
            Level 2: {formatInr(campusConfig.level1Max)} to {formatInr(campusConfig.level2Max)}
          </span>
          <span>Level 3: above {formatInr(campusConfig.level2Max)}</span>
        </div>
      </section>

      <section className="grid-2">
        <article className="panel reveal">
          <h2>Create Event Request</h2>
          <form onSubmit={submitPrototypeRequest} className="form-stack">
            <label>
              Event Title
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter event title"
                required
              />
            </label>

            <div className="form-row">
              <label>
                Campus
                <select value={campus} onChange={(e) => setCampus(e.target.value)}>
                  {Object.keys(campusThresholds).map((campusName) => (
                    <option key={campusName} value={campusName}>
                      {campusName}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Budget (INR)
                <input
                  type="number"
                  min={0}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value) || 0)}
                  required
                />
              </label>
            </div>

            <div className="form-row">
              <label>
                Department
                <input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  required
                />
              </label>

              <label>
                School
                <input
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  required
                />
              </label>
            </div>

            <label className="switch-row">
              <input
                type="checkbox"
                checked={hasFinancialTransaction}
                onChange={(e) => setHasFinancialTransaction(e.target.checked)}
              />
              Event has financial transaction (adds mandatory Level 4 Accounts)
            </label>

            <div>
              <p className="sub-label">Facility requests</p>
              <div className="chips">
                {facilityOptions.map((facility) => {
                  const active = selectedFacilities.includes(facility);
                  return (
                    <button
                      type="button"
                      key={facility}
                      onClick={() => toggleFacility(facility)}
                      className={active ? "chip chip-active" : "chip"}
                    >
                      {facility}
                    </button>
                  );
                })}
              </div>
            </div>

            <button className="cta" type="submit">
              Submit Prototype Request
            </button>
          </form>
        </article>

        <article className="panel reveal delay-1">
          <h2>Live Approval Engine</h2>
          <p className="muted">
            This preview changes as budget, campus, and financial flag are updated.
          </p>

          <div className="flow">
            {liveFlow.map((step) => (
              <div key={step.level} className="flow-item">
                <div className="bubble">L{step.level}</div>
                <div>
                  <p className="flow-label">{step.label}</p>
                  <p className="flow-role">Role: {step.roleCode}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rule-box">
            <h3>Applied Rules</h3>
            <ul>
              <li>Budget below threshold 1 triggers Level 1.</li>
              <li>Budget between threshold 1 and 2 triggers Level 2.</li>
              <li>Budget above threshold 2 triggers Level 3.</li>
              <li>Financial transaction always appends Level 4 Accounts.</li>
            </ul>
          </div>
        </article>
      </section>

      <section className="grid-2">
        <article className="panel reveal">
          <h2>Approver Workbench</h2>
          {requests.length === 0 ? (
            <p className="empty">No requests yet. Submit one from the form above.</p>
          ) : (
            <div className="request-list">
              {requests.map((request) => {
                const currentPending = request.steps.find(
                  (step) => step.status === "PENDING"
                );

                return (
                  <div key={request.id} className="request-card">
                    <div className="request-head">
                      <div>
                        <p className="req-id">{request.id}</p>
                        <h3>{request.title}</h3>
                        <p className="meta">
                          {request.department} - {request.school} - {request.campus}
                        </p>
                      </div>
                      <span className={`status status-${request.status.toLowerCase()}`}>
                        {request.status.replace("_", " ")}
                      </span>
                    </div>

                    <div className="step-row">
                      {request.steps.map((step) => (
                        <span
                          key={`${request.id}-${step.level}`}
                          className={`step-badge step-${step.status.toLowerCase()}`}
                        >
                          L{step.level}: {step.status}
                        </span>
                      ))}
                    </div>

                    <p className="meta">Budget: {formatInr(request.budget)}</p>
                    <p className="meta">Latest: {request.lastAction}</p>

                    {request.status === "UNDER_REVIEW" && currentPending ? (
                      <div className="actions">
                        <button onClick={() => approveCurrentStep(request.id)}>
                          Approve {currentPending.label}
                        </button>
                        <button
                          className="danger"
                          onClick={() => rejectCurrentStep(request.id)}
                        >
                          Reject {currentPending.label}
                        </button>
                      </div>
                    ) : null}

                    {request.status === "APPROVED" ? (
                      <div className="actions">
                        <button onClick={() => moveToSettlement(request.id)}>
                          Move to Settlement
                        </button>
                      </div>
                    ) : null}

                    {request.status === "SETTLEMENT_PENDING" ? (
                      <div className="actions">
                        <button onClick={() => closeAndArchive(request.id)}>
                          Close and Archive Event
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </article>

        <article className="panel reveal delay-1">
          <h2>Dashboard Snapshot</h2>
          <div className="stat-grid">
            <div className="stat-card">
              <p>Total</p>
              <strong>{dashboard.total}</strong>
            </div>
            <div className="stat-card">
              <p>Under Review</p>
              <strong>{dashboard.underReview}</strong>
            </div>
            <div className="stat-card">
              <p>Approved</p>
              <strong>{dashboard.approved}</strong>
            </div>
            <div className="stat-card">
              <p>Rejected</p>
              <strong>{dashboard.rejected}</strong>
            </div>
            <div className="stat-card">
              <p>Closed</p>
              <strong>{dashboard.closed}</strong>
            </div>
          </div>

          <div className="rule-box">
            <h3>Prototype Scope Included</h3>
            <ul>
              <li>Create, review, approve, reject, settle, close lifecycle</li>
              <li>Campus-configurable budget thresholds</li>
              <li>Mandatory Level 4 Accounts logic</li>
              <li>Facility request capture</li>
              <li>Coordinator and approver experience in one page</li>
            </ul>
          </div>
        </article>
      </section>

      <style jsx>{`
        .proto-page {
          --ink: #0f2c3e;
          --accent: #f18f01;
          --accent-soft: #ffd085;
          --sea: #0e6e8b;
          --leaf: #2b9348;
          --paper: #fffdf7;
          --line: rgba(15, 44, 62, 0.15);

          min-height: 100vh;
          padding: 2.2rem 1.1rem 3.5rem;
          color: var(--ink);
          background:
            radial-gradient(circle at 15% 10%, rgba(241, 143, 1, 0.18) 0, transparent 28%),
            radial-gradient(circle at 85% 5%, rgba(14, 110, 139, 0.2) 0, transparent 30%),
            linear-gradient(180deg, #fff7ea 0%, #f7fbff 38%, #f8fffb 100%);
          font-family: var(--font-space-grotesk), system-ui, sans-serif;
          position: relative;
          overflow: hidden;
        }

        .backdrop-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(to right, rgba(15, 44, 62, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(15, 44, 62, 0.04) 1px, transparent 1px);
          background-size: 30px 30px;
          pointer-events: none;
          mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.6), transparent 75%);
          z-index: 0;
        }

        section,
        article {
          position: relative;
          z-index: 1;
        }

        .hero {
          max-width: 1100px;
          margin: 0 auto 1.2rem;
          background: linear-gradient(110deg, rgba(14, 110, 139, 0.12), rgba(241, 143, 1, 0.12));
          border: 1px solid var(--line);
          border-radius: 24px;
          padding: 1.3rem 1.2rem;
          box-shadow: 0 14px 40px rgba(15, 44, 62, 0.08);
        }

        .kicker {
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-size: 0.72rem;
          color: var(--sea);
          margin: 0 0 0.35rem;
        }

        h1 {
          margin: 0;
          font-family: var(--font-fraunces), Georgia, serif;
          font-size: clamp(1.8rem, 4vw, 3rem);
          line-height: 1.05;
        }

        .intro {
          margin: 0.65rem 0 0;
          max-width: 68ch;
          line-height: 1.5;
        }

        .threshold-row {
          margin-top: 0.95rem;
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
        }

        .threshold-row span {
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid var(--line);
          border-radius: 999px;
          padding: 0.33rem 0.68rem;
          font-size: 0.83rem;
        }

        .grid-2 {
          max-width: 1100px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }

        .panel {
          border: 1px solid var(--line);
          border-radius: 20px;
          padding: 1rem;
          background: color-mix(in srgb, var(--paper) 92%, white 8%);
          box-shadow: 0 10px 30px rgba(15, 44, 62, 0.07);
          backdrop-filter: blur(3px);
        }

        h2 {
          margin: 0 0 0.7rem;
          font-family: var(--font-fraunces), Georgia, serif;
          font-size: 1.35rem;
        }

        h3 {
          margin: 0;
          font-size: 1rem;
        }

        .form-stack {
          display: flex;
          flex-direction: column;
          gap: 0.78rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.78rem;
        }

        label {
          display: grid;
          gap: 0.35rem;
          font-size: 0.88rem;
          font-weight: 600;
        }

        input,
        select {
          border: 1px solid rgba(15, 44, 62, 0.22);
          border-radius: 12px;
          padding: 0.62rem 0.72rem;
          font-size: 0.95rem;
          background: white;
          color: var(--ink);
        }

        input:focus,
        select:focus {
          outline: 2px solid rgba(14, 110, 139, 0.32);
          outline-offset: 1px;
        }

        .switch-row {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          font-weight: 500;
        }

        .switch-row input {
          width: 18px;
          height: 18px;
          accent-color: var(--sea);
        }

        .sub-label {
          margin: 0 0 0.42rem;
          font-size: 0.88rem;
          font-weight: 600;
        }

        .chips {
          display: flex;
          gap: 0.45rem;
          flex-wrap: wrap;
        }

        .chip {
          border: 1px solid rgba(15, 44, 62, 0.24);
          background: white;
          border-radius: 999px;
          padding: 0.38rem 0.62rem;
          font-size: 0.82rem;
          cursor: pointer;
        }

        .chip-active {
          border-color: var(--sea);
          background: rgba(14, 110, 139, 0.12);
          color: #0b4d61;
        }

        .cta {
          border: none;
          border-radius: 14px;
          background: linear-gradient(120deg, var(--sea), #1579a8);
          color: white;
          padding: 0.72rem 0.95rem;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 180ms ease;
        }

        .cta:hover {
          transform: translateY(-1px);
        }

        .muted {
          margin: 0 0 0.7rem;
          color: rgba(15, 44, 62, 0.77);
          font-size: 0.93rem;
        }

        .flow {
          display: grid;
          gap: 0.58rem;
          margin: 0 0 0.8rem;
        }

        .flow-item {
          display: flex;
          gap: 0.64rem;
          align-items: center;
          border: 1px dashed rgba(15, 44, 62, 0.22);
          border-radius: 14px;
          background: white;
          padding: 0.6rem;
        }

        .bubble {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(140deg, var(--accent), #ffc34d);
          color: #603600;
          display: grid;
          place-items: center;
          font-weight: 800;
          font-size: 0.88rem;
          flex: 0 0 auto;
        }

        .flow-label {
          margin: 0;
          font-weight: 700;
          font-size: 0.95rem;
        }

        .flow-role {
          margin: 0.12rem 0 0;
          font-size: 0.84rem;
          color: rgba(15, 44, 62, 0.76);
        }

        .rule-box {
          border-radius: 14px;
          border: 1px solid rgba(15, 44, 62, 0.16);
          background: linear-gradient(170deg, rgba(255, 208, 133, 0.18), rgba(43, 147, 72, 0.12));
          padding: 0.7rem 0.82rem;
        }

        .rule-box h3 {
          margin: 0 0 0.35rem;
        }

        .rule-box ul {
          margin: 0;
          padding-left: 1.12rem;
          font-size: 0.9rem;
          line-height: 1.45;
        }

        .empty {
          margin: 0;
          padding: 0.72rem;
          border-radius: 12px;
          background: white;
          border: 1px dashed rgba(15, 44, 62, 0.28);
          font-size: 0.92rem;
        }

        .request-list {
          display: grid;
          gap: 0.75rem;
        }

        .request-card {
          border: 1px solid rgba(15, 44, 62, 0.16);
          border-radius: 16px;
          background: white;
          padding: 0.72rem;
        }

        .request-head {
          display: flex;
          justify-content: space-between;
          gap: 0.6rem;
        }

        .req-id {
          margin: 0;
          font-size: 0.74rem;
          color: rgba(15, 44, 62, 0.72);
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .meta {
          margin: 0.28rem 0 0;
          color: rgba(15, 44, 62, 0.78);
          font-size: 0.84rem;
        }

        .status {
          display: inline-flex;
          align-items: center;
          white-space: nowrap;
          padding: 0.28rem 0.56rem;
          border-radius: 999px;
          height: fit-content;
          font-size: 0.74rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .status-under_review {
          background: rgba(14, 110, 139, 0.14);
          color: #0f5f77;
        }

        .status-approved {
          background: rgba(43, 147, 72, 0.16);
          color: #1f6d35;
        }

        .status-rejected {
          background: rgba(194, 70, 77, 0.16);
          color: #8b2630;
        }

        .status-settlement_pending {
          background: rgba(241, 143, 1, 0.16);
          color: #7e4e00;
        }

        .status-closed {
          background: rgba(15, 44, 62, 0.13);
          color: #1b3b51;
        }

        .step-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
          margin-top: 0.55rem;
        }

        .step-badge {
          border-radius: 999px;
          border: 1px solid rgba(15, 44, 62, 0.2);
          padding: 0.23rem 0.48rem;
          font-size: 0.75rem;
          font-weight: 700;
        }

        .step-pending {
          background: rgba(241, 143, 1, 0.12);
          color: #7c4a00;
        }

        .step-approved {
          background: rgba(43, 147, 72, 0.14);
          color: #215c31;
        }

        .step-rejected {
          background: rgba(194, 70, 77, 0.14);
          color: #8b2630;
        }

        .actions {
          margin-top: 0.62rem;
          display: flex;
          gap: 0.45rem;
          flex-wrap: wrap;
        }

        .actions button {
          border: 1px solid rgba(15, 44, 62, 0.25);
          border-radius: 10px;
          background: white;
          color: var(--ink);
          padding: 0.45rem 0.62rem;
          font-weight: 700;
          font-size: 0.82rem;
          cursor: pointer;
        }

        .actions button:hover {
          background: #f4f8fa;
        }

        .actions .danger {
          border-color: rgba(194, 70, 77, 0.45);
          color: #8f2f34;
          background: rgba(194, 70, 77, 0.07);
        }

        .stat-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.55rem;
          margin-bottom: 0.8rem;
        }

        .stat-card {
          border: 1px solid rgba(15, 44, 62, 0.18);
          border-radius: 14px;
          padding: 0.58rem 0.62rem;
          background: white;
        }

        .stat-card p {
          margin: 0;
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: rgba(15, 44, 62, 0.7);
        }

        .stat-card strong {
          font-size: 1.25rem;
          line-height: 1.1;
        }

        .reveal {
          animation: riseIn 520ms ease both;
        }

        .delay-1 {
          animation-delay: 120ms;
        }

        @keyframes riseIn {
          from {
            transform: translateY(10px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @media (min-width: 860px) {
          .proto-page {
            padding: 2.8rem 1.8rem 4rem;
          }

          .hero,
          .grid-2 {
            margin-bottom: 1.2rem;
          }

          .grid-2 {
            grid-template-columns: 1fr 1fr;
          }

          .form-row {
            grid-template-columns: 1fr 1fr;
          }

          .panel {
            padding: 1.15rem;
          }

          .stat-grid {
            grid-template-columns: repeat(5, minmax(0, 1fr));
          }
        }
      `}</style>
    </main>
  );
}
