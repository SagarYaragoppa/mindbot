import re
import json
import time
import signal
import threading
import numexpr as ne

from backend.services.llm_service import generate_chat_response
from backend.services.rag_service import query_rag
from backend.core.text_utils import sanitize_text, safe_print, safe_response

# =========================
# CONFIG
# =========================
# Removed local LLM constants

# Maximum reasoning steps to prevent runaway loops
MAX_STEPS = 2

# Per-LLM-call timeout (seconds). If a single call exceeds this the agent
# returns a partial / fallback answer rather than hanging indefinitely.
CALL_TIMEOUT_SECONDS = 8

# Fallback string returned when the agent cannot produce a meaningful answer
_FALLBACK_RESPONSE = "Something went wrong. Please try again."


# =========================
# HELPERS
# =========================

def calculate(expression: str) -> str:
    """Evaluate a mathematical expression safely."""
    try:
        expression = expression.replace("calc:", "").strip()
        return str(ne.evaluate(expression))
    except Exception as e:
        return f"Error evaluating '{expression}': {e}"


def _call_with_timeout(fn, *args, timeout: int = CALL_TIMEOUT_SECONDS, **kwargs):
    """
    Run *fn* in a background thread and return its result within *timeout* seconds.
    Returns None if the call times out so the caller can use a fallback.
    """
    result_container: list = [None]
    exc_container: list = [None]

    def _target():
        try:
            result_container[0] = fn(*args, **kwargs)
        except Exception as e:
            exc_container[0] = e

    t = threading.Thread(target=_target, daemon=True)
    t.start()
    t.join(timeout)

    if t.is_alive():
        # Thread is still running – we timed out
        return None

    if exc_container[0] is not None:
        raise exc_container[0]

    return result_container[0]


def _ensure_str(value, fallback: str = _FALLBACK_RESPONSE) -> str:
    """Guarantee a non-empty, clean string is returned."""
    if value is None:
        return fallback
    text = safe_response(sanitize_text(str(value), remove_emojis=True).strip())
    return text if text and text != _FALLBACK_RESPONSE else (sanitize_text(str(value), remove_emojis=True).strip() or fallback)


# =========================
# MAIN AGENT FUNCTION
# =========================

