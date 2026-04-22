import type { Provider } from "./base.js";
import type {
  AgentConfig,
  Message,
  ProviderResponse,
  ToolDefinition,
} from "../types.js";

export function buildOpenAIChatRequest(
  model: string,
  temperature: number | undefined,
  messages: Message[],
  tools?: ToolDefinition[]
) {
  const openaiTools = tools?.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));

  return {
    model,
    ...(temperature != null ? { temperature } : {}),
    messages: messages.map((m) => {
      if (m.role === "assistant" && m.toolCalls?.length) {
        return {
          role: "assistant" as const,
          content: m.content || null,
          tool_calls: m.toolCalls.map((tc) => ({
            id: tc.id,
            type: "function" as const,
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments),
            },
          })),
        };
      }

      return {
        role: m.role,
        content: m.content,
        ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
      };
    }),
    ...(openaiTools?.length ? { tools: openaiTools } : {}),
  };
}

export class OpenAIProvider implements Provider {
  private clientPromise: Promise<any>;
  private model: string;
  private temperature: number | undefined;

  constructor(config: AgentConfig) {
    this.model = config.model;
    this.temperature = config.temperature;
    // @ts-ignore - openai is an optional peer dependency
    this.clientPromise = import("openai")
      .then(({ default: OpenAI }) => new OpenAI({ baseURL: config.base_url }))
      .catch(() => {
        throw new Error("OpenAI SDK not installed. Run: npm install openai");
      });
  }

  async chat(
    messages: Message[],
    tools?: ToolDefinition[]
  ): Promise<ProviderResponse> {
    const client = await this.clientPromise;

    const start = performance.now();
    const response = await client.chat.completions.create(
      buildOpenAIChatRequest(this.model, this.temperature, messages, tools)
    );
    const latencyMs = performance.now() - start;

    const choice = response.choices[0];
    const toolCalls = (choice.message.tool_calls ?? []).map((tc: any) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments),
    }));

    return {
      content: choice.message.content ?? "",
      toolCalls,
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },
      latencyMs,
    };
  }
}
