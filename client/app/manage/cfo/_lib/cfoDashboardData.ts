import "server-only";

import { CfoApprovalQueueItem, CfoDashboardMetrics } from "../types";

type ApprovalRequestJoinRow = {
  id?: string | null;
  entity_type?: string | null;
  entity_ref?: string | null;
  organizing_dept?: string | null;
  organizing_school?: string | null;
  campus_hosted_at?: string | null;
  submitted_at?: string | null;
  created_at?: string | null;
};

type ApprovalStepQueueRow = {
  id?: string | null;
  status?: string | null;
  created_at?: string | null;
  step_code?: string | null;
  approval_requests?: ApprovalRequestJoinRow[] | ApprovalRequestJoinRow | null;
};

type BudgetJoinRow = {
  event_id?: string | null;
  total_estimated_expense?: number | string | null;
  total_actual_expense?: number | string | null;
};

type EventJoinRow = {
  event_id?: string | null;
  title?: string | null;
  event_date?: string | null;
  organizing_dept?: string | null;
  organizing_school?: string | null;
  organizer_email?: string | null;
  fest_id?: string | null;
  campus_hosted_at?: string | null;
};

type UserNameRow = {
  email?: string | null;
  name?: string | null;
};

type DepartmentLookupRow = {
  id?: string | null;
  department_name?: string | null;
  school?: string | null;
};

