import { useEffect, useMemo, useRef, useState } from 'react'
import type { Character } from '../api/client'
import { api } from '../api/client'
import { preloadDriveAudio, speakDrive, getDriveTimer, getDriveWindow, getDriveTapMode } from '../api/speak'
import { CHARACTERS } from '../data/characters'

interface Props {
  deck: string
  chars: Character[]
  onBack: () => void
}

type Phase = 'session' | 'replaying' | 'end' | 'learn'

const LEARN_INTERVAL_MS = 10000

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function DrivePage({ deck, chars: initChars, onBack }: Props) {
  const BASE_MS = getDriveTimer() * 1000
  const EXTRA_MS = 2000

  const [charSet, setCharSet] = useState<Character[]>(initChars)
  const [queue, setQueue] = useState<Character[]>(() => shuffle([...initChars]))
  const [phase, setPhase] = useState<Phase>('session')
  const [timeLeft, setTimeLeft] = useState(BASE_MS)
  const [learnChar, setLearnChar] = useState<Character | null>(null)

  // Last 5 characters by curriculum order (display_order) get +2s; all get it if < 5 selected
  const newerIds = useMemo(() => {
    const sorted = [...charSet].sort((a, b) => a.display_order - b.display_order)
    const count = Math.min(5, sorted.length)
    return new Set(sorted.slice(sorted.length - count).map(c => c.id))
  }, [charSet])
  const newerIdsRef = useRef(newerIds)
  newerIdsRef.current = newerIds
  const [cardKey, setCardKey] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [showChar, setShowChar] = useState(false)

  const queueRef = useRef(queue)
  queueRef.current = queue
  const phaseRef = useRef<Phase>('session')
  phaseRef.current = phase

  // Keep screen awake while driving
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    navigator.wakeLock?.request('screen').then(l => { lock = l }).catch(() => {})
    return () => { lock?.release() }
  }, [])

  // Preload all audio buffers into the WebAudio cache
  useEffect(() => {
    preloadDriveAudio(initChars).then(() => setLoaded(true))
  }, []) // eslint-disable-line

  // Introduce chars for SRS tracking in the background
  useEffect(() => {
    charSet.forEach(c => api.introduce(c.id))
  }, [charSet])

  // Card loop: play audio + run countdown timer
  // Depends on `loaded` so the first card fires after the cache is ready,
  // not on initial mount when the cache is still empty.
  useEffect(() => {
    if (!loaded || phaseRef.current !== 'session') return
    const q = queueRef.current
    if (q.length === 0) return

    speakDrive(q[0].character)

    const cardMs = BASE_MS + (newerIdsRef.current.has(q[0].id) ? EXTRA_MS : 0)
    const deadline = Date.now() + cardMs
    let raf: number

    function tick() {
      const remaining = Math.max(0, deadline - Date.now())
      setTimeLeft(remaining)

      if (phaseRef.current !== 'session') return

      if (remaining > 0) {
        raf = requestAnimationFrame(tick)
        return
      }

      // Timer expired — advance
      const rest = queueRef.current.slice(1)
      if (rest.length === 0) {
        setPhase('end')
      } else {
        setQueue(rest)
        setCardKey(k => k + 1)
      }
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [cardKey, loaded]) // re-runs each new card and once when loading completes

  // Delay showing character/romaji until halfway through the card's duration (rounded up to nearest second)
  useEffect(() => {
    if (!loaded) return
    setShowChar(false)
    const current = queueRef.current[0]
    const cardMs = BASE_MS + (current && newerIdsRef.current.has(current.id) ? EXTRA_MS : 0)
    const revealMs = Math.ceil(cardMs / 2000) * 1000
    const t = setTimeout(() => setShowChar(true), revealMs)
    return () => clearTimeout(t)
  }, [cardKey, loaded])

  // Learn phase: play audio immediately then every 10 seconds
  useEffect(() => {
    if (phase !== 'learn' || !learnChar) return
    speakDrive(learnChar.character)
    const id = setInterval(() => speakDrive(learnChar.character), LEARN_INTERVAL_MS)
    return () => clearInterval(id)
  }, [phase, learnChar])

  function handleTap() {
    if (phase !== 'session' || queue.length === 0) return

    // Skip mode: drop the current card and advance immediately, just like the
    // timer expiring — no replay, the card won't reappear this session.
    if (getDriveTapMode() === 'skip') {
      const rest = queue.slice(1)
      if (rest.length === 0) {
        setPhase('end')
      } else {
        setQueue(rest)
        setCardKey(k => k + 1)
      }
      return
    }

    // Wrong mode: replay the audio and requeue the card to the back so it
    // comes around again later this session.
    setPhase('replaying')
    speakDrive(queue[0].character).then(() => {
      setQueue(prev => {
        const [first, ...rest] = prev
        return [...rest, first]
      })
      setPhase('session')
      setCardKey(k => k + 1)
    })
  }

  function handleReplay() {
    setQueue(shuffle([...charSet]))
    setPhase('session')
    setCardKey(k => k + 1)
  }

  async function handleLearn() {
    const deckChars = CHARACTERS.filter(c => c.deck === deck)
    const charIds = new Set(charSet.map(c => c.id))
    // Find the highest deck-order index currently in the session
    let lastIdx = -1
    for (let i = 0; i < deckChars.length; i++) {
      if (charIds.has(deckChars[i].id)) lastIdx = i
    }
    // Next to learn = first character after lastIdx not already in the session
    const next = deckChars.slice(lastIdx + 1).find(c => !charIds.has(c.id))
    if (!next) { handleReplay(); return }
    await preloadDriveAudio([next])
    setLearnChar(next)
    setPhase('learn')
  }

  function handleLearnConfirm() {
    if (!learnChar) return
    const window = getDriveWindow()
    let newChars = [...charSet, learnChar]
    if (newChars.length > window) {
      const sorted = [...newChars].sort((a, b) => a.display_order - b.display_order)
      const oldest = sorted[0]
      newChars = newChars.filter(c => c.id !== oldest.id)
    }
    setCharSet(newChars)
    setQueue(shuffle([...newChars]))
    setLearnChar(null)
    setPhase('session')
    setCardKey(k => k + 1)
  }

  if (!loaded) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-gray-600 text-sm">Loading audio…</div>
      </div>
    )
  }

  const current = queue[0]
  const currentCardMs = current
    ? BASE_MS + (newerIds.has(current.id) ? EXTRA_MS : 0)
    : BASE_MS
  const timerPct = timeLeft / currentCardMs

  // ── Session / Replaying ──────────────────────────────────────────────────
  if (phase === 'session' || phase === 'replaying') {
    return (
      <div
        className="relative min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center select-none overflow-hidden"
        onClick={handleTap}
      >
        {/* Timer bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#1a1a24]">
          <div
            className="h-full bg-green-500"
            style={{ width: `${timerPct * 100}%`, transition: 'none' }}
          />
        </div>

        {/* Exit — small, doesn't count as a wrong tap */}
        <button
          onClick={e => { e.stopPropagation(); onBack() }}
          className="absolute top-6 left-5 text-gray-700 hover:text-gray-500 text-sm z-10"
        >
          ← exit
        </button>

        {/* Character + romaji — hidden for first 2s so a glance doesn't spoil the next card */}
        {current && showChar && (
          <div className="flex flex-col items-center gap-6 pointer-events-none">
            <div className="text-[10rem] leading-none font-light text-white">
              {current.character}
            </div>
            <div className="text-5xl text-gray-400 font-light tracking-widest">
              {current.romaji}
            </div>
          </div>
        )}

        <div className="absolute bottom-8 text-gray-700 text-sm pointer-events-none">
          {getDriveTapMode() === 'skip' ? 'tap anywhere to skip' : 'tap anywhere if wrong'}
        </div>
      </div>
    )
  }

  // ── End screen ───────────────────────────────────────────────────────────
  if (phase === 'end') {
    const charIds = new Set(charSet.map(c => c.id))
    const hasMore = CHARACTERS.some(c => c.deck === deck && !charIds.has(c.id))

    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col select-none">
        <button
          onClick={onBack}
          className="absolute top-6 left-5 text-gray-700 hover:text-gray-500 text-sm z-10"
        >
          ← exit
        </button>

        {/* Top half — Replay */}
        <div
          className="flex-1 flex items-center justify-center border-b border-[#1a1a24] active:bg-[#111118] cursor-pointer"
          onClick={handleReplay}
        >
          <div className="text-center">
            <div className="text-5xl font-semibold text-white mb-3">Replay</div>
            <div className="text-gray-600 text-sm">{charSet.length} characters</div>
          </div>
        </div>

        {/* Bottom half — Learn */}
        <div
          className={`flex-1 flex items-center justify-center active:bg-[#111118] cursor-pointer ${!hasMore ? 'opacity-25 pointer-events-none' : ''}`}
          onClick={handleLearn}
        >
          <div className="text-center">
            <div className="text-5xl font-semibold text-violet-400 mb-3">Learn</div>
            <div className="text-gray-600 text-sm">
              {hasMore ? 'add next character' : 'all characters learned'}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Learn screen ─────────────────────────────────────────────────────────
  if (phase === 'learn' && learnChar) {
    return (
      <div
        className="relative min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center select-none"
        onClick={handleLearnConfirm}
      >
        <button
          onClick={e => { e.stopPropagation(); onBack() }}
          className="absolute top-6 left-5 text-gray-700 hover:text-gray-500 text-sm z-10"
        >
          ← exit
        </button>

        <div className="flex flex-col items-center gap-6 pointer-events-none">
          <div className="text-[10rem] leading-none font-light text-white">
            {learnChar.character}
          </div>
          <div className="text-5xl text-gray-400 font-light tracking-widest">
            {learnChar.romaji}
          </div>
        </div>

        <div className="absolute bottom-8 text-gray-600 text-sm pointer-events-none">
          tap to add to session
        </div>
      </div>
    )
  }

  return null
}
