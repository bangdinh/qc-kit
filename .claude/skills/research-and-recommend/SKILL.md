---
name: research-and-recommend
description: Quy trinh xu ly cho MOI cho khong chac chan - hoi lai thay vi doan, keo tai lieu tu nguon uy tin ve doc, roi dua ra de xuat kem nhan dinh. Kich hoat khi sap tra loi mot cau chua chac dung, khi chon giua nhieu phuong an, khi gap thu vien/API/quy uoc chua nam ro, khi user hoi "nen dung cai nao", "co dung khong", "tai sao", hoac khi sap viet mot con so/hanh vi ma minh khong tu kiem chung duoc.
---

# Không chắc thì hỏi — đọc nguồn uy tín — rồi mới đề xuất

Ba bước, không bỏ bước. Bỏ bước 1 thì làm sai việc; bỏ bước 2 thì nói sai; bỏ bước 3 thì đẩy
việc quyết định ngược lại cho người hỏi.

Luật gốc: **suy đoán không được trình bày như sự thật.** Một câu không kiểm chứng được phải
mang nhãn "chưa kiểm chứng", hoặc không được viết ra.

---

## Bước 1 — Hỏi, hay tự quyết?

| Tự quyết, nói rõ giả định rồi làm tiếp | Dừng lại và HỎI |
|---|---|
| Có mặc định hợp lý, chọn sai thì sửa rẻ | Hai cách hiểu dẫn tới **khối lượng công việc khác hẳn nhau** |
| Câu trả lời đã nằm trong repo/tài liệu — **tra, đừng hỏi** | Cần thứ chỉ người mới có: tài khoản, quyền, số liệu thật, ưu tiên nghiệp vụ |
| Chi tiết nội bộ không lộ ra ngoài (tên biến, bố cục file) | Việc **khó lùi**: xoá dữ liệu, ghi lên Jira/SharePoint của người khác, publish, push |
| Việc phụ không phụ thuộc chỗ đang mơ hồ → **làm trước** | Đoán sai thì toàn bộ phần đã làm thành bỏ đi |

Hỏi thì hỏi **một lần, gọn, kèm đề xuất mặc định** — không hỏi nhỏ giọt từng câu, không hỏi
lại thứ user đã trả lời.

⚠️ **Bẫy hay mắc**: hỏi những thứ tra được. Convention của project nằm trong `docs/`, tên
transition Jira lấy bằng `jira.sh transitions`, tên field lấy bằng cách đọc DOM thật. Hỏi mấy
thứ đó là đẩy việc sang user chứ không phải cẩn thận.

## Bước 2 — Kéo nguồn uy tín về đọc

Không trả lời từ trí nhớ những thứ **kiểm chứng được**. Đọc thật, rồi mới viết.

| Loại câu hỏi | Nguồn uy tín | Cách lấy |
|---|---|---|
| Yêu cầu nghiệp vụ, business rule, validation | **SRS trên SharePoint** (`6-Web-First`) — thẩm quyền cao nhất | MCP SharePoint. **WebFetch trả 401**, đừng thử. Không đoán tên folder — hỏi tester |
| Trạng thái việc, ticket, point | Jira `jira.fcam.vn` | skill `jira` |
| Convention của chính project | `docs/*.md`, `README.md`, `STRUCTURE.md` trong repo | Read — **đọc lại mỗi phiên**, không dùng trí nhớ phiên trước |
| API / hành vi thư viện (Playwright, playwright-bdd, Appium…) | Doc chính thức **của đúng version đang cài** + CHANGELOG | Xem version trong `package.json` **trước**, rồi WebFetch doc đúng version |
| Hành vi app thật | app beta/staging | Playwright / browser — ghi **nguyên văn** cái quan sát được |
| Model, API, giá của Claude | skill `claude-api` | không trả lời từ trí nhớ |

**Ba luật khi đọc:**

1. **Version phải khớp.** Đọc doc mới nhất rồi áp cho version đang cài là cách sai phổ biến
   nhất và khó phát hiện nhất — API đổi, mặc định đổi, tên option đổi.
2. **Thứ tự thẩm quyền: SRS > Figma > hành vi app thật.** App chạy khác SRS thì **app sai** —
   đó là bug, không phải "sự thật hiển nhiên". Đừng lấy hành vi app làm đặc tả.
3. **Quan sát ≠ suy diễn.** Cái nhìn thấy trên DOM/response thì ghi thẳng; cái suy ra từ hình
   ảnh hay từ tên gọi thì phải gắn nhãn `(TBD)` / "suy đoán, chưa xác nhận".

Nguồn không tra được (link chết, cần đăng nhập, không có tài liệu) → **nói ra là không tra
được**, đừng lấp bằng trí nhớ.

## Bước 3 — Đề xuất kèm nhận định, không phải danh sách lựa chọn

Liệt kê 3 phương án rồi hỏi "anh chọn cái nào" là chưa làm xong việc. Một câu trả lời đạt gồm
đủ bốn phần:

```
Đề xuất:   chọn X.
Vì:        2–3 lý do, mỗi lý do neo vào cái vừa đọc được (kèm nguồn).
Đánh đổi:  chọn X thì mất gì — nói thẳng, đừng giấu.
Đổi ý nếu: điều kiện cụ thể làm kết luận này sai.
```

Kèm theo, luôn ghi rõ **cái chưa kiểm chứng**: "phần này tôi đọc được từ doc v1.57; hành vi
thật trên môi trường beta thì chưa chạy thử."

Nhận định phải **có sức nặng**: nói cái nào tốt hơn và tốt hơn ở đâu. Trung lập giả vờ ("cái
nào cũng có ưu nhược điểm") là né tránh, không phải khách quan.

## Khi bị phản bác

User bảo sai → **kiểm tra lại bằng nguồn**, đừng đổi ý ngay chỉ vì bị nói. Sai thật thì sửa
gọn một câu rồi đi tiếp, không xin lỗi dài, không kể lại quá trình. Đúng thì đưa bằng chứng
đã đọc và giữ nguyên kết luận.

## Không bao giờ

- Bịa số đo, tên API, tên field, tên transition, đường dẫn file, hay tên folder SharePoint.
- Trình bày suy đoán mà không gắn nhãn suy đoán.
- Trả lời "chắc là…", "thường thì…" cho câu hỏi tra được trong 30 giây.
- Hỏi lại thứ đã có sẵn trong repo.
- Nói "đã xong" khi mới chỉ chạy một phần — nói rõ phần nào chưa làm và vì sao.
