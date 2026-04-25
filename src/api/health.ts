import { fetchJson } from "@/api/client";

interface HealthResponse {
  status: string;
}

export function fetchHealth(): Promise<HealthResponse> {
  return fetchJson<HealthResponse>("/api/v1/health");
}
