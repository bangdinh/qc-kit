# Changelog

Định dạng theo [Keep a Changelog](https://keepachangelog.com/), version theo
[SemVer](https://semver.org/).

**Pre-1.0:** bump **minor** cho thay đổi phá vỡ, **patch** cho thay đổi tương thích ngược.
Sau 1.0 thì major mới mang breaking.

Mục dưới đây do `make release` sinh từ conventional commit — đừng soạn tay trừ khi cần
diễn giải lại cho người đọc.

## [Unreleased]

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
