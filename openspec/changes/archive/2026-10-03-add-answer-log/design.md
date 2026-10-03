# Design

## Context

- Хранилище — Dexie `version(1)`: `decks` и `activeSessions` (ключ — `deckId`). См. `src/storage/db.ts`.
- `StudySession` (`src/domain/studySession.ts`) — чистое состояние прохода без идентификатора. `restoreSession` восстанавливает сохранённый проход.
- `StudyScreen` сообщает `App` о каждой оценке через `onProgress(nextSession)` / `onFinish(nextSession)`. `App` сохраняет или удаляет `activeSessions` и при ошибке только пишет в консоль.
- `SwipeableCard` вызывает `onAnswer` после анимации вылета карточки; следующая карточка монтируется заново (`key={answerCount}`).
- Разработка на iPhone идёт через `npm run dev -- --host` по `http://<LAN-IP>` — это **не** secure context: `crypto.randomUUID` там недоступен, `crypto.getRandomValues` доступен.

Мотивация — proposal.md, требования — specs/answer-log/spec.md.

## Goals / Non-Goals

**Goals:**
- Запись лога — одна чистая функция сборки записи плюс одна функция хранилища; экраны почти не меняются.
- Обновление схемы без потери данных версии 0.2.

**Non-Goals:**
- Никаких запросов чтения лога, кроме нужных тестам: способ чтения выберем на этапе интервалов.

## Decisions

### Таблица `answerLog` в `version(2)`

```ts
type AnswerLogEntry = {
  id?: number;            // автоинкремент
  sessionId: string;
  deckId: string;
  cardId: string;
  direction: Direction;
  remembered: boolean;
  wasFlipped: boolean;
  answeredAt: number;     // Date.now()
  durationMs: number;     // целое, мс
};
```

Схема: `answerLog: '++id, deckId, cardId, answeredAt'`. Индексы под очевидные будущие выборки (ответы по карточке, по пачке, по времени); `sessionId` не индексируем — группировка по проходу нужна редко, и индекс можно добавить следующей версией. `decks` и `activeSessions` объявляются как раньше; `upgrade()` версии 2 только проставляет `id` сохранённым проходам.

- **Альтернатива:** хранить ответы внутри записи `activeSessions` и переносить при завершении — сложнее и теряет брошенные проходы.

### Идентификатор прохода — поле `id` в `StudySession`

`createSession` создаёт `id`; `studySessionReducer` и `restoreSession` его сохраняют. Проходы, сохранённые версией 0.2 (поля нет), получают `id` один раз — в `upgrade()` схемы `version(2)`.

- **Альтернатива:** создавать `id` в `restoreSession`, если его нет. Отклонено: `restoreSession` вызывается при каждом рендере `DeckScreen`, id менялся бы до нажатия «Продолжить», а функция перестала бы быть чистой.

Генератор — `createId()` в `src/domain/id.ts`: 16 случайных байт из `crypto.getRandomValues` в hex. Работает и по HTTP в локальной сети, и в node-тестах. `createSession` принимает генератор параметром (как `random`) — тесты детерминированы.

- **Альтернатива:** `crypto.randomUUID` — недоступен вне secure context, проход на iPhone в dev-режиме сломается. Новая зависимость (`nanoid`) — не нужна ради 3 строк.

### Сборка записи — чистая функция

`createAnswerLogEntry(deckId, session, remembered, { answeredAt, durationMs })` в `src/domain/answerLog.ts` берёт состояние прохода **до** оценки: `cardId = session.queue[0]`, `wasFlipped = session.isFlipped`, `sessionId = session.id`, `direction = session.direction`. Покрывается тестами без хранилища.

### Замер времени — в `StudyScreen`

- Момент показа хранится в `useRef`: при монтировании экрана (`useEffect`) и сразу после каждой засчитанной оценки — то есть когда монтируется следующая карточка.
- Используется `performance.now()` (монотонные часы; переводы системного времени не дают отрицательных значений), результат округляется до целых мс.
- Конец замера — вызов `onAnswer`, т. е. после анимации вылета. В `durationMs` входит постоянная добавка длительности анимации (`FLY_OUT_DURATION_S`, 0 при reduced motion); для сравнения ответов между собой она не мешает, а замер остаётся в одном месте.
- **Альтернатива:** фиксировать момент решения в `SwipeableCard` (отпускание пальца / нажатие кнопки) — чуть точнее (на длительность `FLY_OUT_DURATION_S`), но добавляет второй колбэк в компонент жестов. Не стоит того сейчас.

`StudyScreen` собирает запись и передаёт её вверх: `onProgress(nextSession, entry)` / `onFinish(nextSession, entry)`.

### Запись — одна транзакция

`recordAnswer(entry, nextSession)` в `src/storage/answerLog.ts`: в `db.transaction('rw', db.answerLog, db.activeSessions, …)` добавляет запись и либо сохраняет проход (`lastAnsweredAt = entry.answeredAt`), либо — если проход завершён — удаляет его. `App.handleProgress` / `handleFinish` вызывают её вместо `saveActiveSession` / `deleteActiveSession`; ошибки, как и сейчас, уходят в `logSaveError`, проход продолжается.

`answeredAt` берётся тем же `Date.now()`, что раньше уходил в `lastAnsweredAt`, — срок прохода (D-15) не меняется.

## Risks / Trade-offs

- [`durationMs` шумный: сворачивание приложения, отвлечения, анимация] → пишем сырое значение (D-16), отсев — при чтении.
- [Лог растёт бесконечно] → ~150 байт на ответ; 100 ответов в день — ~5 МБ за год, для IndexedDB несущественно. Чистку не делаем.
- [Ссылки на карточки по `cardId` станут неверными, если правка карточки на этапе 5 заменит слово целиком при том же id] → правило «правка сохраняет id, новое слово — новый id» фиксируется в design этапа 5.
- [Проход 0.2 без `id`] → получает `id` при обновлении схемы; протухший удаляется при запуске, как раньше.

## Migration Plan

Dexie применяет `version(2)` при первом открытии новой версией: таблицы `decks` и `activeSessions` с данными остаются, сохранённые проходы получают `id`, добавляется пустая `answerLog`. `on('populate')` при обновлении не вызывается — встроенная пачка не дублируется. Откат: старый код с `version(1)` не откроет БД версии 2 (Dexie выдаст `VersionError`) — откат возможен только с потерей данных; для одного пользователя приемлемо.
