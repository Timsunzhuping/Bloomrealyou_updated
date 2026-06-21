import { Logger, Module, type OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AdminProductsRepository } from '../admin-products/admin-products.repository';
import { OrdersRepository } from '../orders/orders.repository';
import { AgentOrchestrator } from './agent-orchestrator.service';
import { ConversationManager } from './conversation-manager/conversation-manager.service';
import { ToolExecutor } from './tool-executor/tool-executor.service';
import { ClaudeLLMProvider } from './llm-provider/claude-llm.provider';
import { OpenAILLMProvider } from './llm-provider/openai-llm.provider';
import { MockLLMProvider } from './llm-provider/mock-llm.provider';
import type { LLMProvider } from './llm-provider/llm-provider.interface';
import {
  SEARCH_PRODUCTS_TOOL,
  ESTIMATE_PRICE_TOOL,
  CREATE_ORDER_TOOL,
  LOOKUP_ORDER_TOOL,
  GET_ORDER_STATUS_TOOL,
} from './tool-executor/tools';

const log = new Logger('AiAgentsModule');

const llmProviderFactory = {
  provide: 'LLM_PROVIDER',
  inject: [ConfigService],
  useFactory: (config: ConfigService): LLMProvider => {
    const provider = config.get<string>('AI_AGENT_PROVIDER') ?? 'mock';
    const claudeApiKey = config.get<string>('ANTHROPIC_API_KEY');
    const openaiApiKey = config.get<string>('OPENAI_API_KEY');

    if (provider === 'claude' && claudeApiKey) {
      log.log('AI agent provider: Claude');
      return new ClaudeLLMProvider(claudeApiKey);
    }

    if (provider === 'openai' && openaiApiKey) {
      log.log('AI agent provider: OpenAI');
      return new OpenAILLMProvider(openaiApiKey);
    }

    log.warn(
      'AI agent provider: mock (set ANTHROPIC_API_KEY for Claude or OPENAI_API_KEY for OpenAI)',
    );
    return new MockLLMProvider();
  },
};

@Module({
  imports: [ConfigModule],
  providers: [ConversationManager, ToolExecutor, AgentOrchestrator, llmProviderFactory],
  exports: [ConversationManager, ToolExecutor, AgentOrchestrator, 'LLM_PROVIDER'],
})
export class AiAgentsModule implements OnModuleInit {
  constructor(
    private readonly toolExecutor: ToolExecutor,
    private readonly adminProductsRepo: AdminProductsRepository,
    private readonly ordersRepo: OrdersRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    this.registerTools();
  }

  private registerTools(): void {
    // Search products tool
    this.toolExecutor.registerTool(SEARCH_PRODUCTS_TOOL, async (input) => {
      const { query, category, minPrice, maxPrice, limit } = input as any;
      const result = this.adminProductsRepo.list({
        q: query,
        category,
      });
      return result.items
        .filter((p) => {
          if (minPrice && p.basePrice < minPrice) return false;
          if (maxPrice && p.basePrice > maxPrice) return false;
          return true;
        })
        .slice(0, limit || 10)
        .map((p) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          basePrice: p.basePrice,
          category: p.category,
        }));
    });

    // Estimate price tool
    this.toolExecutor.registerTool(ESTIMATE_PRICE_TOOL, async (input) => {
      const { productId, quantity, customizations } = input as any;
      const product = this.adminProductsRepo.get(productId);
      if (!product) {
        throw new Error(`Product ${productId} not found`);
      }
      const basePriceMinor = product.basePrice.amountMinor;
      const customizationFeeMinor = customizations ? 500 : 0;
      const unitPriceMinor = basePriceMinor + customizationFeeMinor;
      const subtotalMinor = unitPriceMinor * quantity;
      const taxMinor = Math.round(subtotalMinor * 0.08);
      const shippingMinor = subtotalMinor > 10000 ? 0 : 1000;
      return {
        productId,
        quantity,
        unitPriceMinor,
        subtotalMinor,
        taxMinor,
        shippingMinor,
        totalMinor: subtotalMinor + taxMinor + shippingMinor,
        currency: product.basePrice.currency,
      };
    });

    // Create order tool (validation only)
    this.toolExecutor.registerTool(CREATE_ORDER_TOOL, async (input) => {
      const { items, shippingAddress } = input as any;
      if (!items || items.length === 0) {
        throw new Error('Order must have at least one item');
      }
      if (!shippingAddress) {
        throw new Error('Shipping address is required');
      }
      return {
        success: true,
        message: 'Order creation initiated. Please review details and confirm.',
        items: items.length,
        total: 'TBD',
      };
    });

    // Lookup order tool
    this.toolExecutor.registerTool(LOOKUP_ORDER_TOOL, async (input) => {
      const { orderId } = input as any;
      const order = this.ordersRepo.get(orderId);
      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }
      return order;
    });

    // Get order status tool
    this.toolExecutor.registerTool(GET_ORDER_STATUS_TOOL, async (input) => {
      const { orderId } = input as any;
      const order = this.ordersRepo.get(orderId);
      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }
      return {
        orderId,
        status: order.status,
        estimatedDelivery: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        progress: {
          design_approval: 25,
          production: 50,
          quality_check: 75,
          shipping: 90,
          delivered: 100,
        },
      };
    });

    log.log('AI agent tools registered');
  }
}
