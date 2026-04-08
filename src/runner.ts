import type {
  Message,
  ProviderResponse,
  Step,
  StepResult,
  TestConfig,
  TestResult,
} from "./types.js";
import type { Provider } from "./providers/base.js";
import { createProvider } from "./providers/index.js";
import type { CustomChatFn } from "./providers/custom.js";
import { runAssertions } from "./assertions/index.js";
import { MockToolServer } from "./mock/tool-server.js";

export interface RunOptions {
  concurrency?: number;
  timeout?: number;
  customFn?: CustomChatFn;
}

export async function runTest(
  config: TestConfig,
  options: RunOptions = {}
): Promise<TestResult> {
  const start = performance.now();
  const provider = createProvider(config.agent, options.customFn);
  const mockServer = new MockToolServer();
  const messages: Message[] = [
    { role: "system", content: config.agent.system_prompt },
  ];
  const stepResults: StepResult[] = [];
  let latestResponse: ProviderResponse | undefined;

  try {
    for (let i = 0; i < config.steps.length; i++) {
      const step = config.steps[i];
      const stepResult = await executeStep(
        step,
        i,
        provider,
        mockServer,
        messages,
        latestResponse,
        config
      );
      stepResults.push(stepResult);
      if (stepResult.response) {
        latestResponse = stepResult.response;
      }
    }
  } catch (err) {
    return {
      name: config.name,
      description: config.description,
      passed: false,
      steps: stepResults,
      durationMs: performance.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const allAssertionsPassed = stepResults.every((sr) =>
    sr.assertions.every((a) => a.passed)
  );

  return {
    name: config.name,
    description: config.description,
    passed: allAssertionsPassed,
    steps: stepResults,
    durationMs: performance.now() - start,
  };
}

async function executeStep(
  step: Step,
  index: number,
  provider: Provider,
  mockServer: MockToolServer,
  messages: Message[],
  latestResponse: ProviderResponse | undefined,
  config: TestConfig
): Promise<StepResult> {
  // User step: send message to provider
  if ("user" in step) {
    messages.push({ role: "user", content: step.user });
    const response = await provider.chat(messages, config.agent.tools);
    messages.push({ role: "assistant", content: response.content });
    return {
      stepIndex: index,
      step,
      response,
      assertions: [],
      scores: [],
    };
  }

  // Assert step: run assertions against latest response
  if ("assert" in step) {
    if (!latestResponse) {
      throw new Error(
        `Assert at step ${index} but no prior response to assert against`
      );
    }
    const assertions = runAssertions(
      step.assert,
      latestResponse,
      config.agent.model
    );
    return {
      stepIndex: index,
      step,
      assertions,
      scores: [],
    };
  }

  // Mock tool response step: configure mocks and resolve pending tool calls
  if ("mock_tool_response" in step) {
    mockServer.configure(step.mock_tool_response);

    if (latestResponse && latestResponse.toolCalls.length > 0) {
      // Resolve tool calls and feed results back to provider
      for (const tc of latestResponse.toolCalls) {
        const result = mockServer.resolve(tc);
        messages.push({
          role: "tool",
          content: result.content,
          tool_call_id: result.tool_call_id,
        });
      }
      const response = await provider.chat(messages, config.agent.tools);
      messages.push({ role: "assistant", content: response.content });
      return {
        stepIndex: index,
        step,
        response,
        assertions: [],
        scores: [],
      };
    }

    return {
      stepIndex: index,
      step,
      assertions: [],
      scores: [],
    };
  }

  throw new Error(`Unknown step type at index ${index}`);
}

export async function runTests(
  configs: TestConfig[],
  options: RunOptions = {}
): Promise<TestResult[]> {
  const concurrency = options.concurrency ?? 1;

  if (concurrency <= 1) {
    const results: TestResult[] = [];
    for (const config of configs) {
      results.push(await runTest(config, options));
    }
    return results;
  }

  // Parallel execution in chunks
  const results: TestResult[] = [];
  for (let i = 0; i < configs.length; i += concurrency) {
    const chunk = configs.slice(i, i + concurrency);
    const chunkResults = await Promise.all(
      chunk.map((c) => runTest(c, options))
    );
    results.push(...chunkResults);
  }
  return results;
}
