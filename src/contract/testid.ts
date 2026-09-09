import { ContractError } from './errors';

export interface TestIdOptions {
  /** Override the module prefix when the screen name does not imply it. */
  module?: string;
  /** Override or extend the element-type table, e.g. `{ button: 'button' }`. */
  abbreviations?: Record<string, string>;
}

/**
 * Element-type suffixes the kit's `data-testid` convention abbreviates. Anything not
 * listed passes through unchanged — the table shortens the handful of long words that
 * actually recur, it is not an allow-list.
 */
export const DEFAULT_ABBREVIATIONS: Readonly<Record<string, string>> = Object.freeze({
  button: 'btn',
  dialog: 'modal',
  dropdown: 'select',
});

function kebab(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Turn a generated step's `screen` + `target` into a `data-testid` in the kit's format:
 * `<module>-<field-or-action>-<element-type>`.
 *
 *   toTestId('livestream_setup', 'start_live_button')  ->  'livestream-start-live-btn'
 *
 * The module is the first segment of `screen` — a heuristic, and the reason `module` is
 * overridable. Pass it explicitly whenever the screen name is not the module name.
 */
export function toTestId(screen: string, target: string, opts: TestIdOptions = {}): string {
  if (!screen || !screen.trim()) {
    throw new ContractError('toTestId: screen rỗng — không suy ra được module prefix.');
  }
  if (!target || !target.trim()) {
    throw new ContractError('toTestId: target rỗng — không có phần tử nào để đặt tên.');
  }

  const module = kebab(opts.module ?? screen.trim().split(/[\s_]+/)[0]);
  const abbreviations = { ...DEFAULT_ABBREVIATIONS, ...opts.abbreviations };

  const parts = target.trim().toLowerCase().split(/[\s_]+/).filter(Boolean);
  const last = parts[parts.length - 1];
  if (abbreviations[last]) parts[parts.length - 1] = abbreviations[last];

  let name = parts.join('-');
  // The generator often repeats the module inside target (`login_submit_button`);
  // keeping both would produce `login-login-submit-btn`.
  if (name === module) return module;
  if (name.startsWith(`${module}-`)) name = name.slice(module.length + 1);

  return `${module}-${name}`;
}
