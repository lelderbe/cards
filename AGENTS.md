# AGENTS.md

Инструкции для ИИ-агентов (Claude Code, Cursor, Codex и др.), работающих с этим репозиторием.

## Продукт

Cards — mobile-first PWA для повторения карточек (слово ↔ перевод): тап — перевернуть, свайпы — «помню / не помню».

- Цель: iPhone Safari, установка на Home Screen (standalone). Сначала портретная раскладка телефона.
- Язык интерфейса — русский.
- Бэкенда нет до этапа ИИ-генерации; данные хранятся только на устройстве (IndexedDB через Dexie).
- Продуктовые документы — источник объёма работ и принятых решений:
  [docs/product.md](docs/product.md), [docs/decisions.md](docs/decisions.md), [docs/plan.md](docs/plan.md), [docs/ideas.md](docs/ideas.md).

## Стек

Vite, React 19, TypeScript, CSS Modules (глобальные переменные в `src/index.css`), vite-plugin-pwa, Dexie, motion, Vitest, oxlint, Prettier.

Структура `src/`: `domain/` — чистая доменная логика, `storage/` — работа с IndexedDB, `screens/` — экраны, `components/` — переиспользуемые компоненты, `data/` — встроенные колоды, `generation/` — генератор пачек по теме (интерфейс и реализации).

## Команды

```bash
npm run dev          # dev-сервер (для телефона: npm run dev -- --host)
npm run build        # tsc -b && vite build
npm run lint         # oxlint
npm run format       # Prettier: форматирует src/ (проверка без изменений: npm run format:check)
npx vitest run       # тесты одним прогоном (npm test запускает watch-режим)
```

Перед завершением задачи: выполнить `npm run format`; `npm run lint`, `npx vitest run`, `npm run build` проходят без ошибок.

## Приоритеты

- Простой UI.
- Читаемый код важнее «умного».
- Доменная логика — чистые функции, легко покрываемые тестами.
- Минимум зависимостей: не добавлять новые без явной необходимости.

## Code style

Форматирование (точки с запятой, одинарные кавычки, ширина строки 100) задаёт Prettier — см. `.prettierrc.json`; вручную не выравнивать.

- Ранние возвраты (early returns) вместо вложенных условий.
- Описательные имена.
- Обработчики событий начинаются с `handle` (`handleFlip`, `handleSwipe`).
- Не использовать TS `enum` — только union-типы или объекты `as const`.
- `className` — первый атрибут в JSX.
- Стили — CSS Modules; общие значения — через переменные в `src/index.css`.

## Процесс

- Изменения ведутся через OpenSpec (`openspec/`): одно изменение на этап из `docs/plan.md`. Изменения маленькие и доводимые до конца; идеи вне объёма — в `docs/ideas.md`.
- Тексты артефактов OpenSpec — на русском; ключевые слова требований (SHALL/MUST) и сценариев (WHEN/THEN) — на английском.
- Пользовательские изменения записываются в раздел «Unreleased» в `CHANGELOG.md` (группы Keep a Changelog, текст на русском).
- Коммиты в стиле Conventional Commits на английском: `feat: …`, `fix: …`, `chore: …`.
