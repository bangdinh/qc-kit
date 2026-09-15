# Changelog

Định dạng theo [Keep a Changelog](https://keepachangelog.com/), version theo
[SemVer](https://semver.org/).

**Pre-1.0:** bump **minor** cho thay đổi phá vỡ, **patch** cho thay đổi tương thích ngược.
Sau 1.0 thì major mới mang breaking.

Mục dưới đây do `make release` sinh từ conventional commit — đừng soạn tay trừ khi cần
diễn giải lại cho người đọc.

## [Unreleased]

### BREAKING — dự kiến v0.3.0: luồng đăng nhập rời khỏi kit

Kit không còn export `createAuthSetup`, `createAuthFixture`, `Authenticator`,
`AuthenticatorFactory`, phần session (`hasFreshSession` · `saveSession` · `writeSession` ·
`writeEmptySession` · `clearSession` · `sessionTtlMs`), `STORAGE_STATE` · `storageStatePath`
· `AUTH_DIR`, và type `Credentials`. Lý do và điều kiện đổi ý:
[ADR 0004](docs/adr/0004-dua-dang-nhap-ve-du-an.md).

`definePlaywrightConfig` vẫn dựng `setup → chromium` + `chromium-guest`, nhưng
**`storageState` không còn mặc định**: bật `projects.auth` mà không truyền thì lỗi ngay
lúc đọc config.

Nâng cấp một dự án đang dùng bản cũ:

1. Mang ba file về dự án — lấy nguyên bản ở `cmd/scaffold/templates/auth/core/`, đặt vào
   `src/core/{auth,session,paths}.ts` + một `index.ts` re-export.
2. Đổi import: `qc-kit/core` → `./core` cho `createAuthSetup` · `createAuthFixture` ·
   `saveSession` · `Authenticator`; `qc-kit/config` → `./core` cho `STORAGE_STATE`.
3. `playwright.config.ts`: thêm `storageState: STORAGE_STATE` lấy từ `./src/core`.

Dự án sinh mới bằng `npx qc-kit new --auth` đã có sẵn cả ba bước.

## v0.2.0 — 2026-09-09

### Added / Changed
- phát hành theo tag, client pin đúng một version
- sinh dự án automation mới, kèm Makefile và commit hook
- đóng gói qc-kit thành package cài được, tách fixture khỏi sản phẩm
- hợp đồng test case, validate và dịch step sang Playwright
- thêm skill jira và research-and-recommend

### Other
- cd qc-kit && git commit -F - <<'MSG' [RPA-4514] refactor: dọn lớp sản phẩm khỏi kit, thêm make smoke, viết lại tài liệu
- ONBOARDING.md, skill qc-concept, trang tổng quan
- Create common components - In progress
- Init project structure

## v0.1.0 — 2026-09-09

### Added / Changed

- Hợp đồng test case: type, validate (dung thứ đóng gói, nghiêm với schema), dịch step
  sang Playwright, chuẩn hoá `target` thành `data-testid`.
- Đóng gói thành package cài được: 8 subpath export, `@playwright/test` là peer optional.
- Fixture đổi thành factory — kit không export sẵn một `test` đã compose.
- `cmd/scaffold`: sinh dự án automation mới, `npx qc-kit new` và `make new`.
- Cờ `projects.auth` / `projects.web` / `projects.unit` cho preset, kèm báo lỗi ngay lúc
  đọc config khi bật `auth` mà thiếu file setup.
- `make smoke`: sinh dự án, cài từ tarball, chạy thật.
