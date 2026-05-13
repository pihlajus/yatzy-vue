import { Category, type OnlinePlayer } from './types/game'

export interface LocalOnlinePlayer {
  uid: string
  name: string
  scores: Map<Category, number>
  conceded: boolean
}

export function scoresRecordToMap(record: Record<string, number>): Map<Category, number> {
  const m = new Map<Category, number>()
  for (const [key, value] of Object.entries(record)) {
    m.set(Number(key) as Category, value)
  }
  return m
}

export function scoresMapToRecord(map: Map<Category, number>): Record<string, number> {
  const r: Record<string, number> = {}
  for (const [key, value] of map.entries()) {
    r[String(key)] = value
  }
  return r
}

export function toLocalPlayer(p: OnlinePlayer): LocalOnlinePlayer {
  return {
    uid: p.uid,
    name: p.name,
    conceded: p.conceded,
    scores: scoresRecordToMap(p.scores),
  }
}

export function toFirestorePlayer(p: LocalOnlinePlayer): OnlinePlayer {
  return {
    uid: p.uid,
    name: p.name,
    conceded: p.conceded,
    scores: scoresMapToRecord(p.scores),
  }
}
