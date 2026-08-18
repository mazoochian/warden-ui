"use client";

import {
  Avatar,
  Button,
  Caption1,
  Divider,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  OverlayDrawer,
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
  ChatMultiple24Filled,
  ChatMultiple24Regular,
  ChevronDown20Regular,
  ChevronRight20Regular,
  ClipboardTextLtr24Filled,
  ClipboardTextLtr24Regular,
  Clock24Filled,
  Clock24Regular,
  Dismiss24Regular,
  DocumentArrowRight24Filled,
  DocumentArrowRight24Regular,
  Key24Filled,
  Key24Regular,
  LineHorizontal320Regular,
  Note24Filled,
  Note24Regular,
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
  Wallet24Filled,
  Wallet24Regular,
} from "@fluentui/react-icons";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { isAdmin, isOwner, useInvalidateSession, useSession } from "@/hooks/useSession";
import { media, useIsCompact } from "@/lib/breakpoints";
import { t } from "@/lib/i18n";
import { ThemeToggle } from "./ThemeToggle";

const NAV_COLLAPSE_KEY = "warden-ui-nav-collapsed";

const useStyles = makeStyles({
  // Mica-like window backdrop; the content layer floats on top of it.
  // `dvh` rather than `vh` so mobile browsers' collapsing address bar
  // doesn't leave the page permanently ~60px taller than the screen.
  root: { display: "flex", minHeight: "100dvh", backgroundColor: tokens.colorNeutralBackground3 },
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
    // Below `compact` the same nav is rendered inside the drawer instead.
    // Display-none (not a width transition to zero) so it's out of the
    // accessibility tree too -- otherwise the identical set of links
    // exists twice for a screen reader, once visible and once not.
    [media.compact]: { display: "none" },
  },
  navCollapsed: { width: "60px" },
  // Never the full width: the sliver of dimmed page still showing is the
  // affordance that tells you tapping outside dismisses this.
  drawer: { width: "min(280px, 84vw)" },
  drawerBrand: { display: "flex", alignItems: "center", gap: "10px" },
  drawerBody: { ...shorthands.padding("4px", "6px", "16px"), overflowX: "hidden" },
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
      insetInlineStart: "1px",
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
  sub: { paddingInlineStart: "26px" },
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
    [media.narrow]: { ...shorthands.padding("0", "6px", "0", "2px"), gap: "4px" },
  },
  // WinUI 3 content layer: solid surface, hairline stroke, 8px top-left corner.
  layer: {
    flexGrow: 1,
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderTop("1px", "solid", tokens.colorNeutralStroke2),
    borderInlineStartWidth: "1px",
    borderInlineStartStyle: "solid",
    borderInlineStartColor: tokens.colorNeutralStroke2,
    borderStartStartRadius: tokens.borderRadiusXLarge,
    overflowX: "hidden",
    // The single rounded start-corner + start-edge stroke reads as "the
    // content layer floats over the sidebar." With no sidebar there's
    // nothing for it to float over, so it becomes a symmetric top edge
    // rather than a lopsided one.
    [media.compact]: {
      borderInlineStartWidth: 0,
      borderStartEndRadius: tokens.borderRadiusXLarge,
    },
  },
  content: {
    ...shorthands.padding("24px", "28px", "32px"),
    flexGrow: 1,
    minWidth: 0,
    [media.compact]: { ...shorthands.padding("20px", "20px", "28px") },
    [media.narrow]: { ...shorthands.padding("16px", "14px", "24px") },
  },
  spread: { display: "flex", alignItems: "center", gap: "8px", minWidth: 0 },
  // The topbar's section title: first thing to give up room on a phone,
  // rather than pushing the account menu off the edge.
  sectionTitle: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 },
  // The avatar alone still identifies the account menu at phone width;
  // the button keeps the same name via `aria-label`.
  userName: { [media.narrow]: { display: "none" } },
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
  { to: "/notes", label: t("nav.notes"), icon: <Note24Regular />, activeIcon: <Note24Filled /> },
  { to: "/finance", label: t("nav.finance"), icon: <Wallet24Regular />, activeIcon: <Wallet24Filled /> },
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
// Owner-only, same as `adminItems` -- but gated on `session.roles.owner`
// specifically, not `isAdmin` (owner || bot_admin): the personal-account
// endpoints this page calls require `roles.owner` on the backend (see
// warden's `api/router.zig`'s `requireTelegramUserConnector`), so a
// bot_admin who isn't the owner would see a link that just 403s. A
// distinct icon from `/admin/chats`' `Chat24*` avoids two different
// destinations looking identical in the nav.
const personalChatsItem: NavLeaf = {
  to: "/personal-chats",
  label: t("nav.personalChats"),
  icon: <ChatMultiple24Regular />,
  activeIcon: <ChatMultiple24Filled />,
};
const settingsItem: NavLeaf = { to: "/settings", label: t("nav.personalSettings"), icon: <Settings24Regular />, activeIcon: <Settings24Filled /> };
const accountItem: NavLeaf = { to: "/account", label: t("nav.accountSessions"), icon: <Person24Regular />, activeIcon: <Person24Filled /> };

