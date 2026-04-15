import {
  LIFECYCLE_STATUS,
  normalizeLifecycleStatus,
} from "./lifecycleStatus.js";

const LIVE_LIFECYCLE_STATUSES = new Set([
  LIFECYCLE_STATUS.PUBLISHED,
  LIFECYCLE_STATUS.APPROVED,
]);

const LEGACY_TERMINAL_APPROVAL_WORKFLOW_STATUSES = new Set([
  "auto_approved",
  "fully_approved",
  "organiser_approved",
]);

const normalizeWorkflowStatus = (value, fallback = "ACTIVE") => {
  const normalized = String(value || "").trim().toUpperCase();
  return normalized || String(fallback || "").trim().toUpperCase();
};

export const parseBooleanLike = (value) => {
  if (value === true || value === 1 || value === "1") {
    return true;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return (
      normalized === "true" ||
      normalized === "yes" ||
      normalized === "on"
    );
  }

  return false;
};

const hasExplicitNotificationPreference = (value) => {
  return (
    value !== undefined &&
    value !== null &&
    String(value).trim() !== ""
  );
};

const areNotificationsEnabled = ({
  sendNotificationsInput,
  defaultSendNotifications = true,
}) => {
  if (hasExplicitNotificationPreference(sendNotificationsInput)) {
    return parseBooleanLike(sendNotificationsInput);
  }

  return Boolean(defaultSendNotifications);
};

export const hasApprovalRequestReference = (record) => {
  return String(record?.approval_request_id || "").trim().length > 0;
};

export const isLegacyTerminalApprovalWorkflowStatus = (workflowStatus) => {
  const normalizedWorkflowStatus = String(workflowStatus || "")
    .trim()
    .toLowerCase();

  if (!normalizedWorkflowStatus) {
    return false;
  }

  return LEGACY_TERMINAL_APPROVAL_WORKFLOW_STATUSES.has(normalizedWorkflowStatus);
};

export const isRecordLiveForNotifications = (record) => {
  if (!record) {
    return false;
  }

  const isDraft = parseBooleanLike(record?.is_draft);
  const lifecycleStatus = normalizeLifecycleStatus(
    record?.status,
    isDraft ? LIFECYCLE_STATUS.DRAFT : LIFECYCLE_STATUS.PUBLISHED
  );

  if (!LIVE_LIFECYCLE_STATUSES.has(lifecycleStatus)) {
    return false;
  }

  const activationState = normalizeWorkflowStatus(record?.activation_state, "ACTIVE");
  if (activationState !== "ACTIVE") {
    return false;
  }

  return true;
};

export const shouldSendLifecycleNotification = ({
  record,
  sendNotificationsInput,
  defaultSendNotifications = true,
}) => {
  const notificationsEnabled = areNotificationsEnabled({
    sendNotificationsInput,
    defaultSendNotifications,
  });

  if (!notificationsEnabled) {
    return false;
  }

  return isRecordLiveForNotifications(record);
};

export const shouldSendCreateBroadcast = ({
  record,
  sendNotificationsInput,
  defaultSendNotifications = true,
  hasApprovalRequest = false,
}) => {
  if (hasApprovalRequest) {
    return false;
  }

  return shouldSendLifecycleNotification({
    record,
    sendNotificationsInput,
    defaultSendNotifications,
  });
};

export const shouldSendPublishBroadcast = ({
  record,
  sendNotificationsInput,
  defaultSendNotifications = true,
  hasApprovalRequest = false,
  legacyWorkflowStatus,
}) => {
  if (hasApprovalRequest) {
    return false;
  }

  if (isLegacyTerminalApprovalWorkflowStatus(legacyWorkflowStatus)) {
    return false;
  }

  return shouldSendLifecycleNotification({
    record,
    sendNotificationsInput,
    defaultSendNotifications,
  });
};

export const shouldSendFinalApprovalBroadcast = ({
  record,
  sendNotificationsInput,
  defaultSendNotifications = true,
  requireLiveRecord = true,
}) => {
  const notificationsEnabled = areNotificationsEnabled({
    sendNotificationsInput,
    defaultSendNotifications,
  });

  if (!notificationsEnabled) {
    return false;
  }

  if (!requireLiveRecord) {
    return true;
  }

  return isRecordLiveForNotifications(record);
};
