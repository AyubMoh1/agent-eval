import type { Provider } from "./base.js";
import type {
  AgentConfig,
  Message,
  ProviderResponse,
  ToolDefinition,
} from "../types.js";

export class OpenAIProvider implements Provider {
  private client: any;
  private model: string;

  constructor(config: AgentConfig) {
    this.model = config.model;
    try {
      const { default: OpenAI } = require("openai");
      this.client = new OpenAI({ baseURL: config.base_url });
    } catch {
      throw new Error(
        'OpenAI SDK not installed. Run: npm install openai'
      );
    }
  }

  async chat(
    messages: Message[],
    tools?: ToolDefinition[]
  ): Promise<ProviderResponse> {
    const openaiTools = tools?.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    const start = performance.now();
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
      })),
      ...(openaiTools?.length ? { tools: openaiTools } : {}),
    });
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
