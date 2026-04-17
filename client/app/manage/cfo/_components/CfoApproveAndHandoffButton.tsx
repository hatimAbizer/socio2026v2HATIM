"use client";

import { SpinnerIcon } from "../../_shared/usePersistedDecisions";

interface CfoApproveAndHandoffButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export default function CfoApproveAndHandoffButton({
  onClick,
  disabled = false,
  isLoading = false,
}: CfoApproveAndHandoffButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isLoading ? <SpinnerIcon /> : null}
      Approve and Send to Accounts
    </button>
  );
}
