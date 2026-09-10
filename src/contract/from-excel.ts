/**
 * Excel test case viết tay  ->  `TestCaseGenerationResult`.
 *
 * Đây là cửa vào thứ hai của hợp đồng, cạnh `platform-qc-agent`: nhiều đội đã có sẵn
 * hàng trăm case trong Excel và không viết lại chúng chỉ để tự động hoá được.
 *
 * Nguyên tắc xuyên suốt: **thiếu thì để trống và báo cáo, không đoán.** Một `target` suy
 * đoán sẽ thành một locator bịa, và locator bịa trông y hệt locator thật cho tới lúc
 * chạy. Vì vậy hàm này trả về ba thứ: bản dịch đầy đủ, phần đủ dữ kiện, và một báo cáo
 * nói case nào còn thiếu gì — thứ dùng để quyết định sửa cột nào trong file trước.
 *
 * Hàm thuần: nhận dữ liệu bảng đã đọc sẵn, không đụng tới đĩa và không cần thư viện đọc
 * .xlsx. Việc bóc file thành `SheetRows` là của caller.
 */
import type { SheetRows } from '../utils/xlsx.util';
import { ContractError } from './errors';
import type { Priority, StepAction, TestCase, TestCaseGenerationResult, TestStep } from './types';
import { parseTestCaseResult } from './validate';

// Đọc file .xlsx là việc của `src/utils/xlsx.util.ts` — một tiện ích định dạng file,
// không biết gì về test case. Module này chỉ nhận bảng đã bóc sẵn và dịch sang hợp đồng.
export type { SheetRows };

/** Cột nào mang thông tin gì — tìm theo nhãn ở dòng tiêu đề, không theo vị trí. */
export interface HeaderLabels {
  id: string[];
  title: string[];
  steps: string[];
  expected: string[];
  priority: string[];
  screenRef: string[];
  testData?: string[];
  condition?: string[];
}

export type VerbRule = readonly [RegExp, StepAction];

export interface ImportOptions {
  headers?: Partial<HeaderLabels>;
  /** Ghi đè bảng động từ. Mặc định là tiếng Việt. */
  verbs?: readonly VerbRule[];
  /** Dòng khớp mẫu này là điều kiện, không phải hành động. */
  conditionPattern?: RegExp;
}

export interface CaseReport {
  id: string;
  sheet: string;
  title: string;
  priority: Priority;
  stepCount: number;
  issues: string[];
}

export interface ImportReport {
  total: number;
  /** Case không còn thiếu dữ kiện nào để sinh script. */
  ready: number;
  /**
   * Case qua được `parseTestCaseResult`.
   *
   * Khác `ready`, và cố ý đếm riêng: hợp đồng bắt MỌI step phải có `expected`, trong khi
   * file viết tay chỉ khai một Expected cho cả case. Case nhiều bước vì thế đủ dữ kiện
   * để sinh script nhưng không qua validator — hai câu hỏi khác nhau, hai con số.
   */
  contractValid: number;
  translatedSteps: number;
  /** Step để `expected` trống vì file không khai riêng cho bước đó. */
  stepsWithoutExpected: number;
  /** Dòng trong cột Steps hoá ra là điều kiện, đã chuyển sang preconditions. */
  movedToPreconditions: number;
  /** Dòng không nhận ra động từ nào. */
  untranslatedLines: number;
  /** Id xuất hiện nhiều hơn một lần — hạ nguồn sẽ gom nhầm chúng làm một case. */
  duplicateIds: string[];
  issuesByReason: Record<string, number>;
  cases: CaseReport[];
  skippedSheets: string[];
}

/**
 * Ranh giới sau động từ là `(?=\s|$)`, KHÔNG phải `\b`.
 *
 * Chữ có dấu như `ở` không phải word character trong regex JS, nên `/^mở\b/` không khớp
 * "Mở dialog" — lỗi này từng làm trượt hàng chục dòng mà không có dấu hiệu gì.
 */
