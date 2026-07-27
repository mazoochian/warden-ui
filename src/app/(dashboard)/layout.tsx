"use client";

import { AppShell } from "@/components/AppShell";
import { useSession } from "@/hooks/useSession";
import { Spinner } from "@fluentui/react-components";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && session && !session.authenticated) router.replace("/login");
  }, [isPending, session, router]);

  if (isPending || !session?.authenticated) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
        <Spinner label="Loading..." />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
