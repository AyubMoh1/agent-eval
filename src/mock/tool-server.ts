import type { ToolCall } from "../types.js";

export interface ToolResult {
  tool_call_id: string;
  content: string;
}

export class MockToolServer {
  private mocks = new Map<string, unknown>();

  configure(responses: Record<string, unknown>): void {
    for (const [name, value] of Object.entries(responses)) {
      this.mocks.set(name, value);
    }
  }

  resolve(toolCall: ToolCall): ToolResult {
    const mock = this.mocks.get(toolCall.name);
    const content =
      mock != null
        ? JSON.stringify(mock)
        : JSON.stringify({ echo: toolCall.name, args: toolCall.arguments });
    return { tool_call_id: toolCall.id, content };
  }

  clear(): void {
    this.mocks.clear();
  }
}
