"use client";

import {
  Avatar,
  Button,
  Caption1,
  Divider,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Text,
  Tooltip,
  makeStyles,
  shorthands,
  tokens,
} from "@fluentui/react-components";
import {
  Alert24Filled,
  Alert24Regular,
  Bot24Filled,
  Bot24Regular,
  BoardSplit24Filled,
  BoardSplit24Regular,
  Chat24Filled,
  Chat24Regular,
  ChevronDown20Regular,
  ChevronRight20Regular,
  ClipboardTextLtr24Filled,
  ClipboardTextLtr24Regular,
  Clock24Filled,
  Clock24Regular,
  DocumentArrowRight24Filled,
  DocumentArrowRight24Regular,
  Key24Filled,
  Key24Regular,
  LineHorizontal320Regular,
  People24Filled,
  People24Regular,
  PeopleTeam24Filled,
  PeopleTeam24Regular,
  Person24Filled,
  Person24Regular,
  PuzzlePiece24Filled,
  PuzzlePiece24Regular,
  Rss24Filled,
  Rss24Regular,
  Settings24Filled,
  Settings24Regular,
  SignOut20Regular,
} from "@fluentui/react-icons";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { isAdmin, useInvalidateSession, useSession } from "@/hooks/useSession";
import { t } from "@/lib/i18n";
import { ThemeToggle } from "./ThemeToggle";

const NAV_COLLAPSE_KEY = "warden-ui-nav-collapsed";

const useStyles = makeStyles({
  // Mica-like window backdrop; the content layer floats on top of it.
  root: { display: "flex", minHeight: "100vh", backgroundColor: tokens.colorNeutralBackground3 },
  nav: {
    width: "252px",
    flexShrink: 0,
    backgroundColor: "transparent",
    display: "flex",
    flexDirection: "column",
    position: "sticky",
    top: 0,
    height: "100vh",
    transition: "width 180ms cubic-bezier(0.16, 1, 0.3, 1)",
    overflowX: "hidden",
  },
  navCollapsed: { width: "60px" },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    height: "48px",
    ...shorthands.padding("0", "14px"),
    flexShrink: 0,
  },
  brandMark: {
    width: "26px",
    height: "26px",
    flexShrink: 0,
  },
  navScroll: { overflowY: "auto", flexGrow: 1, ...shorthands.padding("4px", "6px", "16px") },
  // WinUI 3 NavigationView item: 36px, 4px radius, animated left pill indicator.
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    height: "36px",
    marginBottom: "2px",
    ...shorthands.padding("0", "12px"),
    borderRadius: tokens.borderRadiusMedium,
    color: tokens.colorNeutralForeground1,
    textDecorationLine: "none",
    fontSize: tokens.fontSizeBase300,
    whiteSpace: "nowrap",
    position: "relative",
    transition: "background-color 100ms ease",
    ":hover": { backgroundColor: tokens.colorSubtleBackgroundHover },
    ":active": { backgroundColor: tokens.colorSubtleBackgroundPressed },
  },
  navItemActive: {
    backgroundColor: tokens.colorSubtleBackgroundSelected,
    color: tokens.colorNeutralForeground1,
    fontWeight: tokens.fontWeightSemibold,
    "::before": {
      content: '""',
      position: "absolute",
      left: "1px",
      top: "50%",
      transform: "translateY(-50%)",
      height: "16px",
      width: "3px",
      borderRadius: tokens.borderRadiusCircular,
      backgroundColor: tokens.colorBrandStroke1,
    },
    ":hover": { backgroundColor: tokens.colorSubtleBackgroundHover },
  },
  category: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    height: "36px",
    width: "100%",
    marginBottom: "2px",
    ...shorthands.padding("0", "12px"),
    ...shorthands.border("none"),
    backgroundColor: "transparent",
    color: tokens.colorNeutralForeground1,
    cursor: "pointer",
    borderRadius: tokens.borderRadiusMedium,
    fontSize: tokens.fontSizeBase300,
    fontFamily: tokens.fontFamilyBase,
    ":hover": { backgroundColor: tokens.colorSubtleBackgroundHover },
  },
  sub: { paddingLeft: "26px" },
  groupLabel: {
    display: "block",
    ...shorthands.padding("14px", "12px", "4px"),
    color: tokens.colorNeutralForeground4,
    fontWeight: tokens.fontWeightSemibold,
  },
  main: { flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column" },
  // Title bar sits on the mica backdrop, not on the content layer.
  topbar: {
    height: "48px",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    ...shorthands.padding("0", "16px", "0", "4px"),
    backgroundColor: "transparent",
  },
  // WinUI 3 content layer: solid surface, hairline stroke, 8px top-left corner.
  layer: {
    flexGrow: 1,
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderTop("1px", "solid", tokens.colorNeutralStroke2),
    ...shorthands.borderLeft("1px", "solid", tokens.colorNeutralStroke2),
    borderTopLeftRadius: tokens.borderRadiusXLarge,
    overflowX: "hidden",
  },
  content: { ...shorthands.padding("24px", "28px", "32px"), flexGrow: 1 },
  spread: { display: "flex", alignItems: "center", gap: "8px" },
});

