import { useEffect, useRef, useState } from 'react'
import type { UserProgress } from '../api/client'
import { speakKatakana } from '../api/speak'
import SpeakButton from './SpeakButton'

interface Props {
  progress: UserProgress
  onResult: (correct: boolean) => void
}

export default function WritingCard({ progress, onResult }: Props) {
  const { character } = progress
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [hasStrokes, setHasStrokes] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [romajiVisible, setRomajiVisible] = useState(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  // Auto-play audio when card mounts
  useEffect(() => {
    speakKatakana(character.character)
  }, [character.character])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.repeat) return
      switch (e.key.toLowerCase()) {
        case 'u': speakKatakana(character.character); break
        case 'k': revealed ? onResult(true) : reveal(); break
        case 'i': if (revealed) onResult(false); break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [revealed, character.character, onResult])

  useEffect(() => {
    clearCanvas()
    setHasStrokes(false)
    setRevealed(false)
    setRomajiVisible(false)
  }, [progress.id])

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      const t = e.touches[0]
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setDrawing(true)
    setHasStrokes(true)
    lastPos.current = getPos(e)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (!drawing) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e)
    ctx.beginPath()
    ctx.strokeStyle = '#e8e6f0'
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (lastPos.current) {
      ctx.moveTo(lastPos.current.x, lastPos.current.y)
      ctx.lineTo(pos.x, pos.y)
    }
    ctx.stroke()
    lastPos.current = pos
  }

  const endDraw = () => {
    setDrawing(false)
    lastPos.current = null
  }

  const reveal = () => {
    setRevealed(true)
  }

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-widest">Writing</div>

      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <SpeakButton text={character.character} className="px-2" />
        </div>
        {romajiVisible ? (
          <div className="text-4xl font-bold text-white">{character.romaji}</div>
        ) : (
          <button
            onClick={() => setRomajiVisible(true)}
            className="text-sm text-gray-600 hover:text-gray-400 transition-colors underline underline-offset-2"
          >
            show romaji
          </button>
        )}
        <p className="text-gray-500 text-sm mt-2">Draw the character below</p>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={280}
          height={280}
          className="rounded-2xl border-2 border-[#2e2e3e] bg-[#1a1a24] touch-none"
          style={{ width: 280, height: 280 }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {!hasStrokes && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-gray-700 text-sm">draw here</span>
          </div>
        )}
        {revealed && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl">
            <span className="text-8xl">{character.character}</span>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {hasStrokes && !revealed && (
          <button
            onClick={clearCanvas}
            className="px-5 py-2.5 rounded-xl border border-[#2e2e3e] text-gray-400 hover:text-white hover:border-gray-500 transition-colors text-sm"
          >
            Clear
          </button>
        )}
        {!revealed ? (
          <button
            onClick={reveal}
            className="px-8 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors"
          >
            Reveal
          </button>
        ) : (
          <>
            <button
              onClick={() => onResult(false)}
              className="flex-1 px-6 py-3 rounded-xl border-2 border-red-900/60 bg-red-950/30 text-red-400 hover:bg-red-950/60 font-medium transition-colors"
            >
              Wrong
            </button>
            <button
              onClick={() => onResult(true)}
              className="flex-1 px-6 py-3 rounded-xl border-2 border-emerald-900/60 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-950/60 font-medium transition-colors"
            >
              Correct
            </button>
          </>
        )}
      </div>
    </div>
  )
}
