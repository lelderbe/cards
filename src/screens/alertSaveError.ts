/** A failed write leaves the editor open with its changes, so the user can try again. */
export function alertSaveError(error: unknown) {
  console.error('Failed to save the deck', error);
  window.alert('Не удалось сохранить изменения. Попробуйте ещё раз.');
}
