// frontend/src/api/config.ts
const fromEnv = import.meta.env.VITE_API_BASE as string | undefined;

export const API_BASE: string =
  (fromEnv && fromEnv.trim()) || "http://127.0.0.1:8000";
