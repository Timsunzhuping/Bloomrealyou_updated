import { Injectable, Logger } from '@nestjs/common';

import type { ToolCall, ToolDefinition, ToolExecutorFunction, ToolResult } from '../types';

/**
 * Manages tool definitions and executes tool calls from the LLM.
 */
@Injectable()
export class ToolExecutor {
  private readonly log = new Logger(ToolExecutor.name);
  private readonly tools = new Map<string, ToolExecutorFunction>();
  private readonly definitions = new Map<string, ToolDefinition>();

  registerTool(definition: ToolDefinition, executor: ToolExecutorFunction): void {
    this.tools.set(definition.name, executor);
    this.definitions.set(definition.name, definition);
  }

  getDefinitions(): ToolDefinition[] {
    return Array.from(this.definitions.values());
  }

  async executeToolCall(toolCall: ToolCall): Promise<ToolResult> {
    const executor = this.tools.get(toolCall.name);
    if (!executor) {
      const error = `Tool not found: ${toolCall.name}`;
      this.log.error(error);
      return {
        toolCallId: toolCall.id,
        name: toolCall.name,
        result: null,
        error,
      };
    }

    try {
      const result = await executor(toolCall.arguments);
      return {
        toolCallId: toolCall.id,
        name: toolCall.name,
        result,
      };
    } catch (err) {
      const error = (err as Error).message ?? 'Unknown error';
      this.log.error(`Tool execution failed for ${toolCall.name}: ${error}`);
      return {
        toolCallId: toolCall.id,
        name: toolCall.name,
        result: null,
        error,
      };
    }
  }

  async executeToolCalls(toolCalls: ToolCall[]): Promise<ToolResult[]> {
    return Promise.all(toolCalls.map((call) => this.executeToolCall(call)));
  }
}
