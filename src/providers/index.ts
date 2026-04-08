import type { AgentConfig } from "../types.js";
import type { Provider } from "./base.js";
import type { CustomChatFn } from "./custom.js";

export type { Provider } from "./base.js";
export type { CustomChatFn } from "./custom.js";

export function createProvider(
  config: AgentConfig,
  customFn?: CustomChatFn
): Provider {
  switch (config.provider) {
    case "openai": {
      const { OpenAIProvider } = require("./openai.js");
      return new OpenAIProvider(config);
    }
    case "anthropic": {
      const { AnthropicProvider } = require("./anthropic.js");
      return new AnthropicProvider(config);
    }
    case "ollama": {
      const { OllamaProvider } = require("./ollama.js");
      return new OllamaProvider(config);
    }
    case "custom": {
      if (!customFn) {
        throw new Error("Custom provider requires a chat function");
      }
      const { CustomProvider } = require("./custom.js");
      return new CustomProvider(customFn);
    }
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}
