import type { Provider } from "./base.js";
import type {
  AgentConfig,
  Message,
  ProviderResponse,
  ToolDefinition,
} from "../types.js";

export function buildAnthropicMessagesRequest(
  model: string,
  temperature: number | undefined,
  messages: Message[],
  tools?: ToolDefinition[]
) {
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
      if (m.role === "assistant" && m.toolCalls?.length) {
        return {
          role: "assistant" as const,
          content: [
            ...(m.content ? [{ type: "text" as const, text: m.content }] : []),
            ...m.toolCalls.map((tc) => ({
              type: "tool_use" as const,
              id: tc.id,
              name: tc.name,
              input: tc.arguments,
            })),
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

  return {
    model,
    max_tokens: 4096,
    ...(temperature != null ? { temperature } : {}),
    ...(systemMsg ? { system: systemMsg.content } : {}),
    messages: nonSystemMsgs,
    ...(anthropicTools?.length ? { tools: anthropicTools } : {}),
  };
}

export class AnthropicProvider implements Provider {
  private clientPromise: Promise<any>;
  private model: string;
  private temperature: number | undefined;

  constructor(config: AgentConfig) {
    this.model = config.model;
    this.temperature = config.temperature;
    // @ts-ignore - @anthropic-ai/sdk is an optional peer dependency
    this.clientPromise = import("@anthropic-ai/sdk")
      .then(
        ({ default: Anthropic }) =>
          new Anthropic({
            ...(config.base_url ? { baseURL: config.base_url } : {}),
          })
      )
      .catch(() => {
        throw new Error(
          "Anthropic SDK not installed. Run: npm install @anthropic-ai/sdk"
        );
      });
  }

  async chat(
    messages: Message[],
    tools?: ToolDefinition[]
  ): Promise<ProviderResponse> {
    const client = await this.clientPromise;

    const start = performance.now();
    const response = await client.messages.create(
      buildAnthropicMessagesRequest(
        this.model,
        this.temperature,
        messages,
        tools
      )
    );
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
