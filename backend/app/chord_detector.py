import librosa
import numpy as np


# Chord templates: each chord is defined by its intervals from root
CHORD_TYPES = {
    "": [0, 4, 7],           # major
    "m": [0, 3, 7],          # minor
    "7": [0, 4, 7, 10],      # dominant 7
    "m7": [0, 3, 7, 10],     # minor 7
    "maj7": [0, 4, 7, 11],   # major 7
    "dim": [0, 3, 6],        # diminished
    "aug": [0, 4, 8],        # augmented
    "sus4": [0, 5, 7],       # sus4
    "sus2": [0, 2, 7],       # sus2
}

NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

# Enharmonic mapping for cleaner display
ENHARMONIC = {
    "C#": "C#", "D#": "Eb", "F#": "F#", "G#": "Ab", "A#": "Bb"
}


def _build_chord_templates() -> list[tuple[str, np.ndarray]]:
    """Build all chord templates as 12-dimensional chroma vectors."""
    templates = []
    for root in range(12):
        for chord_type, intervals in CHORD_TYPES.items():
            template = np.zeros(12)
            for interval in intervals:
                template[(root + interval) % 12] = 1.0
            template /= np.linalg.norm(template)

            root_name = NOTE_NAMES[root]
            if root_name in ENHARMONIC:
                root_name = ENHARMONIC[root_name]
            chord_name = f"{root_name}{chord_type}"
            templates.append((chord_name, template))
    return templates


CHORD_TEMPLATES = _build_chord_templates()


def detect_chords(audio_path: str, hop_length: int = 8192, sr: int = 22050) -> list[dict]:
    """Detect chords from an audio file.

    Returns a list of chord events with:
    - start_time: float (seconds)
    - end_time: float (seconds)
    - chord: str (e.g., 'C', 'Am', 'G7')
    - confidence: float
    """
    y, sr = librosa.load(audio_path, sr=sr)

    # Compute chroma features
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=hop_length)

    # Get time stamps for each frame
    times = librosa.frames_to_time(range(chroma.shape[1]), sr=sr, hop_length=hop_length)

    # Match each frame to best chord template
    raw_chords = []
    for i in range(chroma.shape[1]):
        frame = chroma[:, i]
        frame_norm = np.linalg.norm(frame)
        if frame_norm < 0.1:
            raw_chords.append({"time": times[i], "chord": "N.C.", "confidence": 0.0})
            continue

        frame_normalized = frame / frame_norm
        best_chord = "N.C."
        best_score = -1

        for chord_name, template in CHORD_TEMPLATES:
            score = np.dot(frame_normalized, template)
            if score > best_score:
                best_score = score
                best_chord = chord_name

        raw_chords.append({
            "time": times[i],
            "chord": best_chord,
            "confidence": float(best_score),
        })

    # Merge consecutive same chords into segments
    chords = _merge_chord_segments(raw_chords, times)

    # Filter out very short chord segments (< 0.5 seconds)
    chords = [c for c in chords if c["end_time"] - c["start_time"] >= 0.3]

    return chords


def _merge_chord_segments(raw_chords: list[dict], times: np.ndarray) -> list[dict]:
    """Merge consecutive frames with the same chord into segments."""
    if not raw_chords:
        return []

    segments = []
    current = {
        "start_time": raw_chords[0]["time"],
        "chord": raw_chords[0]["chord"],
        "confidence": raw_chords[0]["confidence"],
        "count": 1,
    }

    for i in range(1, len(raw_chords)):
        if raw_chords[i]["chord"] == current["chord"]:
            current["confidence"] += raw_chords[i]["confidence"]
            current["count"] += 1
        else:
            current["end_time"] = raw_chords[i]["time"]
            current["confidence"] /= current["count"]
            del current["count"]
            segments.append(current)
            current = {
                "start_time": raw_chords[i]["time"],
                "chord": raw_chords[i]["chord"],
                "confidence": raw_chords[i]["confidence"],
                "count": 1,
            }

    # Final segment
    if len(times) > 0:
        current["end_time"] = float(times[-1]) + 0.5
    else:
        current["end_time"] = current["start_time"] + 0.5
    current["confidence"] /= current["count"]
    del current["count"]
    segments.append(current)

    return segments


def detect_key(audio_path: str, sr: int = 22050) -> str:
    """Detect the musical key of an audio file."""
    y, sr = librosa.load(audio_path, sr=sr)
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    chroma_avg = np.mean(chroma, axis=1)

    # Major key profiles (Krumhansl-Kessler)
    major_profile = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09,
                               2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
    minor_profile = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53,
                               2.54, 4.75, 3.98, 2.69, 3.34, 3.17])

    best_key = "C"
    best_score = -1

    for i in range(12):
        rotated_chroma = np.roll(chroma_avg, -i)
        major_score = np.corrcoef(rotated_chroma, major_profile)[0, 1]
        minor_score = np.corrcoef(rotated_chroma, minor_profile)[0, 1]

        note = NOTE_NAMES[i]
        if note in ENHARMONIC:
            note = ENHARMONIC[note]

        if major_score > best_score:
            best_score = major_score
            best_key = note
        if minor_score > best_score:
            best_score = minor_score
            best_key = f"{note}m"

    return best_key
