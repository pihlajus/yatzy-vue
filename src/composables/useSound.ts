import { useSettings } from './useSettings'

const BASE = import.meta.env.BASE_URL

// Kenney Casino Audio + Sci-fi Sounds (CC0) - real recorded sounds
const THROW_FILES = ['dice-throw-1.mp3', 'dice-throw-2.mp3', 'dice-throw-3.mp3']
const EXPLOSION_FILES = ['explosion-001.mp3', 'explosion-002.mp3', 'explosion-003.mp3']

const SAMPLE_RATE = 44100

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
}

function samplesToWavUrl(samples: Float32Array): string {
  const numSamples = samples.length
  const buffer = new ArrayBuffer(44 + numSamples * 2)
  const view = new DataView(buffer)

  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + numSamples * 2, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, SAMPLE_RATE, true)
  view.setUint32(28, SAMPLE_RATE * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(view, 36, 'data')
  view.setUint32(40, numSamples * 2, true)

  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]!))
    view.setInt16(44 + i * 2, s * 0x7fff, true)
  }

  const blob = new Blob([buffer], { type: 'audio/wav' })
  return URL.createObjectURL(blob)
}

function generateClick(): string {
  const len = Math.floor(SAMPLE_RATE * 0.08)
  const samples = new Float32Array(len)
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE
    const signal = (
      Math.sin(2 * Math.PI * 300 * t) * 0.5 +
      Math.sin(2 * Math.PI * 150 * t) * 0.3 +
      (Math.random() * 2 - 1) * 0.2
    )
    samples[i] = signal * 0.15 * Math.exp(-t * 60)
  }
  return samplesToWavUrl(samples)
}

// boom generation removed - using real explosion sounds

let clickUrl: string | null = null

function ensureUrls() {
  if (!clickUrl) clickUrl = generateClick()
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

function play(url: string) {
  const audio = new Audio(url)
  audio.play().catch(() => {})
}

function playRoll() {
  const { soundEnabled } = useSettings()
  if (!soundEnabled.value) return
  play(`${BASE}sounds/${pick(THROW_FILES)}`)
}

function playClick() {
  const { soundEnabled } = useSettings()
  if (!soundEnabled.value) return
  ensureUrls()
  play(clickUrl!)
}

function playBoom() {
  const { soundEnabled } = useSettings()
  if (!soundEnabled.value) return
  play(`${BASE}sounds/${pick(EXPLOSION_FILES)}`)
}

export function useSound() {
  return { playRoll, playClick, playBoom }
}
