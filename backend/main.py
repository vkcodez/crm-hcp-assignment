import os
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from sqlalchemy.orm import Session

# Database Imports
from database import engine, Base, get_db
import models

# LangGraph Imports
from langchain_groq import ChatGroq
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent

load_dotenv()

# Create the database tables automatically
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# 1. DEFINE LANGGRAPH TOOLS
# ---------------------------------------------------------

@tool
def log_interaction(hcp_name: str, interaction_type: str, notes: str, sentiment: str, brochures_shared: bool) -> str:
    """Use this tool to log a brand new interaction with a Healthcare Professional."""
    return f"Successfully logged interaction for {hcp_name}."

@tool
def edit_interaction(hcp_name: str = None, interaction_type: str = None, notes: str = None, sentiment: str = None, brochures_shared: bool = None) -> str:
    """Use this tool to modify or correct an existing interaction."""
    return "Successfully updated the interaction."

@tool
def retrieve_hcp_profile(hcp_name: str) -> str:
    """Fetches details about the healthcare professional."""
    return f"Profile: {hcp_name} is a Tier 1 target."

@tool
def schedule_followup(hcp_name: str, date: str, task: str) -> str:
    """Schedules a follow-up task."""
    return f"Scheduled '{task}' for {hcp_name} on {date}."

@tool
def summarize_history(hcp_name: str) -> str:
    """Gets a summary of past interactions with the HCP."""
    return f"Last interaction with {hcp_name} was positive."

tools = [log_interaction, edit_interaction, retrieve_hcp_profile, schedule_followup, summarize_history]

# ---------------------------------------------------------
# 2. INITIALIZE AGENT
# ---------------------------------------------------------
llm = ChatGroq(model="llama-3.3-70b-versatile", api_key=os.getenv("GROQ_API_KEY"))
agent_executor = create_react_agent(llm, tools)

class UserMessageRequest(BaseModel):
    message: str

# ---------------------------------------------------------
# 3. ENDPOINT WITH DATABASE INJECTION
# ---------------------------------------------------------
@app.post("/api/chat")
async def chat_endpoint(request: UserMessageRequest, db: Session = Depends(get_db)):
    system_message = (
        "You are an AI Assistant for Life Science reps. "
        "If a user describes a meeting, call the `log_interaction` tool. "
        "If a user corrects a mistake, call the `edit_interaction` tool. "
        "Always respond conversationally."
    )
    
    response = agent_executor.invoke({
        "messages": [("system", system_message), ("user", request.message)]
    })
    
    final_reply = ""
    form_updates = {}

    # Extract Tool Data
    for msg in response["messages"]:
        if msg.type == "ai" and msg.content:
            final_reply = msg.content
        if msg.type == "ai" and hasattr(msg, "tool_calls") and msg.tool_calls:
            for tool_call in msg.tool_calls:
                if tool_call["name"] in ["log_interaction", "edit_interaction"]:
                    form_updates.update(tool_call["args"])

    # --- NEW: SAVE TO SQL DATABASE ---
    if form_updates and "hcp_name" in form_updates:
        new_log = models.InteractionLog(
            hcp_name=form_updates.get("hcp_name"),
            interaction_type=form_updates.get("interaction_type", "Meeting"),
            notes=form_updates.get("notes", ""),
            sentiment=form_updates.get("sentiment", ""),
            brochures_shared=form_updates.get("brochures_shared", False)
        )
        db.add(new_log)
        db.commit()
    # ----------------------------------

    return {
        "reply": final_reply,
        "form_updates": form_updates
    }