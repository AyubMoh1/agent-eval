import type { AgentConfig } from "../types.js";
import type { Provider } from "./base.js";
import { CustomProvider, type CustomChatFn } from "./custom.js";
import { OpenAIProvider } from "./openai.js";
import { AnthropicProvider } from "./anthropic.js";
import { OllamaProvider } from "./ollama.js";

export type { Provider } from "./base.js";
export type { CustomChatFn } from "./custom.js";

export function createProvider(
  config: AgentConfig,
  customFn?: CustomChatFn
): Provider {
  switch (config.provider) {
    case "openai":
      return new OpenAIProvider(config);
    case "anthropic":
      return new AnthropicProvider(config);
    case "ollama":
      return new OllamaProvider(config);
    case "custom": {
      if (!customFn) {
        throw new Error("Custom provider requires a chat function");
      }
      return new CustomProvider(customFn);
    }
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}
