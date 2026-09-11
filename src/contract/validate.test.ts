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

  /**
   * Step KHÔNG còn field `target`. Case viết tay trong Excel không nêu phần tử ở một ô
   * riêng, và suy nó ra từ câu chữ là đoán — hợp đồng bỏ hẳn field này thay vì giữ một
   * field không producer nào điền được.
   */
  test('step không có target vẫn hợp lệ', () => {
    const out = parseTestCaseResult(valid);
    expect(out.test_cases[0].steps[0]).not.toHaveProperty('target');
  });

  /**
   * Step rút về đúng ba field: `no`, `description`, `expected`. `screen` và `action` đi
   * theo `target` vì cùng một lý do — case viết tay không có ô nào cho chúng.
   */
  test('step không có screen và action vẫn hợp lệ', () => {
    const out = parseTestCaseResult(valid);
    expect(Object.keys(out.test_cases[0].steps[0]).sort()).toEqual([
      'description',
      'expected',
      'no',
    ]);
  });

  test('field cũ thừa trong đầu vào thì bị bỏ qua, không làm hỏng case', () => {
    const legacy = {
      test_cases: [
        {
          ...validCase(),
          steps: [
            {
              ...validCase().steps[0],
              target: 'company_code_input',
              screen: 'login',
              action: 'input',
            },
          ],
        },
      ],
    };
    const out = parseTestCaseResult(legacy);
    for (const field of ['target', 'screen', 'action']) {
      expect(out.test_cases[0].steps[0], `còn sót ${field}`).not.toHaveProperty(field);
    }
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
