# Bladmuziek

Genereer automatisch leadsheets (melodie + akkoorden) uit audiobestanden of YouTube-links.

## Wat doet deze app?

- **Audio analyseren**: Upload een audiobestand (MP3, WAV, etc.) of plak een YouTube-link
- **Automatische herkenning**: De app detecteert melodie, akkoorden en tempo
- **Leadsheet genereren**: Een overzichtelijke bladmuziek met melodielijn en akkoordnamen
- **Bewerken**: Pas de gegenereerde bladmuziek aan in de editor
- **Handmatige aanvullingen**: Voeg titel, toonsoort, tempo, maatsoort en songtekst toe
- **PDF exporteren**: Download je leadsheet als PDF-bestand

## Snel starten

### Met Docker (aanbevolen)

```bash
docker compose up --build
```

Open daarna [http://localhost](http://localhost) in je browser.

### Handmatig

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Open daarna [http://localhost:3000](http://localhost:3000) in je browser.

### Vereisten

- Python 3.11+
- Node.js 18+
- FFmpeg (voor audio-conversie)

#### FFmpeg installeren

- **macOS**: `brew install ffmpeg`
- **Ubuntu/Debian**: `sudo apt install ffmpeg`
- **Windows**: Download van [ffmpeg.org](https://ffmpeg.org/download.html)

## Technologie

| Component | Technologie |
|-----------|-------------|
| Frontend | React + Vite |
| Backend | Python FastAPI |
| Melodie-extractie | basic-pitch (Spotify) |
| Akkoordherkenning | librosa |
| Muzieknotatie | abcjs |
| YouTube-download | yt-dlp |
| PDF-export | jsPDF + svg2pdf.js |

## Licentie

MIT
