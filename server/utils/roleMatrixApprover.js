import { queryAll, queryOne } from "../config/database.js";
import { ROLE_CODES, isRoleAssignmentActive, normalizeRoleCode } from "./roleAccessService.js";

const ASSIGNMENT_SELECT_WITH_SCHOOL =
  "user_id,role_code,department_scope,school_scope,campus_scope,is_active,valid_from,valid_until";
const ASSIGNMENT_SELECT_LEGACY =
  "user_id,role_code,department_scope,campus_scope,is_active,valid_from,valid_until";
const APPROVER_USER_SELECT =
  "id,name,email,department,department_id,school,school_id,campus,university_role,is_hod,is_dean,is_cfo,is_finance_officer,is_finance_office";

const normalizeText = (value) => String(value || "").trim();
const normalizeScope = (value) => normalizeText(value).toLowerCase();
const normalizeEmail = (value) => normalizeText(value).toLowerCase();

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

const matchesScope = (candidate, requiredScope) => {
  if (!normalizeScope(requiredScope)) {
    return true;
  }

  return normalizeScope(candidate) === normalizeScope(requiredScope);
};

const getAssignmentScopeValue = (assignment, roleCode) => {
  const normalizedRoleCode = normalizeRoleCode(roleCode);

  if (normalizedRoleCode === ROLE_CODES.DEAN) {
    return normalizeText(assignment?.school_scope || assignment?.department_scope);
  }

  if (normalizedRoleCode === ROLE_CODES.HOD) {
    return normalizeText(assignment?.department_scope);
  }

  if (
    normalizedRoleCode === ROLE_CODES.CFO ||
    normalizedRoleCode === ROLE_CODES.ACCOUNTS ||
    normalizedRoleCode === ROLE_CODES.FINANCE_OFFICER
  ) {
    return normalizeText(assignment?.campus_scope || assignment?.department_scope);
  }

  return normalizeText(
    assignment?.department_scope || assignment?.school_scope || assignment?.campus_scope
  );
};

const isLegacyRoleMatch = (user, roleCode) => {
  const normalizedRoleCode = normalizeRoleCode(roleCode);
  const universityRole = normalizeScope(user?.university_role);

  if (normalizedRoleCode === ROLE_CODES.HOD) {
    return Boolean(user?.is_hod) || universityRole === "hod";
  }

  if (normalizedRoleCode === ROLE_CODES.DEAN) {
    return Boolean(user?.is_dean) || universityRole === "dean";
  }

  if (normalizedRoleCode === ROLE_CODES.CFO) {
    return Boolean(user?.is_cfo) || universityRole === "cfo";
  }

  if (
    normalizedRoleCode === ROLE_CODES.ACCOUNTS ||
    normalizedRoleCode === ROLE_CODES.FINANCE_OFFICER
  ) {
    return (
      Boolean(user?.is_finance_officer) ||
      Boolean(user?.is_finance_office) ||
      universityRole === "finance_officer" ||
      universityRole === "accounts"
    );
  }

  return false;
};

const normalizeApproverRecord = (user, roleCode, source) => ({
  id: user?.id ?? null,
  name: normalizeText(user?.name) || null,
  email: normalizeEmail(user?.email) || null,
  department: normalizeText(user?.department || user?.department_id) || null,
  department_id: normalizeText(user?.department_id) || null,
  school: normalizeText(user?.school || user?.school_id) || null,
  school_id: normalizeText(user?.school_id) || null,
  campus: normalizeText(user?.campus) || null,
  university_role: normalizeText(user?.university_role) || null,
  role_code: normalizeRoleCode(roleCode),
  source,
});

const resolveDepartmentSchool = async (departmentValue) => {
  const normalizedDepartment = normalizeScope(departmentValue);
  if (!normalizedDepartment) {
    return null;
  }

  try {
    const departmentRows = await queryAll("departments_courses", {
      select: "id,department_name,school",
    });

    const matchedRow = (departmentRows || []).find((row) => {
      return (
        normalizeScope(row?.id) === normalizedDepartment ||
        normalizeScope(row?.department_name) === normalizedDepartment
      );
    });

    const school = normalizeText(matchedRow?.school);
    return school || null;
  } catch (error) {
    if (isMissingRelationError(error) || isMissingColumnError(error, "school")) {
      return null;
    }

    throw error;
  }
};

const loadActiveAssignmentsForRole = async (roleCode) => {
  const normalizedRoleCode = normalizeRoleCode(roleCode);
  if (!normalizedRoleCode) {
    return { assignments: [], source: "invalid" };
  }

  try {
    const assignments = await queryAll("user_role_assignments", {
      where: {
        role_code: normalizedRoleCode,
        is_active: true,
      },
      select: ASSIGNMENT_SELECT_WITH_SCHOOL,
    });

    return {
      assignments: (assignments || []).filter((assignment) => isRoleAssignmentActive(assignment)),
      source: "matrix",
    };
  } catch (error) {
    if (isMissingRelationError(error)) {
      return { assignments: [], source: "missing_table" };
    }

    if (isMissingColumnError(error, "school_scope")) {
      const fallbackAssignments = await queryAll("user_role_assignments", {
        where: {
          role_code: normalizedRoleCode,
          is_active: true,
        },
        select: ASSIGNMENT_SELECT_LEGACY,
      });

      return {
        assignments: (fallbackAssignments || []).filter((assignment) => isRoleAssignmentActive(assignment)),
        source: "matrix_legacy",
      };
    }

    throw error;
  }
};

