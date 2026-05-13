import { describe, it, expect } from 'vitest'
import { generateRoomCode, normalizeRoomCode, isValidRoomCode } from '../codeGenerator'

describe('codeGenerator', () => {
  it('generateRoomCode tuottaa 4-merkkisen merkkijonon', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode()
      expect(code).toMatch(/^[A-HJKMNP-Z2-9]{4}$/)
    }
  })

  it('normalizeRoomCode pakottaa uppercase ja poistaa välilyönnit', () => {
    expect(normalizeRoomCode(' k7m2 ')).toBe('K7M2')
    expect(normalizeRoomCode('k-7-m-2')).toBe('K7M2')
  })

  it('isValidRoomCode hyväksyy validi muoto', () => {
    expect(isValidRoomCode('K7M2')).toBe(true)
    expect(isValidRoomCode('K7M')).toBe(false)
    expect(isValidRoomCode('K7M2X')).toBe(false)
    expect(isValidRoomCode('K0M2')).toBe(false)
    expect(isValidRoomCode('KIM2')).toBe(false)
  })
})
