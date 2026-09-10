/**
 * Một lời gọi: file Excel vào, file JSON ra.
 *
 * Đây là điểm tích hợp cho pipeline sinh test script. Mọi thứ bên dưới —
 * `readXlsxFile` và `importTestCasesFromSheets` — vẫn export riêng cho ai cần từng mảnh,
 * nhưng flow tự động chỉ cần đúng hàm này.
 *
 * Tách khỏi `from-excel.ts` vì file đó cố ý **thuần**: nhận bảng, trả hợp đồng, không
 * đụng tới đĩa. Giữ được tính thuần đó thì phần dịch còn test được mà không cần file
 * thật, còn phần I/O gom hết về đây.
 */
import fs from 'node:fs';
import path from 'node:path';
import { readXlsxFile } from '../utils/xlsx.util';
import {
  importTestCasesFromSheets,
  type ImportOptions,
  type ImportReport,
} from './from-excel';
import type { TestCaseGenerationResult } from './types';

/**
 * Hình dạng file JSON ghi ra đĩa — cố tình mỏng.
 *
 * Chỉ có thứ bước sinh script cần đọc: tổng số case, và danh sách case. Phần chẩn đoán
 * (thiếu gì, case nào) nằm ở `report` trong giá trị trả về, không ghi vào file: nó phục
 * vụ người sửa file Excel, không phục vụ máy đọc JSON.
 */
export interface ExcelJsonFile {
  summary: { total: number };
  test_cases: TestCaseGenerationResult['test_cases'];
}

export interface ConvertExcelResult {
  /** Đường dẫn file JSON vừa ghi. */
  jsonPath: string;
  /** Toàn bộ case đọc được, kể cả case còn thiếu dữ kiện. */
  result: TestCaseGenerationResult;
  /** Chỉ case không còn thiếu gì — phần dùng được ngay cho bước sinh script. */
  ready: TestCaseGenerationResult;
  /** Thiếu gì, case nào, bao nhiêu. Đây là thứ pipeline dùng để quyết định đi tiếp hay dừng. */
  report: ImportReport;
}

/**
 * Đọc `excelPath`, dịch sang hợp đồng test case, ghi JSON vào `outputDir`.
 *
 * Tên file JSON bám theo tên file Excel — `TestCase_v1.0.xlsx` ra `TestCase_v1.0.json`.
 * Nhờ vậy đọc JSON là biết nó sinh từ file nào, và chạy trên hai file khác nhau thì hai
 * kết quả không ghi đè nhau. Thư mục đích được tạo nếu chưa có.
 *
 * File ghi ra có đúng hai khoá — xem `ExcelJsonFile`:
 *
 *   { "summary": { "total": 21 }, "test_cases": [ ... ] }
 *
 * Chẩn đoán chi tiết KHÔNG vào file mà nằm ở `report` trong giá trị trả về; nó phục vụ
 * người sửa Excel, còn file JSON phục vụ bước sinh script.
 *
 *   const { jsonPath, report } = convertExcelToTestCases('cases/Login.xlsx', 'out');
 *   if (report.ready === 0) throw new Error('Chưa case nào đủ dữ kiện để sinh script.');
 *
 * Ném lỗi khi file không đọc được (không phải .xlsx, thiếu workbook). Còn case thiếu dữ
 * kiện thì KHÔNG ném — chúng đi vào `report`, vì một file 300 case thiếu vài chỗ vẫn
 * đáng chạy tiếp với phần còn lại.
 */
export function convertExcelToTestCases(
  excelPath: string,
  outputDir: string,
  options: ImportOptions = {},
): ConvertExcelResult {
  const sheets = readXlsxFile(excelPath);
  const { result, ready, report } = importTestCasesFromSheets(sheets, options);

  fs.mkdirSync(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, `${path.parse(excelPath).name}.json`);

  const file: ExcelJsonFile = {
    summary: { total: report.total },
    test_cases: result.test_cases,
  };
  fs.writeFileSync(jsonPath, JSON.stringify(file, null, 2), 'utf8');

  return { jsonPath, result, ready, report };
}
