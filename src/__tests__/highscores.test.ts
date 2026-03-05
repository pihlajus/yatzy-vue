import { describe, it, expect } from 'vitest'
import { useHighScores } from '../composables/useHighScores'

function createScores() {
  const { scores, hasId, isNumberOne } = useHighScores()

  // Populate with mock top 10 data (no Firebase needed)
  scores.value = [
    { id: 'doc-1', playerName: 'Akseli', score: 300 },
    { id: 'doc-2', playerName: 'Jussi', score: 280 },
    { id: 'doc-3', playerName: 'Maija', score: 260 },
    { id: 'doc-4', playerName: 'Ville', score: 240 },
    { id: 'doc-5', playerName: 'Anna', score: 220 },
    { id: 'doc-6', playerName: 'Jussi', score: 200 },
    { id: 'doc-7', playerName: 'Pekka', score: 180 },
    { id: 'doc-8', playerName: 'Liisa', score: 160 },
    { id: 'doc-9', playerName: 'Kalle', score: 140 },
    { id: 'doc-10', playerName: 'Matti', score: 120 },
  ]

  return { scores, hasId, isNumberOne }
}

describe('useHighScores', () => {
  describe('hasId', () => {
    it('returns true for a doc ID in the top 10', () => {
      const { hasId } = createScores()
      expect(hasId('doc-5')).toBe(true)
    })

    it('returns false for a doc ID not in the top 10', () => {
      const { hasId } = createScores()
      expect(hasId('doc-99')).toBe(false)
    })

    it('matches by ID, not by name or score', () => {
      const { hasId } = createScores()
      // doc-6 and doc-2 are both "Jussi" - only exact ID should match
      expect(hasId('doc-6')).toBe(true)
      expect(hasId('doc-2')).toBe(true)
      expect(hasId('Jussi')).toBe(false)
    })
  })

  describe('isNumberOne', () => {
    it('returns true for the #1 doc ID', () => {
      const { isNumberOne } = createScores()
      expect(isNumberOne('doc-1')).toBe(true)
    })

    it('returns false for a non-#1 doc ID in top 10', () => {
      const { isNumberOne } = createScores()
      expect(isNumberOne('doc-2')).toBe(false)
    })

    it('returns false for a doc ID not in the list', () => {
      const { isNumberOne } = createScores()
      expect(isNumberOne('doc-99')).toBe(false)
    })

    it('returns false when scores are empty', () => {
      const { scores, isNumberOne } = useHighScores()
      scores.value = []
      expect(isNumberOne('doc-1')).toBe(false)
    })
  })
})

describe('celebration logic', () => {
  it('detects top 10 entry from saved doc IDs', () => {
    const { hasId } = createScores()
    const savedDocIds = ['doc-new-1', 'doc-5']
    const top10Ids = savedDocIds.filter(hasId)
    expect(top10Ids).toEqual(['doc-5'])
    expect(top10Ids.length).toBeGreaterThan(0)
  })

  it('detects no top 10 entry when all IDs are outside', () => {
    const { hasId } = createScores()
    const savedDocIds = ['doc-new-1', 'doc-new-2']
    const top10Ids = savedDocIds.filter(hasId)
    expect(top10Ids).toHaveLength(0)
  })

  it('detects #1 entry from saved doc IDs', () => {
    const { hasId, isNumberOne } = createScores()
    const savedDocIds = ['doc-1', 'doc-new-2']
    const top10Ids = savedDocIds.filter(hasId)
    const madeTop1 = top10Ids.some(isNumberOne)
    expect(madeTop1).toBe(true)
  })

  it('does not flag #1 when player is in top 10 but not first', () => {
    const { hasId, isNumberOne } = createScores()
    const savedDocIds = ['doc-3']
    const top10Ids = savedDocIds.filter(hasId)
    const madeTop1 = top10Ids.some(isNumberOne)
    expect(madeTop1).toBe(false)
  })

  it('handles multiplayer where one player makes #1 and another top 10', () => {
    const { hasId, isNumberOne } = createScores()
    const savedDocIds = ['doc-1', 'doc-7']
    const top10Ids = savedDocIds.filter(hasId)
    expect(top10Ids).toHaveLength(2)
    expect(top10Ids.some(isNumberOne)).toBe(true)
  })

  it('highlights only the exact saved doc, not other entries by same player', () => {
    const { hasId } = createScores()
    // Jussi has doc-2 (280) and doc-6 (200) in the list
    // Only doc-6 was saved this game
    const savedDocIds = ['doc-6']
    expect(hasId('doc-6')).toBe(true)
    expect(savedDocIds.includes('doc-2')).toBe(false)
  })
})
