/**
 * Placeholder syntax: `__UPPER_SNAKE__`.
 *
 * Uppercase-only on purpose — `__dirname` and `__filename` appear in generated code and
 * must not be mistaken for placeholders.
 */
const PLACEHOLDER = /__([A-Z][A-Z0-9_]*)__/g;

/**
 * Fill a template. Throws when a placeholder has no value.
 *
 * The throw is the point: a typo'd placeholder that renders silently ships a file with
 * `__NAME__` sitting in the middle of the code, and the user finds out when they run it
 * rather than when they generate it.
 */
export function render(template: string, vars: Record<string, string>): string {
  const missing = new Set<string>();

  const out = template.replace(PLACEHOLDER, (whole, key: string) => {
    if (!(key in vars)) {
      missing.add(key);
      return whole;
    }
    return vars[key];
  });

  if (missing.size > 0) {
    throw new Error(
      `Template còn placeholder chưa có giá trị: ${[...missing].join(', ')}. ` +
        'Thêm giá trị vào scaffold, hoặc sửa lại tên trong template.',
    );
  }
  return out;
}
