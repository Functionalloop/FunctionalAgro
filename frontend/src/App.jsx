import { useState, useEffect } from 'react'
import DiagnosePanel  from './components/DiagnosePanel'
import ResultBubble   from './components/ResultBubble'
import OutbreakBanner from './components/OutbreakBanner'
import DalalChat      from './components/DalalChat'
import MapPanel       from './components/MapPanel'
import FarmerView     from './components/FarmerView'
import { auth, provider } from './firebase'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'

const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'

export default function App() {
  const [activeTab, setActiveTab]   = useState('diagnose')
  const [result, setResult]         = useState(null)
  const [outbreak, setOutbreak]     = useState(null)
  const [user, setUser]             = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })
    return () => unsubscribe()
  }, [])

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, provider)
    } catch (error) {
      console.error("Error signing in with Google", error)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error("Error signing out", error)
    }
  }

  const tabs = [
    { id: 'diagnose',    label: 'Diagnose',      emoji: '🔬' },
    { id: 'farmer',      label: 'Farmer View',   emoji: '📱' },
    { id: 'dalal',       label: 'AI Dalal',      emoji: '🤝' },
    { id: 'radar',       label: 'Outbreak Radar',emoji: '🚨' },
  ]

  return (
    <div className="app">

      {/* Header */}
      <header className="header">
        <div className="header-brand">
          <div className="brand-icon">🌾</div>
          <div className="brand-text">
            <h1>Kisan Alert</h1>
            <p>AI crop intelligence for every Indian farmer</p>
          </div>
        </div>
        <div className="header-badge" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div>
            <span className="badge">ICAR Zones</span>
            <span className="badge">Bhashini</span>
            <span className="badge">Agmarknet</span>
            <span className="badge">Gemini 1.5</span>
          </div>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {user.photoURL && <img src={user.photoURL} alt="Profile" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />}
              <span style={{ fontSize: '12px', fontWeight: 600 }}>{user.displayName?.split(' ')[0] || 'User'}</span>
              <button onClick={handleSignOut} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }}>Sign Out</button>
            </div>
          ) : (
            <button onClick={handleSignIn} className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '12px' }}>
              Sign in with Google
            </button>
          )}
        </div>
      </header>

      {/* Demo Mode Banner */}
      {IS_DEMO_MODE && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))',
          border: '1px solid rgba(245,158,11,0.4)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 18px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 13,
          color: 'var(--amber-400)',
        }}>
          <span style={{ fontSize: 16 }}>🔒</span>
          <strong>DEMO MODE ACTIVE</strong>
          <span style={{ color: 'var(--text-muted)' }}>
            — LLM calls bypassed, all data served from local cache. No external dependencies.
          </span>
        </div>
      )}

      {outbreak?.outbreak && <OutbreakBanner outbreak={outbreak} />}

      {/* Tabs */}
      <nav className="tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
            id={`tab-${t.id}`}
          >
            <span>{t.emoji}</span> {t.label}
            {t.id === 'radar' && outbreak?.outbreak && (
              <span style={{
                background: 'var(--red-500)', color: 'white',
                borderRadius: '50%', width: 18, height: 18,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700,
              }}>!</span>
            )}
          </button>
        ))}
      </nav>

      {/* Tab: Diagnose */}
      {activeTab === 'diagnose' && (
        <div>
          <div className="grid-2">
            <DiagnosePanel
              onDiagnosed={setResult}
              onOutbreakUpdate={setOutbreak}
            />

            <div>
              {!result && (
                <div className="card" style={{ textAlign: 'center', padding: '60px 30px' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🌿</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    Upload a crop photo to get started
                  </div>
                  <div className="text-muted">
                    The AI will diagnose the disease, recommend crops for your zone,
                    and provide multilingual advisory with audio.
                  </div>
                  <div style={{ marginTop: 24, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <span className="badge">38 disease classes</span>
                    <span className="badge">10 Indian languages</span>
                    <span className="badge">Govt zone data</span>
                  </div>
                </div>
              )}

              {result && <ResultBubble result={result} />}
            </div>
          </div>

          {/* CTA row after diagnosis */}
          {result && !result.diagnosis.is_healthy && (
            <div style={{
              marginTop: 20, padding: '16px 24px',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
            }}>
              <div>
                <div style={{ fontWeight: 600 }}>💰 Sell before prices drop?</div>
                <div className="text-muted">Disease detected — get farmer view or check AI Dalal.</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => setActiveTab('farmer')} id="go-to-farmer-btn">
                  📱 Farmer View
                </button>
                <button className="btn btn-secondary" onClick={() => setActiveTab('dalal')} id="go-to-dalal-btn">
                  🤝 AI Dalal →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Farmer View */}
      {activeTab === 'farmer' && (
        <div>
          <div className="section-title">
            📱 Farmer View
            <span className="text-muted" style={{ fontSize: 14, fontWeight: 400 }}>
              — what a farmer sees on WhatsApp/SMS · no app install needed
            </span>
          </div>
          <FarmerView diagnosisResult={result} />
        </div>
      )}

      {/* Tab: AI Dalal */}
      {activeTab === 'dalal' && (
        <DalalChat diagnosisResult={result} />
      )}

      {/* Tab: Outbreak Radar */}
      {activeTab === 'radar' && (
        <div>
          <div className="section-title">
            🚨 Outbreak Radar
            <span className="text-muted" style={{ fontSize: 14, fontWeight: 400 }}>
              — crowd-sourced disease detection from anonymous farmer reports
            </span>
          </div>
          <MapPanel />
        </div>
      )}

    </div>
  )
}
