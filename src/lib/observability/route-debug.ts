/* ------------------------------------------------------------------ */
/*  Dev-mode route observability (stripped in production)              */
/* ------------------------------------------------------------------ */

const DEV = process.env.NODE_ENV === "development";
const ROUTE_STYLE = "color: #8B5CF6; font-weight: 600";

function devLog(...args: unknown[]) {
  if (DEV) console.log(`%c[route]`, ROUTE_STYLE, ...args);
}

/**
 * Logged when a redirect or client-side navigation happens.
 * Intended for the root page, middleware client-side tracking, etc.
 */
export function logRouteTransition(from: string, to: string, role: string) {
  devLog(`transition: ${from} -> ${to}`, { from, to, role });
}

/**
 * Logged when the app layout decides which shell to render.
 * `decision` is one of: "platform" | "tenant" | "redirecting".
 */
export function logLayoutResolution(
  pathname: string,
  role: string,
  decision: "platform" | "tenant" | "redirecting",
) {
  devLog(`layout: ${decision}`, { pathname, role, decision });
}

/**
 * Logged during the auth hydration lifecycle.
 * `status` is one of: "start" | "success" | "fail" | "timeout".
 */
export function logAuthHydration(
  status: "start" | "success" | "fail" | "timeout",
  role?: string,
) {
  devLog(`auth-hydration: ${status}`, { status, role });
}

/**
 * Logged to mirror middleware decisions on the client side.
 * `action` is one of: "allow" | "redirect-platform" | "redirect-tenant" |
 * "redirect-login" | "block".
 */
export function logMiddlewareDecision(
  pathname: string,
  role: string,
  action:
    | "allow"
    | "redirect-platform"
    | "redirect-tenant"
    | "redirect-login"
    | "block",
) {
  devLog(`middleware: ${action}`, { pathname, role, action });
}
