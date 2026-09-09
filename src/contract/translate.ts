import { ContractError } from './errors';
import type { StepAction } from './types';

/** Playwright calls a translated step maps onto. */
export type PlaywrightVerb =
  | 'click'
  | 'fill'
  | 'expect'
  | 'goto'
  | 'selectOption'
  | 'waitFor'
  | 'mouse';

export interface TranslatedAction {
  verb: PlaywrightVerb;
  /**
   * True when Playwright has no single equivalent and the project must supply the
   * gesture itself. Saying so is the point: an invented mapping for `swipe` would look
   * right and be wrong in every project that inherited it.
   */
  custom: boolean;
}

const MAP: Readonly<Record<StepAction, TranslatedAction>> = Object.freeze({
  tap: { verb: 'click', custom: false },
  input: { verb: 'fill', custom: false },
  verify: { verb: 'expect', custom: false },
  navigate: { verb: 'goto', custom: false },
  select: { verb: 'selectOption', custom: false },
  wait: { verb: 'waitFor', custom: false },
  // Distance, direction and target element all matter; there is no one call.
  swipe: { verb: 'mouse', custom: true },
  scroll: { verb: 'mouse', custom: true },
});

/** Map a contract verb onto a Playwright call. Throws on a verb outside the contract. */
export function translateAction(action: StepAction): TranslatedAction {
  const mapped = MAP[action];
  if (!mapped) {
    throw new ContractError(
      `Verb "${action}" không có trong hợp đồng. Verb hợp lệ: ${Object.keys(MAP).join(', ')}.`,
    );
  }
  return { ...mapped };
}
