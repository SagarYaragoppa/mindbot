import os
from backend.core.text_utils import sanitize_text

# Global variable to hold the model instance for lazy loading
_model = None

def _get_model():
    """Lazily load the Whisper model only when needed."""
    global _model
    if _model is not None:
        return _model
    
    try:
        from faster_whisper import WhisperModel
        # Use base model for faster local execution
        model_size = "base"
        print(f"DEBUG: Loading Whisper model ({model_size})...")
        _model = WhisperModel(model_size, device="cpu", compute_type="int8")
        return _model
    except ImportError:
        print("DEBUG: faster-whisper not installed. Voice features disabled.")
        return None
    except Exception as e:
        print(f"DEBUG: Error loading Whisper model: {sanitize_text(str(e))}")
        return None

def transcribe_audio(file_path: str) -> str:
    """Uses Faster-Whisper to transcribe locally with lazy loading."""
    model = _get_model()
    if model is None:
        return "[Voice features unavailable on this environment]"

    try:
        segments, info = model.transcribe(file_path, beam_size=5, vad_filter=True)
        text = " ".join([segment.text for segment in segments]).strip()
        print(f"Faster-Whisper Extracted: '{text}' | Language: {info.language} | Prob: {info.language_probability}")
        return text if text else "[Audio unclear or silent]"
    except Exception as e:
        print(f"Faster-Whisper Error: {e}")
        return f"[Transcription Error: {str(e)}]"
