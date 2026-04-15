import test from "node:test";
import assert from "node:assert/strict";
import { LIFECYCLE_STATUS } from "../utils/lifecycleStatus.js";
import {
  hasApprovalRequestReference,
  isLegacyTerminalApprovalWorkflowStatus,
  isRecordLiveForNotifications,
  parseBooleanLike,
  shouldSendCreateBroadcast,
  shouldSendFinalApprovalBroadcast,
  shouldSendLifecycleNotification,
  shouldSendPublishBroadcast,
} from "../utils/notificationLifecycle.js";

test("Create as draft -> no notification", () => {
  const shouldSend = shouldSendLifecycleNotification({
    record: {
      is_draft: true,
      activation_state: "ACTIVE",
      status: LIFECYCLE_STATUS.DRAFT,
    },
    sendNotificationsInput: true,
  });

  assert.equal(shouldSend, false);
});

test("Submit for approval (pending) -> no notification", () => {
  const shouldSend = shouldSendLifecycleNotification({
    record: {
      is_draft: false,
      activation_state: "PENDING",
      status: LIFECYCLE_STATUS.PENDING_APPROVALS,
    },
    sendNotificationsInput: true,
  });

  assert.equal(shouldSend, false);
});

test("Publish after approvals complete -> notification sent", () => {
  const shouldSend = shouldSendLifecycleNotification({
    record: {
      is_draft: false,
      activation_state: "ACTIVE",
      status: LIFECYCLE_STATUS.PUBLISHED,
    },
    sendNotificationsInput: true,
  });

  assert.equal(shouldSend, true);
});

test("Public visibility blocks draft event", () => {
  const isVisible = isRecordLiveForNotifications({
    is_draft: true,
    activation_state: "ACTIVE",
    status: LIFECYCLE_STATUS.DRAFT,
  });

  assert.equal(isVisible, false);
});

test("Public visibility blocks pending approval event", () => {
  const isVisible = isRecordLiveForNotifications({
    is_draft: false,
    activation_state: "PENDING",
    status: LIFECYCLE_STATUS.PENDING_APPROVALS,
  });

  assert.equal(isVisible, false);
});

test("Public visibility allows approved event", () => {
  const isVisible = isRecordLiveForNotifications({
    is_draft: false,
    activation_state: "ACTIVE",
    status: LIFECYCLE_STATUS.APPROVED,
  });

  assert.equal(isVisible, true);
});

test("Approved status is visible even if legacy is_draft flag is stale", () => {
  const isVisible = isRecordLiveForNotifications({
    is_draft: true,
    activation_state: "ACTIVE",
    status: LIFECYCLE_STATUS.APPROVED,
  });

  assert.equal(isVisible, true);
});

test("Publish notification preference accepts mixed-case truthy strings", () => {
  assert.equal(parseBooleanLike("TRUE"), true);
  assert.equal(parseBooleanLike("Yes"), true);
  assert.equal(parseBooleanLike("on"), true);
  assert.equal(parseBooleanLike("false"), false);
});

test("Create broadcast is skipped when approval request exists", () => {
  const shouldSend = shouldSendCreateBroadcast({
    record: {
      is_draft: false,
      activation_state: "ACTIVE",
      status: LIFECYCLE_STATUS.PUBLISHED,
    },
    sendNotificationsInput: true,
    hasApprovalRequest: true,
  });

  assert.equal(shouldSend, false);
});

test("Create broadcast is allowed for live auto-approved record", () => {
  const shouldSend = shouldSendCreateBroadcast({
    record: {
      is_draft: false,
      activation_state: "ACTIVE",
      status: LIFECYCLE_STATUS.PUBLISHED,
    },
    sendNotificationsInput: true,
    hasApprovalRequest: false,
  });

  assert.equal(shouldSend, true);
});

test("Publish broadcast is skipped for approval-driven records", () => {
  const shouldSend = shouldSendPublishBroadcast({
    record: {
      is_draft: false,
      activation_state: "ACTIVE",
      status: LIFECYCLE_STATUS.PUBLISHED,
      approval_request_id: "req-123",
    },
    sendNotificationsInput: true,
    hasApprovalRequest: true,
  });

  assert.equal(shouldSend, false);
});

test("Publish broadcast is skipped for legacy terminal approval status", () => {
  const shouldSend = shouldSendPublishBroadcast({
    record: {
      is_draft: false,
      activation_state: "ACTIVE",
      status: LIFECYCLE_STATUS.PUBLISHED,
    },
    sendNotificationsInput: true,
    hasApprovalRequest: false,
    legacyWorkflowStatus: "fully_approved",
  });

  assert.equal(shouldSend, false);
});

test("Publish broadcast is allowed for live non-approval publish", () => {
  const shouldSend = shouldSendPublishBroadcast({
    record: {
      is_draft: false,
      activation_state: "ACTIVE",
      status: LIFECYCLE_STATUS.PUBLISHED,
    },
    sendNotificationsInput: true,
    hasApprovalRequest: false,
    legacyWorkflowStatus: "draft",
  });

  assert.equal(shouldSend, true);
});

test("Final approval broadcast can bypass live check when required", () => {
  const shouldSend = shouldSendFinalApprovalBroadcast({
    record: {
      is_draft: true,
      activation_state: "PENDING",
      status: LIFECYCLE_STATUS.DRAFT,
    },
    defaultSendNotifications: true,
    requireLiveRecord: false,
  });

  assert.equal(shouldSend, true);
});

test("Approval request reference helper detects non-empty id", () => {
  assert.equal(hasApprovalRequestReference({ approval_request_id: "abc" }), true);
  assert.equal(hasApprovalRequestReference({ approval_request_id: "" }), false);
  assert.equal(hasApprovalRequestReference({}), false);
});

test("Legacy terminal status helper identifies approval-terminal statuses", () => {
  assert.equal(isLegacyTerminalApprovalWorkflowStatus("fully_approved"), true);
  assert.equal(isLegacyTerminalApprovalWorkflowStatus("auto_approved"), true);
  assert.equal(isLegacyTerminalApprovalWorkflowStatus("organiser_approved"), true);
  assert.equal(isLegacyTerminalApprovalWorkflowStatus("pending_hod"), false);
});
