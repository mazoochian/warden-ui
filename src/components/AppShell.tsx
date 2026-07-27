"use client";

import {
  Avatar,
  Button,
  Hamburger,
  NavCategory,
  NavCategoryItem,
  NavDrawer,
  NavDrawerBody,
  NavDrawerHeader,
  NavItem,
  NavSubItemGroup,
  NavSubItem,
  Subtitle2,
  Title3,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import {
  DataBarVerticalRegular,
  HomeRegular,
  PeopleTeamRegular,
  SettingsRegular,
  ShieldRegular,
  SignOutRegular,
} from "@fluentui/react-icons";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useInvalidateSession, useSession } from "@/hooks/useSession";
import { ThemeToggle } from "./ThemeToggle";

const useStyles = makeStyles({
  layout: {
    display: "flex",
    minHeight: "100vh",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    padding: tokens.spacingVerticalM,
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  main: {
    flex: 1,
    padding: tokens.spacingVerticalL,
    overflowY: "auto",
  },
  accountArea: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
  },
});

/**
 * Every real route lives under this shell (see the `(dashboard)` route
 * group's own layout.tsx) -- `/login` is deliberately outside the group
 * and doesn't get it. Nav items point at real routes today, most of which
 * currently render `PlaceholderPage` -- the shell itself doesn't know or
 * care which phase built the destination, it just navigates.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const styles = useStyles();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const { data: session } = useSession();
  const invalidateSession = useInvalidateSession();
  const logout = useMutation({
    mutationFn: () => apiFetch("/api/v1/auth/logout", { method: "POST" }),
    onSuccess: () => {
      invalidateSession();
      router.replace("/login");
    },
  });
  const displayName = session?.authenticated ? session.display_name : "Signed out";

  return (
    <div className={styles.layout}>
      <NavDrawer
        open={open}
        type="inline"
        selectedValue={pathname}
        onNavItemSelect={(_, data) => {
          if (typeof data.value === "string") router.push(data.value);
        }}
      >
        <NavDrawerHeader>
          <div className={styles.header}>
            <Hamburger onClick={() => setOpen(!open)} />
            <Title3>warden</Title3>
          </div>
        </NavDrawerHeader>
        <NavDrawerBody>
          <NavItem icon={<HomeRegular />} value="/" href="/">
            Dashboard
          </NavItem>
          <NavItem icon={<PeopleTeamRegular />} value="/groups" href="/groups">
            My Groups
          </NavItem>

          <NavCategory value="modules">
            <NavCategoryItem icon={<DataBarVerticalRegular />}>Modules</NavCategoryItem>
            <NavSubItemGroup>
              <NavSubItem value="/reminders" href="/reminders">
                Reminders
              </NavSubItem>
              <NavSubItem value="/alerts" href="/alerts">
                Alerts
              </NavSubItem>
              <NavSubItem value="/watches" href="/watches">
                Watches
              </NavSubItem>
              <NavSubItem value="/convert" href="/convert">
                Convert
              </NavSubItem>
              <NavSubItem value="/moderation" href="/moderation">
                Group Administration
              </NavSubItem>
            </NavSubItemGroup>
          </NavCategory>

          <NavCategory value="admin">
            <NavCategoryItem icon={<ShieldRegular />}>Admin</NavCategoryItem>
            <NavSubItemGroup>
              <NavSubItem value="/admin/modules" href="/admin/modules">
                Modules &amp; Config
              </NavSubItem>
              <NavSubItem value="/bot-view" href="/bot-view">
                Bot View
              </NavSubItem>
              <NavSubItem value="/admin/audit-log" href="/admin/audit-log">
                Audit Log
              </NavSubItem>
            </NavSubItemGroup>
          </NavCategory>

          <NavItem icon={<SettingsRegular />} value="/settings" href="/settings">
            Personal Settings
          </NavItem>
        </NavDrawerBody>
      </NavDrawer>

      <div className={styles.content}>
        <div className={styles.topBar}>
          {!open && <Hamburger onClick={() => setOpen(true)} />}
          <Subtitle2>Control panel</Subtitle2>
          <div style={{ display: "flex", alignItems: "center", gap: tokens.spacingHorizontalM }}>
            <ThemeToggle />
            <div className={styles.accountArea}>
              <Avatar
                name={displayName}
                image={session?.authenticated && session.avatar_url ? { src: session.avatar_url } : undefined}
                size={28}
              />
              <Button
                appearance="subtle"
                icon={<SignOutRegular />}
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
              >
                Log out
              </Button>
            </div>
          </div>
        </div>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
