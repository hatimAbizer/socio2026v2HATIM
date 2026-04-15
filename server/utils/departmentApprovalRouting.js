import { queryAll } from "../config/database.js";
import { ROLE_CODES, normalizeRoleCode } from "./roleAccessService.js";
import {
  hasScopedRoleAssignment,
  resolveDepartmentSchoolForApprovals,
} from "./roleMatrixApprover.js";

const SUPPORTED_PRIMARY_APPROVER_ROLES = new Set([ROLE_CODES.HOD, ROLE_CODES.DEAN]);

const isMissingRelationError = (error) => {
  const code = String(error?.code || "").toUpperCase();
  const message = String(error?.message || "").toLowerCase();

  return (
    code === "42P01" ||
    code === "PGRST205" ||
    (message.includes("relation") && message.includes("does not exist")) ||
    (message.includes("could not find") && message.includes("schema cache"))
  );
};

const isMissingColumnError = (error, columnName) => {
  const code = String(error?.code || "").toUpperCase();
  const message = String(error?.message || "").toLowerCase();
  const normalizedColumn = String(columnName || "").toLowerCase();

  if (!normalizedColumn) {
    return false;
  }

  return (
    code === "42703" ||
    code === "PGRST204" ||
    message.includes(`column \"${normalizedColumn}\"`) ||
    message.includes(`${normalizedColumn} does not exist`) ||
    (message.includes("could not find") && message.includes(normalizedColumn))
  );
};

export const normalizeDepartmentScope = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

export const resolveDepartmentApproverRole = async ({ organizingDept }) => {
  const normalizedDepartmentScope = normalizeDepartmentScope(organizingDept);

  if (!normalizedDepartmentScope) {
    return {
      ok: false,
      errorMessage: "Organizing department is required for approval routing.",
      reason: "missing_department",
    };
  }

  let routingRows;
  try {
    routingRows = await queryAll("department_approval_routing", {
      where: { is_active: true },
      order: { column: "created_at", ascending: true },
    });
  } catch (error) {
    if (isMissingRelationError(error) || isMissingColumnError(error, "department_scope")) {
      return {
        ok: false,
        errorMessage:
          "Department approval routing is not configured yet. Run migration 018_department_approval_routing.sql.",
        reason: "routing_table_missing",
      };
    }

    throw error;
  }

  const matchedRoutingRow = (routingRows || []).find(
    (row) => normalizeDepartmentScope(row?.department_scope) === normalizedDepartmentScope
  );

  if (!matchedRoutingRow) {
    return {
      ok: false,
      errorMessage:
        `No active approver routing is configured for department '${organizingDept}'. Contact admin.`,
      reason: "routing_missing",
    };
  }

  const approverRoleCode = normalizeRoleCode(matchedRoutingRow.approver_role_code);

  if (!SUPPORTED_PRIMARY_APPROVER_ROLES.has(approverRoleCode)) {
    return {
      ok: false,
      errorMessage:
        `Unsupported approver role '${matchedRoutingRow.approver_role_code}' for department '${organizingDept}'.`,
      reason: "invalid_role",
    };
  }

  const resolvedSchoolScope =
    approverRoleCode === ROLE_CODES.DEAN
      ? await resolveDepartmentSchoolForApprovals(normalizedDepartmentScope)
      : null;

  if (approverRoleCode === ROLE_CODES.DEAN && !resolvedSchoolScope) {
    return {
      ok: false,
      errorMessage:
        `Unable to resolve the school for department '${organizingDept}'. Update the department-school mapping before routing Dean approvals.`,
      reason: "school_missing",
    };
  }

  const hasScopedAssignee = await hasScopedRoleAssignment({
    roleCode: approverRoleCode,
    department: normalizedDepartmentScope,
    school: resolvedSchoolScope,
  });

  if (!hasScopedAssignee) {
    return {
      ok: false,
      errorMessage:
        approverRoleCode === ROLE_CODES.DEAN
          ? `No active Dean assignee is mapped to the school for department '${organizingDept}'. Contact admin.`
          : `No active ${approverRoleCode} assignee is mapped to department '${organizingDept}'. Contact admin.`,
      reason: "assignee_missing",
    };
  }

  return {
    ok: true,
    approverRoleCode,
    departmentScope: normalizedDepartmentScope,
    routingRow: matchedRoutingRow,
  };
};
