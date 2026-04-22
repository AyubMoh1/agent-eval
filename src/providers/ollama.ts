import type { Provider } from "./base.js";
import type {
  AgentConfig,
  Message,
  ProviderResponse,
  ToolDefinition,
} from "../types.js";

export function buildOllamaChatRequest(
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
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
      ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
    })),
    ...(openaiTools?.length ? { tools: openaiTools } : {}),
  };
}

export class OllamaProvider implements Provider {
  private baseUrl: string;
  private model: string;
  private temperature: number | undefined;

  constructor(config: AgentConfig) {
    this.model = config.model;
    this.temperature = config.temperature;
    this.baseUrl = config.base_url ?? "http://localhost:11434";
  }

  async chat(
    messages: Message[],
    tools?: ToolDefinition[]
  ): Promise<ProviderResponse> {
    const start = performance.now();
    const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        buildOllamaChatRequest(this.model, this.temperature, messages, tools)
      ),
    });
    const latencyMs = performance.now() - start;

    if (!res.ok) {
      throw new Error(`Ollama request failed: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    const choice = data.choices[0];
    const toolCalls = (choice.message.tool_calls ?? []).map((tc: any) => ({
      id: tc.id ?? crypto.randomUUID(),
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments),
    }));

    return {
      content: choice.message.content ?? "",
      toolCalls,
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
      latencyMs,
    };
  }
}
