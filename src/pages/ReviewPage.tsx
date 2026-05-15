import { useEffect, useState, useCallback } from 'react'
import { api } from '../api/client'
import type { UserProgress } from '../api/client'
import MultipleChoiceCard from '../components/MultipleChoiceCard'
import WritingCard from '../components/WritingCard'

interface Props {
  deck: string
  onBack: () => void
}

type Phase = 'loading' | 'empty' | 'active' | 'done'

interface Stats {
  reviewed: number
  correct: number
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function ReviewPage({ deck, onBack }: Props) {
  const [queue, setQueue] = useState<UserProgress[]>([])
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [phase, setPhase] = useState<Phase>('loading')
  const [stats, setStats] = useState<Stats>({ reviewed: 0, correct: 0 })
  const [cardKey, setCardKey] = useState(0)

  const loadQueue = useCallback(async (reviewAhead = false) => {
    setPhase('loading')
    const [session, data] = await Promise.all([
      api.startSession(deck),
      api.getSessionCards(deck, 'review', reviewAhead),
    ])
    setSessionId(session.id)
    const due = data.due_reviews ?? []
    if (due.length === 0) {
      setPhase('empty')
    } else {
      setQueue(shuffle(due))
      setPhase('active')
    }
  }, [deck])

  useEffect(() => {
    loadQueue()
  }, [loadQueue])

  const handleResult = async (progress: UserProgress, correct: boolean) => {
    const updated = await api.review(progress.id, correct)
    setCardKey(k => k + 1)
    setStats(prev => ({
      reviewed: prev.reviewed + 1,
      correct: prev.correct + (correct ? 1 : 0),
    }))
    setQueue(prev => {
      const [, ...rest] = prev
      if (!correct) return [...rest, updated]
      if (rest.length === 0) return []
      return rest
    })
  }

  useEffect(() => {
    if (phase === 'active' && queue.length === 0 && sessionId) {
      api.endSession(sessionId, stats.reviewed, stats.correct).then(() => {
        setPhase('done')
      })
    }
  }, [queue.length, phase, sessionId, stats])

  const current = queue[0]

  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-[#0f0f14] flex items-center justify-center">
        <div className="text-gray-500">Loading session…</div>
      </div>
    )
  }

  if (phase === 'empty') {
    return (
      <div className="min-h-screen bg-[#0f0f14] flex items-center justify-center p-6">
        <div className="text-center max-w-sm w-full">
          <div className="text-5xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-white mb-1">Nothing due</h2>
          <p className="text-gray-400 mb-8">
            No cards are scheduled right now.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => loadQueue(true)}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-medium py-3 rounded-xl transition-colors"
            >
              Review Ahead (next hour)
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

  if (phase === 'done') {
    const accuracy = stats.reviewed > 0
      ? Math.round((stats.correct / stats.reviewed) * 100)
      : 0
    return (
      <div className="min-h-screen bg-[#0f0f14] flex items-center justify-center p-6">
        <div className="text-center max-w-sm w-full">
          <div className="text-5xl mb-4">
            {accuracy >= 80 ? '🎌' : accuracy >= 50 ? '📖' : '💪'}
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">Review complete</h2>
          <p className="text-gray-400 mb-8">{stats.reviewed} cards reviewed</p>

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

          <button
            onClick={onBack}
            className="w-full border border-[#2e2e3e] text-gray-400 hover:text-white hover:border-gray-500 font-medium py-3 rounded-xl transition-colors"
          >
            Back to home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f14] p-4">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-white transition-colors text-sm"
          >
            ← Back
          </button>
          <div className="text-sm text-gray-500">{queue.length} remaining</div>
          <div className="text-sm text-gray-500">
            {stats.reviewed > 0 && `${Math.round(stats.correct / stats.reviewed * 100)}%`}
          </div>
        </div>

        <div className="h-1 bg-[#1a1a24] rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-violet-600 rounded-full transition-all"
            style={{
              width: `${stats.reviewed + queue.length > 0
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
