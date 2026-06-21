import { Test, TestingModule } from '@nestjs/testing';

import { SnapshotStore } from '../_lib/snapshot-store';
import { AdminProductsRepository } from '../admin-products/admin-products.repository';
import { OrdersRepository } from '../orders/orders.repository';
import { OrdersService } from '../orders/orders.service';
import { AccountRepository } from '../account/account.repository';
import { AIService } from '../ai/ai.service';
import { AgentToolsRegistrar } from './tool-executor/agent-tools.registrar';
import { ToolExecutor } from './tool-executor/tool-executor.service';
import type { ToolContext } from './types';

/**
 * Integration test: wires the agent tools to real product/order/account
 * repositories (with an in-memory snapshot store) and exercises the production
 * flows a Sales Copilot would drive: discover → price → order.
 */
describe('Agent production tools (integration)', () => {
  let executor: ToolExecutor;
  let adminProducts: AdminProductsRepository;
  let orders: OrdersRepository;
  let accounts: AccountRepository;
  let createFromCart: jest.Mock;
  let generateDesignImage: jest.Mock;

  const ctx: ToolContext = {
    userId: 'sess_buyer',
    sessionId: 'sess_buyer',
    conversationId: 'conv_1',
    agentType: 'sales_copilot',
  };

  beforeEach(async () => {
    const snapshots = { loadAll: jest.fn().mockResolvedValue([]), put: jest.fn(), remove: jest.fn() };
    createFromCart = jest.fn();
    generateDesignImage = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ToolExecutor,
        AgentToolsRegistrar,
        AdminProductsRepository,
        OrdersRepository,
        AccountRepository,
        { provide: SnapshotStore, useValue: snapshots },
        { provide: OrdersService, useValue: { createFromCart } },
        { provide: AIService, useValue: { generateDesignImage } },
      ],
    }).compile();

    executor = module.get(ToolExecutor);
    adminProducts = module.get(AdminProductsRepository);
    orders = module.get(OrdersRepository);
    accounts = module.get(AccountRepository);

    module.get(AgentToolsRegistrar).registerAll();
  });

  it('search_products returns seeded catalog entries', async () => {
    const result = await executor.executeToolCall(
      { id: 'c1', name: 'search_products', arguments: { query: '' } },
      ctx,
    );
    expect(result.error).toBeUndefined();
    const items = result.result as any[];
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]).toHaveProperty('basePriceMinor');
    expect(items[0]).toHaveProperty('currency');
  });

  it('estimate_price computes totals for a real product', async () => {
    const anyProduct = adminProducts.list().items[0]!;
    const result = await executor.executeToolCall(
      {
        id: 'c1',
        name: 'estimate_price',
        arguments: { productId: anyProduct.id, quantity: 10, customizations: { color: 'red' } },
      },
      ctx,
    );
    expect(result.error).toBeUndefined();
    const est = result.result as any;
    expect(est.quantity).toBe(10);
    expect(est.totalMinor).toBe(est.subtotalMinor + est.taxMinor + est.shippingMinor);
    expect(est.currency).toBe(anyProduct.basePrice.currency);
  });

  it('estimate_price errors for an unknown product', async () => {
    const result = await executor.executeToolCall(
      { id: 'c1', name: 'estimate_price', arguments: { productId: 'nope', quantity: 1 } },
      ctx,
    );
    expect(result.error).toContain('not found');
  });

  it('create_order requires a cart session', async () => {
    const result = await executor.executeToolCall(
      {
        id: 'c1',
        name: 'create_order',
        arguments: { shippingAddress: { line1: '1 St' }, customerEmail: 'a@b.com' },
      },
      { ...ctx, sessionId: null },
    );
    expect(result.error).toContain('No active cart session');
  });

  it('create_order falls back to the saved profile email and default address', async () => {
    accounts.updateProfile('sess_buyer', { email: 'buyer@example.com' });
    accounts.saveAddress('sess_buyer', {
      fullName: 'Bee Buyer',
      line1: '1 Market St',
      city: 'San Francisco',
      postalCode: '94105',
      country: 'US' as never,
      isDefaultShipping: true,
    } as never);
    createFromCart.mockReturnValue({
      id: 'ord_1',
      orderNumber: 'BR-1001',
      status: 'pending_payment',
      total: { amountMinor: 5000, currency: 'USD' },
      items: [{}],
    });

    const result = await executor.executeToolCall(
      { id: 'c1', name: 'create_order', arguments: {} },
      ctx,
    );

    expect(result.error).toBeUndefined();
    expect(createFromCart).toHaveBeenCalledWith(
      expect.objectContaining({
        cartSessionId: 'sess_buyer',
        customerEmail: 'buyer@example.com',
        shippingAddress: expect.objectContaining({ line1: '1 Market St', fullName: 'Bee Buyer' }),
      }),
    );
    const res = result.result as any;
    expect(res.orderNumber).toBe('BR-1001');
  });

  it('create_order errors when no email can be resolved', async () => {
    const result = await executor.executeToolCall(
      {
        id: 'c1',
        name: 'create_order',
        arguments: {
          shippingAddress: {
            fullName: 'X',
            line1: '1 St',
            city: 'NYC',
            postalCode: '10001',
            country: 'US',
          },
        },
      },
      ctx,
    );
    expect(result.error).toContain('email');
  });

  it('lookup_order hides orders from other sessions', async () => {
    orders.save({
      id: 'ord_other',
      orderNumber: 'BR-2002',
      cartSessionId: 'someone_else',
      status: 'paid',
      total: { amountMinor: 100, currency: 'USD' },
      placedAt: new Date().toISOString(),
    } as never);

    const result = await executor.executeToolCall(
      { id: 'c1', name: 'lookup_order', arguments: { orderId: 'ord_other' } },
      ctx,
    );
    expect(result.error).toContain('not found');
  });

  it('list_my_orders returns only the current session’s orders', async () => {
    orders.save({
      id: 'ord_mine',
      orderNumber: 'BR-3003',
      cartSessionId: 'sess_buyer',
      status: 'paid',
      total: { amountMinor: 2500, currency: 'USD' },
      placedAt: new Date().toISOString(),
    } as never);
    orders.save({
      id: 'ord_theirs',
      orderNumber: 'BR-4004',
      cartSessionId: 'other',
      status: 'paid',
      total: { amountMinor: 9999, currency: 'USD' },
      placedAt: new Date().toISOString(),
    } as never);

    const result = await executor.executeToolCall(
      { id: 'c1', name: 'list_my_orders', arguments: {} },
      ctx,
    );
    const list = result.result as any[];
    expect(list).toHaveLength(1);
    expect(list[0].orderNumber).toBe('BR-3003');
  });

  it('generate_design_image delegates to the AI service with the user id', async () => {
    generateDesignImage.mockResolvedValue({
      imageUrl: 'https://cdn/x.png',
      width: 2048,
      height: 2048,
      prompt: 'logo, modern style',
      provider: 'mock',
    });

    const result = await executor.executeToolCall(
      {
        id: 'c1',
        name: 'generate_design_image',
        arguments: { prompt: 'logo', style: 'modern' },
      },
      ctx,
    );

    expect(result.error).toBeUndefined();
    expect(generateDesignImage).toHaveBeenCalledWith(
      { prompt: 'logo, modern style' },
      'sess_buyer',
    );
    expect((result.result as any).imageUrl).toBe('https://cdn/x.png');
  });

  it('lookup_customer returns the profile and saved addresses', async () => {
    accounts.updateProfile('sess_buyer', { email: 'buyer@example.com', fullName: 'Bee' });
    accounts.saveAddress('sess_buyer', {
      fullName: 'Bee Buyer',
      line1: '1 Market St',
      city: 'SF',
      postalCode: '94105',
      country: 'US' as never,
    } as never);

    const result = await executor.executeToolCall(
      { id: 'c1', name: 'lookup_customer', arguments: {} },
      ctx,
    );
    const data = result.result as any;
    expect(data.profile.email).toBe('buyer@example.com');
    expect(data.addresses).toHaveLength(1);
  });
});
