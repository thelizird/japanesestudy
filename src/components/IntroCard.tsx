import type { Character } from '../api/client'
import SpeakButton from './SpeakButton'

interface Props {
  character: Character
  onGotIt: () => void
}

export default function IntroCard({ character, onGotIt }: Props) {
  const isVariant = character.type === 'dakuten' || character.type === 'combo'

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="text-xs font-medium text-violet-400 uppercase tracking-widest">
        New character
      </div>

      <div className="w-48 h-48 bg-[#1a1a24] border-2 border-[#2e2e3e] rounded-3xl flex items-center justify-center">
        <span className="text-8xl select-none">{character.character}</span>
      </div>

      <div className="text-center">
        <div className="text-3xl font-bold text-white mb-3">{character.romaji}</div>
        <SpeakButton text={character.character} label="Hear pronunciation" />
      </div>

      {isVariant && character.parent_character && (
        <div className="bg-[#1a1a24] border border-violet-900/40 rounded-xl px-5 py-3 max-w-xs text-center">
          <p className="text-sm text-gray-300">
            {character.type === 'dakuten' ? (
              <>
                This is a <span className="text-violet-400">voiced variant</span> of{' '}
                <span className="text-white font-semibold">{character.parent_character}</span>{' '}
                <span className="text-gray-400">({character.parent_romaji})</span>
                {' '}— adding the marks changes the sound.
              </>
            ) : (
              <>
                This is a <span className="text-violet-400">combination</span> built from{' '}
                <span className="text-white font-semibold">{character.parent_character}</span>{' '}
                <span className="text-gray-400">({character.parent_romaji})</span>
                {' '}+ a small ya/yu/yo.
              </>
            )}
          </p>
        </div>
      )}

      <button
        onClick={onGotIt}
        className="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-10 py-3 rounded-xl transition-colors"
      >
        Got it — start quizzing
      </button>
    </div>
  )
}
