# Test này đặt ở đâu

| Thư mục      | Chứa gì                                                                    |
|--------------|----------------------------------------------------------------------------|
| `tests/setup`| Setup project (xác thực, tạo dữ liệu nền). File kết thúc bằng `.setup.ts`.  |
| `tests/ui`   | Kiểm thử UI một màn hình / một tính năng. Nhanh, mặc định đã đăng nhập.     |
| `tests/e2e`  | Luồng nghiệp vụ đi qua nhiều màn hình, nhiều tính năng.                     |
| `tests/api`  | Kiểm thử thuần API — không mở browser.                                     |

Mọi spec đều import fixture dùng chung, không import thẳng `@playwright/test`:

```ts
import { test, expect } from '../fixtures';

test('ví dụ', async ({ createPage, testData }) => {
  // ...
});
```

## Ai là người đăng nhập

Không spec nào trong `tests/ui` hay `tests/e2e` được gọi `LoginPage.signIn()`. Khi bật
`fullyParallel`, một lệnh đăng nhập trong `beforeEach` sẽ chạy lại ở từng spec file, và
tất cả cùng tranh nhau ghi vào một file session.

1. **Mặc định — session dùng chung.** `tests/setup/auth.setup.ts` đăng nhập một lần cho
   cả lần chạy và ghi ra `playwright/.auth/user.json`; project `chromium` phụ thuộc vào
   nó nên khởi động là đã đăng nhập sẵn. Session của lần chạy trước được dùng lại chừng
   nào còn trẻ hơn `SESSION_TTL_MINUTES`.
2. **Không dùng được session đó?** Import `authenticatedTest` thay cho `test` — mỗi
   worker đăng nhập nhiều nhất một lần và cache vào file riêng:

   ```ts
   import { authenticatedTest as test, expect } from '../fixtures';
   ```
3. **Đang test chính màn hình đăng nhập?** Gắn tag `@guest` cho spec để nó chạy dưới
   project `chromium-guest`, hoàn toàn không có session.
