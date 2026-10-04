import { GenerationError, type DeckGenerator } from './generator.ts';

const words: Array<[string, string]> = [
  ['kitchen', 'кухня'],
  ['fridge', 'холодильник'],
  ['oven', 'духовка'],
  ['stove', 'плита'],
  ['sink', 'раковина'],
  ['frying pan', 'сковорода'],
  ['saucepan', 'кастрюля'],
  ['kettle', 'чайник'],
  ['knife', 'нож'],
  ['fork', 'вилка'],
  ['spoon', 'ложка'],
  ['plate', 'тарелка'],
  ['bowl', 'миска'],
  ['cup', 'чашка'],
  ['glass', 'стакан'],
  ['cutting board', 'разделочная доска'],
  ['bread', 'хлеб'],
  ['butter', 'сливочное масло'],
  ['salt', 'соль'],
  ['pepper', 'перец'],
  ['flour', 'мука'],
  ['to boil', 'варить'],
  ['to fry', 'жарить'],
  ['recipe', 'рецепт'],
];

type MockGeneratorOptions = {
  delayMs: number;
};

/**
 * Stands in for the AI generator: answers after a delay with the same kitchen words for any
 * topic. A topic with «ошибка» fails, one with «сеть» fails as if offline.
 */
export function createMockGenerator({ delayMs }: MockGeneratorOptions): DeckGenerator {
  return async (topic, signal) => {
    await wait(delayMs, signal);

    const normalizedTopic = topic.trim().toLowerCase();
    if (normalizedTopic.includes('ошибка')) {
      throw new GenerationError('failed', 'Mock generation failure');
    }
    if (normalizedTopic.includes('сеть')) {
      throw new GenerationError('network', 'Mock network failure');
    }

    return {
      title: capitalize(topic.trim()),
      cards: words.map(([front, back]) => ({ front, back })),
    };
  };
}

function wait(delayMs: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(abortError());
      return;
    }

    const timeoutId = setTimeout(resolve, delayMs);
    signal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
      reject(abortError());
    });
  });
}

function abortError() {
  return new DOMException('Generation aborted', 'AbortError');
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