export const DEFAULT_VERBS: readonly VerbRule[] = [
  [/^(click|bấm|nhấn|chạm)(?=\s|$)/i, 'tap'],
  [/^(nhập|điền|gõ|paste|dán)(?=\s|$)/i, 'input'],
  [/^(chọn|tick|check|bỏ tick|uncheck|đổi sang|đổi lại|đổi|áp dụng)(?=\s|$)/i, 'select'],
  [/^(mở|vào|truy cập|điều hướng|chuyển sang|chuyển|quay lại|reload|tải lại|tải lên|tải|đăng nhập)(?=\s|$)/i, 'navigate'],
  [/^(quan sát|kiểm tra|xác nhận|verify|đảm bảo|so sánh|tìm|lọc)(?=\s|$)/i, 'verify'],
  [/^(chờ|đợi)(?=\s|$)/i, 'wait'],
  [/^(cuộn|scroll|kéo xuống|kéo lên)(?=\s|$)/i, 'scroll'],
  [/^(kéo thả|kéo)(?=\s|$)/i, 'swipe'],
];

export const DEFAULT_CONDITION =
  /^(ở|khi|với|giả sử|trong trường hợp|trong|nếu|đang ở|tại|đã|đang|sau khi)(?=\s|$)/i;

const DEFAULT_HEADERS: HeaderLabels = {
  id: ['No', 'ID', 'Test Case ID'],
  title: ['Test Case', 'Title', 'Tên case'],
  steps: ['Steps', 'Các bước'],
  expected: ['Expected Result', 'Expected', 'Kết quả mong đợi'],
  priority: ['Automation Priority', 'Priority', 'Độ ưu tiên'],
  screenRef: ['Component ref', 'Screen', 'Màn hình'],
  testData: ['Test Data', 'Dữ liệu'],
  condition: ['Condition', 'Precondition', 'Điều kiện'],
};

