"use client";

import { useEffect, useRef } from "react";

export type TelegramAuthUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramAuthUser) => void;
  }
}

/**
 * Mounts Telegram's own widget script (https://telegram.org/js/telegram-widget.js)
 * into a container div -- the widget can't be a plain React component since
 * Telegram's script itself renders the button/iframe, we just give it a DOM
 * node and a `data-onauth` JS callback to call with the signed payload. See
 * ARCHITECTURE.md §3.1 for what happens to that payload server-side.
 *
 * REQUIRES the bot's domain to be registered via @BotFather's /setdomain --
 * an external setup step (see ROADMAP.md Phase 1) that only Armin can do,
 * since it depends on the actual deployed domain. Until that's done the
 * widget will render but silently refuse to authenticate.
 */
export function TelegramLoginButton({
  botUsername,
  onAuth,
}: {
  botUsername: string;
  onAuth: (user: TelegramAuthUser) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.onTelegramAuth = onAuth;

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-radius", "4");

    const container = containerRef.current;
    container?.appendChild(script);

    return () => {
      delete window.onTelegramAuth;
      if (container) container.innerHTML = "";
    };
  }, [botUsername, onAuth]);

  return <div ref={containerRef} />;
}
