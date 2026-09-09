#!/usr/bin/env bash
# smoke.sh — nghiệm thu thật của kit: sinh một dự án, cài từ tarball, rồi CHẠY nó.
#
# Đây là thứ thay cho suite ví dụ từng nằm trong repo. Unit test không bao giờ thấy
# những lỗi lớp này bắt: template không compile, exports map sai, preset dựng nhầm
# project. Đã bắt được hai lỗi thật (STORAGE_STATE sai subpath; preset giả định mọi dự
# án có đăng nhập).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK="$(mktemp -d)"
# Cổng tự chọn: cổng cố định va nhau giữa hai lần chạy, và một server cũ còn sống sẽ
# phục vụ thư mục tạm ĐÃ BỊ XOÁ — test fail vì 404, trông y hệt lỗi thật.
PORT="${SMOKE_PORT:-$(python3 -c 'import socket;s=socket.socket();s.bind(("",0));print(s.getsockname()[1]);s.close()')}"
SRV_PID=""

cleanup() {
  if [ -n "$SRV_PID" ]; then
    kill "$SRV_PID" 2>/dev/null || true
    wait "$SRV_PID" 2>/dev/null || true
  fi
  rm -rf "$WORK"
}
trap cleanup EXIT

say() { printf '\n\033[36m▸ %s\033[0m\n' "$1"; }

say "Đóng gói kit"
cd "$ROOT"
npm run build >/dev/null
rm -f qc-kit-*.tgz
npm pack --silent >/dev/null
TGZ="$ROOT/$(ls qc-kit-*.tgz | head -1)"
echo "  $TGZ"

# qc-kit chưa publish, nên dự án sinh ra phải trỏ vào tarball local. Đây là bước DUY
# NHẤT khác với người dùng thật; publish xong thì bỏ hàm này đi.
use_local_tarball() {
  node -e "
    const fs = require('fs');
    const p = process.argv[1] + '/package.json';
    const d = JSON.parse(fs.readFileSync(p, 'utf8'));
    d.devDependencies['qc-kit'] = 'file:' + process.argv[2];
    fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n');
  " "$1" "$TGZ"
}

# ---------------------------------------------------------------- biến thể tối thiểu
say "Sinh dự án tối thiểu và CHẠY THẬT"
node cmd/scaffold/index.js new kho-hang --out "$WORK/kho-hang" >/dev/null
cd "$WORK/kho-hang"
use_local_tarball "$PWD"
npm install --silent >/dev/null 2>&1
npm run typecheck --silent
echo "  typecheck OK"

mkdir -p app
cat > app/index.html <<'HTML'
<!doctype html><meta charset="utf-8"><title>smoke</title>
<h1 data-testid="example-page-heading">smoke</h1>
HTML
printf 'TEST_ENV=local\nBASE_URL=http://localhost:%s\n' "$PORT" > .env

# --directory thay cho `(cd app && …)`: subshell làm $! trỏ vào subshell chứ không phải
# python, nên kill trượt và server sống sót qua nhiều lần chạy.
python3 -m http.server "$PORT" --directory app >/dev/null 2>&1 &
SRV_PID=$!
sleep 1

if ! npx playwright test --reporter=line; then
  echo ""
  echo "✗ Dự án sinh ra không chạy được."
  echo "  Chưa tải browser thì chạy: npx playwright install chromium"
  exit 1
fi
kill "$SRV_PID" 2>/dev/null || true
wait "$SRV_PID" 2>/dev/null || true
SRV_PID=""

# ------------------------------------------------------------------- biến thể đầy đủ
say "Sinh dự án đầy đủ (--auth --api) và typecheck"
cd "$ROOT"
node cmd/scaffold/index.js new day-du --out "$WORK/day-du" --auth --api >/dev/null
cd "$WORK/day-du"
use_local_tarball "$PWD"
npm install --silent >/dev/null 2>&1
npm run typecheck --silent
echo "  typecheck OK"

# Spec API và spec UI cần backend/app thật nên không chạy ở đây; chỉ kiểm preset dựng
# đúng đồ thị project.
npx playwright test --list >/dev/null
echo "  playwright đọc được config, liệt kê được test"

printf '\n\033[32m✓ smoke đạt: cả hai biến thể cài được, biên dịch được, và bản tối thiểu chạy xanh\033[0m\n'
