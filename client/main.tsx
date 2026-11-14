import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { WelcomeScreen } from './screens/WelcomeScreen'
import { LobbyScreen } from './screens/LobbyScreen'
import { LanguageScreen } from './screens/LanguageScreen'
import { PartnerScreen } from './screens/PartnerScreen'
import { GameScreen } from './screens/GameScreen'
import { ResultsScreen } from './screens/ResultsScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { FriendsScreen } from './screens/FriendsScreen'
import type { Screen } from './screens/types'
import './style.css'

function App() {
  const [screen, setScreen] = useState<Screen>('welcome')
  const [language, setLanguage] = useState('French')
  const [selectedObject, setSelectedObject] = useState<number | null>(null)
  const navigate = (next: Screen) => setScreen(next)
  return <div className="min-h-screen bg-[var(--color-page)] text-[var(--color-text)]">
    {screen === 'welcome' && <WelcomeScreen onNavigate={navigate} />}
    {screen === 'lobby' && <LobbyScreen language={language} setLanguage={setLanguage} onNavigate={navigate} />}
    {screen === 'language' && <LanguageScreen language={language} setLanguage={setLanguage} onNavigate={navigate} />}
    {screen === 'partner' && <PartnerScreen onNavigate={navigate} />}
    {screen === 'game' && <GameScreen selectedObject={selectedObject} setSelectedObject={setSelectedObject} onNavigate={navigate} />}
    {screen === 'results' && <ResultsScreen onNavigate={navigate} />}
    {screen === 'profile' && <ProfileScreen onNavigate={navigate} />}
    {screen === 'friends' && <FriendsScreen onNavigate={navigate} />}
  </div>
}

createRoot(document.getElementById('root')!).render(<App />)
