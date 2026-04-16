"use client";

import { memo } from "react";

import { NotificationSystem } from "./NotificationSystem";

interface NotificationBellProps {
  className?: string;
}

function NotificationBellComponent({ className = "" }: NotificationBellProps) {
  return <NotificationSystem className={className} />;
}

const NotificationBell = memo(NotificationBellComponent);

export default NotificationBell;
