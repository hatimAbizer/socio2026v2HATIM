"use client";

import { SpinnerIcon } from "../../_shared/usePersistedDecisions";

interface AccountsApproveAndRouteButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export default function AccountsApproveAndRouteButton({
  onClick,
  disabled = false,
  isLoading = false,
}: AccountsApproveAndRouteButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
    >
      {isLoading ? <SpinnerIcon /> : null}
      Approve and Route to Logistics
    </button>
  );
}
