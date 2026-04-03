import { useState } from 'react'

export default function LyricsPrompt({ title, onSubmit, onSkip }) {
  const [lyrics, setLyrics] = useState('')

  return (
    <div className="lyrics-prompt">
      <div className="lyrics-prompt-icon">&#9834;</div>
      <h2>Songtekst toevoegen</h2>
      <p>
        De songtekst van <strong>{title || 'dit nummer'}</strong> kan niet automatisch
        worden herkend. Wil je de tekst handmatig invoeren? De tekst wordt onder de
        notenbalk in de bladmuziek geplaatst.
      </p>

      <textarea
        className="lyrics-prompt-editor"
        value={lyrics}
        onChange={(e) => setLyrics(e.target.value)}
        placeholder={"Voer hier de songtekst in...\n\nTip: Gebruik een nieuwe regel voor elke zin of frase.\nElke regel wordt onder een notenbalk geplaatst."}
        rows={8}
      />

      <div className="lyrics-prompt-actions">
        <button className="btn btn-primary" onClick={() => onSubmit(lyrics)} disabled={!lyrics.trim()}>
          Tekst toevoegen
        </button>
        <button className="btn btn-secondary" onClick={onSkip}>
          Overslaan (zonder tekst)
        </button>
      </div>
    </div>
  )
}
