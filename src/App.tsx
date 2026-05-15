import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import StudyPage from './pages/StudyPage'
import ReviewPage from './pages/ReviewPage'
import CharacterListPage from './pages/CharacterListPage'
import PracticePage from './pages/PracticePage'
import SettingsPage from './pages/SettingsPage'

type View =
  | { kind: 'home' }
  | { kind: 'study'; deck: string }
  | { kind: 'review'; deck: string }
  | { kind: 'practice'; deck: string }
  | { kind: 'characters'; deck: string }
  | { kind: 'settings' }

function AppRoutes() {
  const { token } = useAuth()
  const [view, setView] = useState<View>({ kind: 'home' })

  if (!token) return <LoginPage />

  if (view.kind === 'settings') return <SettingsPage onBack={() => setView({ kind: 'home' })} />

  if (view.kind === 'study') return (
    <StudyPage
      deck={view.deck}
      onBack={() => setView({ kind: 'home' })}
      onGoReview={() => setView({ kind: 'review', deck: view.deck })}
    />
  )

  if (view.kind === 'review') return (
    <ReviewPage
      deck={view.deck}
      onBack={() => setView({ kind: 'home' })}
    />
  )

  if (view.kind === 'characters') return (
    <CharacterListPage
      deck={view.deck}
      onBack={() => setView({ kind: 'home' })}
    />
  )

  if (view.kind === 'practice') return (
    <PracticePage
      deck={view.deck}
      onBack={() => setView({ kind: 'home' })}
      onStudy={() => setView({ kind: 'study', deck: view.deck })}
    />
  )

  return (
    <HomePage
      onStudy={deck => setView({ kind: 'study', deck })}
      onReview={deck => setView({ kind: 'review', deck })}
      onPractice={deck => setView({ kind: 'practice', deck })}
      onViewDeck={deck => setView({ kind: 'characters', deck })}
      onSettings={() => setView({ kind: 'settings' })}
    />
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
