// frontend/src/api/http.ts
import { API_BASE } from "./config";
import { refreshRequest } from "./session";

const LS_ACCESS = "access_token";
const LS_REFRESH = "refresh_token";

/**
 * Single-flight refresh: if multiple requests fail at once,
 * only one refresh call happens and others wait.
 */
let refreshInFlight: Promise<string> | null = null;

function getAccess() {
  return localStorage.getItem(LS_ACCESS);
}

function getRefresh() {
  return localStorage.getItem(LS_REFRESH);
}

function setAccess(access: string) {
  localStorage.setItem(LS_ACCESS, access);
  // Notify AppContext (same-tab) so UI updates without refresh
  window.dispatchEvent(new CustomEvent("auth:token-updated", { detail: { access } }));
}

function clearAuthStorage() {
  localStorage.removeItem(LS_ACCESS);
  localStorage.removeItem(LS_REFRESH);
  window.dispatchEvent(new CustomEvent("auth:logged-out"));
}

async function ensureFreshAccessToken(): Promise<string> {
  const refresh = getRefresh();
  if (!refresh) throw new Error("No refresh token available.");

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const data = await refreshRequest(refresh); // { access: string }
      setAccess(data.access);
      return data.access;
    })().finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
}

async function safeJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function isJwtInvalidError(status: number, data: any): boolean {
  if (status !== 401) return false;

  const detail =
    (typeof data === "string" ? data : null) ||
    data?.detail ||
    data?.message ||
    "";

  const msg = String(detail).toLowerCase();

  // SimpleJWT common cases
  return (
    msg.includes("given token not valid for any token type") ||
    msg.includes("token is invalid") ||
    msg.includes("token is expired") ||
    msg.includes("not valid") ||
    msg.includes("authentication credentials were not provided")
  );
}

/**
 * authFetch:
 * - Uses provided accessToken OR reads from localStorage
 * - On 401 invalid/expired token -> refresh -> retry once
 * - If refresh fails -> clears storage + emits logout event
 */
export async function authFetch(
  path: string,
  accessToken?: string,
  options: RequestInit = {}
): Promise<Response> {
  const hasBody = !!options.body;

  const doFetch = async (token: string): Promise<Response> => {
    return fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
      },
    });
  };

  const initialToken = accessToken || getAccess() || "";
  let res = await doFetch(initialToken);

  if (res.status !== 401) return res;

  const data = await safeJson(res);
  if (!isJwtInvalidError(res.status, data)) return res;

  // Try refresh + retry once
  try {
    const newAccess = await ensureFreshAccessToken();
    res = await doFetch(newAccess);
    return res;
  } catch {
    clearAuthStorage();
    return res;
  }
}
