# agent-eval

Lightweight TypeScript CLI for testing AI agent behavior. Like Vitest, but for AI agents.

- Define tests in YAML
- Run against any LLM (OpenAI, Anthropic, Ollama)
- Assert on tool calls, response content, latency, cost
- Score with LLM-as-judge (correctness, relevance, safety)
- CI-friendly: exit codes, JSON output, GitHub Actions annotations

## Quickstart

```bash
npm install agent-eval
npx agent-eval init
npx agent-eval run example.eval.yaml
```

## Test Format

```yaml
name: "booking-agent-test"
description: "Agent handles cancellations"

agent:
  provider: openai
  model: gpt-4o
  system_prompt: "You are a booking assistant."
  tools:
    - name: cancel_booking
      description: "Cancel a booking by ID"
      parameters:
        booking_id: string

steps:
  - user: "Cancel my booking B-1234"
  - assert:
      tool_called: cancel_booking
      tool_args:
        booking_id: "B-1234"
  - mock_tool_response:
      cancel_booking: { success: true, refund: 50 }
  - assert:
      response_contains: ["cancelled", "refund"]

scoring:
  dimensions:
    correctness: 0.5
    relevance: 0.3
    safety: 0.2
thresholds:
  pass: 0.8
```

## Step Types

| Step | Description |
|------|-------------|
| `user: "message"` | Send a user message to the agent |
| `assert: { ... }` | Run assertions against the latest response |
| `mock_tool_response: { ... }` | Configure mock tool responses |

## Assertions

| Assertion | Type | Description |
|-----------|------|-------------|
| `tool_called` | string | Tool was invoked |
| `tool_not_called` | string | Tool was NOT invoked |
| `tool_args` | object | Tool call arguments match |
| `min_tool_calls` | number | Minimum tool call count |
| `max_tool_calls` | number | Maximum tool call count |
| `response_contains` | string/string[] | Response includes text (case-insensitive) |
| `contains_none` | string/string[] | Response excludes text |
| `response_matches` | string | Regex match on response |
| `response_length` | `{min?, max?}` | Response character length bounds |
| `no_error` | boolean | No error indicators in response |
| `response_sentiment` | `"positive"|"negative"|"neutral"` | Heuristic sentiment classification |
| `latency_under` | number (ms) | Response latency threshold |
| `tokens_under` | number | Total token threshold |
| `cost_under` | number ($) | Estimated cost threshold |

## Scoring Dimensions

| Dimension | Method |
|-----------|--------|
| `correctness` | LLM-as-judge |
| `relevance` | LLM-as-judge |
| `safety` | LLM-as-judge |
| `no_hallucination` | LLM-as-judge |
| `sentiment` | LLM-as-judge |
| `grounding` | LLM-as-judge (compares response to tool results) |
| `latency` | Deterministic (< 2s = 1.0) |
| `custom` | User-defined function |

## Providers

**OpenAI**
```bash
npm install openai
export OPENAI_API_KEY=sk-...
```

**Anthropic**
```bash
npm install @anthropic-ai/sdk
export ANTHROPIC_API_KEY=sk-ant-...
```

**Ollama** (no SDK needed)
```yaml
agent:
  provider: ollama
  model: llama3
  base_url: http://localhost:11434  # default
```

**Custom** (programmatic API)
```typescript
import { runTest } from "agent-eval";

const result = await runTest(config, {
  customFn: async (messages, tools) => ({
    content: "mock response",
    toolCalls: [],
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    latencyMs: 0,
  }),
});
```

## CLI

```bash
# Run tests
agent-eval run tests/
agent-eval run test1.yaml test2.yaml

# Options
agent-eval run tests/ --reporter json       # json | console | markdown | github-actions
agent-eval run tests/ --concurrency 4       # parallel test files
agent-eval run tests/ --provider anthropic  # override provider
agent-eval run tests/ --model gpt-4o-mini   # override model

# Create example test
agent-eval init

# Compare results
agent-eval diff results-v1.json results-v2.json
```

## CI Integration

```yaml
- name: Run agent tests
  run: npx agent-eval run tests/ --reporter github-actions
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

## Programmatic API

```typescript
import { loadTestFile, runTest, reportJson } from "agent-eval";

const config = loadTestFile("tests/booking.yaml");
const result = await runTest(config);
console.log(reportJson([result]));
```

## License

MIT
