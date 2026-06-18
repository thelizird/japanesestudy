import { useState } from 'react'
import {
  JP_VOICES, getVoice, setVoice,
  getDriveTimer, setDriveTimer, DRIVE_TIMER_MIN, DRIVE_TIMER_MAX,
  getDriveWindow, setDriveWindow, DRIVE_WINDOW_MIN, DRIVE_WINDOW_MAX,
  getDriveTapMode, setDriveTapMode, type DriveTapMode,
} from '../api/speak'

const DRIVE_TAP_OPTIONS: { mode: DriveTapMode; label: string; desc: string }[] = [
  { mode: 'wrong', label: 'Mark wrong', desc: 'Tap repeats the card later this session.' },
  { mode: 'skip',  label: 'Skip',       desc: 'Tap jumps to the next card right away.' },
]

interface Props {
  onBack: () => void
}

export default function SettingsPage({ onBack }: Props) {
  const [selected, setSelected] = useState(getVoice())
  const [driveTimer, setDriveTimerState] = useState(getDriveTimer())
  const [driveWindow, setDriveWindowState] = useState(getDriveWindow())
  const [driveTapMode, setDriveTapModeState] = useState(getDriveTapMode())

  function handleDriveTimer(seconds: number) {
    setDriveTimer(seconds)
    setDriveTimerState(seconds)
  }

  function handleDriveWindow(n: number) {
    setDriveWindow(n)
    setDriveWindowState(n)
  }

  function handleDriveTapMode(mode: DriveTapMode) {
    setDriveTapMode(mode)
    setDriveTapModeState(mode)
  }

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

        <div className="bg-[#1a1a24] border border-[#2e2e3e] rounded-2xl p-5 mt-4">
          <h2 className="text-white font-semibold mb-1">Drive Mode Timer</h2>
          <p className="text-gray-500 text-sm mb-5">
            Seconds per character before auto-advancing.
          </p>

          <div className="flex gap-2">
            {Array.from({ length: DRIVE_TIMER_MAX - DRIVE_TIMER_MIN + 1 }, (_, i) => {
              const s = DRIVE_TIMER_MIN + i
              const active = driveTimer === s
              return (
                <button
                  key={s}
                  onClick={() => handleDriveTimer(s)}
                  className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors ${
                    active
                      ? 'bg-violet-600 text-white'
                      : 'bg-[#0f0f14] border border-[#2e2e3e] text-gray-400 hover:border-[#3e3e5e]'
                  }`}
                >
                  {s}s
                </button>
              )
            })}
          </div>
        </div>

        <div className="bg-[#1a1a24] border border-[#2e2e3e] rounded-2xl p-5 mt-4">
          <h2 className="text-white font-semibold mb-1">Drive Mode Window</h2>
          <p className="text-gray-500 text-sm mb-5">
            Max characters in a drive session. Once reached, learning a new one drops the oldest.
          </p>

          <div className="flex flex-wrap gap-2">
            {Array.from({ length: DRIVE_WINDOW_MAX - DRIVE_WINDOW_MIN + 1 }, (_, i) => {
              const n = DRIVE_WINDOW_MIN + i
              const active = driveWindow === n
              return (
                <button
                  key={n}
                  onClick={() => handleDriveWindow(n)}
                  className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors ${
                    active
                      ? 'bg-violet-600 text-white'
                      : 'bg-[#0f0f14] border border-[#2e2e3e] text-gray-400 hover:border-[#3e3e5e]'
                  }`}
                >
                  {n}
                </button>
              )
            })}
          </div>
        </div>

        <div className="bg-[#1a1a24] border border-[#2e2e3e] rounded-2xl p-5 mt-4">
          <h2 className="text-white font-semibold mb-1">Drive Mode Tap</h2>
          <p className="text-gray-500 text-sm mb-5">
            What happens when you tap a card in Drive Mode.
          </p>

          <div className="flex gap-2">
            {DRIVE_TAP_OPTIONS.map(opt => {
              const active = driveTapMode === opt.mode
              return (
                <button
                  key={opt.mode}
                  onClick={() => handleDriveTapMode(opt.mode)}
                  className={`flex-1 text-left rounded-xl p-4 border transition-colors ${
                    active
                      ? 'border-violet-500 bg-violet-600/10'
                      : 'border-[#2e2e3e] bg-[#0f0f14] hover:border-[#3e3e5e]'
                  }`}
                >
                  <div className={`font-semibold text-sm mb-1 ${active ? 'text-white' : 'text-gray-300'}`}>
                    {opt.label}
                  </div>
                  <div className="text-gray-500 text-xs leading-snug">{opt.desc}</div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
