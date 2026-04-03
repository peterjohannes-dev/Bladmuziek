import { useEffect, useRef, useState, useCallback } from 'react'
import abcjs from 'abcjs'

export default function SheetMusicViewer({ abc, songInfo, onNewSong, onToggleEditor, showEditor }) {
  const sheetRef = useRef(null)
  const synthControlRef = useRef(null)
  const visualObjRef = useRef(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [synthReady, setSynthReady] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalTime, setTotalTime] = useState(0)
  const [synthError, setSynthError] = useState('')

  // Render the sheet music
  useEffect(() => {
    if (sheetRef.current && abc) {
      const visualObj = abcjs.renderAbc(sheetRef.current, abc, {
        responsive: 'resize',
        staffwidth: 800,
        paddingtop: 10,
        paddingbottom: 20,
        paddingleft: 15,
        paddingright: 15,
        scale: 1.1,
        add_classes: true,
      })
      visualObjRef.current = visualObj[0]

      // Stop any current playback when ABC changes
      stopPlayback()
      setSynthReady(false)
    }
  }, [abc])

  // Initialize the synth
  const initSynth = useCallback(async () => {
    if (!visualObjRef.current) return

    try {
      setSynthError('')

      // Create synth
      const synth = new abcjs.synth.CreateSynth()
      await synth.init({
        visualObj: visualObjRef.current,
        options: {
          soundFontUrl: 'https://paulrosen.github.io/midi-js-soundfonts/FluidR3_GM/',
          program: 0, // Acoustic Grand Piano
        },
      })

      // Create timing callbacks
      const timingCallbacks = new abcjs.TimingCallbacks(visualObjRef.current, {
        eventCallback: (event) => {
          if (event) {
            setCurrentTime(event.milliseconds / 1000)
          }
        },
        beatCallback: () => {},
      })

      await synth.prime()

      // Calculate total duration
      const duration = synth.totalDuration || 0
      setTotalTime(duration)

      synthControlRef.current = { synth, timingCallbacks }
      setSynthReady(true)
    } catch (err) {
      console.error('Synth init error:', err)
      setSynthError('Kan audio niet initialiseren. Probeer opnieuw.')
    }
  }, [abc])

  const startPlayback = async () => {
    if (!synthReady) {
      await initSynth()
    }

    const ctrl = synthControlRef.current
    if (!ctrl) return

    try {
      if (isPaused) {
        ctrl.synth.resume()
        ctrl.timingCallbacks.start()
        setIsPaused(false)
      } else {
        await ctrl.synth.start()
        ctrl.timingCallbacks.start()
      }
      setIsPlaying(true)

      // Poll for end of playback
      const checkEnd = setInterval(() => {
        if (ctrl.synth.isRunning && !ctrl.synth.isRunning()) {
          clearInterval(checkEnd)
          setIsPlaying(false)
          setIsPaused(false)
          setCurrentTime(0)
          ctrl.timingCallbacks.stop()
          ctrl.timingCallbacks.reset()
        }
      }, 500)
    } catch (err) {
      console.error('Playback error:', err)
      setSynthError('Afspelen mislukt. Klik nogmaals om opnieuw te proberen.')
      setIsPlaying(false)
    }
  }

  const pausePlayback = () => {
    const ctrl = synthControlRef.current
    if (!ctrl) return

    ctrl.synth.pause()
    ctrl.timingCallbacks.pause()
    setIsPaused(true)
    setIsPlaying(false)
  }

  const stopPlayback = () => {
    const ctrl = synthControlRef.current
    if (!ctrl) return

    try {
      ctrl.synth.stop()
      ctrl.timingCallbacks.stop()
      ctrl.timingCallbacks.reset()
    } catch (e) {
      // Ignore errors on stop
    }
    setIsPlaying(false)
    setIsPaused(false)
    setCurrentTime(0)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (synthControlRef.current) {
        try {
          synthControlRef.current.synth.stop()
          synthControlRef.current.timingCallbacks.stop()
        } catch (e) {}
      }
    }
  }, [])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleExportPdf = async () => {
    if (!sheetRef.current) return

    const svgElement = sheetRef.current.querySelector('svg')
    if (!svgElement) return

    try {
      const { jsPDF } = await import('jspdf')
      const { default: svg2pdf } = await import('svg2pdf.js')

      const svgWidth = svgElement.viewBox.baseVal.width || svgElement.getBoundingClientRect().width
      const svgHeight = svgElement.viewBox.baseVal.height || svgElement.getBoundingClientRect().height

      const pdfWidth = 210 // A4 width in mm
      const scale = (pdfWidth - 20) / svgWidth
      const pdfHeight = Math.max(svgHeight * scale + 20, 297)

      const pdf = new jsPDF({
        orientation: pdfHeight > pdfWidth ? 'portrait' : 'landscape',
        unit: 'mm',
        format: [pdfWidth, pdfHeight],
      })

      const clonedSvg = svgElement.cloneNode(true)
      await svg2pdf(clonedSvg, pdf, {
        x: 10,
        y: 10,
        width: pdfWidth - 20,
        height: svgHeight * scale,
      })

      const filename = songInfo.title
        ? `${songInfo.title.replace(/[^a-zA-Z0-9\s]/g, '').trim()}.pdf`
        : 'bladmuziek.pdf'
      pdf.save(filename)
    } catch (err) {
      console.error('PDF export error:', err)
      window.print()
    }
  }

  return (
    <div className="sheet-music-section">
      <h2>Bladmuziek</h2>

      <div className="info-bar">
        <div className="info-item">
          <span className="label">Titel:</span>
          <span className="value">{songInfo.title || 'Onbekend'}</span>
        </div>
        <div className="info-item">
          <span className="label">Toonsoort:</span>
          <span className="value">{songInfo.key || '?'}</span>
        </div>
        <div className="info-item">
          <span className="label">Tempo:</span>
          <span className="value">{songInfo.bpm} BPM</span>
        </div>
        <div className="info-item">
          <span className="label">Maatsoort:</span>
          <span className="value">{songInfo.timeSignature}</span>
        </div>
      </div>

      <div className="sheet-music-container" ref={sheetRef} />

      {/* MIDI Player */}
      <div className="player-section">
        <div className="player-controls">
          {!isPlaying ? (
            <button
              className="player-btn player-btn-play"
              onClick={startPlayback}
              title={isPaused ? 'Hervatten' : 'Afspelen'}
            >
              {isPaused ? '\u25B6' : '\u25B6'}
            </button>
          ) : (
            <button
              className="player-btn player-btn-pause"
              onClick={pausePlayback}
              title="Pauzeren"
            >
              \u23F8
            </button>
          )}
          <button
            className="player-btn player-btn-stop"
            onClick={stopPlayback}
            disabled={!isPlaying && !isPaused}
            title="Stoppen"
          >
            \u23F9
          </button>
        </div>

        <div className="player-progress">
          <div className="player-time">{formatTime(currentTime)}</div>
          <div className="player-bar">
            <div
              className="player-bar-fill"
              style={{ width: totalTime > 0 ? `${(currentTime / totalTime) * 100}%` : '0%' }}
            />
          </div>
          <div className="player-time">{formatTime(totalTime)}</div>
        </div>

        {!synthReady && !synthError && (
          <div className="player-hint">Klik op afspelen om de leadsheet te beluisteren</div>
        )}
        {synthError && <div className="player-error">{synthError}</div>}
      </div>

      <div className="action-bar">
        <button className="btn btn-primary" onClick={handleExportPdf}>
          Exporteer als PDF
        </button>
        <button className="btn btn-secondary" onClick={onToggleEditor}>
          {showEditor ? 'Verberg editor' : 'Bewerk notatie'}
        </button>
        <button className="btn btn-secondary" onClick={onNewSong}>
          Nieuw nummer
        </button>
      </div>
    </div>
  )
}
