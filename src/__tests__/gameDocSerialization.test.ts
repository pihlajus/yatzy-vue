import { describe, it, expect } from 'vitest'
import {
  scoresRecordToMap,
  scoresMapToRecord,
  toLocalPlayer,
  toFirestorePlayer,
} from '../gameDocSerialization'
import { Category } from '../types/game'

describe('gameDocSerialization', () => {
  it('scoresRecordToMap muuntaa string-avaimet Category-avaimiksi', () => {
    const m = scoresRecordToMap({ '0': 3, '14': 50 })
    expect(m.get(Category.Ones)).toBe(3)
    expect(m.get(Category.Yatzy)).toBe(50)
  })

  it('scoresMapToRecord muuntaa takaisin Recordiin', () => {
    const m = new Map<Category, number>([[Category.Twos, 4]])
    expect(scoresMapToRecord(m)).toEqual({ '1': 4 })
  })

  it('toLocalPlayer / toFirestorePlayer ovat käänteisiä', () => {
    const local = toLocalPlayer({
      uid: 'u', name: 'A', scores: { '0': 3 }, conceded: false,
    })
    expect(local.scores).toBeInstanceOf(Map)
    const back = toFirestorePlayer(local)
    expect(back.scores).toEqual({ '0': 3 })
  })
})
