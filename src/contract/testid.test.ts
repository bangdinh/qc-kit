import { expect, test } from '@playwright/test';
import { toTestId } from './testid';

test.describe('toTestId — snake_case của generator sang data-testid của kit', () => {
  test('ghép module từ screen, viết tắt loại phần tử', () => {
    expect(toTestId('livestream_setup', 'start_live_button')).toBe(
      'livestream-start-live-btn',
    );
  });

  test('input giữ nguyên hậu tố', () => {
    expect(toTestId('login', 'company_code_input')).toBe('login-company-code-input');
  });

  test('không lặp prefix khi target đã mang tên module', () => {
    expect(toTestId('login', 'login_submit_button')).toBe('login-submit-btn');
  });

  test('loại phần tử không có trong bảng thì giữ nguyên', () => {
    expect(toTestId('home', 'welcome_banner')).toBe('home-welcome-banner');
  });

  test('bảng viết tắt phủ các loại hay gặp', () => {
    expect(toTestId('device', 'add_dialog')).toBe('device-add-modal');
    expect(toTestId('device', 'name_error')).toBe('device-name-error');
    expect(toTestId('device', 'unit_dropdown')).toBe('device-unit-select');
  });

  test('module chỉ lấy đoạn đầu của screen', () => {
    expect(toTestId('places_detail_edit', 'save_button')).toBe('places-save-btn');
  });

  test('override được module khi heuristic đoán sai', () => {
    expect(toTestId('places_detail_edit', 'save_button', { module: 'place-detail' })).toBe(
      'place-detail-save-btn',
    );
  });

  test('override được bảng viết tắt', () => {
    expect(
      toTestId('login', 'submit_button', { abbreviations: { button: 'button' } }),
    ).toBe('login-submit-button');
  });

  test('target rỗng thì ném lỗi thay vì trả ra id cụt', () => {
    expect(() => toTestId('login', '  ')).toThrow(/target/);
  });

  test('screen rỗng thì ném lỗi', () => {
    expect(() => toTestId('', 'save_button')).toThrow(/screen/);
  });
});
