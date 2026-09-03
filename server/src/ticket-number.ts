const SUFFIX_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const SUFFIX_LENGTH = 6

type TicketNumberGeneratorDependencies = {
  exists: (ticketNumber: string) => Promise<boolean>
  random?: () => number
  randomSuffix?: () => string
}

function formatUtcDate(date: Date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

function generateSuffix(random: () => number) {
  return Array.from({ length: SUFFIX_LENGTH }, () => {
    const index = Math.min(SUFFIX_ALPHABET.length - 1, Math.floor(random() * SUFFIX_ALPHABET.length))
    return SUFFIX_ALPHABET[index]
  }).join('')
}

export function createTicketNumberGenerator({
  exists,
  random = Math.random,
  randomSuffix,
}: TicketNumberGeneratorDependencies) {
  return async (date: Date) => {
    const datePart = formatUtcDate(date)

    while (true) {
      const suffix = randomSuffix ? randomSuffix() : generateSuffix(random)
      const ticketNumber = `TT-${datePart}-${suffix}`

      if (!(await exists(ticketNumber))) {
        return ticketNumber
      }
    }
  }
}
