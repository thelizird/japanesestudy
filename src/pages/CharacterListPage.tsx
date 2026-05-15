import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Character, UserProgress } from '../api/client'

interface Props {
  deck: string
  onBack: () => void
}

const TYPE_LABELS: Record<string, string> = {
  base: 'Base',
  dakuten: 'Dakuten',
  combo: 'Combo',
}

export default function CharacterListPage({ deck, onBack }: Props) {
  const [characters, setCharacters] = useState<Character[]>([])
  const [progress, setProgress] = useState<UserProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Character | null>(null)

  useEffect(() => {
    Promise.all([api.getCharacters(deck), api.getProgress(deck)]).then(
      ([chars, prog]) => {
        setCharacters(chars)
        setProgress(prog)
        setLoading(false)
      }
    )
  }, [deck])

  const introducedIds = new Set(
    progress.filter(p => p.introduced).map(p => p.character.id)
  )

  const grouped = (['base', 'dakuten', 'combo'] as const).map(type => ({
    type,
    chars: characters.filter(c => c.type === type),
  })).filter(g => g.chars.length > 0)

  const deckLabel = deck.charAt(0).toUpperCase() + deck.slice(1)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f14] flex items-center justify-center">
        <div className="text-gray-500">Loading…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f14] p-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-white transition-colors text-sm"
          >
            ← Back
          </button>
          <h1 className="text-white font-semibold">{deckLabel}</h1>
          <div className="w-10" />
        </div>

        <div className="space-y-8">
          {grouped.map(({ type, chars }) => (
            <div key={type}>
              <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">
                {TYPE_LABELS[type]}
              </div>
              <div className="grid grid-cols-5 gap-2">
                {chars.map(char => {
                  const introduced = introducedIds.has(char.id)
                  return (
                    <button
                      key={char.id}
                      onClick={() => setSelected(char)}
                      className={`rounded-xl p-2 text-center transition-colors cursor-pointer ${
                        introduced
                          ? 'bg-[#1a1a24] border border-violet-800/40 hover:border-violet-500/60'
                          : 'bg-[#13131a] border border-[#1e1e2e] hover:border-[#2e2e3e]'
                      }`}
                    >
                      <div className={`text-2xl mb-0.5 ${introduced ? 'text-white' : 'text-gray-600'}`}>
                        {char.character}
                      </div>
                      <div className={`text-xs ${introduced ? 'text-gray-400' : 'text-gray-600'}`}>
                        {char.romaji}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-[#1a1a24] border border-[#2e2e3e] rounded-2xl p-10 text-center"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-8xl text-white mb-4 leading-none">
              {selected.character}
            </div>
            <div className="text-2xl text-gray-300 font-medium">
              {selected.romaji}
            </div>
            {selected.parent_romaji && (
              <div className="text-sm text-gray-500 mt-2">
                variant of {selected.parent_character} · {selected.parent_romaji}
              </div>
            )}
            <div className="mt-3">
              {introducedIds.has(selected.id)
                ? <span className="text-xs text-violet-400">introduced</span>
                : <span className="text-xs text-gray-600">not yet introduced</span>
              }
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
