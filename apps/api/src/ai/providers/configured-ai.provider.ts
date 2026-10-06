import { Injectable } from '@nestjs/common';

import { ModelConfigurationService } from '../../model-config/model-config.service';
import { ModelTransport } from '../../model-config/model-transport.service';

import { DoubaoProvider } from './doubao.provider';
import { MockAIProvider } from './mock-ai.provider';
import { OpenAIProvider } from './openai.provider';

import type {
  AICapabilityName,
  AIProvider,
  AiGenerateSloganInput,
  AiDesignIdeasInput,
  AiDesignSuggestionsInput,
  AiGenerateDesignImageInput,
  AiCheckPrintabilityInput,
  AiGiftSetInput,
  AiLogoLayoutInput,
  AiRemoveBackgroundInput,
  AiCheckRiskInput,
} from '@custom-merch/shared';

@Injectable()
export class ConfiguredAIProvider implements AIProvider {
  private readonly fallback = new MockAIProvider();
  constructor(
    private readonly models: ModelConfigurationService,
    private readonly transport: ModelTransport,
  ) {}
  get name(): AIProvider['name'] {
    return this.providerForCapability('design-suggestions');
  }
  providerForCapability(capability: AICapabilityName): AIProvider['name'] {
    try {
      const p = this.models.resolve(
        capability === 'generate-design-image' ? 'design-image' : 'design-text',
      );
      return !p ? 'mock' : p.provider === 'openai-compatible' ? 'openai' : p.provider;
    } catch {
      return 'mock';
    }
  }
  private provider(image = false): AIProvider {
    const p = this.models.resolve(image ? 'design-image' : 'design-text');
    if (!p) return this.fallback;
    if (p.provider === 'doubao')
      return new DoubaoProvider({
        apiKey: p.apiKey,
        baseUrl: p.baseUrl,
        textModel: p.model,
        imageModel: p.model,
        request: (path, body) =>
          path === 'chat/completions'
            ? this.transport.chat(p, body)
            : this.transport.post(p, path, {
                ...body,
                model: p.model,
                response_format: 'b64_json',
              }),
      });
    return new OpenAIProvider({
      apiKey: p.apiKey,
      model: p.model,
      baseUrl: p.baseUrl,
      request: (body) => this.transport.chat(p, body),
    });
  }
  generateSlogan(input: AiGenerateSloganInput) {
    return this.provider().generateSlogan(input);
  }
  designIdeas(input: AiDesignIdeasInput) {
    return this.provider().designIdeas(input);
  }
  designSuggestions(input: AiDesignSuggestionsInput) {
    return this.provider().designSuggestions(input);
  }
  generateDesignImage(input: AiGenerateDesignImageInput) {
    return this.provider(true).generateDesignImage(input);
  }
  checkPrintability(input: AiCheckPrintabilityInput) {
    return this.fallback.checkPrintability(input);
  }
  giftSetSuggestions(input: AiGiftSetInput) {
    return this.provider().giftSetSuggestions(input);
  }
  logoLayout(input: AiLogoLayoutInput) {
    return this.provider().logoLayout(input);
  }
  removeBackground(input: AiRemoveBackgroundInput) {
    return this.fallback.removeBackground(input);
  }
  checkDesignRisk(input: AiCheckRiskInput) {
    return this.provider().checkDesignRisk(input);
  }
}
