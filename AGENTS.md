# scheduler

Планировщик дел: календарь, регулярные и разовые дела, расписание дня. Клиент — `src/` (статика,
опубликован на GitHub Pages), сервер групп — `server/` (Express 5 + socket.io). Подробно — `readme.md`.

## Грабли

- До октября 2026 `package.json` стоял в `.gitignore` — в git были только lock-файлы. Корневой
  `package.json` восстановлен по lock.
- `npm test` поднимает `http-server src -p 8096` сам (см. `playwright.config.js`; 8080 занят рабочим докером). 5 из 79 тестов падали
  и до обновления зависимостей (календарь, временные слоты, повторное открытие модального окна «Информация»).
- Express 5: шаблоны путей — path-to-regexp 8, `'*'` больше не работает.

## Команды

Обслуживание — как в pretty-php: `npm run test`, `npm run check`, `npm run fix`.

- `check` — eslint, prettier --check; ничего не меняет
- `fix` — eslint --fix, prettier --write
- `test` — Playwright (сервер на :8096)

Цели Makefile одинаковые во всех проектах `~/projects` (`make help` — список):

- `make install` — зависимости тестов и сервера
- `make dev` — статика на :8080
- `make build` — сборка
- `make audit` — уязвимости в зависимостях
- `make outdated` — устаревшие зависимости
- `make server` — сервер групп на :3000 (`node --watch`)
