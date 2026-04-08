import type { Provider } from "./base.js";
import type { Message, ProviderResponse, ToolDefinition } from "../types.js";

export type CustomChatFn = (
  messages: Message[],
  tools?: ToolDefinition[]
) => Promise<ProviderResponse>;

export class CustomProvider implements Provider {
  constructor(private chatFn: CustomChatFn) {}

  async chat(
    messages: Message[],
    tools?: ToolDefinition[]
  ): Promise<ProviderResponse> {
    return this.chatFn(messages, tools);
  }
}
