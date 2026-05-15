import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { UserProgress } from '../api/client'
import SpeakButton from './SpeakButton'

interface Props {
  progress: UserProgress
  onResult: (correct: boolean) => void
}

export default function MultipleChoiceCard({ progress, onResult }: Props) {
  const { character, quiz_type } = progress
  const [options, setOptions] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const correctAnswer = quiz_type === 'mc_to_romaji' ? character.romaji : character.character

  useEffect(() => {
    setSelected(null)
    setLoading(true)
    api.getDistractors(character.id, quiz_type).then(distractors => {
      const all = [correctAnswer, ...distractors]
      setOptions(all.sort(() => Math.random() - 0.5))
      setLoading(false)
    })
  }, [progress.id])

  const choose = (opt: string) => {
    if (selected) return
    setSelected(opt)
    const correct = opt === correctAnswer
    setTimeout(() => onResult(correct), 900)
  }

  const prompt = quiz_type === 'mc_to_romaji' ? character.character : character.romaji
  const isKanaPrompt = quiz_type === 'mc_to_romaji'

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading…</div>

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-widest">
        {quiz_type === 'mc_to_romaji' ? 'Kana → Romaji' : 'Romaji → Kana'}
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="w-44 h-44 bg-[#1a1a24] border-2 border-[#2e2e3e] rounded-3xl flex items-center justify-center">
          <span className={isKanaPrompt ? 'text-7xl' : 'text-3xl font-bold text-white'}>
            {prompt}
          </span>
        </div>
        {isKanaPrompt && (
          <SpeakButton text={character.character} label="Hear pronunciation" />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {options.map(opt => {
          let btnClass =
            'border-2 border-[#2e2e3e] bg-[#1a1a24] text-white hover:border-violet-500 hover:bg-[#22223a] transition-colors'

          if (selected) {
            if (opt === correctAnswer) {
              btnClass = 'border-2 border-emerald-500 bg-emerald-950/40 text-emerald-300'
            } else if (opt === selected) {
              btnClass = 'border-2 border-red-500 bg-red-950/40 text-red-300'
            } else {
              btnClass = 'border-2 border-[#2e2e3e] bg-[#1a1a24] text-gray-600'
            }
          }

          return (
            <button
              key={opt}
              onClick={() => choose(opt)}
              className={`${btnClass} rounded-xl py-4 text-xl font-semibold`}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}
