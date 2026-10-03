# Design

## Context

- PWA уже настроен: `vite-plugin-pwa` в режиме `generateSW`, `registerType: 'autoUpdate'`, регистрация через сгенерированный `registerSW.js` (подключается в `index.html` при сборке). Сейчас precache — 5 файлов: `index.html`, JS, CSS, `registerSW.js`, манифест; встроенная пачка уже внутри JS-бандла.
- В манифесте нет иконок, `theme_color` / `background_color` — `#ffffff`. В `public/` лежит только `favicon.svg` — логотип Vite.
- `index.html`: `viewport-fit=cover`, `theme-color` `#ffffff`, `apple-mobile-web-app-title`; нет `apple-touch-icon` и `apple-mobile-web-app-status-bar-style`.
- Отступы под вырез и статус-бар уже есть (`env(safe-area-inset-*)` в `src/index.css` и `StudyScreen.module.css`).
- Внешних ресурсов нет: шрифты системные, запросов к другим доменам нет.
- Цвета темы в `src/index.css`: светлая — фон `#ffffff`, акцент `#4f46e5`; тёмная — фон `#16171d`, акцент `#818cf8`.
- Репозиторий на GitHub (`lelderbe/cards`), ветки `master` (релизы) и `develop`.
- Из инструментов растеризации SVG на Mac есть только `sips` / `qlmanage` — они плохо справляются с SVG.

Мотивация — proposal.md, требования — specs/app-install/spec.md.

## Goals / Non-Goals

**Goals:**
- Минимум кода: всё делается конфигурацией `vite-plugin-pwa`, `index.html` и `vercel.json`.
- Обновление, которое не ломает уже установленное приложение и не теряет данные.

**Non-Goals:**
- UI для обновления и установки, CI, свой домен — см. Non-goals в proposal.md.

## Decisions

### Хостинг: Vercel, Git-интеграция

D-11 переходит в «Согласовано». Автор сам создаёт проект в Vercel и подключает репозиторий GitHub (аккаунт и OAuth — только руками автора). Production Branch — `master`, `develop` и остальные ветки получают превью-деплои со своими адресами.

Vercel сам определяет Vite (`npm run build`, выход `dist/`), но в репозиторий кладём `vercel.json` с явными `framework`, `buildCommand`, `outputDirectory` — настройки видны в коде, а не только в панели Vercel. HTTPS и редирект с HTTP Vercel даёт сам.

- **Альтернатива:** деплой с машины через `vercel` CLI — лишний ручной шаг и токен на машине; Git-интеграция бесплатна и не требует CI.

### Заголовки кеширования

В `vercel.json`:
- `/sw.js`, `/registerSW.js`, `/index.html`, `/manifest.webmanifest` — `Cache-Control: public, max-age=0, must-revalidate`, чтобы браузер всегда проверял новую версию service worker.
- `/assets/*` — `public, max-age=31536000, immutable`: имена с хешем.

Без этого HTTP-кеш может отдавать старый `sw.js`, и обновление застрянет. SPA-роутинга нет (один `index.html`, экраны — состояние React), rewrites не нужны.

### Иконка: один SVG-исходник, PNG коммитятся

- `public/icon.svg` — исходник 512×512: две-три скруглённые карточки, сдвинутые и слегка повёрнутые, на фоне акцентного цвета `#4f46e5`; верхняя карточка белая. Без текста, значимое содержимое в центральных 80 % — тот же файл годится как основа для maskable.
- PNG генерируются один раз `npx @vite-pwa/assets-generator` и коммитятся в `public/`. Настройки — в `pwa-assets.config.js`: размеры как у пресета `minimal-2023`, но без отступов — пресет добавляет белые поля вокруг иконки, а у неё фон на весь квадрат. Файлы: `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`, `favicon.ico`. Пакет запускается через `npx` и в `package.json` не добавляется; команда записывается в `README.md` для перегенерации.
- `favicon.svg` от Vite удаляется; `<link rel="icon">` указывает на `icon.svg` (с `favicon.ico` как запасным).
- В манифесте: `pwa-192x192.png`, `pwa-512x512.png` (`purpose: any`), `maskable-icon-512x512.png` (`purpose: maskable`). В `index.html`: `<link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png">` — iOS берёт иконку отсюда, а не из манифеста. У apple-touch-icon фон непрозрачный, иначе iOS зальёт прозрачное чёрным.

