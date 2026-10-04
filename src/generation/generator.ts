export type GeneratedDeck = {
  title: string;
  cards: Array<{ front: string; back: string }>;
};

/** Makes a deck draft on a topic; rejects with an AbortError once the signal is aborted. */
export type DeckGenerator = (topic: string, signal: AbortSignal) => Promise<GeneratedDeck>;

export type GenerationErrorKind = 'network' | 'unauthorized' | 'failed';

/** The request header that carries the access code to the generation server. */
export const ACCESS_CODE_HEADER = 'X-Access-Code';

/** Why the server turned down the access code: none was sent, or it did not match. */
export type AccessCodeProblem = 'missing_code' | 'wrong_code';

export class GenerationError extends Error {
  readonly kind: GenerationErrorKind;
  /** Set for kind 'unauthorized'. */
  readonly accessCodeProblem?: AccessCodeProblem;

  constructor(kind: GenerationErrorKind, message: string, accessCodeProblem?: AccessCodeProblem) {
    super(message);
    this.name = 'GenerationError';
    this.kind = kind;
    this.accessCodeProblem = accessCodeProblem;
  }
}
