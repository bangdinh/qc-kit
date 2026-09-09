import { expect, test } from '@playwright/test';
import { STEP_ACTIONS } from './types';
import { translateAction } from './translate';

test.describe('translateAction', () => {
  test('sáu verb ánh xạ thẳng sang Playwright', () => {
    expect(translateAction('tap')).toEqual({ verb: 'click', custom: false });
    expect(translateAction('input')).toEqual({ verb: 'fill', custom: false });
    expect(translateAction('verify')).toEqual({ verb: 'expect', custom: false });
    expect(translateAction('navigate')).toEqual({ verb: 'goto', custom: false });
    expect(translateAction('select')).toEqual({ verb: 'selectOption', custom: false });
    expect(translateAction('wait')).toEqual({ verb: 'waitFor', custom: false });
  });

  /**
   * Playwright không có một lời gọi tương đương cho swipe/scroll — cử chỉ phụ thuộc
   * khoảng cách, hướng và phần tử. Khai báo là cần handler riêng, thay vì bịa ra một
   * ánh xạ trông đúng rồi sinh ra code sai ở mọi dự án.
   */
  test('swipe và scroll khai báo rõ là cần handler riêng', () => {
    expect(translateAction('swipe')).toEqual({ verb: 'mouse', custom: true });
    expect(translateAction('scroll')).toEqual({ verb: 'mouse', custom: true });
  });

  test('mọi verb trong STEP_ACTIONS đều có ánh xạ', () => {
    for (const action of STEP_ACTIONS) {
      const mapped = translateAction(action);
      expect(mapped.verb, `verb "${action}" chưa được ánh xạ`).toBeTruthy();
    }
  });

  test('verb ngoài hợp đồng thì ném lỗi, không trả về mặc định im lặng', () => {
    expect(() => translateAction('teleport' as never)).toThrow(/teleport/);
  });
});
