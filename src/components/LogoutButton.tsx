"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/i18n/IntlProvider";

export default function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const t = useT();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button onClick={logout} disabled={loading} className={className || "btn-ghost"}>
      {loading ? t.common.loading : t.common.logout}
    </button>
  );
}
