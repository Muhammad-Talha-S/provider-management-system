const API_BASE = "http://127.0.0.1:8000";

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
