import { Test, TestingModule } from '@nestjs/testing';
import { ToolExecutor } from './tool-executor.service';
import { SEARCH_PRODUCTS_TOOL, ESTIMATE_PRICE_TOOL } from './tools';

describe('ToolExecutor', () => {
  let executor: ToolExecutor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ToolExecutor],
    }).compile();
    executor = module.get(ToolExecutor);
  });

  it('should register and retrieve tool definitions', () => {
    executor.registerTool(SEARCH_PRODUCTS_TOOL, async () => ({ products: [] }));

    const defs = executor.getDefinitions();
    expect(defs).toHaveLength(1);
    expect(defs[0]?.name).toBe('search_products');
  });

  it('should execute registered tools', async () => {
    executor.registerTool(SEARCH_PRODUCTS_TOOL, async (input: any) => ({
      products: [{ id: 'prod_1', name: 'T-Shirt', price: 25 }],
      query: input.query,
    }));

    const result = await executor.executeToolCall({
      id: 'call_1',
      name: 'search_products',
      arguments: { query: 'shirt' },
    });

    expect(result.toolCallId).toBe('call_1');
    expect(result.name).toBe('search_products');
    expect(result.error).toBeUndefined();
    const res = result.result as any;
    expect(res.products).toHaveLength(1);
    expect(res.query).toBe('shirt');
  });

  it('should handle missing tools', async () => {
    const result = await executor.executeToolCall({
      id: 'call_1',
      name: 'nonexistent_tool',
      arguments: {},
    });

    expect(result.error).toBeTruthy();
    expect(result.error).toContain('Tool not found');
  });

  it('should handle tool execution errors', async () => {
    executor.registerTool(ESTIMATE_PRICE_TOOL, async () => {
      throw new Error('Price estimation failed');
    });

    const result = await executor.executeToolCall({
      id: 'call_1',
      name: 'estimate_price',
      arguments: { productId: 'prod_1', quantity: 10 },
    });

    expect(result.error).toBe('Price estimation failed');
  });

  it('should execute multiple tool calls in parallel', async () => {
    let call1Count = 0;
    let call2Count = 0;

    executor.registerTool(SEARCH_PRODUCTS_TOOL, async () => {
      call1Count++;
      return { count: call1Count };
    });

    executor.registerTool(ESTIMATE_PRICE_TOOL, async () => {
      call2Count++;
      return { count: call2Count };
    });

    const results = await executor.executeToolCalls([
      { id: 'call_1', name: 'search_products', arguments: {} },
      { id: 'call_2', name: 'estimate_price', arguments: {} },
    ]);

    expect(results).toHaveLength(2);
    expect(call1Count).toBe(1);
    expect(call2Count).toBe(1);
  });
});
