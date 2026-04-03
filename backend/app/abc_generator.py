"""Generate ABC notation from melody and chord analysis."""
from __future__ import annotations


def generate_abc(
    title: str,
    key: str,
    melody_notes: list[dict],
    chords: list[dict],
    bpm: int = 120,
    time_signature: str = "4/4",
    lyrics: str = "",
) -> str:
    """Generate ABC notation string from analysis results.

    Args:
        title: Song title
        key: Musical key (e.g., 'C', 'Am', 'G')
        melody_notes: List of melody note dicts from melody_extractor
        chords: List of chord dicts from chord_detector
        bpm: Tempo in beats per minute
        time_signature: Time signature string (e.g., '4/4', '3/4')
        lyrics: Optional lyrics text

    Returns:
        ABC notation string
    """
    # Parse time signature
    beats_per_measure = int(time_signature.split("/")[0])
    beat_value = int(time_signature.split("/")[1])

    # ABC key: strip 'm' for minor keys and add 'min'
    abc_key = key
    if key.endswith("m") and not key.endswith("min"):
        abc_key = key[:-1] + "min"

    # Build header
    header = f"""X:1
T:{title}
M:{time_signature}
L:1/8
Q:1/4={bpm}
K:{abc_key}
"""

    if not melody_notes:
        # No melody detected, generate chord-only lead sheet
        abc_body = _generate_chord_only(chords, beats_per_measure, bpm)
    else:
        abc_body = _generate_melody_with_chords(
            melody_notes, chords, beats_per_measure, bpm
        )

    abc = header + abc_body

    # Add lyrics if provided
    if lyrics:
        # ABC lyrics go on w: lines
        lyrics_lines = lyrics.strip().split("\n")
        for line in lyrics_lines:
            abc += f"\nw: {line}"

    return abc


def _generate_chord_only(
    chords: list[dict], beats_per_measure: int, bpm: float
) -> str:
    """Generate ABC with just chord symbols and rests."""
    if not chords:
        return '| z8 | z8 | z8 | z8 ||\n'

    beat_duration = 60.0 / bpm
    measure_duration = beats_per_measure * beat_duration
    notes_per_measure = beats_per_measure * 2  # eighth notes

    body = ""
    current_time = 0.0
    measure_count = 0

    # Calculate total duration
    total_duration = chords[-1]["end_time"] if chords else 0
    total_measures = max(4, int(total_duration / measure_duration) + 1)

    for measure in range(total_measures):
        measure_start = measure * measure_duration
        measure_end = measure_start + measure_duration

        # Find chord(s) active during this measure
        active_chords = []
        for chord in chords:
            if chord["start_time"] < measure_end and chord["end_time"] > measure_start:
                active_chords.append(chord)

        if active_chords:
            chord_name = active_chords[0]["chord"]
            body += f'"{chord_name}"z{notes_per_measure}'
        else:
            body += f"z{notes_per_measure}"

        body += " | "
        measure_count += 1

        if measure_count % 4 == 0:
            body += "\n"

    body += "|]\n"
    return body


def _generate_melody_with_chords(
    melody_notes: list[dict],
    chords: list[dict],
    beats_per_measure: int,
    bpm: float,
) -> str:
    """Generate ABC notation with melody notes and chord annotations."""
    beat_duration = 60.0 / bpm
    eighth_duration = beat_duration / 2
    measure_duration = beats_per_measure * beat_duration
    notes_per_measure = beats_per_measure * 2  # in eighth notes

    if not melody_notes:
        return '| z8 ||\n'

    total_duration = max(
        melody_notes[-1]["end_time"] if melody_notes else 0,
        chords[-1]["end_time"] if chords else 0,
    )
    total_measures = max(1, int(total_duration / measure_duration) + 1)

    body = ""
    note_idx = 0
    measure_count = 0

    for measure in range(total_measures):
        measure_start = measure * measure_duration
        measure_end = measure_start + measure_duration

        # Find chord for this measure
        measure_chord = None
        for chord in chords:
            if chord["start_time"] < measure_end and chord["end_time"] > measure_start:
                measure_chord = chord["chord"]
                break

        eighth_slots_filled = 0
        first_note_in_measure = True

        while eighth_slots_filled < notes_per_measure:
            current_time = measure_start + eighth_slots_filled * eighth_duration

            # Find note active at current time
            active_note = None
            while note_idx < len(melody_notes):
                note = melody_notes[note_idx]
                if note["end_time"] <= current_time:
                    note_idx += 1
                    continue
                if note["start_time"] <= current_time + eighth_duration:
                    active_note = note
                break

            if active_note:
                # Calculate note duration in eighth notes
                note_end = min(active_note["end_time"], measure_end)
                note_dur_eighths = max(1, round((note_end - current_time) / eighth_duration))
                note_dur_eighths = min(note_dur_eighths, notes_per_measure - eighth_slots_filled)

                abc_note = active_note["abc_note"]

                # Add duration
                if note_dur_eighths > 1:
                    abc_note += str(note_dur_eighths)

                # Add chord annotation on first note or when chord changes
                if first_note_in_measure and measure_chord:
                    abc_note = f'"{measure_chord}"{abc_note}'
                    first_note_in_measure = False

                body += abc_note
                eighth_slots_filled += note_dur_eighths

                # Skip to next note if this one is fully consumed
                if active_note["end_time"] <= current_time + note_dur_eighths * eighth_duration:
                    note_idx += 1
            else:
                # Rest
                rest = "z"
                if first_note_in_measure and measure_chord:
                    rest = f'"{measure_chord}"z'
                    first_note_in_measure = False
                body += rest
                eighth_slots_filled += 1

        body += " | "
        measure_count += 1

        if measure_count % 4 == 0:
            body += "\n"

    body += "|]\n"
    return body
