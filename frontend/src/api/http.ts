import { API_BASE } from "./config";

export async function authFetch(
  path: string,
  accessToken: string,
  options: RequestInit = {}
) {
  const hasBody = !!options.body;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${accessToken}`,
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
    },
  });

  return res;
}
