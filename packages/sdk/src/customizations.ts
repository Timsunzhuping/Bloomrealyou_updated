import type {
  CreateCustomerDesignInput,
  CustomerDesignDto,
  GenerateProductionFileInput,
  GenerateProductionFileResult,
  RenderPreviewInput,
  RenderPreviewResult,
  UpdateCustomerDesignInput,
  ValidateDesignInput,
  ValidationResult,
} from '@custom-merch/shared';

import type { ApiClient } from './client.js';

/** Strongly-typed client for /customizations/* endpoints. */
export class CustomizationsClient {
  constructor(private readonly api: ApiClient) {}

  async create(input: CreateCustomerDesignInput): Promise<CustomerDesignDto> {
    return this.api.request<CustomerDesignDto>('/customizations', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async get(id: string): Promise<CustomerDesignDto> {
    return this.api.request<CustomerDesignDto>(`/customizations/${encodeURIComponent(id)}`);
  }

  async patch(id: string, input: UpdateCustomerDesignInput): Promise<CustomerDesignDto> {
    return this.api.request<CustomerDesignDto>(`/customizations/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async renderPreview(id: string, input: RenderPreviewInput = {}): Promise<RenderPreviewResult> {
    return this.api.request<RenderPreviewResult>(
      `/customizations/${encodeURIComponent(id)}/render-preview`,
      { method: 'POST', body: JSON.stringify(input) },
    );
  }

  async generateProductionFile(
    id: string,
    input: GenerateProductionFileInput = {},
  ): Promise<GenerateProductionFileResult> {
    return this.api.request<GenerateProductionFileResult>(
      `/customizations/${encodeURIComponent(id)}/generate-production-file`,
      { method: 'POST', body: JSON.stringify(input) },
    );
  }

  async validate(id: string, input: ValidateDesignInput = {}): Promise<ValidationResult> {
    return this.api.request<ValidationResult>(
      `/customizations/${encodeURIComponent(id)}/validate`,
      { method: 'POST', body: JSON.stringify(input) },
    );
  }
}
