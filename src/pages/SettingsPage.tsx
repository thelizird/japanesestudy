import { useState } from 'react'
import { JP_VOICES, getVoice, setVoice/*, speak*/ } from '../api/speak'

interface Props {
  onBack: () => void
}

export default function SettingsPage({ onBack }: Props) {
  const [selected, setSelected] = useState(getVoice())

  function handleSelect(voiceId: string) {
    setSelected(voiceId)
    setVoice(voiceId)
  }

  return (
    <div className="min-h-screen bg-[#0f0f14] p-6">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-4 mb-10">
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-gray-300 transition-colors text-sm"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
        </div>

        <div className="bg-[#1a1a24] border border-[#2e2e3e] rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-1">Japanese Voice</h2>
          <p className="text-gray-500 text-sm mb-4">
            Select the voice used when pronouncing characters.
          </p>

          <div className="space-y-2">
            {JP_VOICES.map(voice => {
              const isActive = selected === voice.id
              return (
                <div
                  key={voice.id}
                  className={`flex items-center justify-between rounded-xl p-4 border cursor-pointer transition-colors ${
                    isActive
                      ? 'border-violet-500 bg-violet-600/10'
                      : 'border-[#2e2e3e] bg-[#0f0f14] hover:border-[#3e3e5e]'
                  }`}
                  onClick={() => handleSelect(voice.id)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        isActive ? 'border-violet-500' : 'border-gray-600'
                      }`}
                    >
                      {isActive && <div className="w-2 h-2 rounded-full bg-violet-500" />}
                    </div>
                    <div>
                      <span className="text-white font-medium">{voice.name}</span>
                      <span className="text-gray-500 text-sm ml-2">
                        {voice.gender} · {voice.age}
                      </span>
                    </div>
                  </div>

                  {/* <button
                    onClick={e => {
                      e.stopPropagation()
                      speak('あ')
                    }}
                    className="text-gray-500 hover:text-violet-400 text-xs transition-colors px-2 py-1 rounded-lg hover:bg-violet-600/10"
                  >
                    Preview
                  </button> */}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
