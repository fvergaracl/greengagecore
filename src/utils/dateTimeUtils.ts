const formatToISO = (datetime?: string): string => {
  const date = new Date(datetime)
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${datetime}`)
  }
  return date.toISOString()
}

const formatFromISO = (datetime?: Date): string => {
  const date = new Date(datetime)
  // date '2025-01-17T12:38:00.000Z' to '2025-01-17T12:38'
  return date.toISOString().slice(0, 16)
}

export { formatToISO, formatFromISO }
