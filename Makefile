# qc-kit — Makefile
#
# Mục tiêu: mọi việc hay làm đều là MỘT lệnh, và lệnh đó chạy được trên máy sạch.
# Chạy `make` không tham số để xem danh sách.

.DEFAULT_GOAL := help
.PHONY: help verify build test typecheck new pack smoke release verify-tag clean hooks

NAME ?=
OUT  ?= $(NAME)
AUTH ?=
API  ?=

SCAFFOLD_FLAGS := $(if $(AUTH),--auth,) $(if $(API),--api,)

help: ## Danh sách lệnh
	@grep -hE '^[a-z][a-zA-Z0-9_-]*:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "} {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "  Dự án mới:"
	@echo "    make new NAME=kho-hang"
	@echo "    make new NAME=kho-hang OUT=../kho-hang AUTH=1 API=1"

verify: ## typecheck + build + unit test — cổng duy nhất trước khi commit
	npm run verify

typecheck: ## Chỉ kiểm kiểu
	npm run typecheck

test: ## Chỉ chạy unit test của kit
	npm run test:unit

build: ## Biên dịch sang dist/
	npm run build

new: build ## Sinh dự án automation mới (cần NAME=)
	@if [ -z "$(NAME)" ]; then \
		echo "Thiếu NAME. Ví dụ: make new NAME=kho-hang OUT=../kho-hang AUTH=1"; \
		exit 1; \
	fi
	node cmd/scaffold/index.js new $(NAME) --out $(OUT) $(SCAFFOLD_FLAGS)

smoke: ## Nghiệm thu thật: sinh dự án, cài từ tarball, chạy. Cần browser.
	bash scripts/smoke.sh

release: ## Cắt release: verify + CHANGELOG + bump version + tag (VERSION=vX.Y.Z; DRY=1 xem trước; KHÔNG push)
	@[ -n "$(VERSION)" ] || { echo 'Dùng: make release VERSION=v0.2.0 [DRY=1]'; exit 1; }
	@bash scripts/release.sh "$(VERSION)" $(if $(DRY),--dry)

verify-tag: ## Kiểm một tag đã cắt: client cài từ git URL có dùng được không (VERSION=vX.Y.Z)
	@[ -n "$(VERSION)" ] || { echo 'Dùng: make verify-tag VERSION=v0.2.0'; exit 1; }
	@bash scripts/verify-tag.sh "$(VERSION)"

pack: build ## Đóng gói tarball để thử cài ở nơi khác
	npm pack

hooks: ## Bật git hook của repo (mỗi clone làm một lần)
	git config core.hooksPath .githooks
	@echo "core.hooksPath = .githooks"

clean: ## Xoá dist, tarball và artifact của lần chạy test
	rm -rf dist test-results playwright-report *.tgz
