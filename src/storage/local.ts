import type { Character, UserProgress, StudySession, DeckStats, SessionCards } from '../api/client'
import { CHARACTERS } from '../data/characters'

const SRS_INTERVALS = [1 / 60, 5 / 60, 10 / 60, 0.5, 1, 4, 8]
const NEW_CARDS_PER_SESSION = 10
const QUIZ_TYPES = ['mc_to_romaji', 'mc_to_kana', 'writing'] as const

interface StoredProgress {
  id: number
  character_id: number
  quiz_type: string
  interval_index: number
  next_review_at: string
  consecutive_correct: number
  total_reviews: number
  introduced: boolean
}

interface StoredSession {
  id: number
  deck: string
  started_at: string
  ended_at: string | null
  cards_reviewed: number
  correct: number
}

function loadProgress(): StoredProgress[] {
  return JSON.parse(localStorage.getItem('srs_progress') ?? '[]')
}

function saveProgress(records: StoredProgress[]) {
  localStorage.setItem('srs_progress', JSON.stringify(records))
}

function loadSessions(): StoredSession[] {
  return JSON.parse(localStorage.getItem('srs_sessions') ?? '[]')
}

function saveSessions(sessions: StoredSession[]) {
  localStorage.setItem('srs_sessions', JSON.stringify(sessions))
}

function nextId(): number {
  const id = parseInt(localStorage.getItem('srs_next_id') ?? '1')
  localStorage.setItem('srs_next_id', String(id + 1))
  return id
}

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 3_600_000).toISOString()
}

function toUserProgress(p: StoredProgress): UserProgress {
  const char = CHARACTERS.find(c => c.id === p.character_id)!
  return {
    id: p.id,
    character: char,
    quiz_type: p.quiz_type as UserProgress['quiz_type'],
    interval_index: p.interval_index,
    next_review_at: p.next_review_at,
    consecutive_correct: p.consecutive_correct,
    total_reviews: p.total_reviews,
    introduced: p.introduced,
  }
}

export const localApi = {
  login: async (_u: string, _p: string) => ({ token: 'local', username: 'me' }),
  register: async (_u: string, _p: string) => ({ token: 'local', username: 'me' }),

  getCharacters: async (deck?: string): Promise<Character[]> =>
    deck ? CHARACTERS.filter(c => c.deck === deck) : [...CHARACTERS],

  getProgress: async (deck?: string): Promise<UserProgress[]> => {
    const all = loadProgress()
    const filtered = deck
      ? all.filter(p => CHARACTERS.find(c => c.id === p.character_id)?.deck === deck)
      : all
    return filtered.map(toUserProgress)
  },

  getSessionCards: async (
    deck: string,
    mode: 'study' | 'review' = 'study',
    reviewAhead = false,
  ): Promise<SessionCards> => {
    const all = loadProgress()

    if (mode === 'review') {
      const cutoff = reviewAhead
        ? new Date(Date.now() + 3_600_000).toISOString()
        : new Date().toISOString()
      const due = all.filter(p => {
        const char = CHARACTERS.find(c => c.id === p.character_id)
        return char?.deck === deck && p.introduced && p.next_review_at <= cutoff
      })
      return { due_reviews: due.map(toUserProgress) }
    }

    const introducedIds = new Set(
      all
        .filter(p => CHARACTERS.find(c => c.id === p.character_id)?.deck === deck)
        .map(p => p.character_id),
    )
    const newChars = CHARACTERS.filter(c => c.deck === deck && !introducedIds.has(c.id))
      .sort((a, b) => a.display_order - b.display_order)
      .slice(0, NEW_CARDS_PER_SESSION)

    return { new_characters: newChars }
  },

  introduce: async (character_id: number) => {
    const all = loadProgress()
    const now = new Date().toISOString()
    for (const qt of QUIZ_TYPES) {
      if (!all.find(p => p.character_id === character_id && p.quiz_type === qt)) {
        all.push({
          id: nextId(),
          character_id,
          quiz_type: qt,
          interval_index: 0,
          next_review_at: now,
          consecutive_correct: 0,
          total_reviews: 0,
          introduced: true,
        })
      }
    }
    all.forEach(p => { if (p.character_id === character_id) p.introduced = true })
    saveProgress(all)
    return { status: 'ok' }
  },

  review: async (progress_id: number, correct: boolean): Promise<UserProgress> => {
    const all = loadProgress()
    const p = all.find(r => r.id === progress_id)
    if (!p) throw new Error('Not found')

    if (correct) {
      p.interval_index = Math.min(p.interval_index + 1, SRS_INTERVALS.length - 1)
      p.next_review_at = hoursFromNow(SRS_INTERVALS[p.interval_index])
      p.consecutive_correct += 1
    } else {
      p.interval_index = 0
      p.next_review_at = hoursFromNow(SRS_INTERVALS[0])
      p.consecutive_correct = 0
    }
    p.total_reviews += 1
    saveProgress(all)
    return toUserProgress(p)
  },

  getDistractors: async (character_id: number, quiz_type: string): Promise<string[]> => {
    const char = CHARACTERS.find(c => c.id === character_id)!
    const others = CHARACTERS.filter(c => c.deck === char.deck && c.id !== character_id)
    const sample = others.sort(() => Math.random() - 0.5).slice(0, 3)
    return quiz_type === 'mc_to_romaji'
      ? sample.map(c => c.romaji)
      : sample.map(c => c.character)
  },

  startSession: async (deck: string): Promise<StudySession> => {
    const sessions = loadSessions()
    const session: StoredSession = {
      id: nextId(),
      deck,
      started_at: new Date().toISOString(),
      ended_at: null,
      cards_reviewed: 0,
      correct: 0,
    }
    sessions.push(session)
    saveSessions(sessions)
    return { ...session, accuracy: 0 }
  },

  endSession: async (
    session_id: number,
    cards_reviewed: number,
    correct: number,
  ): Promise<StudySession> => {
    const sessions = loadSessions()
    const s = sessions.find(s => s.id === session_id)
    if (!s) throw new Error('Not found')
    s.ended_at = new Date().toISOString()
    s.cards_reviewed = cards_reviewed
    s.correct = correct
    saveSessions(sessions)
    const accuracy = cards_reviewed === 0 ? 0 : Math.round((correct / cards_reviewed) * 100)
    return { ...s, accuracy }
  },

  getDeckStats: async (deck: string): Promise<DeckStats> => {
    const total = CHARACTERS.filter(c => c.deck === deck).length
    const all = loadProgress()
    const deckProgress = all.filter(
      p => CHARACTERS.find(c => c.id === p.character_id)?.deck === deck,
    )
    const introducedIds = new Set(deckProgress.filter(p => p.introduced).map(p => p.character_id))
    const masteredIds = new Set(deckProgress.filter(p => p.interval_index >= 6).map(p => p.character_id))
    const now = new Date().toISOString()
    const due = deckProgress.filter(p => p.introduced && p.next_review_at <= now).length
    return { total, introduced: introducedIds.size, mastered: masteredIds.size, due }
  },
}
