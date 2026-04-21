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
# Maximum reasoning steps to prevent runaway loops
MAX_STEPS = 2
CALL_TIMEOUT_SECONDS = 15

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
    """
    result_container: list = [None]
    exc_container: list = [None]

    def _target():
        try:
            # Force cloud provider arguments
            kwargs['provider'] = 'mistral'
            kwargs['model'] = 'mistral-small-latest'
            result_container[0] = fn(*args, **kwargs)
        except Exception as e:
            exc_container[0] = e

    t = threading.Thread(target=_target, daemon=True)
    t.start()
    t.join(timeout)

    if t.is_alive():
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
    model: str = "mistral-small-latest",
    provider: str = "mistral",
    temperature: float = 0.7,
    image_path: str = None,
) -> str:
    """
    Execute a task with tool-based decision making.
    Forced to use Mistral Cloud.
    """
    # Force cloud settings
    model = "mistral-small-latest"
    provider = "mistral"
    
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
            "- CHAT         : general conversation, reasoning, everything else\n\n"
            f"User Query: {task_instruction}\n\n"
            'Respond ONLY with a JSON object (no markdown):\n'
            '{"reasoning":"<why>","selected_tools":["TOOL"]}'
        )

        routing_raw = _call_with_timeout(
            generate_chat_response,
            routing_prompt,
            conversation_id=conversation_id,
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
                safe_print(f"DEBUG: Routing parse error")

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

            if "SEARCH_DOCS" in tool_name:
                res = _call_with_timeout(
                    query_rag,
                    task_instruction,
                    conversation_id=conversation_id,
                    timeout=CALL_TIMEOUT_SECONDS,
                )
                results.append(f"Document Context: {_ensure_str(res, 'Doc search is limited in cloud mode.')}")

            elif "CALCULATE" in tool_name:
                expr_match = re.search(r"CALCULATE\((.*?)\)", tool, re.IGNORECASE)
                expr = expr_match.group(1) if expr_match else task_instruction
                results.append(f"Calculation Result: {calculate(expr)}")

            else:  # CHAT (default)
                res = _call_with_timeout(
                    generate_chat_response,
                    task_instruction,
                    conversation_id=conversation_id,
                    timeout=CALL_TIMEOUT_SECONDS,
                )
                results.append(f"General Knowledge: {_ensure_str(res)}")

            if time.time() - start_time > CALL_TIMEOUT_SECONDS * MAX_STEPS:
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
            "Format your reply in Markdown.\n"
            "Be professional and concise."
        )

        final_answer = _call_with_timeout(
            generate_chat_response,
            synthesis_prompt,
            conversation_id=conversation_id,
            timeout=CALL_TIMEOUT_SECONDS,
        )

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
