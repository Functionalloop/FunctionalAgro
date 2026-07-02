import { useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const LANGUAGES = [
  { value: 'english', label: '🇬🇧 English' },
  { value: 'hindi',   label: '🇮🇳 हिंदी (Hindi)' },
  { value: 'tamil',   label: '🌟 தமிழ் (Tamil)' },
  { value: 'telugu',  label: '🌟 తెలుగు (Telugu)' },
  { value: 'kannada', label: '🌟 ಕನ್ನಡ (Kannada)' },
  { value: 'marathi', label: '🌟 मराठी (Marathi)' },
  { value: 'bengali', label: '🌟 বাংলা (Bengali)' },
]

export default function DiagnosePanel({ onDiagnosed, onOutbreakUpdate }) {
  const [image, setImage]         = useState(null)
  const [preview, setPreview]     = useState(null)
  const [pincode, setPincode]     = useState('560001')
  const [language, setLanguage]   = useState('hindi')
  const [dragging, setDragging]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)

  function handleFile(file) {
    if (!file) return
    setImage(file)
    setPreview(URL.createObjectURL(file))
    setError(null)
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  async function handleSubmit() {
    if (!image) { setError('Please upload a crop photo first.'); return }
    if (!/^\d{6}$/.test(pincode)) { setError('Enter a valid 6-digit pincode.'); return }

    setLoading(true)
    setError(null)

    try {
      // Step 1: Diagnose
      const formData = new FormData()
      formData.append('image', image)
      formData.append('pincode', pincode)
      const { data: diagnosis } = await axios.post(`${API}/diagnose`, formData)

      // Step 2: Zone recommendation (parallel)
      const { data: zone } = await axios.get(`${API}/recommend-crop?pincode=${pincode}`)

      // Step 3: Advisory
      const { data: advisory } = await axios.post(`${API}/advise`, {
        crop: diagnosis.crop,
        disease: diagnosis.disease,
        language,
        pincode,
      })

      // Step 4: Check outbreak
      const { data: outbreak } = await axios.get(
        `${API}/outbreak-check?pincode=${pincode}&crop=${diagnosis.crop}`
      )

      onOutbreakUpdate(outbreak)
      onDiagnosed({ diagnosis, zone, advisory, outbreak, language, pincode })

    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Check if the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <div className="card-title">
        <span>🌿</span> Diagnose Your Crop
      </div>

      {/* Upload Zone */}
      <div
        className={`upload-zone ${dragging ? 'drag-over' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !preview && document.getElementById('file-input').click()}
      >
        <input
          id="file-input"
          type="file"
          accept="image/*"
          onChange={e => handleFile(e.target.files[0])}
          style={{ display: 'none' }}
        />
        {preview ? (
          <>
            <img src={preview} alt="Preview" className="upload-preview" />
            <div className="upload-hint" style={{ marginTop: 10 }}>
              ✅ {image.name} — <button
                className="btn btn-secondary"
                style={{ padding: '4px 12px', fontSize: 12, display: 'inline-flex', marginTop: 8 }}
                onClick={e => { e.stopPropagation(); setImage(null); setPreview(null) }}
              >Change photo</button>
            </div>
          </>
        ) : (
          <>
            <div className="upload-icon">📸</div>
            <div className="upload-text">Drop your crop photo here or click to upload</div>
            <div className="upload-hint">Supports JPG, PNG, WEBP — PlantVillage model (38 disease classes)</div>
          </>
        )}
      </div>

      {/* Form */}
      <div className="form-row">
        <div className="form-group">
          <label>📍 Pincode</label>
          <input
            className="form-input"
            type="text"
            placeholder="e.g. 560001"
            value={pincode}
            onChange={e => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
          />
        </div>
        <div className="form-group">
          <label>🌐 Language</label>
          <select
            className="form-select"
            value={language}
            onChange={e => setLanguage(e.target.value)}
          >
            {LANGUAGES.map(l => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div style={{
          marginTop: 16, padding: '12px 16px',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 'var(--radius-md)', color: 'var(--red-400)', fontSize: 13,
        }}>
          ⚠️ {error}
        </div>
      )}

      <button
        className="btn btn-primary"
        onClick={handleSubmit}
        disabled={loading || !image}
        id="diagnose-btn"
      >
        {loading ? (
          <><div className="spinner" style={{ width: 18, height: 18 }} /> Analysing your crop…</>
        ) : (
          <><span>🔍</span> Diagnose &amp; Get Advisory</>
        )}
      </button>
    </div>
  )
}