const resolveEffectiveScope = async ({ roleCode, department, school, campus }) => {
  const normalizedRoleCode = normalizeRoleCode(roleCode);
  const normalizedDepartment = normalizeScope(department);
  const normalizedCampus = normalizeScope(campus);
  let normalizedSchool = normalizeScope(school);

  if (normalizedRoleCode === ROLE_CODES.DEAN && !normalizedSchool && normalizedDepartment) {
    normalizedSchool = normalizeScope(await resolveDepartmentSchool(normalizedDepartment));
  }

  return {
    roleCode: normalizedRoleCode,
    department: normalizedDepartment,
    school: normalizedSchool,
    campus: normalizedCampus,
  };
};

const assignmentMatchesScope = (assignment, effectiveScope) => {
  const scopeValue = getAssignmentScopeValue(assignment, effectiveScope.roleCode);

  if (effectiveScope.roleCode === ROLE_CODES.HOD) {
    return matchesScope(scopeValue, effectiveScope.department);
  }

  if (effectiveScope.roleCode === ROLE_CODES.DEAN) {
    return matchesScope(scopeValue, effectiveScope.school);
  }

  if (
    effectiveScope.roleCode === ROLE_CODES.CFO ||
    effectiveScope.roleCode === ROLE_CODES.ACCOUNTS ||
    effectiveScope.roleCode === ROLE_CODES.FINANCE_OFFICER
  ) {
    return matchesScope(scopeValue, effectiveScope.campus);
  }

  return false;
};

const findUsersByCandidateIds = async (candidateUserIds) => {
  const approvers = [];

  for (const candidateUserId of candidateUserIds) {
    const user = await queryOne("users", {
      where: { id: candidateUserId },
      select: APPROVER_USER_SELECT,
    });

    if (user) {
      approvers.push(user);
    }
  }

  return approvers;
};

const resolveLegacyApprover = async ({ roleCode, department, school, campus, excludeEmail }) => {
  const effectiveScope = await resolveEffectiveScope({ roleCode, department, school, campus });
  const normalizedExclude = normalizeEmail(excludeEmail);

  let users;
  try {
    users = await queryAll("users", {
      select: APPROVER_USER_SELECT,
    });
  } catch (error) {
    if (isMissingRelationError(error)) {
      return null;
    }

    throw error;
  }

  const roleFiltered = (users || []).filter((user) => {
    if (!normalizeEmail(user?.email)) {
      return false;
    }

    return isLegacyRoleMatch(user, effectiveScope.roleCode);
  });

  const scopedUsers = roleFiltered.filter((user) => {
    if (normalizedExclude && normalizeEmail(user.email) === normalizedExclude) {
      return false;
    }

    if (effectiveScope.roleCode === ROLE_CODES.HOD) {
      return matchesScope(user?.department_id || user?.department, effectiveScope.department);
    }

    if (effectiveScope.roleCode === ROLE_CODES.DEAN) {
      return matchesScope(user?.school_id || user?.school, effectiveScope.school);
    }

    if (
      effectiveScope.roleCode === ROLE_CODES.CFO ||
      effectiveScope.roleCode === ROLE_CODES.ACCOUNTS ||
      effectiveScope.roleCode === ROLE_CODES.FINANCE_OFFICER
    ) {
      return matchesScope(user?.campus, effectiveScope.campus);
    }

    return false;
  });

  return scopedUsers[0] ? normalizeApproverRecord(scopedUsers[0], effectiveScope.roleCode, "legacy") : null;
};

export const hasScopedRoleAssignment = async ({ roleCode, department, school, campus }) => {
  const effectiveScope = await resolveEffectiveScope({ roleCode, department, school, campus });
  const { assignments } = await loadActiveAssignmentsForRole(effectiveScope.roleCode);

  return (assignments || []).some((assignment) => assignmentMatchesScope(assignment, effectiveScope));
};

export const resolveDepartmentSchoolForApprovals = resolveDepartmentSchool;

export const resolveRoleMatrixApprover = async ({
  roleCode,
  department,
  school,
  campus,
  excludeEmail,
}) => {
  const effectiveScope = await resolveEffectiveScope({ roleCode, department, school, campus });
  const normalizedExclude = normalizeEmail(excludeEmail);

  const { assignments, source } = await loadActiveAssignmentsForRole(effectiveScope.roleCode);
  const matchingAssignments = (assignments || []).filter((assignment) =>
    assignmentMatchesScope(assignment, effectiveScope)
  );

  const candidateUserIds = Array.from(
    new Set(
      matchingAssignments
        .map((assignment) => normalizeText(assignment?.user_id))
        .filter((userId) => userId.length > 0)
    )
  );

  if (candidateUserIds.length > 0) {
    const users = await findUsersByCandidateIds(candidateUserIds);
    const matchingUser = users.find((user) => {
      if (!user) {
        return false;
      }

      if (normalizedExclude && normalizeEmail(user.email) === normalizedExclude) {
        return false;
      }

      return true;
    });

    if (matchingUser) {
      return normalizeApproverRecord(matchingUser, effectiveScope.roleCode, source);
    }
  }

  if (source === "missing_table" || matchingAssignments.length === 0) {
    return resolveLegacyApprover({
      roleCode: effectiveScope.roleCode,
      department: effectiveScope.department,
      school: effectiveScope.school,
      campus: effectiveScope.campus,
      excludeEmail,
    });
  }

  return null;
};
