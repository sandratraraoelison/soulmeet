export const UNAUTHORIZED_EVENT = 'soulmeet:unauthorized';
export function dispatchUnauthorized() {
  window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
}
export function listenUnauthorized(handler: () => void): () => void {
  window.addEventListener(UNAUTHORIZED_EVENT, handler);
  return () => window.removeEventListener(UNAUTHORIZED_EVENT, handler);
}