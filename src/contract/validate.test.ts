import { expect, test } from '@playwright/test';
import { assertGrounded, ContractError, parseTestCaseResult } from './validate';
import type { TestCase } from './types';

/** A minimal case that passes; each test mutates one thing away from valid. */
function validCase(over: Partial<TestCase> = {}): TestCase {
  return {
    test_case_id: 'TC_LOGIN_001',
    title: 'Đăng nhập bằng mã doanh nghiệp hợp lệ',
    preconditions: ['Chưa đăng nhập'],
    steps: [
      {
        no: 1,
        screen: 'login',
        action: 'input',
        target: 'company_code_input',
        description: 'Nhập mã doanh nghiệp',
        expected: 'Ô nhập hiện đúng giá trị',
      },
    ],
    test_data: { company: 'fpt' },
    priority: 'High',
    tags: ['smoke'],
    source: 'requirement',
    ...over,
  };
}

const valid = { test_cases: [validCase()], assumptions: [] };

test.describe('parseTestCaseResult — shape', () => {
  test('nhận một object hợp lệ', () => {
    const out = parseTestCaseResult(valid);
    expect(out.test_cases).toHaveLength(1);
    expect(out.test_cases[0].test_case_id).toBe('TC_LOGIN_001');
  });

  test('assumptions vắng mặt thì mặc định là mảng rỗng', () => {
    const out = parseTestCaseResult({ test_cases: [validCase()] });
    expect(out.assumptions).toEqual([]);
  });

  test('nhận chuỗi JSON', () => {
    const out = parseTestCaseResult(JSON.stringify(valid));
    expect(out.test_cases).toHaveLength(1);
  });
});

test.describe('parseTestCaseResult — dung thứ đóng gói, nghiêm với schema', () => {
  test('bóc markdown fence', () => {
    const out = parseTestCaseResult('```json\n' + JSON.stringify(valid) + '\n```');
    expect(out.test_cases).toHaveLength(1);
  });

  test('cứu JSON bị bọc trong lời dẫn', () => {
    const text = `Đây là các test case: ${JSON.stringify(valid)} Bạn cần thêm gì không?`;
    expect(parseTestCaseResult(text).test_cases).toHaveLength(1);
  });

  test('dấu ngoặc nhọn trong description không làm lệch việc đếm ngoặc', () => {
    const tricky = {
      test_cases: [
        validCase({ title: 'Hiển thị chuỗi { chưa đóng trong ô ghi chú' }),
      ],
      assumptions: [],
    };
    const text = `Kết quả: ${JSON.stringify(tricky)} — hết.`;
    expect(parseTestCaseResult(text).test_cases[0].title).toContain('{ chưa đóng');
  });

  test('không phải JSON thì báo lỗi hợp đồng, không ném SyntaxError trần', () => {
    expect(() => parseTestCaseResult('xin lỗi, tôi không tạo được test case')).toThrow(
      ContractError,
    );
  });
});

test.describe('parseTestCaseResult — từ chối schema sai, kèm đường dẫn', () => {
  test('verb lạ', () => {
    const bad = {
      test_cases: [validCase({ steps: [{ ...validCase().steps[0], action: 'click' }] as never })],
    };
    expect(() => parseTestCaseResult(bad)).toThrow(/test_cases\[0\]\.steps\[0\]\.action/);
  });

  test('thiếu test_case_id', () => {
    const { test_case_id, ...rest } = validCase();
    expect(() => parseTestCaseResult({ test_cases: [rest] })).toThrow(
      /test_cases\[0\]\.test_case_id/,
    );
  });

  test('steps không phải mảng', () => {
    expect(() => parseTestCaseResult({ test_cases: [validCase({ steps: 'nhiều' as never })] })).toThrow(
      /test_cases\[0\]\.steps/,
    );
  });

  test('priority sai', () => {
    expect(() =>
      parseTestCaseResult({ test_cases: [validCase({ priority: 'Urgent' as never })] }),
    ).toThrow(/priority/);
  });

  test('source sai', () => {
    expect(() =>
      parseTestCaseResult({ test_cases: [validCase({ source: 'guess' as never })] }),
    ).toThrow(/source/);
  });

  test('test_cases không phải mảng', () => {
    expect(() => parseTestCaseResult({ test_cases: {} })).toThrow(/test_cases/);
  });
});

test.describe('assertGrounded — chính sách, tách khỏi kiểm hình dạng', () => {
  test('case inferred mà không có assumptions thì hỏng', () => {
    const suite = parseTestCaseResult({
      test_cases: [validCase({ source: 'inferred' })],
      assumptions: [],
    });
    expect(() => assertGrounded(suite)).toThrow(/TC_LOGIN_001/);
  });

  test('case inferred có assumptions thì qua', () => {
    const suite = parseTestCaseResult({
      test_cases: [validCase({ source: 'inferred' })],
      assumptions: ['Giả định mã doanh nghiệp không phân biệt hoa thường'],
    });
    expect(() => assertGrounded(suite)).not.toThrow();
  });

  test('không có case inferred thì assumptions rỗng vẫn qua', () => {
    expect(() => assertGrounded(parseTestCaseResult(valid))).not.toThrow();
  });
});
