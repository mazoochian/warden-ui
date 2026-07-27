"use client";

import { FluentProvider } from "@fluentui/react-components";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { wardenDarkTheme, wardenLightTheme } from "./brand-theme";
import { ThemeProvider, useTheme } from "./theme";

function FluentThemeBridge({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <FluentProvider theme={theme === "dark" ? wardenDarkTheme : wardenLightTheme} style={{ minHeight: "100vh" }}>
      {children}
    </FluentProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  // One QueryClient per browser session (not per render) -- created lazily
  // in state so it survives re-renders but isn't shared across separate
  // requests the way a module-level singleton would be under React's
  // strict-mode double-invoke or (later, if any route ever opts into SSR
  // data fetching) across concurrent requests on the server.
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <FluentThemeBridge>{children}</FluentThemeBridge>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
