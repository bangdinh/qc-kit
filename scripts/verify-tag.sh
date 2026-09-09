#!/usr/bin/env bash
#
# verify-tag.sh — kiểm ĐÚNG đường mà client đi: cài kit từ một tag git, rồi dựng một dự
#                 án trên bản vừa cài đó và biên dịch nó.
#
#   make verify-tag VERSION=v0.2.0
#
# Khác `make smoke` ở chỗ smoke cài từ tarball `npm pack` (kiểm nội dung gói), còn cái
# này cài từ **git URL + tag** (kiểm luôn: tag có tồn tại không, hook `prepare` có chạy
# và sinh ra `dist/` không, `exports` có phân giải không). Hai đường khác nhau: npm chỉ
# chạy `prepare` ở đường git, và `files` thì chỉ có tác dụng ở đường tarball.
set -euo pipefail

VERSION="${1:-${VERSION:-}}"
[ -n "$VERSION" ] || { echo "Dùng: make verify-tag VERSION=v0.2.0" >&2; exit 1; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
git -C "$ROOT" rev-parse "$VERSION" >/dev/null 2>&1 || {
  echo "LỖI: tag $VERSION không tồn tại. Cắt nó trước: make release VERSION=$VERSION" >&2
  exit 1
}

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "▸ Sinh dự án client và cài kit từ tag $VERSION"
node "$ROOT/cmd/scaffold/index.js" new client-thu --out "$WORK/client-thu" >/dev/null
cd "$WORK/client-thu"

# git+file:// dùng chính repo local — không cần đã push, nên chạy được ngay sau khi tag.
node -e "
  const fs = require('fs');
  const d = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  d.devDependencies['qc-kit'] = 'git+file://' + process.argv[1] + '#' + process.argv[2];
  fs.writeFileSync('package.json', JSON.stringify(d, null, 2) + '\n');
" "$ROOT" "$VERSION"

npm install --silent >/dev/null 2>&1

INSTALLED="$(node -p "require('qc-kit/package.json').version")"
echo "  qc-kit đã cài: $INSTALLED"

[ -d node_modules/qc-kit/dist ] || {
  echo "✗ node_modules/qc-kit/dist không tồn tại — hook \`prepare\` đã không chạy." >&2
  echo "  npm CHỈ chạy \`prepare\` khi cài từ git; \`prepack\` không đủ." >&2
  exit 1
}
echo "  dist/ có mặt — prepare đã chạy"

for sub in config core contract api fixtures utils types scaffold; do
  node -e "require('qc-kit/$sub')" || { echo "✗ subpath qc-kit/$sub không phân giải được" >&2; exit 1; }
done
echo "  8/8 subpath phân giải được"

npm run typecheck --silent
echo "  dự án client biên dịch được"

printf '\n\033[32m✓ tag %s cài được từ git và dùng được ở client\033[0m\n' "$VERSION"
