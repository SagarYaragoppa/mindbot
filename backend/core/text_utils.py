import re
import sys
import unicodedata


# ---------------------------------------------------------------------------
# Core sanitization
# ---------------------------------------------------------------------------

def sanitize_text(text: str, remove_emojis: bool = True) -> str:
    """
    Sanitize text to prevent Unicode encoding errors.

    - If remove_emojis is True, strips emojis / surrogate pairs /
      non-BMP characters (anything outside U+0000-U+FFFF) using both
      a Unicode category check and a regex covering common emoji ranges.
    - Always encodes/decodes with 'replace' as a final safety net so the
      result is always valid UTF-8 with no surrogate characters.
    """
    if not isinstance(text, str):
        try:
            text = str(text)
        except Exception:
            return "UNREPRESENTABLE_VALUE"

    if remove_emojis:
        # 1. Remove characters outside the Basic Multilingual Plane (most emojis)
        text = re.sub(r'[^\u0000-\uFFFF]', '', text)

        # 2. Remove common emoji / symbol ranges still inside the BMP
        emoji_bmp_pattern = re.compile(
            "["
            "\u2600-\u27BF"   # Misc symbols, dingbats
            "\u2B00-\u2BFF"   # Misc symbols & arrows
            "]",
            re.UNICODE,
        )
        text = emoji_bmp_pattern.sub('', text)

    # 3. Remove lone surrogate code points that can crash codecs on Windows
    text = text.encode('utf-16', 'surrogatepass').decode('utf-16', 'replace')

    # 4. Final encode/decode with replace to catch anything remaining
    return text.encode('utf-8', errors='replace').decode('utf-8', errors='replace')


def safe_format_error(e: Exception) -> str:
    """Safely format an exception message for logging."""
    try:
        return sanitize_text(str(e), remove_emojis=True)
    except Exception:
        return "Unknown error (encoding failure)"


# ---------------------------------------------------------------------------
# Safe print - always succeeds, even on Windows cp1252 consoles
# ---------------------------------------------------------------------------

def safe_print(*args, **kwargs):
    """
    Drop-in replacement for print() that sanitizes all arguments so that
    emojis / surrogate pairs never crash the Windows console encoder.
    """
    safe_args = [sanitize_text(str(a), remove_emojis=True) for a in args]
    try:
        print(*safe_args, **kwargs)
    except UnicodeEncodeError:
        # Absolute last resort: encode to ASCII with replacement
        ascii_args = [a.encode('ascii', errors='replace').decode('ascii') for a in safe_args]
        print(*ascii_args, **kwargs)


# ---------------------------------------------------------------------------
# stdout / stderr setup
# ---------------------------------------------------------------------------

def setup_unicode_stdout():
    """
    Configure stdout and stderr to handle Unicode gracefully on Windows.
    Must be called before any other import that might print to the console.
    """
    if sys.platform == "win32":
        try:
            import io
            # Only wrap if the underlying buffer is available (avoids pytest issues)
            if hasattr(sys.stdout, 'buffer'):
                sys.stdout = io.TextIOWrapper(
                    sys.stdout.buffer, encoding='utf-8', errors='replace', line_buffering=True
                )
            if hasattr(sys.stderr, 'buffer'):
                sys.stderr = io.TextIOWrapper(
                    sys.stderr.buffer, encoding='utf-8', errors='replace', line_buffering=True
                )
        except Exception as exc:
            # Cannot use safe_print here (not yet set up), fallback to basic print
            print(f"Warning: Could not configure Unicode stdout: {exc}")


# ---------------------------------------------------------------------------
# Garbage output detection - backend safety filter (Requirement 6)
# ---------------------------------------------------------------------------

_GARBAGE_FALLBACK = "Something went wrong. Please try again."

# Characters considered "clean": word chars, whitespace, common punctuation
_CLEAN_CHAR_RE = re.compile(r"[^\w\s.,!?;:'\"()\-\[\]{}@#$%&*+=/<>\\|`~^]")

# Detect runs of the same non-alpha char repeated 5+ times (e.g. "######")
_REPEATED_SYMBOL_RE = re.compile(r"([^\w\s])\1{4,}")


def is_garbage_output(text: str, threshold: float = 0.25) -> bool:
    """
    Return True if *text* looks like garbled / unreadable output.

    Heuristics applied in order:
    1. Text is None, empty, or whitespace-only.
    2. Contains long runs of repeated non-alphanumeric characters (####, >>>>).
    3. More than *threshold* fraction of characters are unexpected symbols.
    """
    if not text or not text.strip():
        return True

    stripped = text.strip()

    # Heuristic 2: repeated symbol runs
    if _REPEATED_SYMBOL_RE.search(stripped):
        return True

    # Heuristic 3: symbol density
    garbage_chars = _CLEAN_CHAR_RE.findall(stripped)
    ratio = len(garbage_chars) / max(len(stripped), 1)
    return ratio > threshold


def safe_response(text: str) -> str:
    """
    Return *text* if it looks clean, otherwise return the fallback message.
    Sanitizes first, then runs garbage detection.
    Always returns a non-empty string.
    """
    clean = sanitize_text(text, remove_emojis=True).strip() if text else ""
    if is_garbage_output(clean):
        return _GARBAGE_FALLBACK
    return clean
