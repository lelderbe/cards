# Cards

PWA с карточками для повторения слов: тап — перевернуть, свайп — «помню / не помню», пачки по теме от ИИ.

- Продукт: [docs/product.md](docs/product.md)
- Решения: [docs/decisions.md](docs/decisions.md)
- План: [docs/plan.md](docs/plan.md)
- Будущие идеи: [docs/ideas.md](docs/ideas.md)
- Спецификации и изменения: [openspec/](openspec/)

## Запуск

```bash
npm install
npm run dev -- --host   # открыть на телефоне по адресу из строки Network (та же Wi-Fi сеть)
npm run build
npm test
```

### Генерация пачек

Пачки составляет OpenAI через серверную функцию [api/generate.ts](api/generate.ts). Для локального запуска скопируйте [.env.example](.env.example) в `.env.local` и заполните:

- `OPENAI_API_KEY` — ключ OpenAI;
- `ACCESS_CODE` — код доступа, его спросит приложение при первой генерации;
- `OPENAI_MODEL` — необязательно, модель вместо модели по умолчанию.

`npm run dev` обслуживает `/api/generate` прямо в dev-сервере. Без запросов к OpenAI — мок, который имитирует ошибки по слову в теме («ошибка», «сеть»):

```bash
VITE_GENERATOR=mock npm run dev
```

На Vercel те же переменные задаются в Settings → Environment Variables для Production и Preview; новые значения действуют со следующего деплоя.

## Приложение

https://cards-lake-theta.vercel.app — открыть в Safari на iPhone → «Поделиться» → «На экран Домой».

## Деплой

Vercel с Git-интеграцией, настройки — в [vercel.json](vercel.json):

- `master` → прод;
- `develop` → превью https://cards-git-develop-lelderbes-projects.vercel.app, остальные ветки — превью со своими адресами.

У каждого адреса своё хранилище на устройстве: данные превью и прода не пересекаются.

## Иконки

Исходник — [public/icon.svg](public/icon.svg). PNG и `favicon.ico` в `public/` генерируются по [pwa-assets.config.js](pwa-assets.config.js) и коммитятся:

```bash
npx @vite-pwa/assets-generator
```
