import { useEffect, useRef, useState, useCallback } from 'react'
import { api } from '../api/client'
import type { Character, UserProgress } from '../api/client'
import MultipleChoiceCard from '../components/MultipleChoiceCard'
import WritingCard from '../components/WritingCard'

interface Props {
  deck: string
  onBack: () => void
  onStudy: () => void
}

type QuizType = 'mc_to_romaji' | 'mc_to_kana' | 'writing'
type Phase = 'pick' | 'select' | 'active' | 'done'

const QUIZ_OPTIONS: { type: QuizType; label: string; desc: string }[] = [
  { type: 'mc_to_romaji', label: 'Kana → Romaji', desc: 'See the character, pick the reading' },
  { type: 'mc_to_kana',   label: 'Romaji → Kana', desc: 'See the reading, pick the character' },
  { type: 'writing',      label: 'Drawing',        desc: 'Hear or see the reading, draw it' },
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function PracticePage({ deck, onBack, onStudy }: Props) {
  const [phase, setPhase] = useState<Phase>('pick')
  const [quizType, setQuizType] = useState<QuizType | null>(null)

  // character selector state
  const [introducedChars, setIntroducedChars] = useState<Character[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [loadingChars, setLoadingChars] = useState(false)
  const dragMode = useRef<'select' | 'deselect' | null>(null)

  // session state
  const [queue, setQueue] = useState<UserProgress[]>([])
  const [cardKey, setCardKey] = useState(0)
  const [stats, setStats] = useState({ seen: 0, correct: 0 })
  const [loadingSession, setLoadingSession] = useState(false)

  const deckLabel = deck.charAt(0).toUpperCase() + deck.slice(1)

  // Load introduced characters when entering select phase
  const enterSelect = useCallback(async (type: QuizType) => {
    setQuizType(type)
    setSelectedIds(new Set())
    setLoadingChars(true)
    const progress = await api.getProgress(deck)
    const chars = progress
      .filter(p => p.introduced && p.quiz_type === type)
      .map(p => p.character)
    // dedupe by id (3 progress rows share the same character)
    const seen = new Set<number>()
    const unique = chars.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true })
    setIntroducedChars(unique)
    setLoadingChars(false)
    setPhase('select')
  }, [deck])

  const startSession = useCallback(async (type: QuizType, charIds: Set<number>) => {
    setLoadingSession(true)
    const progress = await api.getProgress(deck)
    const cards = progress.filter(p =>
      p.introduced && p.quiz_type === type && charIds.has(p.character.id)
    )
    setQueue(shuffle(cards))
    setStats({ seen: 0, correct: 0 })
    setCardKey(0)
    setPhase('active')
    setLoadingSession(false)
  }, [deck])

  useEffect(() => {
    if (phase === 'active' && queue.length === 0 && !loadingSession) {
      setPhase('done')
    }
  }, [queue.length, phase, loadingSession])

  const handleResult = (progress: UserProgress, correct: boolean) => {
    setCardKey(k => k + 1)
    setStats(prev => ({
      seen: prev.seen + 1,
      correct: prev.correct + (correct ? 1 : 0),
    }))
    setQueue(prev => {
      const [, ...rest] = prev
      if (!correct) return [...rest, progress]
      return rest
    })
  }

  // Done screen keyboard shortcuts
  useEffect(() => {
    if (phase !== 'done') return
    const handler = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.key.toLowerCase() === 'o') onStudy()
      if (e.key.toLowerCase() === 'l' && quizType) startSession(quizType, selectedIds)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [phase, onStudy, quizType, selectedIds, startSession])

  // Drag selection handlers
  const handleCharPointerDown = (e: React.PointerEvent, id: number) => {
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    dragMode.current = selectedIds.has(id) ? 'deselect' : 'select'
    setSelectedIds(prev => {
      const next = new Set(prev)
      dragMode.current === 'select' ? next.add(id) : next.delete(id)
      return next
    })
  }

  const handleCharPointerEnter = (id: number) => {
    if (!dragMode.current) return
    setSelectedIds(prev => {
      const next = new Set(prev)
      dragMode.current === 'select' ? next.add(id) : next.delete(id)
      return next
    })
  }

  const handlePointerUp = () => {
    dragMode.current = null
  }

  const current = queue[0]

  if (loadingChars || loadingSession) {
    return (
      <div className="min-h-screen bg-[#0f0f14] flex items-center justify-center">
        <div className="text-gray-500">Loading…</div>
      </div>
    )
  }

  if (phase === 'pick') {
    return (
      <div className="min-h-screen bg-[#0f0f14] p-4">
        <div className="max-w-sm mx-auto">
          <div className="flex items-center justify-between mb-8">
            <button onClick={onBack} className="text-gray-500 hover:text-white transition-colors text-sm">
              ← Back
            </button>
            <span className="text-white font-semibold">{deckLabel} · Practice</span>
            <div className="w-10" />
          </div>
          <p className="text-gray-400 text-sm mb-6">Choose a quiz type to drill your introduced characters.</p>
          <div className="space-y-3">
            {QUIZ_OPTIONS.map(opt => (
              <button
                key={opt.type}
                onClick={() => enterSelect(opt.type)}
                className="w-full bg-[#1a1a24] hover:bg-[#22223a] border border-[#2e2e3e] hover:border-violet-800/50 rounded-2xl p-4 text-left transition-colors"
              >
                <div className="text-white font-medium mb-0.5">{opt.label}</div>
                <div className="text-gray-500 text-sm">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'select') {
    const allSelected = introducedChars.length > 0 && selectedIds.size === introducedChars.length
    return (
      <div
        className="min-h-screen bg-[#0f0f14] p-4 select-none"
        onPointerUp={handlePointerUp}
      >
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setPhase('pick')} className="text-gray-500 hover:text-white transition-colors text-sm">
              ← Back
            </button>
            <span className="text-white font-semibold">Pick characters</span>
            <button
              onClick={() => setSelectedIds(allSelected ? new Set() : new Set(introducedChars.map(c => c.id)))}
              className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              {allSelected ? 'Clear all' : 'All'}
            </button>
          </div>

          <div className="grid grid-cols-5 gap-2 mb-24">
            {introducedChars.map(char => {
              const selected = selectedIds.has(char.id)
              return (
                <div
                  key={char.id}
                  onPointerDown={e => handleCharPointerDown(e, char.id)}
                  onPointerEnter={() => handleCharPointerEnter(char.id)}
                  className={`rounded-xl p-2 text-center cursor-pointer transition-colors touch-none ${
                    selected
                      ? 'bg-violet-700/40 border border-violet-500/70'
                      : 'bg-[#13131a] border border-[#1e1e2e] hover:border-[#3e3e4e]'
                  }`}
                >
                  <div className={`text-2xl mb-0.5 ${selected ? 'text-white' : 'text-gray-500'}`}>
                    {char.character}
                  </div>
                  <div className={`text-xs ${selected ? 'text-gray-300' : 'text-gray-600'}`}>
                    {char.romaji}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sticky start button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0f0f14] to-transparent">
          <div className="max-w-lg mx-auto">
            <button
              disabled={selectedIds.size === 0}
              onClick={() => quizType && startSession(quizType, selectedIds)}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors"
            >
              {selectedIds.size === 0 ? 'Select characters to start' : `Start (${selectedIds.size})`}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    const accuracy = stats.seen > 0 ? Math.round((stats.correct / stats.seen) * 100) : 0
    const label = QUIZ_OPTIONS.find(o => o.type === quizType)?.label ?? ''
    return (
      <div className="min-h-screen bg-[#0f0f14] flex items-center justify-center p-6">
        <div className="text-center max-w-sm w-full">
          <div className="text-5xl mb-4">{accuracy >= 80 ? '🎌' : accuracy >= 50 ? '📖' : '💪'}</div>
          <h2 className="text-2xl font-bold text-white mb-1">Practice complete</h2>
          <p className="text-gray-400 mb-8">{label} · {stats.seen} attempts</p>

          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="bg-[#1a1a24] border border-[#2e2e3e] rounded-xl p-4">
              <div className="text-3xl font-bold text-white">{stats.correct}</div>
              <div className="text-xs text-gray-500">Correct</div>
            </div>
            <div className="bg-[#1a1a24] border border-[#2e2e3e] rounded-xl p-4">
              <div className="text-3xl font-bold text-white">{accuracy}%</div>
              <div className="text-xs text-gray-500">Accuracy</div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={onStudy}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-medium py-3 rounded-xl transition-colors"
            >
              Study next character
            </button>
            <button
              onClick={() => quizType && startSession(quizType, selectedIds)}
              className="w-full bg-[#1e1e2e] hover:bg-[#26263a] border border-[#2e2e3e] text-white font-medium py-3 rounded-xl transition-colors"
            >
              Practice again
            </button>
            <button
              onClick={onBack}
              className="w-full border border-[#2e2e3e] text-gray-400 hover:text-white hover:border-gray-500 font-medium py-3 rounded-xl transition-colors"
            >
              Back to home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f14] p-4">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="text-gray-500 hover:text-white transition-colors text-sm">
            ← Back
          </button>
          <div className="text-sm text-gray-500">{queue.length} remaining</div>
          <div className="text-sm text-gray-500">
            {stats.seen > 0 && `${Math.round(stats.correct / stats.seen * 100)}%`}
          </div>
        </div>

        <div className="h-1 bg-[#1a1a24] rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-violet-600 rounded-full transition-all"
            style={{
              width: `${stats.correct + queue.length > 0
                ? (stats.correct / (stats.correct + queue.length)) * 100
                : 0}%`,
            }}
          />
        </div>

        {current && current.quiz_type !== 'writing' && (
          <MultipleChoiceCard
            key={cardKey}
            progress={current}
            onResult={correct => handleResult(current, correct)}
          />
        )}
        {current && current.quiz_type === 'writing' && (
          <WritingCard
            key={cardKey}
            progress={current}
            onResult={correct => handleResult(current, correct)}
          />
        )}
      </div>
    </div>
  )
}
