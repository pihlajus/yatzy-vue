// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { useSettings } from '../composables/useSettings'

beforeEach(() => {
  localStorage.clear()
})

describe('useSettings', () => {
  it('defaults sound to false', () => {
    const { soundEnabled } = useSettings()
    expect(soundEnabled.value).toBe(false)
  })

  it('defaults probabilities to false', () => {
    const { probabilitiesEnabled } = useSettings()
    expect(probabilitiesEnabled.value).toBe(false)
  })

  it('persists sound toggle to localStorage', () => {
    const { soundEnabled, toggleSound } = useSettings()
    toggleSound()
    expect(soundEnabled.value).toBe(true)
    expect(localStorage.getItem('yatzy-sound')).toBe('true')
  })

  it('persists probabilities toggle to localStorage', () => {
    const { probabilitiesEnabled, toggleProbabilities } = useSettings()
    toggleProbabilities()
    expect(probabilitiesEnabled.value).toBe(true)
    expect(localStorage.getItem('yatzy-probabilities')).toBe('true')
  })

  it('reads saved state from localStorage', () => {
    localStorage.setItem('yatzy-sound', 'true')
    localStorage.setItem('yatzy-probabilities', 'true')
    const { soundEnabled, probabilitiesEnabled } = useSettings()
    expect(soundEnabled.value).toBe(true)
    expect(probabilitiesEnabled.value).toBe(true)
  })
})
