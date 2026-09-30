/**
 * An unfinished session can be continued until the end of the day after its latest answer
 * (device local time). Calendar arithmetic keeps the boundary at midnight across DST changes.
 */
export function getSessionExpiry(lastAnsweredAt: number): number {
  const expiry = new Date(lastAnsweredAt)
  expiry.setHours(0, 0, 0, 0)
  expiry.setDate(expiry.getDate() + 2)
  return expiry.getTime()
}

export function isSessionFresh(lastAnsweredAt: number, now: number): boolean {
  return now < getSessionExpiry(lastAnsweredAt)
}
