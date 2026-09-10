/**
 * Đọc một file `.xlsx` thành `SheetRows[]` — không thêm dependency nào.
 *
 * `.xlsx` là một file ZIP chứa XML. Node có sẵn `zlib.inflateRawSync`, nên phần còn lại
 * chỉ là đọc central directory của ZIP và bóc vài file XML. Một thư viện Excel đầy đủ
 * (exceljs, xlsx) kéo theo hàng megabyte và cả trăm dependency, cho một việc mà kit chỉ
 * cần đúng một chiều: đọc ô ra chuỗi.
 *
 * Không hỗ trợ: công thức (đọc giá trị đã tính), định dạng, ô gộp (chỉ ô góc trên trái
 * giữ giá trị — đúng như Excel lưu), ZIP64.
 */
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

/**
 * Một sheet đã bóc thành các dòng; key của mỗi dòng là chữ cột Excel (`A`, `B`, ...).
 *
 * Kiểu này ở utils chứ không ở contract vì nó chỉ mô tả "một bảng", không biết gì về test
 * case. `src/contract/from-excel.ts` tiêu thụ nó — phụ thuộc chảy xuống, không ngược lên.
 */
export interface SheetRows {
  name: string;
  rows: Record<string, string>[];
}

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;

/** Bóc mọi entry của ZIP thành map path -> nội dung. */
function unzip(buffer: Buffer): Map<string, Buffer> {
  // EOCD nằm ở cuối file, sau nó chỉ có comment (tối đa 64KB) nên quét ngược là đủ.
  let eocd = -1;
  for (let i = buffer.length - 22; i >= 0 && i > buffer.length - 22 - 0xffff; i -= 1) {
    if (buffer.readUInt32LE(i) === EOCD_SIGNATURE) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw new Error('Không phải file .xlsx hợp lệ: thiếu ZIP end-of-central-directory.');

  const entryCount = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const files = new Map<string, Buffer>();

  for (let i = 0; i < entryCount; i += 1) {
    if (buffer.readUInt32LE(offset) !== CENTRAL_SIGNATURE) break;

    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);

    // Local header có độ dài name/extra RIÊNG, thường khác central directory — đọc lại
    // ở đó, đừng dùng lại số của central, nếu không lệch vị trí dữ liệu.
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const raw = buffer.subarray(dataStart, dataStart + compressedSize);

    files.set(name, method === 0 ? raw : inflateRawSync(raw));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

const decodeEntities = (s: string): string =>
  s
    .replace(/&#10;/g, '\n')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

function parseSharedStrings(xml: string | undefined): string[] {
  if (!xml) return [];
  const out: string[] = [];
  for (const si of xml.split('<si>').slice(1)) {
    // Rich text tách một ô thành nhiều <t>; nối lại mới ra chuỗi người dùng thấy.
    const parts = [...si.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1]);
    out.push(decodeEntities(parts.join('')));
  }
  return out;
}

function parseRows(xml: string, shared: string[]): Record<string, string>[] {
  const rows: Record<string, string>[] = [];

  for (const chunk of xml.split(/<row /).slice(1)) {
    const cells: Record<string, string> = {};
    // Ô rỗng ở dạng tự đóng `<c r="F12" s="2"/>`. Không khớp nhánh đó RIÊNG thì regex
    // nuốt sang ô kế tiếp và toàn bộ cột lệch — lỗi im lặng, số liệu vẫn trông đúng.
    for (const m of chunk.matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const [, column, attrs, body = ''] = m;
      const value = (body.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
      const inline = (body.match(/<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>/) || [])[1];

      if (inline !== undefined) cells[column] = decodeEntities(inline);
      else if (value !== undefined) {
        cells[column] = /t="s"/.test(attrs) ? (shared[+value] ?? '') : decodeEntities(value);
      }
    }
    if (Object.keys(cells).length) rows.push(cells);
  }
  return rows;
}

/**
 * Đọc workbook thành danh sách sheet, đúng thứ tự hiển thị trong Excel.
 *
 * Tên sheet -> file XML đi qua `r:id` và `workbook.xml.rels`, KHÔNG suy theo thứ tự tên
 * file: Excel không đảm bảo sheet thứ N nằm ở `sheetN.xml`. Xoá hoặc đổi thứ tự sheet là
 * lệch, và lệch im lặng — vẫn ra dữ liệu, chỉ là của sheet khác.
 */
export function readXlsxFile(filePath: string): SheetRows[] {
  const files = unzip(readFileSync(filePath));
  const text = (name: string): string | undefined => files.get(name)?.toString('utf8');

  const workbook = text('xl/workbook.xml');
  if (!workbook) throw new Error(`Không đọc được xl/workbook.xml trong "${filePath}".`);

  const shared = parseSharedStrings(text('xl/sharedStrings.xml'));

  // Đọc từng thẻ rồi bóc thuộc tính RIÊNG, không bắt chúng theo thứ tự: thứ tự thuộc
  // tính XML là tuỳ ý, và Excel đổi nó giữa các phiên bản. Một file ghi
  // `<sheet name=… r:id=…>`, file khác ghi `<sheet state="visible" name=… r:id=…>` —
  // regex đòi `name` đứng ngay sau `<sheet ` sẽ trả về 0 sheet, im lặng.
  const attr = (tag: string, key: string): string | undefined =>
    tag.match(new RegExp(`\\b${key}="([^"]*)"`))?.[1];

  const targetById = new Map<string, string>();
  for (const [tag] of (text('xl/_rels/workbook.xml.rels') ?? '').matchAll(/<Relationship\b[^>]*>/g)) {
    const id = attr(tag, 'Id');
    const target = attr(tag, 'Target');
    if (id && target) targetById.set(id, target.replace(/^\/?xl\//, '').replace(/^\.\.\//, ''));
  }

  const sheets: SheetRows[] = [];
  for (const [tag] of workbook.matchAll(/<sheet\b[^>]*>/g)) {
    const rawName = attr(tag, 'name');
    const relationshipId = attr(tag, 'r:id');
    if (!rawName || !relationshipId) continue;

    const target = targetById.get(relationshipId);
    if (!target?.startsWith('worksheets/')) continue;

    const xml = text(`xl/${target}`);
    if (!xml) continue;
    sheets.push({ name: decodeEntities(rawName), rows: parseRows(xml, shared) });
  }
  return sheets;
}
