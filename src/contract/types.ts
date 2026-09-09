/**
 * The test-case contract — the one shape every producer and every consumer agrees on.
 *
 * Producers: `platform-qc-agent` (generated), a `.spec.ts` declaring `qc.case(...)`,
 * a `.feature` file, a hand-written CSV. Consumers: the report pipeline (Excel,
 * OVERVIEW, RUN_HISTORY), and the step translator that turns a case into Playwright
 * calls.
 *
 * Mirrors `platform_qc_agent/schemas.py` on the `development` branch. That file is the
 * producer's source of truth and this one is the consumer's; they are kept in step by a
 * check, not by memory — see `docs/testcase-standard.md`.
 */

/**
 * The verbs a step may use.
 *
 * Constrained on purpose: a step is meant to be executable, not prose. An unknown verb
 * fails validation loudly here rather than becoming a step nobody can run.
 */
export const STEP_ACTIONS = [
  'tap',
  'input',
  'swipe',
  'scroll',
  'wait',
  'verify',
  'navigate',
  'select',
] as const;

export type StepAction = (typeof STEP_ACTIONS)[number];

export const PRIORITIES = ['High', 'Medium', 'Low'] as const;
export type Priority = (typeof PRIORITIES)[number];

/**
 * Where a case's business rules came from.
 *
 * `inferred` means nobody stated the rule — the case is an assumption and must be
 * reviewed before it is trusted. Making this explicit is what turns "the model might
 * have made this up" into a filter you can act on: invented cases are exactly the
 * plausible-sounding ones, so they cannot be spotted by reading.
 */
export const SOURCES = ['requirement', 'context', 'inferred'] as const;
export type TestCaseSource = (typeof SOURCES)[number];

export interface TestStep {
  /** 1-based, within this test case. */
  no: number;
  /** snake_case identifier of the screen, e.g. `livestream_setup`. */
  screen: string;
  action: StepAction;
  /** snake_case identifier of the element acted on, e.g. `start_live_button`. */
  target: string;
  /** What the tester does. */
  description: string;
  /** Observable result of this step. */
  expected: string;
}

export interface TestCase {
  /** `TC_<flow_key>_<3 digits>` from the generator, or `<MODULE>-<NN><a-z>` by hand. */
  test_case_id: string;
  title: string;
  preconditions: string[];
  steps: TestStep[];
  /** Free-shaped key/value data for this case — one `Examples:` row, in Gherkin terms. */
  test_data: Record<string, unknown>;
  priority: Priority;
  tags: string[];
  source: TestCaseSource;
}

export interface TestCaseGenerationResult {
  test_cases: TestCase[];
  /**
   * One line per unstated fact a case relied on. Must cover every case whose `source`
   * is `inferred` — enforced by `assertGrounded()`, not by the shape check, because a
   * suite that fails it is still well-formed, just not yet trustworthy.
   */
  assumptions: string[];
}
