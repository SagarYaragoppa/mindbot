import os
from faster_whisper import WhisperModel

# Use base model for faster local execution
model_size = "base"
model = WhisperModel(model_size, device="cpu", compute_type="int8")

def transcribe_audio(file_path: str) -> str:
    """Uses Faster-Whisper to transcribe locally."""
    try:
        segments, info = model.transcribe(file_path, beam_size=5, vad_filter=True)
        text = " ".join([segment.text for segment in segments]).strip()
        print(f"Faster-Whisper Extracted: '{text}' | Language: {info.language} | Prob: {info.language_probability}")
        return text if text else "[Audio unclear or silent]"
    except Exception as e:
        print(f"Faster-Whisper Error: {e}")
        return f"[Transcription Error: {str(e)}]"
