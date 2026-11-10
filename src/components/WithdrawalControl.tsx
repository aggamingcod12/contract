"use client";

import { useState } from "react";
import type { Agreement } from "@/lib/agreement";

export default function WithdrawalControl({
  token,
  onWithdraw,
  onError,
}: {
  token: string;
  onWithdraw: (agreement: Agreement) => void;
  onError: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  const withdraw = async () => {
    if (!window.confirm("Withdraw this agreement? It will be marked withdrawn and cannot be signed further.")) return;
    setBusy(true);
    onError("");
    try {
      const response = await fetch("/api/withdraw", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to withdraw agreement.");
      onWithdraw(data.agreement);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to withdraw agreement.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button className="withdraw-control" type="button" onClick={withdraw} disabled={busy}>
      {busy ? "Withdrawing…" : "Withdraw agreement"}
    </button>
  );
}
