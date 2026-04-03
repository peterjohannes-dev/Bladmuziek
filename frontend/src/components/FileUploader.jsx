import { useState, useRef } from 'react'

export default function FileUploader({ apiBase, onResult, onLoading, onError }) {
  const [activeTab, setActiveTab] = useState('bestand')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [title, setTitle] = useState('')
  const [dragging, setDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const fileInputRef = useRef(null)

  const handleFileSelect = (file) => {
    if (file) {
      setSelectedFile(file)
      if (!title) {
        const name = file.name.replace(/\.[^/.]+$/, '')
        setTitle(name)
      }
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    handleFileSelect(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    onLoading(true)
    onError('')

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('title', title || selectedFile.name)

    try {
      const response = await fetch(`${apiBase}/analyze/upload`, {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.detail || 'Analyse mislukt')
      }
      const result = await response.json()
      onResult(result)
    } catch (err) {
      onError(err.message || 'Er is een fout opgetreden bij het analyseren')
    } finally {
      onLoading(false)
    }
  }

  const handleYoutubeAnalyze = async () => {
    if (!youtubeUrl) return
    onLoading(true)
    onError('')

    try {
      const response = await fetch(`${apiBase}/analyze/youtube`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl, title: title || null }),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.detail || 'Analyse mislukt')
      }
      const result = await response.json()
      onResult(result)
    } catch (err) {
      onError(err.message || 'Er is een fout opgetreden bij het analyseren')
    } finally {
      onLoading(false)
    }
  }

  return (
    <div className="upload-section">
      <h2>Nieuw nummer analyseren</h2>

      <div className="upload-tabs">
        <button
          className={`upload-tab ${activeTab === 'bestand' ? 'active' : ''}`}
          onClick={() => setActiveTab('bestand')}
        >
          Audiobestand
        </button>
        <button
          className={`upload-tab ${activeTab === 'youtube' ? 'active' : ''}`}
          onClick={() => setActiveTab('youtube')}
        >
          YouTube-link
        </button>
      </div>

      {activeTab === 'bestand' && (
        <>
          <div
            className={`file-drop-zone ${dragging ? 'dragging' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="icon">&#127925;</div>
            {selectedFile ? (
              <p><strong>{selectedFile.name}</strong> geselecteerd</p>
            ) : (
              <>
                <p><strong>Sleep een audiobestand hierheen</strong></p>
                <p>of klik om te selecteren (MP3, WAV, M4A, OGG, FLAC)</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,.m4a,.ogg,.flac,.aac,.wma"
              style={{ display: 'none' }}
              onChange={(e) => handleFileSelect(e.target.files[0])}
            />
          </div>

          <div className="title-input">
            <label>Titel (optioneel)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Voer de titel van het nummer in"
            />
          </div>

          <div className="action-bar">
            <button
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={!selectedFile}
            >
              Analyseren
            </button>
          </div>
        </>
      )}

      {activeTab === 'youtube' && (
        <>
          <div className="youtube-input">
            <input
              type="text"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="Plak hier een YouTube-link (bijv. https://youtube.com/watch?v=...)"
            />
            <button
              className="btn btn-primary"
              onClick={handleYoutubeAnalyze}
              disabled={!youtubeUrl}
            >
              Analyseren
            </button>
          </div>

          <div className="title-input">
            <label>Titel (optioneel, wordt anders van YouTube overgenomen)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Voer de titel van het nummer in"
            />
          </div>
        </>
      )}
    </div>
  )
}