function isActivePath(pathname: string, to: string, exact?: boolean) {
  return exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");
}

/** Best-match nav label for the current path, for the topbar's section title. */
function currentSectionLabel(pathname: string): string {
  const all = [dashboardItem, groupsItem, ...moduleItems, ...adminItems, personalChatsItem, settingsItem, accountItem];
  const match = all.find((item) => isActivePath(pathname, item.to, item.exact));
  return match?.label ?? t("nav.brand");
}

function NavItem({
  item,
  collapsed,
  sub,
  onNavigate,
}: {
  item: NavLeaf;
  collapsed: boolean;
  sub?: boolean;
  onNavigate?: () => void;
}) {
  const s = useStyles();
  const pathname = usePathname();
  const active = isActivePath(pathname, item.to, item.exact);
  const link = (
    <Link
      href={item.to}
      className={`${s.navItem} ${active ? s.navItemActive : ""} ${sub && !collapsed ? s.sub : ""}`}
      onClick={onNavigate}
    >
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
 * The nav's actual contents, shared verbatim by the persistent sidebar
 * (regular widths) and the overlay drawer (compact widths) -- one list to
 * keep in step with the routes, not two. `collapsed` is always false in
 * the drawer: an icon rail inside a drawer you had to open on purpose
 * would be the worst of both.
 */
function NavContent({
  collapsed,
  admin,
  owner,
  onNavigate,
  modulesOpen,
  setModulesOpen,
  adminOpen,
  setAdminOpen,
}: {
  collapsed: boolean;
  admin: boolean;
  owner: boolean;
  onNavigate?: () => void;
  modulesOpen: boolean;
  setModulesOpen: (fn: (open: boolean) => boolean) => void;
  adminOpen: boolean;
  setAdminOpen: (fn: (open: boolean) => boolean) => void;
}) {
  const s = useStyles();

  return (
    <>
      <NavItem item={dashboardItem} collapsed={collapsed} onNavigate={onNavigate} />
      <NavItem item={groupsItem} collapsed={collapsed} onNavigate={onNavigate} />

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
          {modulesOpen && moduleItems.map((i) => <NavItem key={i.to} item={i} collapsed={false} sub onNavigate={onNavigate} />)}
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
            {adminOpen && adminItems.map((i) => <NavItem key={i.to} item={i} collapsed={false} sub onNavigate={onNavigate} />)}
          </>
        ))}

      {!collapsed && <Divider style={{ margin: "14px 0 6px" }} />}
      {owner && <NavItem item={personalChatsItem} collapsed={collapsed} onNavigate={onNavigate} />}
      <NavItem item={settingsItem} collapsed={collapsed} onNavigate={onNavigate} />
      <NavItem item={accountItem} collapsed={collapsed} onNavigate={onNavigate} />
    </>
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
 *
 * Below the `compact` breakpoint (Phase 10) the persistent sidebar is
 * replaced by an `OverlayDrawer` holding the identical `NavContent`. The
 * 252px sidebar was eating 65% of a 390px phone viewport, which is what
 * made every page under it unusable rather than merely cramped. The one
 * topbar button therefore means two different things by width -- collapse
 * the rail (regular) or open the drawer (compact) -- which is the single
 * reason `useIsCompact()` exists instead of another media query.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const s = useStyles();
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const invalidateSession = useInvalidateSession();
  const admin = isAdmin(session);
  const owner = isOwner(session);
  const isCompact = useIsCompact();

  // Lazy initializer (not an effect) -- `AppShell` only ever mounts after
  // `(dashboard)/layout.tsx`'s own auth-loading gate resolves, so there's
  // no meaningful server-rendered nav state to mismatch against here,
  // same reasoning `theme.tsx`'s `readInitialTheme` already relies on.
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem(NAV_COLLAPSE_KEY) === "1",
  );
  const [modulesOpen, setModulesOpen] = useState(true);
  const [adminOpen, setAdminOpen] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Reset during render (not in an effect) when the viewport crosses back
  // above the breakpoint -- the same pattern `useBotView.ts` already uses
  // to clear its feed on a `chatId` change, and what React recommends over
  // a render-then-effect-then-setState cascade. Without it, a window
  // widened past `compact` with the drawer open and then narrowed again
  // would spring the drawer back open on its own.
  const [lastCompact, setLastCompact] = useState(isCompact);
  if (isCompact !== lastCompact) {
    setLastCompact(isCompact);
    if (!isCompact) setDrawerOpen(false);
  }

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

  const navProps = { admin, owner, modulesOpen, setModulesOpen, adminOpen, setAdminOpen };

  return (
    <div className={s.root}>
      <nav className={`${s.nav} ${collapsed ? s.navCollapsed : ""}`} aria-label={t("nav.landmark")}>
        <div className={s.brand}>
          <Image src="/warden-mark.png" alt={t("nav.brandAlt")} width={26} height={26} className={s.brandMark} priority />
          {!collapsed && <Text weight="semibold">{t("nav.brand")}</Text>}
        </div>
        <div className={s.navScroll}>
          <NavContent collapsed={collapsed} {...navProps} />
        </div>
      </nav>

      {/* Mounted only while compact, so the same set of links never exists
          twice in the accessibility tree. `position="start"` (not "left")
          keeps it opening from the inline start edge under RTL. */}
      {isCompact && (
        <OverlayDrawer
          className={s.drawer}
          position="start"
          open={drawerOpen}
          onOpenChange={(_, data) => setDrawerOpen(data.open)}
        >
          <DrawerHeader>
            <DrawerHeaderTitle
              action={
                <Button
                  appearance="subtle"
                  icon={<Dismiss24Regular />}
                  onClick={() => setDrawerOpen(false)}
                  aria-label={t("nav.closeMenu")}
                />
              }
            >
              <span className={s.drawerBrand}>
                <Image src="/warden-mark.png" alt={t("nav.brandAlt")} width={26} height={26} className={s.brandMark} />
                <Text weight="semibold">{t("nav.brand")}</Text>
              </span>
            </DrawerHeaderTitle>
          </DrawerHeader>
          {/* Tapping a link navigates *and* dismisses -- leaving a modal
              drawer covering the page you just asked for is the classic
              mobile-nav bug. */}
          <DrawerBody className={s.drawerBody}>
            <NavContent collapsed={false} onNavigate={() => setDrawerOpen(false)} {...navProps} />
          </DrawerBody>
        </OverlayDrawer>
      )}

      <div className={s.main}>
        <header className={s.topbar}>
          <div className={s.spread}>
            <Button
              appearance="subtle"
              icon={<LineHorizontal320Regular />}
              onClick={() => (isCompact ? setDrawerOpen(true) : toggleNav())}
              aria-label={isCompact ? t("nav.openMenu") : collapsed ? t("nav.expand") : t("nav.collapse")}
              aria-expanded={isCompact ? drawerOpen : undefined}
            />
            <Text weight="semibold" className={s.sectionTitle}>
              {sectionLabel}
            </Text>
          </div>
          <div className={s.spread}>
            <ThemeToggle />
            <Menu>
              <MenuTrigger disableButtonEnhancement>
                {/* The name is hidden by CSS at phone width, so the button
                    carries it as an explicit accessible name rather than
                    silently losing the one it had. */}
                <Button appearance="subtle" aria-label={displayName}>
                  <span className={s.spread}>
                    <Avatar
                      size={24}
                      name={displayName}
                      color="brand"
                      image={session?.authenticated && session.avatar_url ? { src: session.avatar_url } : undefined}
                    />
                    <span className={s.userName}>{displayName}</span>
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
