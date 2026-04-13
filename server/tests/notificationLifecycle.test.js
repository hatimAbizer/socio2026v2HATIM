import test from "node:test";
import assert from "node:assert/strict";
import { LIFECYCLE_STATUS } from "../utils/lifecycleStatus.js";
import {
  parseBooleanLike,
  shouldSendLifecycleNotification,
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

test("Publish notification preference accepts mixed-case truthy strings", () => {
  assert.equal(parseBooleanLike("TRUE"), true);
  assert.equal(parseBooleanLike("Yes"), true);
  assert.equal(parseBooleanLike("on"), true);
  assert.equal(parseBooleanLike("false"), false);
});
