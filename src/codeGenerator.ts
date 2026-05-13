const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const LENGTH = 4

export function generateRoomCode(): string {
  let code = ''
  const arr = new Uint32Array(LENGTH)
  crypto.getRandomValues(arr)
  for (let i = 0; i < LENGTH; i++) {
    code += ALPHABET[arr[i]! % ALPHABET.length]
  }
  return code
}

export function normalizeRoomCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function isValidRoomCode(code: string): boolean {
  if (code.length !== LENGTH) return false
  for (const ch of code) {
    if (!ALPHABET.includes(ch)) return false
  }
  return true
}
