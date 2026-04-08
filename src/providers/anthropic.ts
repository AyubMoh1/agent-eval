import type { Provider } from "./base.js";
import type {
  AgentConfig,
  Message,
  ProviderResponse,
  ToolDefinition,
} from "../types.js";

export class AnthropicProvider implements Provider {
  private client: any;
  private model: string;

  constructor(config: AgentConfig) {
    this.model = config.model;
    try {
      const { default: Anthropic } = require("@anthropic-ai/sdk");
      this.client = new Anthropic({
        ...(config.base_url ? { baseURL: config.base_url } : {}),
      });
    } catch {
      throw new Error(
        'Anthropic SDK not installed. Run: npm install @anthropic-ai/sdk'
      );
    }
  }

  async chat(
    messages: Message[],
    tools?: ToolDefinition[]
  ): Promise<ProviderResponse> {
    const systemMsg = messages.find((m) => m.role === "system");
    const nonSystemMsgs = messages
      .filter((m) => m.role !== "system")
      .map((m) => {
        if (m.role === "tool") {
          return {
            role: "user" as const,
            content: [
              {
                type: "tool_result" as const,
                tool_use_id: m.tool_call_id,
                content: m.content,
              },
            ],
          };
        }
        return { role: m.role as "user" | "assistant", content: m.content };
      });

    const anthropicTools = tools?.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: { type: "object" as const, properties: t.parameters },
    }));

    const start = performance.now();
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      ...(systemMsg ? { system: systemMsg.content } : {}),
      messages: nonSystemMsgs,
      ...(anthropicTools?.length ? { tools: anthropicTools } : {}),
    });
    const latencyMs = performance.now() - start;

    let content = "";
    const toolCalls: ProviderResponse["toolCalls"] = [];

    for (const block of response.content) {
      if (block.type === "text") {
        content += block.text;
      } else if (block.type === "tool_use") {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.input as Record<string, unknown>,
        });
      }
    }

    return {
      content,
      toolCalls,
      usage: {
        promptTokens: response.usage?.input_tokens ?? 0,
        completionTokens: response.usage?.output_tokens ?? 0,
        totalTokens:
          (response.usage?.input_tokens ?? 0) +
          (response.usage?.output_tokens ?? 0),
      },
      latencyMs,
    };
  }
}