/** snake_case không dấu — dạng hợp đồng dùng cho `screen` và `target`. */
export function toSnake(value: string): string {
  return String(value)
    // Tách camelCase TRƯỚC khi hạ chữ thường, nếu không `AddDialog` ra `adddialog`.
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

/**
 * Phần tử được thao tác = chuỗi trong ngoặc kép, đúng cách các đội vốn đã viết case:
 * `Click nút "Xác nhận"` -> `xac_nhan`. Không có ngoặc kép thì trả rỗng.
 */
export function extractTarget(line: string): string {
  const quoted = line.match(/["“”'‘’]([^"“”'‘’]{2,60})["“”'‘’]/);
  return quoted ? toSnake(quoted[1]) : '';
}

function toPriority(raw: string): Priority {
  if (/high|cao/i.test(raw)) return 'High';
  if (/medium|trung/i.test(raw)) return 'Medium';
  return 'Low';
}

/** Case này có qua được validator của hợp đồng không. */
function passesContract(testCase: TestCase): boolean {
  try {
    parseTestCaseResult(JSON.stringify({ test_cases: [testCase], assumptions: [] }));
    return true;
  } catch {
    return false;
  }
}

/** Vị trí cột theo nhãn ở dòng tiêu đề. `null` khi sheet không có dòng tiêu đề nào. */
function locateColumns(
  rows: Record<string, string>[],
  labels: HeaderLabels,
): { headerIndex: number; columns: Partial<Record<keyof HeaderLabels, string>> } | null {
  const wanted = Object.entries(labels) as [keyof HeaderLabels, string[]][];

  for (let i = 0; i < rows.length; i += 1) {
    const columns: Partial<Record<keyof HeaderLabels, string>> = {};
    for (const [col, value] of Object.entries(rows[i])) {
      const hit = wanted.find(([, names]) =>
        names.some((n) => n.toLowerCase() === String(value).trim().toLowerCase()),
      );
      if (hit) columns[hit[0]] = col;
    }
    // Tiêu đề thật phải có ít nhất id + steps; vài dòng đầu file hay là tiêu đề trang.
    if (columns.id && columns.steps) return { headerIndex: i, columns };
  }
  return null;
}

export function importTestCasesFromSheets(
  sheets: SheetRows[],
  options: ImportOptions = {},
): { result: TestCaseGenerationResult; ready: TestCaseGenerationResult; report: ImportReport } {
  const labels = { ...DEFAULT_HEADERS, ...options.headers } as HeaderLabels;
  const verbs = options.verbs ?? DEFAULT_VERBS;
  const conditionPattern = options.conditionPattern ?? DEFAULT_CONDITION;

  const cases: TestCase[] = [];
  const reports: CaseReport[] = [];
  const skippedSheets: string[] = [];
  let movedToPreconditions = 0;
  let untranslatedLines = 0;
  let stepsWithoutExpected = 0;

  for (const sheet of sheets) {
    const located = locateColumns(sheet.rows, labels);
    if (!located) {
      skippedSheets.push(sheet.name);
      continue;
    }
    const { headerIndex, columns } = located;
    const cell = (row: Record<string, string>, key: keyof HeaderLabels): string => {
      const col = columns[key];
      return col ? String(row[col] ?? '').trim() : '';
    };

    for (const row of sheet.rows.slice(headerIndex + 1)) {
      // Id lấy NGUYÊN VĂN ô 'No' — đây là khoá đội dùng để đối chiếu ngược về Excel, nên
      // kit không thêm tiền tố, không chuẩn hoá. Trùng id thì báo cáo, không tự đổi.
      const id = cell(row, 'id');
      if (!/^[A-Za-z]+\d+(\.\d+)?$/.test(id)) continue;

      const screen = toSnake(cell(row, 'screenRef'));
      const expected = cell(row, 'expected');
      const testData = cell(row, 'testData');
      const issues: string[] = [];
      const steps: TestStep[] = [];
      const preconditions = [cell(row, 'condition')].filter(Boolean);

      for (const raw of cell(row, 'steps').split('\n')) {
        const line = raw.replace(/^\s*\d+[.)]\s*/, '').trim();
        if (!line) continue;

        if (conditionPattern.test(line)) {
          preconditions.push(line);
          movedToPreconditions += 1;
          continue;
        }

        const action = verbs.find(([re]) => re.test(line))?.[1];
        if (!action) {
          untranslatedLines += 1;
          issues.push(`không nhận ra động từ: "${line.slice(0, 48)}"`);
          continue;
        }

        const target = extractTarget(line);
        if (!target) {
          issues.push(`step thiếu target (phần tử không đặt trong ngoặc kép): "${line.slice(0, 48)}"`);
        }

        steps.push({ no: steps.length + 1, screen, action, target, description: line, expected: '' });
      }

      // File khai Expected ở mức case; hợp đồng đặt ở mức step. Bước cuối nhận kết quả
      // thật, các bước dẫn đường để TRỐNG — bịa một kỳ vọng cho chúng còn tệ hơn.
      if (steps.length && expected) steps[steps.length - 1].expected = expected;
      stepsWithoutExpected += steps.filter((s) => !s.expected).length;

      if (!steps.length) issues.push('không dịch được step nào');
      if (!screen) issues.push('thiếu screen (cột Component ref trống)');
      if (!expected) issues.push('thiếu Expected Result');
      if (steps.some((s) => s.action === 'input') && !testData) {
        issues.push('có bước nhập liệu nhưng Test Data trống');
      }

      const priority = toPriority(cell(row, 'priority'));

      cases.push({
        test_case_id: id,
        title: cell(row, 'title'),
        preconditions,
        steps,
        test_data: testData ? { raw: testData } : {},
        priority,
        tags: [`@${priority.toLowerCase()}`],
        source: 'requirement',
      });
      reports.push({ id, sheet: sheet.name, title: cell(row, 'title'), priority, stepCount: steps.length, issues });
    }
  }

  const seen = new Set<string>();
  const duplicateIds = [...new Set(cases.map((c) => c.test_case_id).filter((id) => !seen.has(id) ? (seen.add(id), false) : true))];

  const readyIds = new Set(reports.filter((r) => r.issues.length === 0).map((r) => r.id));
  const issuesByReason: Record<string, number> = {};
  for (const r of reports) {
    for (const issue of r.issues) {
      const key = issue.split(':')[0];
      issuesByReason[key] = (issuesByReason[key] ?? 0) + 1;
    }
  }

  const assumptions = [
    'Expected Result trong file ở mức case; hợp đồng đặt ở mức step nên chỉ bước cuối nhận nó, bước dẫn đường để trống.',
    'screen suy từ cột tham chiếu màn hình; case bỏ trống cột đó thì screen rỗng.',
    'target lấy từ chuỗi trong ngoặc kép của step; không có ngoặc kép thì để rỗng, không đoán.',
    'test_case_id lấy nguyên văn ô No trong Excel, không thêm tiền tố sheet.',
  ];

  return {
    result: { test_cases: cases, assumptions },
    ready: { test_cases: cases.filter((c) => readyIds.has(c.test_case_id)), assumptions },
    report: {
      total: reports.length,
      ready: readyIds.size,
      contractValid: cases.filter(passesContract).length,
      translatedSteps: cases.reduce((sum, c) => sum + c.steps.length, 0),
      stepsWithoutExpected,
      movedToPreconditions,
      untranslatedLines,
      duplicateIds,
      issuesByReason,
      cases: reports,
      skippedSheets,
    },
  };
}

export { ContractError };
