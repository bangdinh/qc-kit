# Chữ ký cuối description — ba chỗ dễ ghi sai

```
----
*Service:* <repo> · *Branch Name:* <nhánh chứa commit> · *Người tạo:* <email>
```

Cách lấy:

```bash
git rev-parse --show-toplevel | xargs basename    # Service
bash "$J" whoami                                  # Người tạo — email, KHÔNG dùng display name
```

---

## 1. `Service` ghi "webfirst" hoặc ghi nhầm repo

Web-First có **năm repo**. `Service` là repo **chứa commit**, không phải tên dự án.

| Việc thuộc về | `Service` đúng |
|---|---|
| Màn hình, component, BFF của web/mobile/desktop | `camera-ai-platform` |
| Đăng nhập, Keycloak, realm, Company ID | `iam-v2` |
| Role, permission, cây tài nguyên, closure table | `brm-v2` |
| Camera, gateway, NVR, luồng thiết bị | `devicemanagement` |
| Gửi mail qua NES | `proxy-smtp` |

Bẫy hay gặp: `camera-ai-platform` là monorepo **FE**. Sửa API phân quyền mà ghi
`Service: camera-ai-platform` là sai — việc đó nằm ở `brm-v2`.

## 2. Tạo ticket trước khi tạo nhánh (đúng flow)

Lúc đó còn đứng ở `development`, nên `git branch --show-current` trả `development` — **sai**.
Điền tên nhánh **sắp** tạo (`<type>/RPA-<số>-<brief>`), hoặc ghi `(chưa tạo — sẽ là …)` rồi
cập nhật ở bước dev-xong.

## 3. Tách nhánh sau khi đã commit

Gỡ commit khỏi `development` sang nhánh riêng ⇒ tên nhánh đổi ⇒ **phải `describe` lại**.
Đây là ca thật đã xảy ra với RPA-4210.

## Lấy đúng nhánh chứa một commit

`git branch --show-current` là nguồn sai phổ biến nhất — nó trả nhánh đang checkout, không
phải nhánh chứa commit.

```bash
git branch --contains <sha> --format='%(refname:short)' \
  | grep -v '^\(development\|master\)$' | head -1
```
