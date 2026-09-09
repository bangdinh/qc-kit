# Kiến trúc — qc-kit

[README.md](README.md) nói về **cách chạy** suite. Tài liệu này nói về **vì sao nó có
hình dạng như vậy**: các tầng, luật phụ thuộc duy nhất giữ chúng tách nhau, và những
điểm nối mà một dự án mới cắm vào.

Tài liệu này cố ý không liệt kê file. Danh sách file sẽ lạc hậu ngay sau lần refactor đầu
tiên và từ đó trở đi nó gây hiểu sai — cây thư mục ở
[README §6](README.md#6-cấu-trúc-thư-mục) mới là bản đồ, còn code mới là nguồn sự thật.
Những gì viết ở đây là phần vẫn còn đúng sau một năm nữa.

---

## 1. Hai loại tri thức

Mọi dòng trong `src/` thuộc về một trong hai loại, và toàn bộ thiết kế đi ra từ việc giữ
chúng tách bạch:

| | **Tri thức framework** | **Tri thức sản phẩm** |
|---|---|---|
| Trả lời câu hỏi | *Chúng ta test như thế nào?* | *Chúng ta đang test cái gì?* |
| Ví dụ | một step được ghi vào report ra sao, session được cache thế nào, `.env` override một giá trị mặc định ra sao, lỗi API được định dạng thế nào | `beta` trỏ vào URL nào, mã doanh nghiệp là gì, nút submit ghi chữ "Tiếp tục" |
| Thay đổi khi | cả nhóm đổi cách làm test | sản phẩm thay đổi |
| Nằm ở | `src/config` (loader + resolver), `src/core`, `src/utils`, `src/api/clients/base.client.ts` | `src/pages`, `src/components`, `src/data`, `src/config/environments.ts`, `tests/` |
| Thuộc về | mọi dự án — đây chính là phần sau này thành package dùng chung | riêng dự án này |

Nếu một thay đổi của sản phẩm buộc bạn phải sửa code framework thì ranh giới đã rò rỉ.
Đó là tín hiệu hữu ích nhất mà kiến trúc này cho bạn.

## 2. Luật phụ thuộc

```
tests/**/*.spec.ts
      │ chỉ import
      ▼
tests/fixtures.ts ─────────────────── cửa vào duy nhất của spec (dự án tự compose)
      │
      ├──► src/pages  ─┐
      ├──► src/components ─┤
      ├──► src/api/clients ─┼──► src/core ──► src/config, src/utils, src/types
      └──► src/data ────────┘
```

**Phụ thuộc chỉ chảy một chiều. Code framework không bao giờ import code sản phẩm.**

Luật này kiểm chứng được, và đáng chạy trước mỗi lần merge:

```bash
grep -rE "from '\.\./(pages|components|data)" src/core src/config src/utils src/types
```

In ra dòng nào là vi phạm dòng đó. Mọi thứ còn lại trong tài liệu này đều là hệ quả của
luật đó.

Ba hệ quả:

- Spec import `tests/fixtures`, không import thẳng `@playwright/test`. Chính điều đó cho
  phép thêm một fixture — log, dọn dữ liệu, một role mới — mà không phải sửa một spec
  nào.
- Spec không bao giờ tự khởi tạo page object hay HTTP client; nó xin từ fixture.
- Page object giữ locator và các hành động mô tả ý định. Assertion thuộc về trang thì
  nằm trên nó dưới dạng `expectX()`; assertion riêng của một kịch bản thì ở lại trong
  spec. Đây là thứ cho phép một page object phục vụ hai mươi test.

## 3. Các điểm nối

Ở những chỗ code framework cần thứ mà chỉ sản phẩm mới biết, nó nhận thứ đó qua tham số.
Bốn điểm nối dưới đây là API ổn định — những hợp đồng sống sót qua refactor, và là chỗ
một dự án thứ hai cắm vào.

**Môi trường** — framework biết cách đọc một bảng; dự án sở hữu cái bảng đó.

```ts
defineEnvironments(table, { fallback }) -> { names, resolve(): ResolvedEnvironment }
```

Thứ tự ưu tiên là cố định: biến môi trường thật của process → `.env` → giá trị mặc định
trong bảng. Giá trị rỗng được coi như không có, nên các placeholder để trống trong
`.env.example` không bao giờ ghi đè một mặc định thật. Danh sách tên lấy từ khoá của
bảng, nên một `TEST_ENV` lạ sẽ fail ngay lập tức kèm danh sách tên hợp lệ, thay vì âm
thầm chạy vào nhầm host.

**Bố cục runner** — framework sở hữu đồ thị project; dự án sở hữu URL.

```ts
definePlaywrightConfig({ env, projects?, extraProjects?, overrides? })
```

Thứ đáng chia sẻ ở đây không phải timeout mà là *hình dạng*: đăng nhập một lần trong
setup project, chạy spec đã đăng nhập ở một project, chạy spec `@guest` ở project khác
không có session, và giữ spec API nằm ngoài browser. Làm sai hình dạng này chính là cách
một suite kết thúc bằng việc đăng nhập lại ở từng spec file.

**Xác thực** — framework quyết định *khi nào* đăng nhập và session cache *ở đâu*; sản
phẩm quyết định *bằng cách nào*.

```ts
interface Authenticator { signIn(): Promise<void>; saveSession(file?): Promise<void> }
type AuthenticatorFactory = (page: Page) => Authenticator | null   // null = chưa cấu hình
```

`createAuthSetup(factory)` và `createAuthFixture(factory)` tiêu thụ hợp đồng này. Cả hai
đều không biết là có tồn tại một màn hình đăng nhập. Page object của sản phẩm tự thích
ứng với hợp đồng — cái adapter đó là nơi duy nhất hai thế giới gặp nhau.

**Khởi tạo đối tượng** — `createPage(PageClass)` và `createClient(ClientClass)` dựng các
class của sản phẩm từ fixture của framework mà không cần gọi tên bất kỳ class nào.

## 4. Luồng thực thi

Sáu giai đoạn. Biết chúng là đáng, vì lỗi ở mỗi giai đoạn có hình dạng khác nhau.

| Giai đoạn | Chuyện gì xảy ra | Fail ở đây nghĩa là |
|---|---|---|
| **0 · Cấu hình** | `.env` được đọc một lần, bảng môi trường phân giải thành một bộ URL và timeout, preset dựng đồ thị project | `TEST_ENV` sai, cấu hình không đọc được — fail trước khi có bất kỳ test nào tồn tại |
| **1 · Khám phá** | Playwright gom các spec file, khớp chúng vào project, áp `grep` / `grepInvert` theo tag | Một spec chạy nhầm project, hoặc không chạy gì cả |
| **2 · Setup project** | Chạy một lần. Dùng lại session cache nếu còn hạn; nếu không thì đăng nhập qua UI và ghi ra file | Toàn bộ test cần đăng nhập fail — nhìn vào đây trước tiên |
| **3 · Khởi động worker** | Mỗi worker mở browser và nạp file session vào các context của nó | Session cũ hoặc rỗng: test bắt đầu ở trạng thái chưa đăng nhập |
| **4 · Phân giải fixture** | Theo từng test, đúng thứ tự phụ thuộc. Chỉ những fixture mà test gọi tên mới được dựng | Một fixture đã ném lỗi trước khi thân test kịp chạy |
| **5 · Thân test → teardown** | Page object và client được dựng, kịch bản chạy; fixture teardown theo thứ tự ngược, log và artifact được attach | Đây mới là lỗi assertion thật — kèm trace, screenshot, video, `run.log` |

Phạm vi (scope) của fixture quyết định chi phí. Việc ở **worker scope** chạy một lần cho
mỗi worker (một browser, một lần đăng nhập theo worker); việc ở **test scope** chạy lại
theo từng test (một page, một page object). Đặt một thứ đắt đỏ ở test scope là lỗi hiệu
năng phổ biến nhất trong một suite Playwright.

## 5. Session và chạy song song

Suite chạy `fullyParallel`. Ba luật giữ cho điều đó không biến thành một cơn bão đăng
nhập:

1. **Mỗi file session chỉ có một người ghi.** Setup project sở hữu session dùng chung.
   Login theo worker chỉ ghi vào file của riêng nó. Một spec tự đăng nhập cho mục đích
   của nó thì mặc định không ghi gì cả.
2. **Đăng nhập không bao giờ nằm trong `beforeEach`.** Nó hoặc chạy một lần cho cả lần
   chạy (setup project), hoặc một lần cho mỗi worker (auth fixture). Đặt trong
   `beforeEach` nghĩa là chạy lại ở từng spec file và tranh nhau cùng một đường dẫn.
3. **Ghi file là atomic** — ghi ra file tạm rồi rename. Các worker đọc những file này
   trong lúc một worker khác có thể đang làm mới; đọc trúng một file JSON dang dở sẽ làm
   hỏng cả lần chạy vì một lý do không bao giờ tái hiện được.

Một session đã cache được tin dùng khi nó còn trẻ hơn TTL và vẫn còn cookie. Mọi trường
hợp khác — mất file, hết hạn, rỗng — đều có nghĩa là đăng nhập lại. Xoá thư mục cache
luôn là một thao tác reset an toàn.

## 6. Report

Hai cơ chế, trên thực tế đều bắt buộc:

- **Step.** Mọi method public của page object và component bọc thân hàm trong
  `this.step(...)`, nhờ đó report đọc được thành `LoginPage: submit company code "fpt"`
  thay vì ba hành động vô danh. Đây chính là lý do `BasePage` và `BaseComponent` chia
  chung một lớp cơ sở: hồi chỉ page mới ghi được step, mọi thứ xảy ra bên trong header,
  modal hay grid đều biến mất khỏi report — mà đó đúng là loại lỗi khó tái hiện nhất.
- **Attachment.** Screenshot ghi vào thư mục output riêng của test đang chạy (nếu không
  các worker song song sẽ ghi đè lên nhau), còn log được gom theo từng test và attach
  dưới tên `run.log`. Trong CI, console là một luồng duy nhất mà mọi worker cùng dùng;
  một dòng log không gắn với test nào là một dòng vô dụng.

Trace, screenshot và video **chỉ thu khi fail** — bật trace toàn thời gian tốn nhiều hơn
phần nó mang lại một khi suite đã lớn.

## 7. Code mới đi đâu

Phân theo loại tri thức, không phải theo tên file:

| Bạn đang thêm… | Tầng | Kế thừa / cắm vào |
|---|---|---|
| Một màn hình | `src/pages` | `BasePage`; export ở file barrel, thêm fixture nếu dùng thường xuyên |
| Một mảnh UI dùng lại được | `src/components` | `BaseComponent`, giới hạn trong một root locator |
| Một tài nguyên API | `src/api/clients` | `BaseApiClient`; type của nó đặt ở `api/models` |
| Dữ liệu test sinh ra | `src/data/factories` | expose qua data fixture |
| Một role đăng nhập thứ hai | `src/data` (ai) + `tests/setup` (khi nào) | `AuthenticatorFactory` + `createAuthSetup` |
| Một môi trường | `src/config/environments.ts` | một entry trong bảng — không cần gì thêm |
| Một năng lực cắt ngang (dọn dữ liệu, giả lập network, matcher riêng) | `src/core` + một fixture | phải dùng được cho mọi sản phẩm, nếu không thì nó không phải core |
| Một spec | `tests/ui`, `tests/e2e`, `tests/api` | xem [tests/README.md](tests/README.md) |

Dòng cuối là dòng cần nghiêm khắc nhất. Một helper "generic, trừ mỗi cái field này" thì
không phải generic; cứ để nó ở tầng sản phẩm cho tới khi có sản phẩm thứ hai cần đến.

## 8. Vì sao việc tách này đáng công

Repo này là repo đầu tiên trong nhiều repo sẽ có. Ranh giới ở §1 tồn tại để nửa framework
sau này thành một package có version cho các dự án khác cài vào, thay vì bị copy — khi đó
một bug trong lớp cơ sở được sửa một lần rồi release, chứ không phải sửa năm lần ở năm
bản clone.

Việc tách đó **cố ý chưa làm**. Với một sản phẩm duy nhất, mọi phán đoán về cái gì là
"dùng chung" đều chỉ là phỏng đoán; chỉ sản phẩm thứ hai mới trả lời dứt điểm được. Từ
giờ đến lúc đó, luật ở §2 là thứ giữ cho lựa chọn ấy còn mở, và giữ nó thì chẳng tốn gì.
