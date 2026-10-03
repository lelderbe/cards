/**
 * Random 128-bit id in hex. Uses getRandomValues rather than randomUUID: the latter is missing
 * outside secure contexts, e.g. when the dev server is opened on a phone over plain HTTP.
 */
export function createId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
