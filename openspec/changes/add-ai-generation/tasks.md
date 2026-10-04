# Tasks

## 1. Каркас функции на Vercel

- [x] 1.1 Создать `api/generate.ts` с `POST(request: Request)`, который пока отвечает `501` (`maxDuration` 60 с), импортирует константу из `src/generation/` (чтобы проверить импорт `.ts` из `src/`); включить `api/` в `tsconfig.node.json`, скрипты `format` / `format:check` и `oxlint`; добавить `.env.example` (`OPENAI_API_KEY`, `ACCESS_CODE`, `OPENAI_MODEL`); проверка: `npm run build` и `npm run lint` проходят; после пуша в `develop` `curl -X POST https://cards-git-develop-lelderbes-projects.vercel.app/api/generate` отвечает `501`, а приложение на превью открывается как раньше
- [x] 1.2 Вручную (пользователь): создать ключ API в OpenAI, задать лимит расходов в кабинете; в Vercel → Settings → Environment Variables задать `OPENAI_API_KEY` и `ACCESS_CODE` (случайные 16+ символов) для Production и Preview; положить те же значения в `.env.local`; проверка: переменные видны в настройках проекта Vercel, `.env.local` не попадает в `git status`

## 2. Проверка темы и ответа ИИ

- [x] 2.1 `src/generation/validateDeck.ts`: `MAX_TOPIC_LENGTH`, `MAX_CARDS`, `validateTopic`, `validateGeneratedDeck` (обрезка пробелов, отброс пустых сторон и повторов без учёта регистра, не больше 100, пустой результат или не та форма → `null`); `CreateDeckScreen` берёт `MAX_TOPIC_LENGTH` отсюда, подсказка в поле — «Например, 50 слов про путешествия»; проверка: тесты — тема из пробелов и 101 символ отклоняются, « кухня » → «кухня»; 105 карточек с «Fork — вилка» / «fork — вилка» и пустым переводом → не больше 100, «fork» один раз, без пустой; `null` для не-объекта, без `cards`, с числом вместо строки, с пустым `title`

## 3. Запрос к OpenAI

- [x] 3.1 Уточнить по документации OpenAI актуальную лёгкую модель и параметры Responses API для strict JSON Schema (`text.format`, `max_output_tokens`, усилие рассуждения); записать выбор в `design.md` (решение 3); проверка: в `design.md` указано имя модели по умолчанию и ссылка на страницу документации
- [x] 3.2 `src/generation/openaiDeck.ts`: `buildDeckRequest(topic, model)` (инструкции, тема отдельным сообщением, JSON Schema, `max_output_tokens`), `parseDeckResponse(json)` (текст ответа → `JSON.parse` → `validateGeneratedDeck`), `generateWithOpenAI({ apiKey, model, topic, signal, fetch })` с таймаутом 55 с и результатом `{ ok: true, deck } | { ok: false, reason: 'bad_response' | 'timeout' | 'upstream' }`; проверка: тесты с подменённым `fetch` — тема попадает в сообщение пользователя, а не в инструкции; в инструкциях — потолок 100 и 25 по умолчанию; успешный ответ разбирается; отказ модели, битый JSON и пустые карточки → `bad_response`; ответ OpenAI 500 → `upstream`; таймаут → `timeout`

## 4. Серверная функция

- [x] 4.1 Довести `api/generate.ts`: только POST, разбор тела, проверка `ACCESS_CODE` по заголовку `X-Access-Code` через `timingSafeEqual` (`401` с `missing_code` / `wrong_code`), `validateTopic` (`400` без обращения к ИИ), вызов `generateWithOpenAI` и коды `200` / `502` / `504`, `500` без настроенных переменных; логика ответа вынесена в функцию, принимающую окружение и `fetch`; проверка: тесты обработчика — нет кода, неверный код, тема 101 символ (OpenAI не вызывается), успешный ответ, таймаут → `504`, нет `OPENAI_API_KEY` → `500`
- [x] 4.2 Dev-middleware в `vite.config.ts`: `POST /api/generate` → `ssrLoadModule('/api/generate.ts')`, переменные из `.env.local` через `loadEnv`; проверка: при `npm run dev` `curl` с верным кодом и темой «кухня» возвращает пачку от OpenAI, без кода — `401`

## 5. Генератор в приложении и код доступа

- [x] 5.1 `GenerationError` получает `kind: 'unauthorized'` и `reason`; `src/generation/accessCode.ts` (`getAccessCode` / `setAccessCode` поверх `localStorage` в `try/catch`); `src/generation/apiGenerator.ts` — `createApiGenerator({ fetch, getAccessCode })`; `generateDeck.ts` выбирает мок по `VITE_GENERATOR=mock`; проверка: тесты `createApiGenerator` с подменённым `fetch` — код уходит в `X-Access-Code`, без кода заголовка нет; `TypeError` → `network`; `401` → `unauthorized` с `reason`; `502` / `504` и битое тело → `failed`; «Отмена» отклоняет с `AbortError`; `npm run build` — в `dist/` нет слов мока («разделочная доска»)
- [x] 5.2 `StatusMessage`: необязательные `children` и `disabled` у действий; `CreateDeckScreen`: при `unauthorized` — «Нужен код доступа» / «Неверный код доступа», поле «Код доступа» (`type="password"`), «Повторить» недоступна при пустом поле и сохраняет код перед генерацией; проверка в браузере (`npm run dev`, мобильный размер окна): без кода — «Нужен код доступа»; неверный — «Неверный код доступа»; верный — черновик про кухню; новая пачка после перезагрузки страницы — без вопроса о коде; `VITE_GENERATOR=mock npm run dev` — «ошибка» и «сеть» показывают прежние сообщения
- [x] 5.3 Подобрать промпт на 5–6 запросах (кухня, поход, аэропорт, тема на английском, «мне нужно 50 слов EN-RU на тему путешествий», «200 слов про еду»): без числа — 20–30 осмысленных карточек, с числом — около указанного, не больше 100, EN на лицевой стороне, перевод коротко, название 1–3 слова; ответ на 100 карточек укладывается в таймаут; проверка: результаты прогонов кратко записаны в итог этапа (задача 6.2)

## 6. Проверка на iPhone и документы

- [x] 6.1 Пуш в `develop`; на iPhone в установленном приложении с превью `develop`: тема «кухня» → 20–30 осмысленных карточек после ввода кода, сохранить и пройти; «50 слов про путешествия» → около 50 карточек; вторая пачка — без кода; авиарежим → «Нет подключения к интернету»; изменить `ACCESS_CODE` на Vercel → «Неверный код доступа», ввод нового кода → черновик; существующие пачки и незавершённый проход на месте; проверка: всё перечисленное выполнено
- [x] 6.2 Документы: D-09 и D-10 в `docs/decisions.md` → «Согласовано (этап 6)» с итогом и находками (своя проверка вместо `zod`, модель, промпт, импорт `src/` из `api/`); этап 6 в `docs/plan.md` → ✅; `README.md` — переменные окружения, `.env.local`, `VITE_GENERATOR=mock`; `AGENTS.md` — папка `api/` в структуре; проверка: `npm run format`, `npm run lint`, `npx vitest run`, `npm run build` проходят
- [x] 6.3 Запись в раздел «Unreleased» в `CHANGELOG.md`: «Добавлено» — пачку по теме составляет ИИ, код доступа при первой генерации; «Изменено» — название пачки предлагает ИИ, число карточек можно указать в запросе (до 100); проверка: запись есть и написана по-русски в группах Keep a Changelog
