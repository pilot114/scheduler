# scheduler: планировщик дел (PWA)
# Цели одинаковые во всех проектах ~/projects — см. make help.
.DEFAULT_GOAL := help

.PHONY: server
server: ## сервер групп с автоперезапуском
	cd server && npm run dev

.PHONY: help
help: ## эта справка
	@grep -hE '^[a-zA-Z0-9_-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-12s %s\n", $$1, $$2}'

.PHONY: install
install: ## зависимости тестов и сервера
	npm ci
	cd server && npm ci
	npx playwright install chromium

.PHONY: dev
dev: ## статика на :8080
	npm run serve

.PHONY: build
build: ## сборка
	@echo "сборки нет: src/ раздаётся как есть"

.PHONY: audit
audit: ## уязвимости в зависимостях
	npm audit
	cd server && npm audit

.PHONY: outdated
outdated: ## устаревшие зависимости
	npm outdated || true
	cd server && npm outdated || true