interface NavLeaf {
  to: string;
  label: string;
  icon: ReactNode;
  activeIcon: ReactNode;
  exact?: boolean;
}

const moduleItems: NavLeaf[] = [
  { to: "/reminders", label: t("nav.reminders"), icon: <Clock24Regular />, activeIcon: <Clock24Filled /> },
  { to: "/alerts", label: t("nav.alerts"), icon: <Alert24Regular />, activeIcon: <Alert24Filled /> },
  { to: "/watches", label: t("nav.watches"), icon: <Rss24Regular />, activeIcon: <Rss24Filled /> },
  { to: "/convert", label: t("nav.convert"), icon: <DocumentArrowRight24Regular />, activeIcon: <DocumentArrowRight24Filled /> },
  { to: "/moderation", label: t("nav.groupAdministration"), icon: <PeopleTeam24Regular />, activeIcon: <PeopleTeam24Filled /> },
];

const adminItems: NavLeaf[] = [
  { to: "/admin/chats", label: t("nav.adminChats"), icon: <Chat24Regular />, activeIcon: <Chat24Filled /> },
  { to: "/admin/identities", label: t("nav.adminUsers"), icon: <People24Regular />, activeIcon: <People24Filled /> },
  { to: "/admin/modules", label: t("nav.adminModules"), icon: <PuzzlePiece24Regular />, activeIcon: <PuzzlePiece24Filled /> },
  { to: "/admin/config", label: t("nav.adminConfig"), icon: <Key24Regular />, activeIcon: <Key24Filled /> },
  { to: "/bot-view", label: t("nav.botView"), icon: <Bot24Regular />, activeIcon: <Bot24Filled /> },
  { to: "/admin/audit-log", label: t("nav.adminAuditLog"), icon: <ClipboardTextLtr24Regular />, activeIcon: <ClipboardTextLtr24Filled /> },
];

const dashboardItem: NavLeaf = { to: "/", label: t("nav.dashboard"), icon: <BoardSplit24Regular />, activeIcon: <BoardSplit24Filled />, exact: true };
const groupsItem: NavLeaf = { to: "/groups", label: t("nav.myGroups"), icon: <PeopleTeam24Regular />, activeIcon: <PeopleTeam24Filled /> };
const settingsItem: NavLeaf = { to: "/settings", label: t("nav.personalSettings"), icon: <Settings24Regular />, activeIcon: <Settings24Filled /> };
const accountItem: NavLeaf = { to: "/account", label: t("nav.accountSessions"), icon: <Person24Regular />, activeIcon: <Person24Filled /> };

function isActivePath(pathname: string, to: string, exact?: boolean) {
  return exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");
}

/** Best-match nav label for the current path, for the topbar's section title. */
function currentSectionLabel(pathname: string): string {
  const all = [dashboardItem, groupsItem, ...moduleItems, ...adminItems, settingsItem, accountItem];
  const match = all.find((item) => isActivePath(pathname, item.to, item.exact));
  return match?.label ?? t("nav.brand");
}

