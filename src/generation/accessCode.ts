const STORAGE_KEY = 'cards.accessCode';

/** The code for the generation server kept on this device, or null. */
export function getAccessCode(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAccessCode(code: string) {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch (error) {
    console.error('Failed to keep the access code', error);
  }
}
