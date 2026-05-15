export { localApi as api } from '../storage/local'

export interface Character {
  id: number
  deck: string
  character: string
  romaji: string
  type: 'base' | 'dakuten' | 'combo'
  parent: number | null
  parent_romaji: string | null
  parent_character: string | null
  display_order: number
}

export interface UserProgress {
  id: number
  character: Character
  quiz_type: 'mc_to_romaji' | 'mc_to_kana' | 'writing'
  interval_index: number
  next_review_at: string
  consecutive_correct: number
  total_reviews: number
  introduced: boolean
}

export interface SessionCards {
  due_reviews?: UserProgress[]
  new_characters?: Character[]
}

export interface StudySession {
  id: number
  deck: string
  started_at: string
  ended_at: string | null
  cards_reviewed: number
  correct: number
  accuracy: number
}

export interface DeckStats {
  total: number
  introduced: number
  mastered: number
  due: number
}
