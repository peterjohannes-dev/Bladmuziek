import { useState } from 'react'

export default function AbcEditor({ abc, onChange, onSave }) {
  const [saved, setSaved] = useState(false)

  const handleChange = (e) => {
    onChange(e.target.value)
    setSaved(false)
  }

  const handleSave = () => {
    onSave()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="editor-section">
      <h2>ABC-notatie bewerken</h2>
      <p style={{ color: '#8b7355', marginBottom: '12px', fontSize: '0.9rem' }}>
        Pas de notatie hieronder aan. Wijzigingen worden direct in de bladmuziek weergegeven.
      </p>
      <textarea
        className="abc-editor"
        value={abc}
        onChange={handleChange}
        spellCheck={false}
      />
      <div className="action-bar" style={{ marginTop: '12px' }}>
        <button className="btn btn-primary" onClick={handleSave}>
          {saved ? 'Opgeslagen!' : 'Wijzigingen opslaan'}
        </button>
      </div>
    </div>
  )
}
