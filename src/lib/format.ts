const litreFormatter = new Intl.NumberFormat('en-IN')

export function formatLitres(value: number): string {
  return `${litreFormatter.format(value)} L`
}

export function formatShortDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return isoDate
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function createRecordId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}
