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
    .toLowerCase()
    .replace(/\s+/g, " ");

const normalizeDepartmentWords = (value) =>
  normalizeDepartmentScope(value)
    .replace(/[_-]+/g, " ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const buildDepartmentScopeAliases = (value) => {
  const aliases = new Set();
  const normalizedRaw = normalizeDepartmentScope(value);
  const normalizedWords = normalizeDepartmentWords(value);

  if (normalizedRaw) {
    aliases.add(normalizedRaw);
  }

  if (normalizedWords) {
    aliases.add(normalizedWords);
  }

  const underscored = normalizedWords.replace(/\s+/g, "_");
  if (underscored) {
    aliases.add(underscored);
  }

  const withoutDepartmentPrefix = underscored
    .replace(/^department_of_/, "")
    .replace(/^department_/, "")
    .replace(/^dept_/, "")
    .trim();

  const withoutConnectors = withoutDepartmentPrefix
    .replace(/(^|_)(and|of)(?=_|$)/g, "$1")
    .replace(/__+/g, "_")
    .replace(/^_+|_+$/g, "")
    .trim();

  if (withoutDepartmentPrefix) {
    aliases.add(withoutDepartmentPrefix);
    aliases.add(`dept_${withoutDepartmentPrefix}`);
    aliases.add(`department_${withoutDepartmentPrefix}`);
    aliases.add(`department_of_${withoutDepartmentPrefix}`);
    aliases.add(withoutDepartmentPrefix.replace(/_/g, " "));
    aliases.add(`department of ${withoutDepartmentPrefix.replace(/_/g, " ")}`);
  }

  if (withoutConnectors && withoutConnectors !== withoutDepartmentPrefix) {
    aliases.add(withoutConnectors);
    aliases.add(`dept_${withoutConnectors}`);
    aliases.add(`department_${withoutConnectors}`);
    aliases.add(`department_of_${withoutConnectors}`);
    aliases.add(withoutConnectors.replace(/_/g, " "));
    aliases.add(`department of ${withoutConnectors.replace(/_/g, " ")}`);
  }

  return Array.from(aliases)
    .map((alias) => normalizeDepartmentScope(alias))
    .filter(Boolean);
};

const buildDepartmentScopeCandidates = (...values) => {
  const candidates = new Set();

  for (const value of values) {
    const aliases = buildDepartmentScopeAliases(value);
    aliases.forEach((alias) => candidates.add(alias));
  }

  return Array.from(candidates);
};

export const resolveDepartmentApproverRole = async ({ organizingDept }) => {
  const normalizedDepartmentScope = normalizeDepartmentScope(organizingDept);
  const organizingDeptCandidates = buildDepartmentScopeCandidates(organizingDept);
  const organizingDeptCandidateSet = new Set(organizingDeptCandidates);

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

  const matchedRoutingRow = (routingRows || []).find((row) => {
    const rowCandidates = buildDepartmentScopeCandidates(row?.department_scope);
    return rowCandidates.some((candidate) => organizingDeptCandidateSet.has(candidate));
  });

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

  const candidateDepartmentScopes = buildDepartmentScopeCandidates(
    matchedRoutingRow?.department_scope,
    organizingDept
  );
  const departmentScopeCandidates =
    candidateDepartmentScopes.length > 0
      ? candidateDepartmentScopes
      : [normalizedDepartmentScope];

  const schoolCache = new Map();
  const resolveSchoolForDepartmentScope = async (departmentScope) => {
    const normalizedScope = normalizeDepartmentScope(departmentScope);
    if (!normalizedScope) {
      return null;
    }

    if (schoolCache.has(normalizedScope)) {
      return schoolCache.get(normalizedScope);
    }

    const resolvedSchool = await resolveDepartmentSchoolForApprovals(normalizedScope);
    schoolCache.set(normalizedScope, resolvedSchool || null);
    return resolvedSchool || null;
  };

  let selectedDepartmentScope =
    departmentScopeCandidates[0] || normalizedDepartmentScope;
  let hasScopedAssignee = false;

  for (const departmentScopeCandidate of departmentScopeCandidates) {
    const scopedSchool =
      approverRoleCode === ROLE_CODES.DEAN
        ? await resolveSchoolForDepartmentScope(departmentScopeCandidate)
        : null;

    if (approverRoleCode === ROLE_CODES.DEAN && !scopedSchool) {
      continue;
    }

    const hasAssignee = await hasScopedRoleAssignment({
      roleCode: approverRoleCode,
      department: departmentScopeCandidate,
      school: scopedSchool,
    });

    if (hasAssignee) {
      selectedDepartmentScope = departmentScopeCandidate;
      hasScopedAssignee = true;
      break;
    }
  }

  if (approverRoleCode === ROLE_CODES.DEAN && !hasScopedAssignee) {
    const hasAnyResolvableSchool = (
      await Promise.all(
        departmentScopeCandidates.map((departmentScopeCandidate) =>
          resolveSchoolForDepartmentScope(departmentScopeCandidate)
        )
      )
    ).some(Boolean);

    if (!hasAnyResolvableSchool) {
      return {
        ok: false,
        errorMessage:
          `Unable to resolve the school for department '${organizingDept}'. Update the department-school mapping before routing Dean approvals.`,
        reason: "school_missing",
      };
    }
  }

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
    departmentScope: selectedDepartmentScope,
    routingRow: matchedRoutingRow,
  };
};
