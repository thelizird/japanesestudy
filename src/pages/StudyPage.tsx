import { useEffect, useState, useCallback } from 'react'
import { api } from '../api/client'
import type { Character } from '../api/client'
import IntroCard from '../components/IntroCard'

interface Props {
  deck: string
  onBack: () => void
  onGoReview: () => void
}

export default function StudyPage({ deck, onBack, onGoReview }: Props) {
  const [queue, setQueue] = useState<Character[]>([])
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [introduced, setIntroduced] = useState(0)
  const [done, setDone] = useState(false)

  const loadQueue = useCallback(async () => {
    setLoading(true)
    const [session, data] = await Promise.all([
      api.startSession(deck),
      api.getSessionCards(deck, 'study'),
    ])
    setSessionId(session.id)
    setQueue(data.new_characters ?? [])
    if ((data.new_characters ?? []).length === 0) setDone(true)
    setLoading(false)
  }, [deck])

  useEffect(() => {
    loadQueue()
  }, [loadQueue])

  const handleGotIt = async (character: Character) => {
    await api.introduce(character.id)
    setIntroduced(n => n + 1)
    setQueue(prev => {
      const next = prev.slice(1)
      if (next.length === 0) setDone(true)
      return next
    })
  }

  useEffect(() => {
    if (done && sessionId) {
      api.endSession(sessionId, introduced, introduced)
    }
  }, [done, sessionId, introduced])

  const current = queue[0]

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f14] flex items-center justify-center">
        <div className="text-gray-500">Loading…</div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#0f0f14] flex items-center justify-center p-6">
        <div className="text-center max-w-sm w-full">
          <div className="text-5xl mb-4">📖</div>
          <h2 className="text-2xl font-bold text-white mb-1">
            {introduced > 0 ? `${introduced} characters introduced` : 'Nothing new right now'}
          </h2>
          <p className="text-gray-400 mb-8">
            {introduced > 0
              ? 'Head to Review to start drilling them.'
              : 'All characters have been introduced.'}
          </p>
          <div className="space-y-3">
            {introduced > 0 && (
              <button
                onClick={onGoReview}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white font-medium py-3 rounded-xl transition-colors"
              >
                Go to Review
              </button>
            )}
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
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-white transition-colors text-sm"
          >
            ← Back
          </button>
          <div className="text-sm text-gray-500">{queue.length} remaining</div>
          <div className="w-10" />
        </div>

        <div className="h-1 bg-[#1a1a24] rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-violet-600 rounded-full transition-all"
            style={{
              width: `${introduced + queue.length > 0
                ? (introduced / (introduced + queue.length)) * 100
                : 0}%`,
            }}
          />
        </div>

        {current && (
          <IntroCard
            character={current}
            onGotIt={() => handleGotIt(current)}
          />
        )}
      </div>
    </div>
  )
}
