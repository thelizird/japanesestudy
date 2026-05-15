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

// ── Drive Mode: WebAudio-based playback ─────────────────────────────────────
// Uses the Web Audio API so playback works on iOS without a user gesture on
// every individual play call. The AudioContext must be created/resumed once
// inside a user-gesture handler (createDriveAudioContext), after which all
// subsequent speakDrive() calls play freely.

let _driveCtx: AudioContext | null = null
const _driveCache = new Map<string, AudioBuffer>()

export function createDriveAudioContext() {
  if (_driveCtx && _driveCtx.state !== 'closed') {
    _driveCtx.resume().catch(() => {})
    return
  }
  _driveCtx = new AudioContext()
}

export async function preloadDriveAudio(characters: { character: string }[]): Promise<void> {
  if (!_driveCtx) return
  await Promise.all(
    characters.map(async c => {
      const url = `/audio/katakana/${encodeURIComponent(toKatakana(c.character))}.mp3`
      if (_driveCache.has(url)) return
      try {
        const resp = await fetch(url)
        const ab = await resp.arrayBuffer()
        const buf = await _driveCtx!.decodeAudioData(ab)
        _driveCache.set(url, buf)
      } catch { /* skip missing files */ }
    }),
  )
}

export function speakDrive(character: string): Promise<void> {
  return new Promise(resolve => {
    if (!_driveCtx) { resolve(); return }
    const url = `/audio/katakana/${encodeURIComponent(toKatakana(character))}.mp3`
    const buffer = _driveCache.get(url)
    if (!buffer) { resolve(); return }
    const src = _driveCtx.createBufferSource()
    src.buffer = buffer
    src.connect(_driveCtx.destination)
    src.onended = () => resolve()
    src.start()
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
