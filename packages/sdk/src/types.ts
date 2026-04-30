/** Response shape returned by the API GET /health endpoint. */
export interface HealthResponse {
  status: 'ok';
  uptimeSec: number;
  service: string;
  version: string;
  timestamp: string;
}
