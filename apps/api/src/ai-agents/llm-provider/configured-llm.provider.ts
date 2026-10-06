import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { ModelConfigurationService } from '../../model-config/model-config.service';
import { ModelTransport } from '../../model-config/model-transport.service';

import { ClaudeLLMProvider } from './claude-llm.provider';
import { BaseLLMProvider } from './llm-provider.interface';
import { MockLLMProvider } from './mock-llm.provider';
import { OpenAILLMProvider } from './openai-llm.provider';

import type { ConversationMessage, ToolDefinition, LLMResponse } from '../types';
@Injectable()
export class ConfiguredLLMProvider extends BaseLLMProvider {
  constructor(
    private readonly models: ModelConfigurationService,
    private readonly transport: ModelTransport,
  ) {
    super();
  }
  get name() {
    try {
      return this.models.resolve('assistant')?.provider ?? 'mock';
    } catch {
      return 'unavailable';
    }
  }
  async generateResponse(
    messages: ConversationMessage[],
    tools: ToolDefinition[],
    prompt: string,
  ): Promise<LLMResponse> {
    const p = this.models.resolve('assistant');
    if (!p) return new MockLLMProvider().generateResponse(messages, tools, prompt);
    const options = {
      baseURL: p.baseUrl,
      timeout: p.timeoutMs,
      maxRetries: 0,
      fetch: this.transport.sdkFetch(p),
    };
    const provider =
      p.provider === 'anthropic'
        ? new ClaudeLLMProvider(p.apiKey, p.model, options)
        : new OpenAILLMProvider(p.apiKey, p.model, options);
    try {
      return await provider.generateResponse(messages, tools, prompt);
    } catch {
      throw new ServiceUnavailableException({
        code: 'MODEL_ASSISTANT_FAILED',
        message: '智能助手模型暂时不可用。',
      });
    }
  }
}
