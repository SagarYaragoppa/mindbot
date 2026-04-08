import typing

from langchain_community.tools import DuckDuckGoSearchRun
from langchain_core.tools import Tool
import numexpr as ne

# Safe import for experimental tools
try:
    from langchain_experimental.tools import PythonREPLTool
    python_repl = PythonREPLTool()
    HAS_PYTHON_REPL = True
except ImportError:
    python_repl = None
    HAS_PYTHON_REPL = False

# Resilient import for LangGraph vs LangChain
try:
    from langgraph.prebuilt import create_react_agent
    HAS_REACT_AGENT = True
except ImportError:
    HAS_REACT_AGENT = False

search_tool = DuckDuckGoSearchRun()

def calculate(expression: str) -> str:
    try:
        return str(ne.evaluate(expression))
    except Exception as e:
        return f"Error: {e}"

calculator_tool = Tool(
    name="Calculator",
    func=calculate,
    description="Useful to solve math problems. Input must be valid mathematical expression."
)

def search(query: str) -> str:
    return search_tool.run(query)

def repl(code: str) -> str:
    return python_repl.run(code)

tools = [
    Tool(
        name="Web_Search",
        func=search,
        description="Searches the web."
    ),
    calculator_tool
]

if HAS_PYTHON_REPL:
    tools.append(
        Tool(
            name="Python_REPL",
            func=repl,
            description="Executes python script."
        )
    )

def run_agent_task(task_instruction: str, model_name: str = "llama3.1", temperature: float = 0.7) -> str:
    """Executes the Agent action securely using Ollama."""
    print("Initializing Ollama agent...")
    from langchain_ollama import ChatOllama
    dynamic_llm = ChatOllama(model=model_name, base_url="http://localhost:11434", temperature=temperature)
    
    agent = None
    if HAS_REACT_AGENT:
        agent = create_react_agent(dynamic_llm, tools)

    try:
        if agent:
            response = agent.invoke({"messages": [("user", task_instruction)]})
            return response["messages"][-1].content
        else:
            return dynamic_llm.invoke(f"Answer the user. Task: {task_instruction}").content
    except Exception as e:
        return f"Agent execution error: {e}"
