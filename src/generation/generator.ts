export type GeneratedDeck = {
  title: string;
  cards: Array<{ front: string; back: string }>;
};

/** Makes a deck draft on a topic; rejects with an AbortError once the signal is aborted. */
export type DeckGenerator = (topic: string, signal: AbortSignal) => Promise<GeneratedDeck>;

export type GenerationErrorKind = 'network' | 'failed';

export class GenerationError extends Error {
  readonly kind: GenerationErrorKind;

  constructor(kind: GenerationErrorKind, message: string) {
    super(message);
    this.name = 'GenerationError';
    this.kind = kind;
  }
}
