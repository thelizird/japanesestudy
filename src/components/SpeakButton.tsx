import { useState } from 'react'
import { speakKatakana } from '../api/speak'

interface Props {
  text: string
  label?: string
  className?: string
}

export default function SpeakButton({ text, label, className = '' }: Props) {
  const [playing, setPlaying] = useState(false)

  const handleClick = async () => {
    if (playing) return
    setPlaying(true)
    await speakKatakana(text)
    setPlaying(false)
  }

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1a1a24] border transition-colors text-sm ${
        playing
          ? 'border-violet-500 text-violet-400'
          : 'border-[#2e2e3e] text-gray-400 hover:border-violet-500 hover:text-violet-400'
      } ${className}`}
      title={playing ? 'Playing…' : 'Hear pronunciation'}
    >
      {playing ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none"/>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
        </svg>
      )}
      {label && <span>{playing ? 'Playing…' : label}</span>}
    </button>
  )
}
