/**
 * The gate every test case passes through before the kit does anything with it.
 *
 * Why the kit validates at all, when the producer already has a schema: the endpoint
 * Dify actually calls (`POST /v1/test-suite/generate`) streams an OpenAI envelope and
 * does **not** validate against the schema — only `/testcases/generate` does, and that
 * one is disabled on the omni provider. So a suite reaching us has, in the common path,
 * never been checked by anyone.
 *
 * The policy is one-way: **packaging is forgiven, schema is not.** A reply wrapped in a
 * markdown fence or in a sentence of commentary is a packaging miss and gets salvaged;
 * a missing field or an unknown verb is rejected with the exact path.
 */
import { ContractError } from './errors';
import {
  PRIORITIES,
  SOURCES,
  STEP_ACTIONS,
  type Priority,
  type StepAction,
  type TestCase,
  type TestCaseGenerationResult,
  type TestCaseSource,
  type TestStep,
} from './types';

export { ContractError };

// ---------------------------------------------------------------------------
// Field readers. Each takes the JSON path so a failure names the exact field.
// ---------------------------------------------------------------------------

function fail(path: string, detail: string): never {
  throw new ContractError(`${path}: ${detail}`);
}

function readObject(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(path, `phải là object, nhận được ${describe(value)}`);
  }
  return value as Record<string, unknown>;
}

function readArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) fail(path, `phải là mảng, nhận được ${describe(value)}`);
  return value;
}

function readString(value: unknown, path: string): string {
  if (typeof value !== 'string') fail(path, `phải là chuỗi, nhận được ${describe(value)}`);
  if (!value.trim()) fail(path, 'không được rỗng');
  return value;
}

function readStringArray(value: unknown, path: string): string[] {
  return readArray(value, path).map((item, i) => readString(item, `${path}[${i}]`));
}

function readInteger(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    fail(path, `phải là số nguyên, nhận được ${describe(value)}`);
  }
  return value;
}

function readEnum<T extends string>(value: unknown, allowed: readonly T[], path: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    fail(path, `phải là một trong [${allowed.join(', ')}], nhận được ${describe(value)}`);
  }
  return value as T;
}

function describe(value: unknown): string {
  if (value === undefined) return 'không có';
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'mảng';
  return `${typeof value} (${JSON.stringify(value)?.slice(0, 40) ?? ''})`;
}

// ---------------------------------------------------------------------------
// Packaging tolerance: get from "whatever the model sent" to a JSON value.
// ---------------------------------------------------------------------------

function stripFences(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith('```')) return trimmed;
  return trimmed
    .replace(/^```[a-zA-Z]*\s*/, '')
    .replace(/```\s*$/, '')
    .trim();
}

/**
 * Pull the outermost balanced `{…}` out of a reply that wrapped good JSON in prose.
 *
 * String-aware, so a `{` inside a Vietnamese `title` or `description` does not throw off
 * the depth count — that brace is data, not structure, and counting it is how a salvage
 * silently returns a truncated object.
 */
function salvageObject(text: string): string | undefined {
  const start = text.indexOf('{');
  if (start === -1) return undefined;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') inString = true;
    else if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return undefined;
}

function toJsonValue(input: unknown): unknown {
  if (typeof input !== 'string') return input;

  const text = stripFences(input);
  try {
    return JSON.parse(text);
  } catch {
    const salvaged = salvageObject(text);
    if (salvaged !== undefined) {
      try {
        return JSON.parse(salvaged);
      } catch {
        /* fall through to the error below */
      }
    }
    throw new ContractError(
      'Đầu vào không phải JSON và không cứu được một object nào từ nó. ' +
        `Bắt đầu bằng: ${JSON.stringify(text.slice(0, 80))}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Shape check.
// ---------------------------------------------------------------------------

function readStep(value: unknown, path: string): TestStep {
  const raw = readObject(value, path);
  return {
    no: readInteger(raw.no, `${path}.no`),
    screen: readString(raw.screen, `${path}.screen`),
    action: readEnum<StepAction>(raw.action, STEP_ACTIONS, `${path}.action`),
    target: readString(raw.target, `${path}.target`),
    description: readString(raw.description, `${path}.description`),
    expected: readString(raw.expected, `${path}.expected`),
  };
}

function readCase(value: unknown, path: string): TestCase {
  const raw = readObject(value, path);
  return {
    test_case_id: readString(raw.test_case_id, `${path}.test_case_id`),
    title: readString(raw.title, `${path}.title`),
    preconditions: readStringArray(raw.preconditions ?? [], `${path}.preconditions`),
    steps: readArray(raw.steps, `${path}.steps`).map((step, i) =>
      readStep(step, `${path}.steps[${i}]`),
    ),
    test_data: readObject(raw.test_data ?? {}, `${path}.test_data`),
    priority: readEnum<Priority>(raw.priority, PRIORITIES, `${path}.priority`),
    tags: readStringArray(raw.tags ?? [], `${path}.tags`),
    source: readEnum<TestCaseSource>(raw.source, SOURCES, `${path}.source`),
  };
}

/**
 * Parse and validate a generated suite. Accepts an already-parsed value, or the raw text
 * a model returned.
 */
export function parseTestCaseResult(input: unknown): TestCaseGenerationResult {
  const root = readObject(toJsonValue(input), 'result');

  return {
    test_cases: readArray(root.test_cases, 'test_cases').map((item, i) =>
      readCase(item, `test_cases[${i}]`),
    ),
    assumptions: readStringArray(root.assumptions ?? [], 'assumptions'),
  };
}

// ---------------------------------------------------------------------------
// Policy, deliberately separate from shape.
// ---------------------------------------------------------------------------

/**
 * Refuse a suite that claims inferred rules without declaring them.
 *
 * Kept out of `parseTestCaseResult` on purpose: such a suite is well-formed, just not
 * yet trustworthy. A caller importing cases for review wants them; a caller promoting
 * them into the run wants this gate first.
 *
 * The check is coarse — assumptions are free text, so we can verify that *some* were
 * declared, not that each inferred case is covered. That is the honest limit of an
 * automated check here; the review is a human one.
 */
export function assertGrounded(result: TestCaseGenerationResult): void {
  const inferred = result.test_cases.filter((c) => c.source === 'inferred');
  if (inferred.length === 0) return;
  if (result.assumptions.length > 0) return;

  throw new ContractError(
    `${inferred.length} case khai source="inferred" nhưng assumptions rỗng: ` +
      `${inferred.map((c) => c.test_case_id).join(', ')}. ` +
      'Case inferred là giả định chưa ai xác nhận — phải nêu rõ giả định trước khi dùng.',
  );
}