function NavItem({ item, collapsed, sub }: { item: NavLeaf; collapsed: boolean; sub?: boolean }) {
  const s = useStyles();
  const pathname = usePathname();
  const active = isActivePath(pathname, item.to, item.exact);
  const link = (
    <Link href={item.to} className={`${s.navItem} ${active ? s.navItemActive : ""} ${sub && !collapsed ? s.sub : ""}`}>
      {active ? item.activeIcon : item.icon}
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
  return collapsed ? (
    <Tooltip content={item.label} relationship="label" positioning="after">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

/**
 * Every real route lives under this shell (see the `(dashboard)` route
 * group's own layout.tsx) -- `/login` is deliberately outside the group
 * and doesn't get it. Nav items point at real routes today, most of which
 * currently render `PlaceholderPage` -- the shell itself doesn't know or
 * care which phase built the destination, it just navigates.
 *
 * Visual design (collapsible grouped nav, active accent bar, filled/
 * regular icon swap, mica-backdrop shell with a rounded content layer)
 * ported from the design reference at github.com/mazoochian/warden-control-hub
 * (2026-07-28, updated to its "Fluent 2 UI" pass 2026-08-02): the nav and
 * topbar sit transparently on the `root` mica backdrop rather than being
 * their own bordered/sticky surfaces, and page content lives inside a
 * separate `layer` div -- a solid surface with a single rounded top-left
 * corner, the WinUI 3 NavigationView pattern.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const s = useStyles();
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const invalidateSession = useInvalidateSession();
  const admin = isAdmin(session);

  // Lazy initializer (not an effect) -- `AppShell` only ever mounts after
  // `(dashboard)/layout.tsx`'s own auth-loading gate resolves, so there's
  // no meaningful server-rendered nav state to mismatch against here,
  // same reasoning `theme.tsx`'s `readInitialTheme` already relies on.
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem(NAV_COLLAPSE_KEY) === "1",
  );
  const [modulesOpen, setModulesOpen] = useState(true);
  const [adminOpen, setAdminOpen] = useState(true);

  const toggleNav = () => {
    setCollapsed((c) => {
      window.localStorage.setItem(NAV_COLLAPSE_KEY, c ? "0" : "1");
      return !c;
    });
  };

  const logout = useMutation({
    mutationFn: () => apiFetch("/api/v1/auth/logout", { method: "POST" }),
    onSuccess: () => {
      invalidateSession();
      router.replace("/login");
    },
  });

  const displayName = session?.authenticated ? session.display_name : t("nav.signedOut");
  const sectionLabel = useMemo(() => currentSectionLabel(pathname), [pathname]);

  return (
    <div className={s.root}>
      <nav className={`${s.nav} ${collapsed ? s.navCollapsed : ""}`} aria-label={t("nav.landmark")}>
        <div className={s.brand}>
          <Image src="/warden-mark.png" alt={t("nav.brandAlt")} width={26} height={26} className={s.brandMark} priority />
          {!collapsed && <Text weight="semibold">{t("nav.brand")}</Text>}
        </div>
        <div className={s.navScroll}>
          <NavItem item={dashboardItem} collapsed={collapsed} />
          <NavItem item={groupsItem} collapsed={collapsed} />

          {collapsed ? (
            moduleItems.map((i) => <NavItem key={i.to} item={i} collapsed />)
          ) : (
            <>
              <Caption1 as="span" className={s.groupLabel}>
                {t("nav.modulesGroupLabel")}
              </Caption1>
              <button className={s.category} onClick={() => setModulesOpen((o) => !o)} aria-expanded={modulesOpen}>
                {modulesOpen ? <ChevronDown20Regular /> : <ChevronRight20Regular />}
                <span>{t("nav.allModules")}</span>
              </button>
              {modulesOpen && moduleItems.map((i) => <NavItem key={i.to} item={i} collapsed={false} sub />)}
            </>
          )}

          {admin &&
            (collapsed ? (
              adminItems.map((i) => <NavItem key={i.to} item={i} collapsed />)
            ) : (
              <>
                <Caption1 as="span" className={s.groupLabel}>
                  {t("nav.adminGroupLabel")}
                </Caption1>
                <button className={s.category} onClick={() => setAdminOpen((o) => !o)} aria-expanded={adminOpen}>
                  {adminOpen ? <ChevronDown20Regular /> : <ChevronRight20Regular />}
                  <span>{t("nav.botAdministration")}</span>
                </button>
                {adminOpen && adminItems.map((i) => <NavItem key={i.to} item={i} collapsed={false} sub />)}
              </>
            ))}

          {!collapsed && <Divider style={{ margin: "14px 0 6px" }} />}
          <NavItem item={settingsItem} collapsed={collapsed} />
          <NavItem item={accountItem} collapsed={collapsed} />
        </div>
      </nav>

      <div className={s.main}>
        <header className={s.topbar}>
          <div className={s.spread}>
            <Button
              appearance="subtle"
              icon={<LineHorizontal320Regular />}
              onClick={toggleNav}
              aria-label={collapsed ? t("nav.expand") : t("nav.collapse")}
            />
            <Text weight="semibold">{sectionLabel}</Text>
          </div>
          <div className={s.spread}>
            <ThemeToggle />
            <Menu>
              <MenuTrigger disableButtonEnhancement>
                <Button appearance="subtle">
                  <span className={s.spread}>
                    <Avatar
                      size={24}
                      name={displayName}
                      color="brand"
                      image={session?.authenticated && session.avatar_url ? { src: session.avatar_url } : undefined}
                    />
                    <span>{displayName}</span>
                  </span>
                </Button>
              </MenuTrigger>
              <MenuPopover>
                <MenuList>
                  <MenuItem icon={<SignOut20Regular />} onClick={() => logout.mutate()} disabled={logout.isPending}>
                    {t("nav.logOut")}
                  </MenuItem>
                </MenuList>
              </MenuPopover>
            </Menu>
          </div>
        </header>
        <div className={s.layer}>
          <main className={s.content}>{children}</main>
        </div>
      </div>
    </div>
  );
}
