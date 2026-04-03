import { useEffect, useRef } from 'react'
import abcjs from 'abcjs'

export default function SheetMusicViewer({ abc, songInfo, onNewSong, onToggleEditor, showEditor }) {
  const sheetRef = useRef(null)

  useEffect(() => {
    if (sheetRef.current && abc) {
      abcjs.renderAbc(sheetRef.current, abc, {
        responsive: 'resize',
        staffwidth: 800,
        paddingtop: 10,
        paddingbottom: 20,
        paddingleft: 15,
        paddingright: 15,
        scale: 1.1,
        add_classes: true,
      })
    }
  }, [abc])

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
      // Fallback: print
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
