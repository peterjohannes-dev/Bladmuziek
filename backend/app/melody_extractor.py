import numpy as np
from basic_pitch.inference import predict
from basic_pitch import ICASSP_2022_MODEL_PATH


# MIDI note number to note name mapping
NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def midi_to_note_name(midi_note: int) -> str:
    """Convert MIDI note number to note name with octave."""
    octave = (midi_note // 12) - 1
    note = NOTE_NAMES[midi_note % 12]
    return f"{note}{octave}"


def midi_to_abc_note(midi_note: int, key_midi_base: int = 60) -> str:
    """Convert MIDI note number to ABC notation.

    ABC notation:
    - C D E F G A B = middle octave (C4-B4, MIDI 60-71)
    - c d e f g a b = octave above (C5-B5, MIDI 72-83)
    - C, D, E, = octave below (C3-B3, MIDI 48-59)
    """
    note_name = NOTE_NAMES[midi_note % 12]
    octave = (midi_note // 12) - 1

    # Handle sharps -> use ^ in ABC
    if "#" in note_name:
        abc_note = f"^{note_name[0]}"
    else:
        abc_note = note_name

    if octave >= 5:
        abc_note = abc_note.lower()
        abc_note += "'" * (octave - 5)
    elif octave == 4:
        pass  # uppercase, no modifier
    elif octave == 3:
        abc_note += ","
    elif octave <= 2:
        abc_note += "," * (4 - octave)

    return abc_note


def quantize_duration(duration_seconds: float, bpm: float, base_length: float = 0.25) -> str:
    """Convert a duration in seconds to an ABC duration modifier.

    base_length is the L: value in fractions of a whole note (0.25 = quarter note).
    """
    beat_duration = 60.0 / bpm
    beats = duration_seconds / beat_duration
    # Quantize to nearest standard duration
    standard_durations = [0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 4.0]
    closest = min(standard_durations, key=lambda x: abs(x - beats))

    # Convert to ABC duration relative to base note (quarter note)
    ratio = closest / 1.0  # relative to quarter note when L:1/4
    if ratio == 0.25:
        return "/2"  # eighth note
    elif ratio == 0.5:
        return ""  # quarter note is the base
    elif ratio == 0.75:
        return "3/2"
    elif ratio == 1.0:
        return ""
    elif ratio == 1.5:
        return "3/2"
    elif ratio == 2.0:
        return "2"
    elif ratio == 3.0:
        return "3"
    elif ratio == 4.0:
        return "4"
    return ""


def extract_melody(audio_path: str, bpm: float = 120.0) -> list[dict]:
    """Extract melody notes from an audio file using basic-pitch.

    Returns a list of note events with:
    - start_time: float (seconds)
    - end_time: float (seconds)
    - midi_note: int
    - abc_note: str
    - confidence: float
    """
    model_output, midi_data, note_events = predict(audio_path)

    notes = []
    for start, end, pitch, velocity, confidence_values in note_events:
        midi_note = int(pitch)
        notes.append(
            {
                "start_time": float(start),
                "end_time": float(end),
                "duration": float(end - start),
                "midi_note": midi_note,
                "note_name": midi_to_note_name(midi_note),
                "abc_note": midi_to_abc_note(midi_note),
                "velocity": float(velocity),
            }
        )

    # Sort by start time
    notes.sort(key=lambda n: n["start_time"])

    # Keep only the highest-confidence note at each time point (melody = top line)
    if notes:
        melody = _extract_top_line(notes)
        return melody

    return notes


def _extract_top_line(notes: list[dict], time_resolution: float = 0.05) -> list[dict]:
    """Extract the top melodic line from polyphonic note data.

    When multiple notes overlap, keep the highest pitch (typically the melody).
    """
    if not notes:
        return []

    max_time = max(n["end_time"] for n in notes)
    time_slots = int(max_time / time_resolution) + 1

    # For each time slot, find the highest active note
    slot_notes = [None] * time_slots
    for note in notes:
        start_slot = int(note["start_time"] / time_resolution)
        end_slot = int(note["end_time"] / time_resolution)
        for slot in range(start_slot, min(end_slot, time_slots)):
            if slot_notes[slot] is None or note["midi_note"] > slot_notes[slot]["midi_note"]:
                slot_notes[slot] = note

    # Convert back to note events (merge consecutive same-pitch slots)
    melody = []
    current_note = None
    for slot_note in slot_notes:
        if slot_note is None:
            if current_note is not None:
                melody.append(current_note)
                current_note = None
        elif current_note is None or slot_note["midi_note"] != current_note["midi_note"]:
            if current_note is not None:
                melody.append(current_note)
            current_note = dict(slot_note)
        else:
            current_note["end_time"] = slot_note["end_time"]
            current_note["duration"] = current_note["end_time"] - current_note["start_time"]

    if current_note is not None:
        melody.append(current_note)

    return melody
