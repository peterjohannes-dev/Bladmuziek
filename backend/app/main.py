from __future__ import annotations

import os
import shutil
import tempfile
import uuid
from typing import Optional

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from .melody_extractor import extract_melody
from .chord_detector import detect_chords, detect_key
from .abc_generator import generate_abc
from .youtube_handler import download_audio_from_youtube

app = FastAPI(
    title="Bladmuziek API",
    description="API voor het genereren van bladmuziek uit audiobestanden",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Temporary storage for analysis results
analysis_store: dict[str, dict] = {}


class YouTubeRequest(BaseModel):
    url: str
    title: Optional[str] = None


class UpdateAbcRequest(BaseModel):
    session_id: str
    abc: str
    title: Optional[str] = None
    lyrics: Optional[str] = None


class ManualUpdateRequest(BaseModel):
    session_id: str
    title: Optional[str] = None
    key: Optional[str] = None
    bpm: Optional[int] = None
    time_signature: Optional[str] = None
    lyrics: Optional[str] = None


@app.get("/")
async def root():
    return {"status": "ok", "message": "Bladmuziek API draait"}


@app.post("/api/analyze/upload")
async def analyze_upload(
    file: UploadFile = File(...),
    title: str = Form(default=""),
):
    """Analyze an uploaded audio file and generate lead sheet."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Geen bestand geüpload")

    allowed_extensions = {".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac", ".wma"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Niet-ondersteund bestandstype: {ext}. Gebruik: {', '.join(allowed_extensions)}",
        )

    # Save uploaded file temporarily
    temp_dir = tempfile.mkdtemp()
    temp_path = os.path.join(temp_dir, f"upload{ext}")
    try:
        with open(temp_path, "wb") as f:
            content = await file.read()
            f.write(content)

        song_title = title or os.path.splitext(file.filename)[0]
        result = _analyze_audio(temp_path, song_title)
        return JSONResponse(content=result)
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


@app.post("/api/analyze/youtube")
async def analyze_youtube(request: YouTubeRequest):
    """Analyze audio from a YouTube URL and generate lead sheet."""
    try:
        audio_path, detected_title = download_audio_from_youtube(request.url)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Kan video niet downloaden: {str(e)}",
        )

    try:
        song_title = request.title or detected_title
        result = _analyze_audio(audio_path, song_title)
        return JSONResponse(content=result)
    finally:
        # Clean up temp directory
        temp_dir = os.path.dirname(audio_path)
        shutil.rmtree(temp_dir, ignore_errors=True)


@app.post("/api/update/abc")
async def update_abc(request: UpdateAbcRequest):
    """Update the ABC notation for a session."""
    if request.session_id not in analysis_store:
        raise HTTPException(status_code=404, detail="Sessie niet gevonden")

    session = analysis_store[request.session_id]
    session["abc"] = request.abc
    if request.title:
        session["title"] = request.title
    if request.lyrics is not None:
        session["lyrics"] = request.lyrics

    return {"status": "ok", "session_id": request.session_id}


@app.post("/api/update/manual")
async def update_manual(request: ManualUpdateRequest):
    """Update analysis parameters and regenerate ABC notation."""
    if request.session_id not in analysis_store:
        raise HTTPException(status_code=404, detail="Sessie niet gevonden")

    session = analysis_store[request.session_id]

    if request.title:
        session["title"] = request.title
    if request.key:
        session["key"] = request.key
    if request.bpm:
        session["bpm"] = request.bpm
    if request.time_signature:
        session["time_signature"] = request.time_signature
    if request.lyrics is not None:
        session["lyrics"] = request.lyrics

    # Regenerate ABC with updated parameters
    abc = generate_abc(
        title=session["title"],
        key=session["key"],
        melody_notes=session.get("melody_notes", []),
        chords=session.get("chords", []),
        bpm=session["bpm"],
        time_signature=session["time_signature"],
        lyrics=session.get("lyrics", ""),
    )
    session["abc"] = abc

    return {
        "status": "ok",
        "session_id": request.session_id,
        "abc": abc,
        "key": session["key"],
        "bpm": session["bpm"],
        "time_signature": session["time_signature"],
    }


@app.get("/api/session/{session_id}")
async def get_session(session_id: str):
    """Get the current state of an analysis session."""
    if session_id not in analysis_store:
        raise HTTPException(status_code=404, detail="Sessie niet gevonden")

    session = analysis_store[session_id]
    return {
        "session_id": session_id,
        "title": session["title"],
        "abc": session["abc"],
        "key": session["key"],
        "bpm": session["bpm"],
        "time_signature": session["time_signature"],
        "chords": session.get("chords", []),
        "lyrics": session.get("lyrics", ""),
    }


def _analyze_audio(audio_path: str, title: str) -> dict:
    """Core analysis pipeline: extract melody, detect chords, generate ABC."""
    # Detect key
    key = detect_key(audio_path)

    # Detect chords
    chords = detect_chords(audio_path)

    # Extract melody
    melody_notes = extract_melody(audio_path)

    # Estimate BPM using librosa
    import librosa
    y, sr = librosa.load(audio_path)
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    bpm = int(round(float(tempo[0]) if hasattr(tempo, '__len__') else float(tempo)))

    # Generate ABC notation
    abc = generate_abc(
        title=title,
        key=key,
        melody_notes=melody_notes,
        chords=chords,
        bpm=bpm,
    )

    # Store session
    session_id = str(uuid.uuid4())
    analysis_store[session_id] = {
        "title": title,
        "abc": abc,
        "key": key,
        "bpm": bpm,
        "time_signature": "4/4",
        "melody_notes": melody_notes,
        "chords": chords,
        "lyrics": "",
    }

    return {
        "session_id": session_id,
        "title": title,
        "abc": abc,
        "key": key,
        "bpm": bpm,
        "time_signature": "4/4",
        "chords": [{"chord": c["chord"], "start_time": c["start_time"]} for c in chords],
    }
