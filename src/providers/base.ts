import type { Message, ProviderResponse, ToolDefinition } from "../types.js";

export interface Provider {
  chat(
    messages: Message[],
    tools?: ToolDefinition[]
  ): Promise<ProviderResponse>;
}
