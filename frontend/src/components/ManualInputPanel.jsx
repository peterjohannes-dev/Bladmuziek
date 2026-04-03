import { useState } from 'react'

const KEYS = [
  'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B',
  'Am', 'A#m', 'Bm', 'Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m',
]

const TIME_SIGNATURES = ['4/4', '3/4', '6/8', '2/4', '2/2']

export default function ManualInputPanel({ songInfo, lyrics, onLyricsChange, onUpdate }) {
  const [localTitle, setLocalTitle] = useState(songInfo.title)
  const [localKey, setLocalKey] = useState(songInfo.key)
  const [localBpm, setLocalBpm] = useState(songInfo.bpm)
  const [localTimeSig, setLocalTimeSig] = useState(songInfo.timeSignature)
  const [localLyrics, setLocalLyrics] = useState(lyrics)
  const [saved, setSaved] = useState(false)

  const handleApply = () => {
    const updates = {}
    if (localTitle !== songInfo.title) updates.title = localTitle
    if (localKey !== songInfo.key) updates.key = localKey
    if (localBpm !== songInfo.bpm) updates.bpm = parseInt(localBpm)
    if (localTimeSig !== songInfo.timeSignature) updates.time_signature = localTimeSig
    if (localLyrics !== lyrics) {
      updates.lyrics = localLyrics
    }

    if (Object.keys(updates).length > 0) {
      onUpdate(updates)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  return (
    <div className="manual-panel">
      <h2>Gegevens aanpassen</h2>

      <div className="manual-grid">
        <div className="form-group">
          <label>Titel</label>
          <input
            type="text"
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Toonsoort</label>
          <select value={localKey} onChange={(e) => setLocalKey(e.target.value)}>
            {KEYS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Tempo (BPM)</label>
          <input
            type="number"
            min="40"
            max="240"
            value={localBpm}
            onChange={(e) => setLocalBpm(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Maatsoort</label>
          <select value={localTimeSig} onChange={(e) => setLocalTimeSig(e.target.value)}>
            {TIME_SIGNATURES.map((ts) => (
              <option key={ts} value={ts}>{ts}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: '16px' }}>
        <label>Songtekst / Lyrics</label>
        <textarea
          className="lyrics-editor"
          value={localLyrics}
          onChange={(e) => setLocalLyrics(e.target.value)}
          placeholder="Voer hier de songtekst in (elke regel wordt onder de notenbalk geplaatst)"
        />
      </div>

      <div className="action-bar">
        <button className="btn btn-primary" onClick={handleApply}>
          {saved ? 'Toegepast!' : 'Wijzigingen toepassen'}
        </button>
      </div>
    </div>
  )
}
