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