- **Альтернатива:** генерировать PNG при каждой сборке (`@vite-pwa/assets-generator` как devDependency + `pwaAssets` в конфиге) — новая зависимость ради редко меняющейся иконки. Рисовать PNG вручную — нет инструмента под рукой.

### Офлайн: precache всей сборки

В precache, кроме сборки (`js`, `css`, `html` по умолчанию), попадают `includeAssets` (`icon.svg`, `favicon.ico`, `apple-touch-icon-180x180.png`) и иконки манифеста — плагин добавляет их сам. Свой `workbox.globPatterns` не нужен: с ним иконки попадали в precache дважды. Runtime-кеширование не нужно: внешних запросов нет, все данные — в IndexedDB. `navigateFallback` у `generateSW` по умолчанию `index.html` — запуск с иконки без сети отдаётся из кеша.

Проверка, что во время работы нет запросов к другим адресам, — вручную в DevTools (Network) на прод-адресе.

### Обновление: `autoUpdate` без UI

Оставляем `registerType: 'autoUpdate'`: новый service worker активируется сразу (`skipWaiting` + `clientsClaim`), страница перезагружается. На iOS проверка обновления идёт при запуске установленного приложения, поэтому новая версия появляется в течение первого-второго запуска после деплоя.

Перезагрузка посреди прохода данных не теряет: незавершённый проход и лог пишутся после каждой оценки (этапы 2–3). После перезагрузки пользователь оказывается в списке пачек и продолжает проход кнопкой «Продолжить» — это приемлемо для первой пробы.

- **Альтернатива:** `registerType: 'prompt'` с плашкой «Доступна новая версия» — больше UI ради редкой ситуации; вернёмся, если перезагрузка при обкатке будет мешать.

### Тема: `theme-color` по `prefers-color-scheme`

- В `index.html` два `<meta name="theme-color">` с `media="(prefers-color-scheme: light)"` → `#ffffff` и `media="(prefers-color-scheme: dark)"` → `#16171d`. Safari на iOS 15+ берёт цвет статус-бара установленного приложения отсюда.
- `<meta name="apple-mobile-web-app-status-bar-style" content="default">`: текст статус-бара тёмный / светлый по теме системы, контент под статус-бар не заходит. `black-translucent` отклонён: белый текст статус-бара не читается в светлой теме.
- Манифест (`theme_color`, `background_color`) поддерживает один цвет — оставляем светлый `#ffffff`, он используется Android и десктопом; iOS для экрана запуска берёт фон страницы.

## Risks / Trade-offs

- [iOS не обновил service worker ко второму запуску] → проверка на телефоне после второго деплоя; если застрянет — заголовки `sw.js` и ручной перезапуск (смахнуть из переключателя приложений).
- [Белая вспышка при запуске в тёмной теме] → iOS показывает фон до первой отрисовки; если вспышка заметна — добавить `background-color` в `<style>` прямо в `index.html` с `prefers-color-scheme`, чтобы фон был до загрузки CSS.
- [Данные из dev-режима не переедут] → ожидаемо (разные адреса и хранилища); на проде встроенная пачка появится заново, лог начнётся с нуля.
- [Публичный адрес] → приложение без бэкенда и без чужих данных: каждый посетитель видит только свою IndexedDB. Ключей и секретов на этом этапе нет.
- [Превью-деплои `develop`] → у них свой адрес, а значит своё хранилище; на телефон ставим только прод.
