#!/usr/bin/env bash
#
# release.sh — MỘT phát: verify → sinh CHANGELOG → bump package.json → commit → annotated
#              tag. KHÔNG push (in lệnh push ở cuối).
#
#   make release VERSION=v0.2.0          # làm thật
#   make release VERSION=v0.2.0 DRY=1    # chỉ xem trước mục CHANGELOG, không đụng gì
#
# Client pin đúng một tag; sửa gì ở kit thì client chỉ cần nâng version. Đó là lý do
# tag phải mang được release notes và package.json phải khớp tag.
set -euo pipefail

VERSION="${1:-${VERSION:-}}"
DRY=0; [ "${2:-}" = "--dry" ] && DRY=1
[ -n "$VERSION" ] || { echo "Dùng: make release VERSION=v0.2.0 [DRY=1]" >&2; exit 1; }
case "$VERSION" in v*.*.*) ;; *) echo "LỖI: VERSION phải dạng vX.Y.Z" >&2; exit 1;; esac
BARE="${VERSION#v}"

prev="$(git describe --tags --abbrev=0 2>/dev/null || true)"
range="HEAD"; [ -n "$prev" ] && range="$prev..HEAD"

entry="$(python3 - "$VERSION" "$range" <<'PY'
import subprocess, sys, re, datetime
version, rng = sys.argv[1], sys.argv[2]
subs = subprocess.check_output(["git","log","--no-merges","--pretty=%s",rng], text=True).splitlines()
groups = {"Breaking": [], "Added / Changed": [], "Fixed": [], "Other": []}
for s in subs:
    s = s.strip()
    if not s or s.startswith("chore(release)"):
        continue
    # Bỏ tiền tố Jira key nếu có: "[RPA-1234] feat(x): ..." -> "feat(x): ..."
    s = re.sub(r'^\[[A-Z][A-Z0-9]+-\d+\]\s*', '', s)
    m = re.match(r'^(\w+)(\([^)]*\))?(!)?:\s*(.*)$', s)
    if not m:
        groups["Other"].append(f"- {s}"); continue
    typ, _scope, bang, desc = m.groups()
    line = f"- {desc}"
    if bang: groups["Breaking"].append(line)
    elif typ == "feat": groups["Added / Changed"].append(line)
    elif typ == "fix": groups["Fixed"].append(line)
    elif typ in ("docs", "chore", "test", "ci", "style"): groups["Other"].append(line)
    else: groups["Added / Changed"].append(line)
out = [f"## {version} — {datetime.date.today().isoformat()}", ""]
for g in ["Breaking", "Added / Changed", "Fixed", "Other"]:
    if groups[g]:
        out.append(f"### {g}"); out += groups[g]; out.append("")
print("\n".join(out).rstrip())
PY
)"

if [ "$DRY" = 1 ]; then
  echo "===== CHANGELOG entry (DRY — chưa ghi/commit/tag), range: ${range} ====="
  echo "$entry"
  echo "======================================================================="
  echo "Chạy thật: make release VERSION=$VERSION"
  exit 0
fi

# --- guards ---
[ "$(git branch --show-current)" = "master" ] || { echo "LỖI: phải ở nhánh master" >&2; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "LỖI: cây làm việc chưa sạch — commit hết trước" >&2; exit 1; }
git rev-parse "$VERSION" >/dev/null 2>&1 && { echo "LỖI: tag $VERSION đã tồn tại" >&2; exit 1; }

# Tag là thứ client cài về. Phát hành một bản không verify được là đẩy lỗi sang họ.
echo "▸ make verify trước khi cắt tag"
npm run verify >/dev/null

# --- package.json: version phải KHỚP tag, vì đó là thứ npm phân giải ---
python3 - "$BARE" <<'PY'
import json, sys
v = sys.argv[1]
d = json.load(open("package.json", encoding="utf-8"))
d["version"] = v
json.dump(d, open("package.json", "w", encoding="utf-8"), indent=2, ensure_ascii=False)
open("package.json", "a", encoding="utf-8").write("\n")
print(f"package.json: version -> {v}")
PY

# --- chèn entry vào CHANGELOG, ngay dưới ## [Unreleased] ---
python3 - "$entry" <<'PY'
import sys, re
entry = sys.argv[1].rstrip() + "\n\n"
s = open("CHANGELOG.md", encoding="utf-8").read()
m = re.search(r'## \[Unreleased\]\n+', s)
if m:
    s = s[:m.end()] + entry + s[m.end():]
else:
    m2 = re.search(r'^## v\d', s, re.M)
    s = (s[:m2.start()] + entry + s[m2.start():]) if m2 else s.rstrip() + "\n\n" + entry
open("CHANGELOG.md", "w", encoding="utf-8").write(s)
print("CHANGELOG.md updated")
PY

git add package.json CHANGELOG.md
git commit -q -m "chore(release): $VERSION"
# Annotated tag mang luôn release notes. --cleanup=verbatim để git không strip dòng '##'
# (nó coi dấu # là comment).
printf '%s\n' "$entry" | git tag -a "$VERSION" -F - --cleanup=verbatim

cat <<EOF

✓ $VERSION — CHANGELOG + package.json committed, annotated tag đã tạo (CHƯA push).

  Push:   git push origin master --tags
  Client: npm i "\$(node -p "require('./package.json').name")@$(git remote get-url origin 2>/dev/null | sed 's/.*[:/]\([^/]*\/[^/]*\)\.git$/github:\1/')#$VERSION"
          hoặc sửa package.json rồi npm install — xem README mục "Phát hành và nâng cấp".
EOF
