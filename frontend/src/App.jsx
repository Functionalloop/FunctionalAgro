import { useState, useEffect } from 'react'
import DiagnosePanel  from './components/DiagnosePanel'
import ResultBubble   from './components/ResultBubble'
import OutbreakBanner from './components/OutbreakBanner'
import DalalChat      from './components/DalalChat'
import MapPanel       from './components/MapPanel'
import Hero           from './components/Hero'
import BentoGrid      from './components/BentoGrid'
import FarmerView     from './components/FarmerView'
import { auth, provider } from './firebase'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'

const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'

export default function App() {
  const [activeSection, setActiveSection] = useState('overview')
  const [scrollY, setScrollY]             = useState(0)
  const [scrollMax, setScrollMax]         = useState(1)
  const [result, setResult]               = useState(null)
  const [outbreak, setOutbreak]           = useState(null)
  const [user, setUser]                   = useState(null)

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

  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY
      setScrollY(currentScroll)

      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      setScrollMax(maxScroll)

      // Detect which section is active in the viewport
      const sections = ['overview', 'diagnose', 'farmer', 'radar', 'dalal']
      const viewportMid = currentScroll + window.innerHeight / 3
      for (const section of sections) {
        const el = document.getElementById(section)
        if (el) {
          const top = el.offsetTop
          const height = el.offsetHeight
          if (viewportMid >= top && viewportMid < top + height) {
            setActiveSection(section)
            break
          }
        }
      }
    }

    setScrollMax(Math.max(1, document.documentElement.scrollHeight - window.innerHeight))
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
        } else {
          entry.target.classList.remove('visible')
        }
      })
    }, observerOptions)

    const sections = document.querySelectorAll('.section-scroll')
    sections.forEach((sec) => observer.observe(sec))

    return () => {
      sections.forEach((sec) => observer.unobserve(sec))
    }
  }, [])

  // Calculate dynamic blur (0px to 20px) and crazy transition filters on scroll
  const scrollRatio = Math.max(0, Math.min(1, scrollY / (scrollMax || 1)))
  const blurVal = scrollRatio * 20
  const scaleVal = 1.0 + (scrollRatio * 0.15)
  const hueVal = scrollRatio * 180
  const saturateVal = 100 + (scrollRatio * 120)
  const brightnessVal = 100 - (scrollRatio * 55)

  return (
    <div className="app-container">
      {/* Background Graphics Wrapper containing video, blurred, hue-shifted and scaled dynamically */}
      <div 
        className="bg-graphics-wrapper"
        style={{
          filter: `blur(${blurVal}px) hue-rotate(${hueVal}deg) saturate(${saturateVal}%) brightness(${brightnessVal}%)`,
          transform: `scale(${scaleVal})`,
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          transition: 'filter 0.05s ease-out, transform 0.05s ease-out'
        }}
      >
        <div className="bg-video-container">
          <video 
            autoPlay 
            loop 
            muted 
            playsInline 
            className="bg-video"
            src="/66810-520427372_medium.mp4"
          />
          <div className="bg-overlay" />
        </div>
      </div>

      {/* Floating Center-Top Pill Navigation */}
      <header className="floating-nav">
        <button 
          className="nav-brand-minimal" 
          onClick={() => document.getElementById('overview')?.scrollIntoView({ behavior: 'smooth' })}
          style={{ cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit' }}
        >
          <span>🌾</span> FUNCTIONALAGRO
        </button>
        <div className="nav-links-minimal">
          <button 
            className={activeSection === 'overview' ? 'active' : ''} 
            onClick={() => document.getElementById('overview')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Overview
          </button>
          <button 
            className={activeSection === 'diagnose' ? 'active' : ''} 
            onClick={() => document.getElementById('diagnose')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Diagnostics
          </button>
          <button 
            className={activeSection === 'farmer' ? 'active' : ''} 
            onClick={() => document.getElementById('farmer')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Farmer View
          </button>
          <button 
            className={activeSection === 'radar' ? 'active' : ''} 
            onClick={() => document.getElementById('radar')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Radar
          </button>
          <button 
            className={activeSection === 'dalal' ? 'active' : ''} 
            onClick={() => document.getElementById('dalal')?.scrollIntoView({ behavior: 'smooth' })}
          >
            AI Dalal
          </button>
        </div>
        
        {/* Firebase Auth Area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '16px', marginLeft: '8px' }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {user.photoURL && <img src={user.photoURL} alt="Profile" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />}
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)' }}>{user.displayName?.split(' ')[0] || 'User'}</span>
              <button onClick={handleSignOut} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--red-400)', padding: '4px 10px', fontSize: '9px', fontWeight: 800, borderRadius: '20px', cursor: 'pointer', textTransform: 'uppercase' }}>Log Out</button>
            </div>
          ) : (
            <button onClick={handleSignIn} style={{ background: 'rgba(57, 255, 20, 0.1)', border: '1px solid rgba(57, 255, 20, 0.3)', color: 'var(--green-500)', padding: '4px 10px', fontSize: '9px', fontWeight: 800, borderRadius: '20px', cursor: 'pointer', textTransform: 'uppercase' }}>
              Login
            </button>
          )}
        </div>
      </header>

      {/* Fixed Outbreak Alert Banner */}
      {outbreak?.outbreak && <OutbreakBanner outbreak={outbreak} />}

      {/* Spacious View Area */}
      <main className="view-content-wrapper">
        
        {/* Demo Mode Ribbon */}
        {IS_DEMO_MODE && (
          <div style={{
            background: 'rgba(250, 204, 21, 0.06)',
            border: '1px solid rgba(250, 204, 21, 0.2)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 16px',
            marginBottom: 28,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 12,
            color: 'var(--amber-400)',
            backdropFilter: 'blur(6px)',
            width: 'fit-content',
            position: 'relative',
            zIndex: 15
          }}>
            <span>🔒</span>
            <strong>DEMO MODE ACTIVE</strong>
            <span style={{ color: 'var(--text-secondary)' }}>
              — Bypassing LLM requests via seed files.
            </span>
          </div>
        )}

        {/* 1. Overview Section */}
        <section id="overview" className="section-scroll">
          <Hero 
            onStartDiagnose={() => document.getElementById('diagnose')?.scrollIntoView({ behavior: 'smooth' })}
            onStartDalal={() => document.getElementById('dalal')?.scrollIntoView({ behavior: 'smooth' })}
          />
          <BentoGrid onSelectTab={(tabId) => {
            const targetId = tabId === 'diagnose' ? 'diagnose' : tabId === 'dalal' ? 'dalal' : 'radar';
            document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
          }} />
        </section>

        {/* 2. Diagnose Section */}
        <section id="diagnose" className="section-scroll">
          <div className="section-header-styled">
            <h2>02 / Crop Diagnostics Scanner</h2>
            <div className="section-line"></div>
          </div>
          <div className="grid-2">
            <DiagnosePanel
              onDiagnosed={setResult}
              onOutbreakUpdate={setOutbreak}
            />

            <div>
              {!result ? (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 30px', minHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: 48, marginBottom: 16, animation: 'float 3.5s ease-in-out infinite' }}>🌿</div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
                    Edge AI Health Scanner
                  </h3>
                  <p className="text-muted" style={{ lineHeight: 1.6, marginBottom: 20 }}>
                    Upload a photograph of your plants above to begin analysis locally on your device (no internet required). Our classifier detects 38 crop disease classes 
                    and queries zone recommendations and Hindi/Tamil audio advisory.
                  </p>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <span className="badge">TensorFlow.js Edge</span>
                    <span className="badge">10 Languages</span>
                    <span className="badge">AIKosh Zone Data</span>
                  </div>
                </div>
              ) : (
                <ResultBubble result={result} />
              )}
            </div>
          </div>

          {/* Suggested Sell CTA */}
          {result && !result.diagnosis.is_healthy && (
            <div className="glass-panel" style={{
              marginTop: 24,
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
              border: '1px solid rgba(239, 68, 68, 0.25)',
              background: 'rgba(239, 68, 68, 0.03)'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--red-400)' }}>💰 Crop Disease Detected! Sell now?</div>
                <div className="text-muted" style={{ fontSize: 12 }}>Check AI Dalal marketplace prices before infection impacts crop valuations next week.</div>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => document.getElementById('dalal')?.scrollIntoView({ behavior: 'smooth' })}
                id="go-to-dalal-btn"
                style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '8px', cursor: 'pointer' }}
              >
                Open AI Dalal →
              </button>
            </div>
          )}
        </section>

        {/* 3. Farmer View Section */}
        <section id="farmer" className="section-scroll">
          <div className="section-header-styled">
            <h2>03 / Mobile Farmer View</h2>
            <div className="section-line"></div>
          </div>
          <div>
            <div className="text-muted" style={{ marginBottom: 16, fontSize: 14 }}>
              This simulates the low-bandwidth SMS/WhatsApp view delivered directly to farmers' feature phones.
            </div>
            <FarmerView diagnosisResult={result} />
          </div>
        </section>

        {/* 4. Outbreak Radar Section */}
        <section id="radar" className="section-scroll">
          <div className="section-header-styled">
            <h2>04 / Outbreak Radar Tracking</h2>
            <div className="section-line"></div>
          </div>
          <div>
            <MapPanel />
          </div>
        </section>

        {/* 5. AI Dalal Section */}
        <section id="dalal" className="section-scroll">
          <div className="section-header-styled">
            <h2>05 / AI Dalal Bidding Hub</h2>
            <div className="section-line"></div>
          </div>
          <div>
            <DalalChat diagnosisResult={result} />
          </div>
        </section>

      </main>
    </div>
  )
}
