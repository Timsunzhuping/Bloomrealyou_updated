import type { ToolDefinition } from '../types';

/** Tool: Search for products by criteria. */
export const SEARCH_PRODUCTS_TOOL: ToolDefinition = {
  name: 'search_products',
  description:
    'Search for products by category, keyword, or other criteria. Returns matching products with prices and availability.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query (e.g., "t-shirt", "mug", "tote bag")',
      },
      category: {
        type: 'string',
        description: 'Product category (e.g., "t-shirts", "mugs", "bags")',
      },
      minPrice: {
        type: 'number',
        description: 'Minimum price in USD',
      },
      maxPrice: {
        type: 'number',
        description: 'Maximum price in USD',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results (default: 10)',
      },
    },
    required: ['query'],
  },
};

/** Tool: Estimate price for a product with quantity and customization. */
export const ESTIMATE_PRICE_TOOL: ToolDefinition = {
  name: 'estimate_price',
  description: 'Estimate the price for a product with a specific quantity and customization options.',
  inputSchema: {
    type: 'object',
    properties: {
      productId: {
        type: 'string',
        description: 'The product ID',
      },
      quantity: {
        type: 'number',
        description: 'Quantity to order',
      },
      customizations: {
        type: 'object',
        description: 'Customization options (e.g., color, size, design)',
      },
    },
    required: ['productId', 'quantity'],
  },
};

/** Tool: Generate design image from description. */
export const GENERATE_DESIGN_TOOL: ToolDefinition = {
  name: 'generate_design_image',
  description: 'Generate a design image based on a text description.',
  inputSchema: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'Description of the design to generate',
      },
      style: {
        type: 'string',
        description: 'Design style (e.g., "modern", "retro", "minimalist")',
      },
      colors: {
        type: 'array',
        items: { type: 'string' },
        description: 'Preferred colors (hex codes)',
      },
    },
    required: ['prompt'],
  },
};

/** Tool: Create an order. */
export const CREATE_ORDER_TOOL: ToolDefinition = {
  name: 'create_order',
  description: 'Create a new merchandise order with specified products and customizations.',
  inputSchema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        description: 'Order items',
        items: {
          type: 'object',
          properties: {
            productId: { type: 'string' },
            quantity: { type: 'number' },
            customizations: { type: 'object' },
          },
        },
      },
      shippingAddress: {
        type: 'object',
        description: 'Shipping address',
        properties: {
          street: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          zipCode: { type: 'string' },
          country: { type: 'string' },
        },
      },
      billingAddress: {
        type: 'object',
        description: 'Billing address (optional, defaults to shipping address)',
      },
    },
    required: ['items', 'shippingAddress'],
  },
};

/** Tool: Lookup order details. */
export const LOOKUP_ORDER_TOOL: ToolDefinition = {
  name: 'lookup_order',
  description: 'Retrieve details for a specific order by order ID.',
  inputSchema: {
    type: 'object',
    properties: {
      orderId: {
        type: 'string',
        description: 'The order ID to look up',
      },
    },
    required: ['orderId'],
  },
};

/** Tool: Get order status. */
export const GET_ORDER_STATUS_TOOL: ToolDefinition = {
  name: 'get_order_status',
  description: 'Get the current status of an order including production progress and estimated delivery.',
  inputSchema: {
    type: 'object',
    properties: {
      orderId: {
        type: 'string',
        description: 'The order ID',
      },
    },
    required: ['orderId'],
  },
};

/** Tool: Request a design review. */
export const REQUEST_DESIGN_REVIEW_TOOL: ToolDefinition = {
  name: 'request_design_review',
  description: 'Request a design review by the production team before finalizing order.',
  inputSchema: {
    type: 'object',
    properties: {
      orderId: {
        type: 'string',
        description: 'The order ID to review',
      },
      designUrl: {
        type: 'string',
        description: 'URL of the design to review',
      },
      reviewNotes: {
        type: 'string',
        description: 'Any specific concerns or questions about the design',
      },
    },
    required: ['orderId', 'designUrl'],
  },
};

/** All available tools. */
export const ALL_TOOLS: ToolDefinition[] = [
  SEARCH_PRODUCTS_TOOL,
  ESTIMATE_PRICE_TOOL,
  GENERATE_DESIGN_TOOL,
  CREATE_ORDER_TOOL,
  LOOKUP_ORDER_TOOL,
  GET_ORDER_STATUS_TOOL,
  REQUEST_DESIGN_REVIEW_TOOL,
];
