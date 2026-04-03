import { useState } from 'react'
import FileUploader from './components/FileUploader'
import SheetMusicViewer from './components/SheetMusicViewer'
import AbcEditor from './components/AbcEditor'
import ManualInputPanel from './components/ManualInputPanel'

const API_BASE = '/api'

export default function App() {
  const [sessionId, setSessionId] = useState(null)
  const [abc, setAbc] = useState('')
  const [songInfo, setSongInfo] = useState({ title: '', key: '', bpm: 120, timeSignature: '4/4' })
  const [chords, setChords] = useState([])
  const [lyrics, setLyrics] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showEditor, setShowEditor] = useState(false)

  const handleAnalysisResult = (result) => {
    setSessionId(result.session_id)
    setAbc(result.abc)
    setSongInfo({
      title: result.title,
      key: result.key,
      bpm: result.bpm,
      timeSignature: result.time_signature,
    })
    setChords(result.chords || [])
    setError('')
  }

  const handleAbcChange = (newAbc) => {
    setAbc(newAbc)
  }

  const handleAbcSave = async () => {
    if (!sessionId) return
    try {
      await fetch(`${API_BASE}/update/abc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          abc: abc,
          lyrics: lyrics,
        }),
      })
    } catch (err) {
      setError('Kan wijzigingen niet opslaan')
    }
  }

  const handleManualUpdate = async (updates) => {
    if (!sessionId) return
    try {
      const response = await fetch(`${API_BASE}/update/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          ...updates,
        }),
      })
      const result = await response.json()
      if (result.abc) {
        setAbc(result.abc)
      }
      if (result.key) setSongInfo(prev => ({ ...prev, key: result.key }))
      if (result.bpm) setSongInfo(prev => ({ ...prev, bpm: result.bpm }))
      if (result.time_signature) setSongInfo(prev => ({ ...prev, timeSignature: result.time_signature }))
    } catch (err) {
      setError('Kan wijzigingen niet opslaan')
    }
  }

  const handleNewSong = () => {
    setSessionId(null)
    setAbc('')
    setSongInfo({ title: '', key: '', bpm: 120, timeSignature: '4/4' })
    setChords([])
    setLyrics('')
    setError('')
    setShowEditor(false)
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Bladmuziek</h1>
        <p>Genereer leadsheets uit audio of YouTube</p>
      </header>

      {error && <div className="error-message">{error}</div>}

      {!sessionId && !loading && (
        <FileUploader
          apiBase={API_BASE}
          onResult={handleAnalysisResult}
          onLoading={setLoading}
          onError={setError}
        />
      )}

      {loading && (
        <div className="upload-section">
          <div className="loading-overlay">
            <div className="spinner" />
            <p>Audio wordt geanalyseerd... Dit kan even duren.</p>
          </div>
        </div>
      )}

      {sessionId && abc && (
        <>
          <SheetMusicViewer
            abc={abc}
            songInfo={songInfo}
            onNewSong={handleNewSong}
            onToggleEditor={() => setShowEditor(!showEditor)}
            showEditor={showEditor}
          />

          {showEditor && (
            <AbcEditor
              abc={abc}
              onChange={handleAbcChange}
              onSave={handleAbcSave}
            />
          )}

          <ManualInputPanel
            songInfo={songInfo}
            lyrics={lyrics}
            onLyricsChange={setLyrics}
            onUpdate={handleManualUpdate}
          />
        </>
      )}
    </div>
  )
}
