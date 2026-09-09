import { expect, test } from '@playwright/test';
import { render } from './render';

test('thay placeholder', () => {
  expect(render('name: __NAME__', { NAME: 'kho-hang' })).toBe('name: kho-hang');
});

test('thay mọi lần xuất hiện', () => {
  expect(render('__A__/__A__', { A: 'x' })).toBe('x/x');
});

/**
 * Cái bẫy thật của scaffold: gõ sai tên placeholder thì file vẫn được ghi ra, mang theo
 * `__TEN__` giữa code, và người dùng phát hiện lúc chạy chứ không phải lúc sinh.
 */
test('còn sót placeholder thì ném lỗi, không ghi ra file hỏng', () => {
  expect(() => render('a __NAME__ b __KHONG_CO__', { NAME: 'x' })).toThrow(/KHONG_CO/);
});

test('không nhầm __dirname là placeholder', () => {
  const src = 'const p = `file://${__dirname}/../app/`;';
  expect(render(src, {})).toBe(src);
});

test('giá trị rỗng vẫn là giá trị hợp lệ', () => {
  expect(render('[__X__]', { X: '' })).toBe('[]');
});
