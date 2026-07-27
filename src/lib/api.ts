/**
 * Every call is same-origin in production (see ARCHITECTURE.md §2 -- one
 * reverse-proxied domain, `/api/*` routed to warden's API server) so this
 * always uses relative paths and never sets a base URL. In local dev, where
 * Next.js and the Zig API server run on different ports, `next.config.ts`
 * rewrites `/api/*` to `WARDEN_API_ORIGIN` if that env var is set -- this
 * file doesn't need to know that's happening.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let code = "unknown";
    let message = res.statusText;
    try {
      const body = await res.json();
      if (body?.error) {
        code = body.error.code ?? code;
        message = body.error.message ?? message;
      }
    } catch {
      // Non-JSON error body -- fall back to the status text above.
    }
    throw new ApiError(res.status, code, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
