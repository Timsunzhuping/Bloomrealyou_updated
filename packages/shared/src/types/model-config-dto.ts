export const MODEL_SCOPES = [
  'design-text',
  'design-image',
  'listing-text',
  'listing-image',
  'assistant',
] as const;
export type ModelScope = (typeof MODEL_SCOPES)[number];
export type ModelVendor = 'doubao' | 'openai-compatible' | 'anthropic';
export type ModelKind = 'text' | 'image';
export interface ModelBinding {
  scope: ModelScope;
  mode: 'environment' | 'profile' | 'disabled';
  profileId: string | null;
}
export interface ModelProfileDto {
  id: string;
  name: string;
  provider: ModelVendor;
  kind: ModelKind;
  baseUrl: string;
  model: string;
  timeoutMs: number;
  enabled: boolean;
  hasKey: boolean;
  keyStatus: 'missing' | 'ready' | 'locked';
  updatedAt: string;
}
export interface ModelConfigurationDto {
  revision: number;
  profiles: ModelProfileDto[];
  bindings: ModelBinding[];
  runtime: Array<{
    scope: ModelScope;
    provider: ModelVendor | null;
    model: string | null;
    status: 'ready' | 'disabled' | 'unconfigured' | 'locked';
  }>;
  encryptionReady: boolean;
  persistence: 'database' | 'memory';
  allowedHosts: string[];
}
export interface ModelConnectionTestDto {
  ok: boolean;
  model: string;
  kind: ModelKind;
  latencyMs: number;
  code: 'OK' | 'MODEL_TEST_FAILED';
}
