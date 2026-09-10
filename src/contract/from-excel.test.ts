import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { convertExcelToTestCases } from './convert-excel';

/**
 * Chạy hàm tích hợp trên một file .xlsx THẬT, rồi để lại JSON cho người đọc soi bằng mắt.
 *
 * Đường dẫn đến từ `QC_EXCEL_FILE`, không hardcode: file test case là tri thức sản phẩm,
 * không thuộc kit (luật 2), và `make verify` phải chạy được trên máy chưa từng thấy file
 * đó. Không đặt biến thì test tự skip.
 *
 *   QC_EXCEL_FILE="C:/duong/dan/TestCase.xlsx" npx playwright test --project=unit -g Excel
 */
/**
 * Dùng dấu `/` kể cả trên Windows: trong chuỗi JS, `'C:\Users\FPT\Downloads'` mất sạch
 * backslash vì `\U` `\F` `\D` không phải escape hợp lệ — chuỗi thành `C:UsersFPTDownloads`
 * và Node đi tìm nó trong thư mục hiện tại. Node nhận `/` trên mọi hệ điều hành.
 */
const DEFAULT_EXCEL_FILE = 'C:/Users/FPT/Downloads/Device_Management_TestCase_v1.0.0.xlsx';
const EXCEL_FILE = process.env.QC_EXCEL_FILE || DEFAULT_EXCEL_FILE;

test('chuyển file Excel thật sang JSON để review', async ({}, testInfo) => {
  // Skip theo SỰ TỒN TẠI của file, không theo biến có được đặt hay không: đường dẫn mặc
  // định trỏ vào máy một người, nên trên máy khác test phải bỏ qua thay vì đỏ.
  test.skip(!fs.existsSync(EXCEL_FILE), `Không thấy file Excel: ${EXCEL_FILE}`);

  const { jsonPath, report } = convertExcelToTestCases(EXCEL_FILE, testInfo.outputDir);

  await testInfo.attach(path.basename(jsonPath), {
    path: jsonPath,
    contentType: 'application/json',
  });

  console.log(
    `\n  excel:  ${EXCEL_FILE}` +
    `\n  case:   ${report.total}  (sẵn sàng ${report.ready}, hợp lệ với hợp đồng ${report.contractValid})` +
    `\n  step:   ${report.translatedSteps} dịch được, ${report.stepsWithoutExpected} để trống expected` +
    `\n  json:   ${jsonPath}\n`,
  );

  // Đọc được file và ra được case là đủ cho mục đích của test này; chất lượng từng case
  // nằm trong `report`, và đó là thứ người đọc JSON tự đánh giá.
  expect(fs.existsSync(jsonPath), 'phải ghi ra file JSON').toBe(true);
  expect(path.parse(jsonPath).name, 'tên JSON phải khớp tên Excel').toBe(
    path.parse(EXCEL_FILE).name,
  );
  expect(report.total).toBeGreaterThan(0);
  expect(report.duplicateIds, 'id trùng nhau sẽ làm hạ nguồn gom nhầm case').toEqual([]);
});
