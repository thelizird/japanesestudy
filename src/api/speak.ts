const VOICE_KEY = 'dg_voice'
export const DEFAULT_VOICE = 'aura-2-izanami-ja'

export const JP_VOICES = [
  { id: 'aura-2-izanami-ja', name: 'Izanami', gender: 'Female', age: 'Adult' },
  { id: 'aura-2-uzume-ja',   name: 'Uzume',   gender: 'Female', age: 'Young Adult' },
  { id: 'aura-2-ama-ja',     name: 'Ama',     gender: 'Female', age: 'Adult' },
  { id: 'aura-2-fujin-ja',   name: 'Fujin',   gender: 'Male',   age: 'Adult' },
  { id: 'aura-2-ebisu-ja',   name: 'Ebisu',   gender: 'Male',   age: 'Young Adult' },
] as const

export function getVoice(): string {
  return localStorage.getItem(VOICE_KEY) ?? DEFAULT_VOICE
}

export function setVoice(voiceId: string) {
  localStorage.setItem(VOICE_KEY, voiceId)
}

const DRIVE_TIMER_KEY = 'drive_timer_s'
export const DRIVE_TIMER_DEFAULT = 5
export const DRIVE_TIMER_MIN = 5
export const DRIVE_TIMER_MAX = 10

export function getDriveTimer(): number {
  const v = parseInt(localStorage.getItem(DRIVE_TIMER_KEY) ?? '')
  return isNaN(v) ? DRIVE_TIMER_DEFAULT : Math.min(DRIVE_TIMER_MAX, Math.max(DRIVE_TIMER_MIN, v))
}

export function setDriveTimer(seconds: number) {
  localStorage.setItem(DRIVE_TIMER_KEY, String(seconds))
}

let currentAudio: HTMLAudioElement | null = null

function toKatakana(text: string): string {
  return [...text].map(ch => {
    const code = ch.charCodeAt(0)
    return code >= 0x3041 && code <= 0x3096 ? String.fromCharCode(code + 0x60) : ch
  }).join('')
}

export function speakKatakana(character: string): Promise<void> {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
  const katakana = toKatakana(character)
  const audio = new Audio(`/audio/katakana/${encodeURIComponent(katakana)}.mp3`)
  currentAudio = audio
  return new Promise(resolve => {
    audio.onended = () => { currentAudio = null; resolve() }
    audio.onerror = () => { currentAudio = null; resolve() }
    audio.play()
  })
}

// ── Drive Mode audio ────────────────────────────────────────────────────────
// iOS Safari only allows programmatic audio.play() on an element that was
// explicitly touched inside a user-gesture handler. We create ONE Audio
// element in the gesture handler (Start tap) and reuse it for every card.
// Reusing the same element means the gesture unlock carries through the
// entire session without needing a new gesture per card.

let _driveEl: HTMLAudioElement | null = null

export function createDriveAudioContext() {
  _driveEl = new Audio()
  // Calling play() here (even though it fails with no src) registers this
  // element as gesture-activated on iOS for all future play() calls.
  _driveEl.play().catch(() => {})
}

export async function preloadDriveAudio(characters: { character: string }[]): Promise<void> {
  // Warm the service-worker / HTTP cache so playback is instant.
  await Promise.all(
    characters.map(c =>
      fetch(`/audio/katakana/${encodeURIComponent(toKatakana(c.character))}.mp3`).catch(() => {}),
    ),
  )
}

export function speakDrive(character: string): Promise<void> {
  const el = _driveEl
  if (!el) return Promise.resolve()
  const url = `/audio/katakana/${encodeURIComponent(toKatakana(character))}.mp3`
  return new Promise(resolve => {
    const done = () => {
      el.removeEventListener('ended', done)
      el.removeEventListener('error', done)
      resolve()
    }
    el.addEventListener('ended', done, { once: true })
    el.addEventListener('error', done, { once: true })
    el.src = url
    el.load()
    el.play().catch(done)
  })
}

export async function speak(text: string): Promise<void> {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }

  const token = localStorage.getItem('token')
  const res = await fetch('/api/speak/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Token ${token}` } : {}),
    },
    body: JSON.stringify({ text, voice: getVoice() }),
  })

  if (!res.ok) return

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  currentAudio = audio

  return new Promise(resolve => {
    audio.onended = () => {
      URL.revokeObjectURL(url)
      resolve()
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      resolve()
    }
    audio.play()
  })
}
