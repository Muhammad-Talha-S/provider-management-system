import type { Provider } from "../types";
import { authFetch } from "./http";

export async function getMyProvider(accessToken: string): Promise<Provider> {
  const res = await authFetch("/api/providers/me/", accessToken);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || "Failed to load provider");
  return data as Provider;
}

export type ProviderPatch = Partial<
  Pick<Provider, "name" | "contactName" | "contactEmail" | "contactPhone" | "address">
> & {
  communicationPreferences?: Partial<Provider["communicationPreferences"]>;
};

export async function patchMyProvider(accessToken: string, patch: ProviderPatch): Promise<Provider> {
  const res = await authFetch("/api/providers/me/", accessToken, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || "Failed to update provider");
  return data as Provider;
}
