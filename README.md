Python

content = """# AI-First CRM HCP Module (Antigravity Assignment)

## Objective
This project is an AI-first Customer Relationship Management (CRM) module designed for Life Science field representatives to log interactions with Healthcare Professionals (HCPs). 

Built to satisfy strict architectural requirements, this application features a split-screen UI where the data-entry form is entirely locked down (read-only). All data entry and modification are driven autonomously by an AI Assistant using natural language processing and function calling via LangGraph.

## Tech Stack
* **Frontend:** React.js, Redux Toolkit, plain CSS (Google Inter Font)
* **Backend:** Python, FastAPI, Pydantic, SQLAlchemy, SQLite/PostgreSQL
* **AI Agent:** LangGraph, LangChain
* **LLM:** Groq API (`llama-3.3-70b-versatile`)

---

## How It Works (Application Architecture)

The application operates on a strict **"AI-Controlled UI"** paradigm. The user never types into the form fields directly.

1. **User Input:** The rep types a natural language message into the chat panel on the right (e.g., *"Met with Dr. Smith today. Discussed efficacy. Sentiment was positive."*).
2. **State Management (Frontend):** Redux intercepts this message and sends a POST request to the FastAPI backend.
3. **LangGraph Routing (Backend):** The backend receives the text. The `create_react_agent` analyzes the intent and decides which of the 5 predefined tools to invoke (e.g., the `log_interaction` tool).
4. **Structured Output:** The Groq Llama 3.3 model extracts the exact variables needed (HCP Name, Sentiment, etc.) and returns them as a structured JSON payload alongside a conversational text reply.
5. **Database Storage:** The backend saves the extracted interaction data into a SQL database via SQLAlchemy.
6. **UI Update:** Redux receives the JSON payload, updates the global state, and the read-only form on the left instantly populates with the extracted data.

### The 5 LangGraph Tools
* `log_interaction`: Extracts data to populate a new interaction form.
* `edit_interaction`: Modifies specific fields of an existing form if the user corrects the AI.
* `retrieve_hcp_profile`: Fetches background details on the target HCP.
* `schedule_followup`: Parses date and intent to schedule a future action.
* `summarize_history`: Retrieves a brief summary of past interactions.

---

## File Structure

Code output
README.md generated successfully.

```text
crm-hcp-assignment/
│
├── backend/                        # Python FastAPI, Database & LangGraph logic
│   ├── .env                        # Stores GROQ_API_KEY (Not pushed to repo)
│   ├── requirements.txt            # Python dependencies
│   ├── database.py                 # SQLAlchemy connection logic
│   ├── models.py                   # SQL table schemas
│   └── main.py                     # Core backend server, agent definition, and tools
│
├── frontend/                       # React UI & Redux State
│   ├── package.json                # Node dependencies
│   ├── public/
│   │   └── index.html              # Entry HTML (Imports Google Inter font)
│   └── src/
│       ├── App.js                  # Main split-screen UI layout
│       ├── App.css                 # Pixel-perfect styling matching video requirements
│       ├── index.js                # React DOM render and Redux Provider
│       ├── store.js                # Global Redux store configuration
│       └── interactionSlice.js     # Redux slice handling chat history and form state
│
└── README.md                       # Project documentation

Local Setup & Installation
1. Backend Setup
Open a terminal and navigate to the backend directory.

Create and activate a virtual environment:

Bash
# Windows
python -m venv venv
venv\\Scripts\\activate

# Mac/Linux
python3 -m venv venv
source venv/bin/activate
Install dependencies:

Bash
pip install fastapi uvicorn langchain langchain-groq langgraph pydantic python-dotenv sqlalchemy
Create a .env file in the backend folder and add your Groq API key:

Code snippet
GROQ_API_KEY=gsk_your_api_key_here
Start the FastAPI server:

Bash
uvicorn main:app --reload --port 8000
2. Frontend Setup
Open a second terminal window and navigate to the frontend directory.

Install dependencies:

Bash
npm install
Start the React development server:

Bash
npm start
The application will launch in your default browser at http://localhost:3000.
