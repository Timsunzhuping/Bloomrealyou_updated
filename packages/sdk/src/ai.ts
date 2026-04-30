import type {
  AiCheckRiskInput,
  AiCheckRiskResult,
  AiDesignIdeasInput,
  AiDesignIdeasResult,
  AiGenerateSloganInput,
  AiGenerateSloganResult,
  AiGiftSetInput,
  AiGiftSetResult,
  AiLogoLayoutInput,
  AiLogoLayoutResult,
  AiRemoveBackgroundInput,
  AiRemoveBackgroundResult,
} from '@custom-merch/shared';

import type { ApiClient } from './client.js';

export class AIClient {
  constructor(private readonly api: ApiClient) {}

  async generateSlogan(input: AiGenerateSloganInput): Promise<AiGenerateSloganResult> {
    return this.api.request<AiGenerateSloganResult>('/ai/generate-slogan', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async designIdeas(input: AiDesignIdeasInput): Promise<AiDesignIdeasResult> {
    return this.api.request<AiDesignIdeasResult>('/ai/design-ideas', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async giftSetSuggestions(input: AiGiftSetInput): Promise<AiGiftSetResult> {
    return this.api.request<AiGiftSetResult>('/ai/gift-set-suggestions', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async logoLayout(input: AiLogoLayoutInput): Promise<AiLogoLayoutResult> {
    return this.api.request<AiLogoLayoutResult>('/ai/logo-layout', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async removeBackground(input: AiRemoveBackgroundInput): Promise<AiRemoveBackgroundResult> {
    return this.api.request<AiRemoveBackgroundResult>('/ai/remove-background', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async checkDesignRisk(input: AiCheckRiskInput): Promise<AiCheckRiskResult> {
    return this.api.request<AiCheckRiskResult>('/ai/check-design-risk', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }
}
