import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import type { DeckStats } from '../api/client'

interface Props {
  onStudy: (deck: string) => void
  onReview: (deck: string) => void
  onPractice: (deck: string) => void
  onViewDeck: (deck: string) => void
  onSettings: () => void
}

const DECKS = [
  { id: 'hiragana', label: 'Hiragana', jp: 'ひらがな', desc: 'The foundational phonetic alphabet' },
  { id: 'katakana', label: 'Katakana', jp: 'カタカナ', desc: 'Used for foreign words & emphasis' },
]

export default function HomePage({ onStudy, onReview, onPractice, onViewDeck, onSettings }: Props) {
  const { username, logout } = useAuth()
  const [stats, setStats] = useState<Record<string, DeckStats>>({})

  useEffect(() => {
    DECKS.forEach(async ({ id }) => {
      const s = await api.getDeckStats(id)
      setStats(prev => ({ ...prev, [id]: s }))
    })
  }, [])

  return (
    <div className="min-h-screen bg-[#0f0f14] p-6">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-white">日本語</h1>
            <p className="text-gray-400 text-sm mt-1">Welcome back, {username}</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onSettings}
              className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
            >
              Settings
            </button>
            <button
              onClick={logout}
              className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {DECKS.map(deck => {
            const s = stats[deck.id]
            const dueCount = s?.due ?? 0
            return (
              <div
                key={deck.id}
                className="bg-[#1a1a24] border border-[#2e2e3e] rounded-2xl p-5"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-semibold">{deck.label}</span>
                      <span className="text-gray-500 text-sm">{deck.jp}</span>
                      {s && (
                        <span className="text-green-500 text-xs">
                          {s.introduced} / {s.total}
                        </span>
                      )}
                      {dueCount > 0 && (
                        <span className="bg-violet-600 text-white text-xs px-2 py-0.5 rounded-full">
                          {dueCount} due
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-sm">{deck.desc}</p>
                  </div>
                  <button
                    onClick={() => onViewDeck(deck.id)}
                    className="text-gray-500 hover:text-white text-xs transition-colors shrink-0 mt-0.5"
                  >
                    View all
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => onStudy(deck.id)}
                    className="bg-[#1e1e2e] hover:bg-[#26263a] border border-[#2e2e3e] text-white font-medium py-2.5 rounded-xl transition-colors text-sm"
                  >
                    Study
                  </button>
                  <button
                    onClick={() => onReview(deck.id)}
                    className="bg-violet-600 hover:bg-violet-500 text-white font-medium py-2.5 rounded-xl transition-colors text-sm"
                  >
                    {dueCount > 0 ? `Review (${dueCount})` : 'Review'}
                  </button>
                  <button
                    onClick={() => onPractice(deck.id)}
                    className="bg-[#1e1e2e] hover:bg-[#26263a] border border-[#2e2e3e] text-white font-medium py-2.5 rounded-xl transition-colors text-sm"
                  >
                    Practice
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-center text-gray-700 text-xs mt-10">v0.1.0</p>
      </div>
    </div>
  )
}
