"use client";

import {
  Avatar,
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
} from "@fluentui/react-icons";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
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
            <Avatar name="Signed out" size={28} />
          </div>
        </div>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