def run_agent_task(
    task_instruction: str,
    conversation_id: int = None,
    model: str = "phi3",
    provider: str = "mistral",
    temperature: float = 0.7,
    image_path: str = None,
) -> str:
    """
    Execute a task with tool-based decision making.

    Guarantees:
    - Returns a non-None, non-empty string.
    - Completes within a reasonable wall-clock time.
    - Never crashes the server due to Unicode issues.
    """
    start_time = time.time()
    execution_steps: list[str] = []
    tools_used: list[str] = []

    try:
        # ------------------------------------------------------------------
        # STEP 1 – Classify intent & route to tool(s)
        # ------------------------------------------------------------------
        execution_steps.append("Intent routing")

        routing_prompt = (
            "You are an intelligent router for an AI agent.\n"
            "Analyze the user query and select the SINGLE most appropriate tool.\n\n"
            "Available Tools:\n"
            "- SEARCH_DOCS  : query relates to documents / files / internal knowledge\n"
            "- CALCULATE(expr): math problems only\n"
            "- ANALYZE_IMAGE: user asks about an image\n"
            "- CHAT         : general conversation, reasoning, everything else\n\n"
            f"User Query: {task_instruction}\n"
            f"Image Available: {'Yes' if image_path else 'No'}\n\n"
            'Respond ONLY with a JSON object (no markdown):\n'
            '{"reasoning":"<why>","selected_tools":["TOOL"]}'
        )

        routing_raw = _call_with_timeout(
            generate_chat_response,
            routing_prompt,
            model=model,
            provider=provider,
            timeout=CALL_TIMEOUT_SECONDS,
        )

        selected_tools: list[str] = []
        if routing_raw:
            try:
                clean = routing_raw.strip()
                if "```json" in clean:
                    clean = clean.split("```json")[1].split("```")[0].strip()
                elif "```" in clean:
                    clean = clean.split("```")[1].split("```")[0].strip()
                route_data = json.loads(clean)
                selected_tools = route_data.get("selected_tools", [])
            except Exception as parse_err:
                safe_print(f"DEBUG: Routing parse error: {safe_format_err(parse_err)}")

        # Deduplicate & cap at MAX_STEPS
        seen: set = set()
        unique_tools: list[str] = []
        for t in selected_tools:
            key = t.split("(")[0].upper()
            if key not in seen:
                seen.add(key)
                unique_tools.append(t)
        selected_tools = unique_tools[:MAX_STEPS] if unique_tools else ["CHAT"]

        # ------------------------------------------------------------------
        # STEP 2 – Execute tools
        # ------------------------------------------------------------------
        results: list[str] = []

        for tool in selected_tools:
            tool_name = tool.split("(")[0].upper()
            tools_used.append(tool_name)
            execution_steps.append(f"Execute {tool_name}")
            safe_print(f"DEBUG: Running tool: {tool_name}")

            if "SEARCH_DOCS" in tool_name:
                res = _call_with_timeout(
                    query_rag,
                    task_instruction,
                    conversation_id=conversation_id,
                    model=model,
                    provider=provider,
                    timeout=CALL_TIMEOUT_SECONDS,
                )
                results.append(f"Document Context: {_ensure_str(res, 'No relevant documents found.')}")

            elif "CALCULATE" in tool_name:
                expr_match = re.search(r"CALCULATE\((.*?)\)", tool, re.IGNORECASE)
                expr = expr_match.group(1) if expr_match else task_instruction
                results.append(f"Calculation Result: {calculate(expr)}")

            elif "ANALYZE_IMAGE" in tool_name:
                if image_path:
                    try:
                        from backend.services.vision_service import analyze_image
                        res = _call_with_timeout(
                            analyze_image,
                            image_path,
                            task_instruction,
                            timeout=CALL_TIMEOUT_SECONDS,
                        )
                        results.append(f"Visual Analysis: {_ensure_str(res, 'Could not analyze image.')}")
                    except Exception as img_err:
                        results.append(f"Visual Analysis failed: {safe_format_err(img_err)}")
                else:
                    results.append("Visual Analysis skipped: No image provided.")

            else:  # CHAT (default)
                res = _call_with_timeout(
                    generate_chat_response,
                    task_instruction,
                    model=model,
                    provider=provider,
                    conversation_id=conversation_id,
                    timeout=CALL_TIMEOUT_SECONDS,
                )
                results.append(f"General Knowledge: {_ensure_str(res)}")

            # Bail out early if we are running long
            if time.time() - start_time > CALL_TIMEOUT_SECONDS * MAX_STEPS:
                safe_print("DEBUG: Agent timeout guard triggered – returning partial results.")
                break

        # ------------------------------------------------------------------
        # STEP 3 – Synthesise final response
        # ------------------------------------------------------------------
        execution_steps.append("Response synthesis")

        if not results:
            return _FALLBACK_RESPONSE

        context = "\n".join(results)
        synthesis_prompt = (
            "You are a helpful AI assistant. Write a clear, structured response.\n\n"
            f"User Query: {task_instruction}\n\n"
            "Tool Results:\n"
            f"{context}\n\n"
            "Format your reply in Markdown with:\n"
            "### Summary\n"
            "[Brief summary]\n\n"
            "### Key Points\n"
            "[Bulleted list]\n\n"
            "### Insights (optional)\n"
            "[Deeper insights if applicable]\n\n"
            "Be professional and concise. Do not mention internal tools."
        )

        final_answer = _call_with_timeout(
            generate_chat_response,
            synthesis_prompt,
            model=model,
            provider=provider,
            conversation_id=conversation_id,
            timeout=CALL_TIMEOUT_SECONDS,
        )

        # ------------------------------------------------------------------
        # Observability log (ASCII-safe, no emojis)
        # ------------------------------------------------------------------
        latency_ms = int((time.time() - start_time) * 1000)
        safe_print("=" * 50)
        safe_print("AGENT OBSERVABILITY LOG")
        safe_print(f"Provider : {sanitize_text(str(provider)).upper()}")
        safe_print(f"Model    : {sanitize_text(str(model))}")
        safe_print(f"Tools    : {', '.join(set(tools_used))}")
        safe_print(f"Steps    : {' -> '.join(execution_steps)}")
        safe_print(f"Latency  : {latency_ms}ms")
        safe_print("=" * 50)

        return _ensure_str(final_answer)

    except Exception as e:
        import traceback
        traceback.print_exc()
        safe_print(f"ERROR [run_agent_task]: {safe_format_err(e)}")
        return _FALLBACK_RESPONSE


# ---------------------------------------------------------------------------
# Internal helper (avoids circular import with text_utils)
# ---------------------------------------------------------------------------
def safe_format_err(exc: Exception) -> str:
    try:
        return sanitize_text(str(exc), remove_emojis=True)
    except Exception:
        return "Unknown error"