export interface CfoDashboardData {
  queue: CfoApprovalQueueItem[];
  metrics: CfoDashboardMetrics;
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function toRecordArray<T>(value: T[] | T | null | undefined): T[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  return [value];
}

function toSingleRecord<T>(value: T[] | T | null | undefined): T | null {
  const rows = toRecordArray(value);
  return rows[0] ?? null;
}

function deriveCoordinatorName(
  email: string | null | undefined,
  displayName: string | null | undefined
): string {
  if (displayName && displayName.trim()) {
    return displayName.trim();
  }

  if (!email || !email.includes("@")) {
    return "Coordinator";
  }

  const localPart = email.split("@")[0];
  return localPart
    .replace(/[._]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function normalizeText(value: unknown): string {
  return String(value || "").trim();
}

function toTimestamp(value: unknown): number {
  if (!value) {
    return 0;
  }

  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function getYearDateBounds(now: Date): { startDate: string; endDate: string } {
  const year = now.getUTCFullYear();
  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  };
}

function isLikelyUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function normalizeEntityType(value: unknown): string {
  return normalizeText(value).toUpperCase();
}

function isEventEntityType(value: unknown): boolean {
  const entityType = normalizeEntityType(value);
  return ["EVENT", "STANDALONE_EVENT", "FEST_CHILD_EVENT"].includes(entityType);
}

function isMissingColumnError(
  error: { code?: string | null; message?: string | null } | null | undefined,
  columnName?: string | null
): boolean {
  const code = String(error?.code || "").trim().toUpperCase();
  const message = String(error?.message || "").trim().toLowerCase();
  const normalizedColumn = String(columnName || "").trim().toLowerCase();

  if (!normalizedColumn) {
    return (
      code === "42703" ||
      code === "PGRST204" ||
      message.includes("column") ||
      message.includes("schema cache")
    );
  }

  return (
    code === "42703" ||
    code === "PGRST204" ||
    message.includes(`column \"${normalizedColumn}\"`) ||
    message.includes(`${normalizedColumn} does not exist`) ||
    (message.includes("could not find") && message.includes(normalizedColumn))
  );
}

function resolveDepartmentName(
  eventRow: EventJoinRow,
  departmentLookup: DepartmentLookupRow | null
): string {
  const directDepartment = normalizeText(eventRow.organizing_dept);
  const mappedDepartment = normalizeText(departmentLookup?.department_name);

  if (mappedDepartment) {
    return mappedDepartment;
  }

  return directDepartment || "Unknown Department";
}

function resolveSchoolName(
  eventRow: EventJoinRow,
  departmentLookup: DepartmentLookupRow | null
): string {
  const directSchool = normalizeText(eventRow.organizing_school);
  const mappedSchool = normalizeText(departmentLookup?.school);

  if (directSchool && !isLikelyUuid(directSchool)) {
    return directSchool;
  }

  if (mappedSchool) {
    return mappedSchool;
  }

  return directSchool || "Unknown School";
}

export async function fetchCfoDashboardData({
  supabase,
  campus,
  l2Threshold,
}: {
  supabase: any;
  campus?: string | null;
  l2Threshold: number;
}): Promise<CfoDashboardData> {
  const normalizedCampus = String(campus || "").trim();
  const normalizedThreshold = Number.isFinite(l2Threshold) && l2Threshold > 0 ? l2Threshold : 100000;

  const { data: budgetData, error: budgetError } = await supabase
    .from("event_budgets")
    .select("event_id,total_estimated_expense,total_actual_expense")
    .gt("total_estimated_expense", 0);

  if (budgetError) {
    throw new Error(`Failed to load CFO budget data: ${budgetError.message}`);
  }

  const budgetRows = Array.isArray(budgetData) ? (budgetData as BudgetJoinRow[]) : [];
  const budgetByEventId = new Map<string, BudgetJoinRow>();

  budgetRows.forEach((row) => {
    const eventId = normalizeText(row.event_id);
    if (!eventId) {
      return;
    }

    if (!budgetByEventId.has(eventId)) {
      budgetByEventId.set(eventId, row);
    }
  });

  if (budgetByEventId.size === 0) {
    return {
      queue: [],
      metrics: {
        campusRequestedBudgetYtd: 0,
        campusApprovedBudgetYtd: 0,
        highValuePendingRequests: 0,
        highValuePendingBudget: 0,
        l2Threshold: normalizedThreshold,
      },
    };
  }

  const pendingSelectWithSchool = `
    id,
    status,
    created_at,
    step_code,
    approval_requests!inner (
      id,
      entity_type,
      entity_ref,
      organizing_dept,
      organizing_school,
      campus_hosted_at,
      submitted_at,
      created_at
    )
  `;

  const pendingSelectLegacy = `
    id,
    status,
    created_at,
    step_code,
    approval_requests!inner (
      id,
      entity_type,
      entity_ref,
      organizing_dept,
      campus_hosted_at,
      submitted_at,
      created_at
    )
  `;

  let pendingQueryResult = await supabase
    .from("approval_steps")
    .select(pendingSelectWithSchool)
    .eq("role_code", "CFO")
    .in("step_code", ["CFO", "L3_CFO"])
    .eq("status", "PENDING")
    .order("created_at", { ascending: true });

  if (
    pendingQueryResult.error &&
    isMissingColumnError(pendingQueryResult.error, "organizing_school")
  ) {
    pendingQueryResult = await supabase
      .from("approval_steps")
      .select(pendingSelectLegacy)
      .eq("role_code", "CFO")
      .in("step_code", ["CFO", "L3_CFO"])
      .eq("status", "PENDING")
      .order("created_at", { ascending: true });
  }

  const { data: pendingStepsData, error: pendingStepsError } = pendingQueryResult;

  if (pendingStepsError) {
    throw new Error(`Failed to load CFO approvals: ${pendingStepsError.message}`);
  }

  const pendingSteps = Array.isArray(pendingStepsData)
    ? (pendingStepsData as ApprovalStepQueueRow[])
    : [];

  const pendingRequestRows = pendingSteps
    .map((row) => toSingleRecord(row.approval_requests))
    .filter((row): row is ApprovalRequestJoinRow => Boolean(row))
    .filter((requestRow) => isEventEntityType(requestRow.entity_type));

  const pendingEventIds = Array.from(
    new Set(
      pendingRequestRows
        .map((requestRow) => normalizeText(requestRow.entity_ref))
        .filter((entityRef) => entityRef.length > 0)
    )
  );

  let pendingEventsById = new Map<string, EventJoinRow>();
  if (pendingEventIds.length > 0) {
    let pendingEventsQuery = supabase
      .from("events")
      .select(
        "event_id,title,event_date,organizing_dept,organizing_school,organizer_email,fest_id,campus_hosted_at"
      )
      .in("event_id", pendingEventIds)
      .is("fest_id", null);

    if (normalizedCampus) {
      pendingEventsQuery = pendingEventsQuery.eq("campus_hosted_at", normalizedCampus);
    }

    const { data: pendingEventsData, error: pendingEventsError } = await pendingEventsQuery;

    if (pendingEventsError) {
      throw new Error(`Failed to load CFO event details: ${pendingEventsError.message}`);
    }

    const pendingEvents = Array.isArray(pendingEventsData)
      ? (pendingEventsData as EventJoinRow[])
      : [];

    pendingEventsById = new Map(
      pendingEvents
        .map((row) => [normalizeText(row.event_id), row] as const)
        .filter(([eventId]) => eventId.length > 0)
    );
  }

  const departmentIdCandidates = Array.from(
    new Set(
      Array.from(pendingEventsById.values())
        .map((row) => normalizeText(row.organizing_dept))
        .filter((value) => value.length > 0)
    )
  );

  const departmentIds = departmentIdCandidates.filter((value) => isLikelyUuid(value));
  const departmentById = new Map<string, DepartmentLookupRow>();

  if (departmentIds.length > 0) {
    const { data: departmentRows, error: departmentError } = await supabase
      .from("departments_courses")
      .select("id, department_name, school")
      .in("id", departmentIds);

    if (departmentError) {
      throw new Error(`Failed to load department references: ${departmentError.message}`);
    }

    if (Array.isArray(departmentRows)) {
      (departmentRows as DepartmentLookupRow[]).forEach((row) => {
        const id = normalizeText(row.id);
        if (!id) {
          return;
        }

        departmentById.set(id, row);
      });
    }
  }

  const organizerEmails = Array.from(
    new Set(
      Array.from(pendingEventsById.values())
        .map((row) => normalizeText(row.organizer_email).toLowerCase())
        .filter((email) => email.length > 0)
    )
  );

  let userNamesByEmail = new Map<string, string>();
  if (organizerEmails.length > 0) {
    const { data: usersData, error: usersError } = await supabase
      .from("users")
      .select("email, name")
      .in("email", organizerEmails);

    if (!usersError && Array.isArray(usersData)) {
      const userRows = usersData as UserNameRow[];
      userNamesByEmail = new Map(
        userRows
          .map((row) => [normalizeText(row.email).toLowerCase(), normalizeText(row.name)] as const)
          .filter(([email]) => email.length > 0)
      );
    }
  }

  const queue: CfoApprovalQueueItem[] = pendingSteps
    .map((stepRow) => {
      const requestRow = toSingleRecord(stepRow.approval_requests);
      if (!requestRow || !isEventEntityType(requestRow.entity_type)) {
        return null;
      }

      const eventId = normalizeText(requestRow.entity_ref);
      if (!eventId) {
        return null;
      }

      const eventRow = pendingEventsById.get(eventId);
      if (!eventRow) {
        return null;
      }

      const budgetRow = budgetByEventId.get(eventId);
      if (!budgetRow) {
        return null;
      }

      const organizerEmail = normalizeText(eventRow.organizer_email).toLowerCase();
      const departmentId =
        normalizeText(eventRow.organizing_dept) || normalizeText(requestRow.organizing_dept);
      const schoolId =
        normalizeText(eventRow.organizing_school) || normalizeText(requestRow.organizing_school);
      const departmentLookup = departmentById.get(departmentId) || null;

      return {
        id: normalizeText(requestRow.id),
        eventId,
        eventName: normalizeText(eventRow.title) || "Untitled Event",
        totalBudget: toNumber(budgetRow.total_estimated_expense),
        coordinatorName: deriveCoordinatorName(
          organizerEmail,
          organizerEmail ? userNamesByEmail.get(organizerEmail) : null
        ),
        eventDate: normalizeText(eventRow.event_date) || null,
        requestedAt:
          normalizeText(requestRow.submitted_at) ||
          normalizeText(requestRow.created_at) ||
          normalizeText(stepRow.created_at) ||
          null,
        schoolId: schoolId || resolveSchoolName(eventRow, departmentLookup),
        schoolName: resolveSchoolName(eventRow, departmentLookup),
        departmentId,
        departmentName: resolveDepartmentName(eventRow, departmentLookup),
      };
    })
    .filter(
      (row): row is CfoApprovalQueueItem => Boolean(row && row.id.length > 0 && row.eventId.length > 0)
    );

  const highValueQueue = queue.filter((row) => row.totalBudget > normalizedThreshold);
  const highValuePendingBudget = highValueQueue.reduce((sum, row) => sum + row.totalBudget, 0);

  const ytdSelectWithSchool = `
    id,
    status,
    created_at,
    step_code,
    approval_requests!inner (
      id,
      entity_type,
      entity_ref,
      organizing_school,
      campus_hosted_at,
      created_at
    )
  `;

  const ytdSelectLegacy = `
    id,
    status,
    created_at,
    step_code,
    approval_requests!inner (
      id,
      entity_type,
      entity_ref,
      campus_hosted_at,
      created_at
    )
  `;

  let ytdStepQueryResult = await supabase
    .from("approval_steps")
    .select(ytdSelectWithSchool)
    .eq("role_code", "CFO")
    .in("step_code", ["CFO", "L3_CFO"])
    .order("created_at", { ascending: false });

  if (
    ytdStepQueryResult.error &&
    isMissingColumnError(ytdStepQueryResult.error, "organizing_school")
  ) {
    ytdStepQueryResult = await supabase
      .from("approval_steps")
      .select(ytdSelectLegacy)
      .eq("role_code", "CFO")
      .in("step_code", ["CFO", "L3_CFO"])
      .order("created_at", { ascending: false });
  }

  const { data: ytdStepData, error: ytdStepError } = ytdStepQueryResult;

  if (ytdStepError) {
    throw new Error(`Failed to load CFO KPI data: ${ytdStepError.message}`);
  }

  const ytdSteps = Array.isArray(ytdStepData) ? (ytdStepData as ApprovalStepQueueRow[]) : [];

  const ytdRequestStateById = new Map<
    string,
    {
      eventId: string;
      stepStatus: string;
      timestamp: number;
    }
  >();

  ytdSteps.forEach((stepRow) => {
    const requestRow = toSingleRecord(stepRow.approval_requests);
    if (!requestRow || !isEventEntityType(requestRow.entity_type)) {
      return;
    }

    const requestId = normalizeText(requestRow.id);
    const eventId = normalizeText(requestRow.entity_ref);
    if (!requestId || !eventId || !budgetByEventId.has(eventId)) {
      return;
    }

    const timestamp = Math.max(toTimestamp(stepRow.created_at), toTimestamp(requestRow.created_at));
    const existing = ytdRequestStateById.get(requestId);

    if (!existing || timestamp >= existing.timestamp) {
      ytdRequestStateById.set(requestId, {
        eventId,
        stepStatus: normalizeText(stepRow.status).toUpperCase(),
        timestamp,
      });
    }
  });

  const { startDate, endDate } = getYearDateBounds(new Date());

  const ytdEventIds = Array.from(
    new Set(Array.from(ytdRequestStateById.values()).map((row) => row.eventId))
  );

  const ytdEligibleEventIds = new Set<string>();

  if (ytdEventIds.length > 0) {
    let ytdEventsQuery = supabase
      .from("events")
      .select("event_id,event_date,fest_id,campus_hosted_at")
      .in("event_id", ytdEventIds)
      .is("fest_id", null)
      .gte("event_date", startDate)
      .lte("event_date", endDate);

    if (normalizedCampus) {
      ytdEventsQuery = ytdEventsQuery.eq("campus_hosted_at", normalizedCampus);
    }

    const { data: ytdEventsData, error: ytdEventsError } = await ytdEventsQuery;

    if (ytdEventsError) {
      throw new Error(`Failed to load CFO KPI event details: ${ytdEventsError.message}`);
    }

    const ytdEvents = Array.isArray(ytdEventsData) ? (ytdEventsData as EventJoinRow[]) : [];
    ytdEvents.forEach((eventRow) => {
      const eventId = normalizeText(eventRow.event_id);
      if (eventId) {
        ytdEligibleEventIds.add(eventId);
      }
    });
  }

  const ytdTotals = Array.from(ytdRequestStateById.values()).reduce(
    (acc, requestState) => {
      if (!ytdEligibleEventIds.has(requestState.eventId)) {
        return acc;
      }

      const budgetRow = budgetByEventId.get(requestState.eventId) || null;
      const budgetValue = toNumber(budgetRow?.total_estimated_expense);

      acc.requested += budgetValue;
      if (requestState.stepStatus === "APPROVED") {
        acc.approved += budgetValue;
      }

      return acc;
    },
    { requested: 0, approved: 0 }
  );

  return {
    queue,
    metrics: {
      campusRequestedBudgetYtd: ytdTotals.requested,
      campusApprovedBudgetYtd: ytdTotals.approved,
      highValuePendingRequests: highValueQueue.length,
      highValuePendingBudget,
      l2Threshold: normalizedThreshold,
    },
  };
}