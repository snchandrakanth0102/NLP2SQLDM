<<<<<<< HEAD
# NLP2SQL_DM
=======
# NLP-to-SQL Data Manager

This application is an intelligent NLP-to-SQL interface that allows users to query a database using natural language. It leverages Google's Gemini LLM to translate English questions into SQL queries, executes them against an external database, and visualizes the results.

## 🏗️ Architecture Overview

The application follows a modern client-server architecture:

- **Frontend**: Next.js (React) application for the chat interface and data visualization.
- **Backend**: Node.js/Express server handling API requests, LLM integration, and database execution.
------------------
## � Technologies Used

### Frontend
*   **Framework**: [Next.js 16](https://nextjs.org/) (React 19)
*   **Language**: TypeScript
*   **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
*   **Icons**: Lucide React
*   **HTTP Client**: Axios
*   **Charts**: Recharts

### Backend
*   **Runtime**: Node.js
*   **Framework**: [Express 5](https://expressjs.com/)
*   **Language**: TypeScript
*   **LLM Integration**: [Google Generative AI SDK](https://www.npmjs.com/package/@google/generative-ai) (Gemini)
*   **Security**: Helmet, Express Rate Limit
*   **Utilities**: Dotenv, CORS

------------------

## 📋 Requirements

### System Requirements
*   **Node.js**: Version 20 or higher (Required for Next.js 16)
*   **npm**: Version 10+ or Yarn/pnpm equivalent

### API Requirements
1.  **Google Gemini API Key**:
    *   Required for LLM SQL generation and Embedding generation.
    *   Models used: `gemini-2.5-flash` (SQL) and `text-embedding-004` (Caching).
    *   Get it from [Google AI Studio](https://aistudio.google.com/).

2.  **External Database Access**:
    *   The application executes generated SQL against a target database.
    *   Ensure network connectivity from the server to the database.
    *   (Note: The current implementation sends SQL to an external execution API endpoint).

------------------

## �🛠️ Setup & Run

### Prerequisites
*   Node.js installed
*   Gemini API Key
*   External Database Access

### Running the Server
```bash
cd server
cp .env.example .env  # Configure your keys
npm install
npm run dev
```

### Running the Client
```bash
cd client
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the application.

--------------------

### 🔄 Application Flow

1.  **User Input**: User types a question in the Chat Interface.
2.  **Request**: Frontend sends the prompt to the Backend API (`/api/generate`).
3.  **Context Retrieval**: Backend retrieves database schema context (`rag.service.ts`).
4.  **SQL Generation**: LLM Service (`llm.service.ts`) sends schema + user question to Gemini to generate SQL.
5.  **Validation & Formatting**:
    *   **Guardrails**: Checks for malicious intent (`guardrails.service.ts`).
    *   **Formatting**: Enforces SQL casing rules (`execution.service.ts`).
    *   **Syntax Check**: Validates SQL syntax (`guardrails.service.ts`).
6.  **Execution**: Validated SQL is sent to the external database API (`execution.service.ts`).
7.  **Response**: Results are returned to the frontend.
8.  **Visualization**: Frontend renders the data as a table or chart (`ResultsVisualizer.tsx`).

------------------

## 📂 Key Files & Connections

### 1. Backend (`/server`)

The server acts as the brain of the application.

*   **`src/server.ts`**: Entry point. Validates environment variables and starts the Express server.
*   **`src/app.ts`**: Configures middleware (CORS, Rate Limiting, Helmet) and mounts routes.
*   **`src/routes/api.routes.ts`**: Defines API endpoints (e.g., `/generate`, `/execute`). Maps requests to controllers.

#### **Controllers** (`src/controllers/`)
*   **`sql.controller.ts`**: Handles the main flow. Receives user prompt -> calls LLM Service -> returns SQL.
*   **`insights.controller.ts`**: Generates data insights from query results.

#### **Services** (`src/services/`)
These services contain the core business logic and are "connected" by being imported into controllers.

*   **`llm.service.ts`**:
    *   **Connects to**: Google Gemini API.
    *   **Function**: Constructs the prompt with schema context and generates SQL.
    *   **Flow**: `generateSql(question)` -> `getSchemaContext()` -> Call Gemini -> `formatSqlCasing()` -> `validateSqlSyntax()` -> Return SQL.
*   **`guardrails.service.ts`**:
    *   **Function**: Security and validation.
    *   **Methods**: `validateInput` (checks for malicious keywords), `validateSqlSyntax` (regex-based SQL syntax check).
*   **`execution.service.ts`**:
    *   **Connects to**: External Database API.
    *   **Function**: Executes the generated SQL.
    *   **Methods**: `executeSql` (runs query), `formatSqlCasing` (enforces UPPERCASE keywords/lowercase columns).
*   **`rag.service.ts`**:
    *   **Function**: Provides the "knowledge" about the database structure (tables, columns) to the LLM.
*   **`semantic-cache.service.ts`**:
    *   **Function**: Caches generated SQL for semantically similar questions to reduce LLM calls.
    *   **Configuration**:
        *   `SEMANTIC_CACHE_THRESHOLD`: Similarity threshold (0.0 - 1.0, default 0.9).
        *   `SEMANTIC_CACHE_MAX_SIZE`: Max cache entries (default 1000).
    *   **API**:
        *   `GET /api/cache/stats`: View cache statistics.
        *   `DELETE /api/cache`: Clear the cache.

    #### Semantic Cache Flow
    ```mermaid
    sequenceDiagram
        participant U as User
        participant S as Server
        participant C as Memory/File Cache
        participant LLM as Google Gemini

        U->>S: Ask Question ("Show me top users")
        S->>S: Generate Embedding (Question)
        S->>C: Find semantically similar (Cosine Sim > 0.9)
        
        alt Found in Cache
            C-->>S: Return Cached SQL
            S-->>U: Return SQL (No LLM Cost)
        else Not Found
            S->>LLM: Generate SQL
            LLM-->>S: SQL Query
            S->>C: Save {Question, SQL, Embedding} to JSON
            S-->>U: Return SQL
        end
    ```


------------------

### 2. Frontend (`/client`)

The client handles user interaction and display.

*   **`app/page.tsx`**: Main entry page. Renders the `ChatInterface`.
*   **`components/chat/ChatInterface.tsx`**:
    *   **Core Component**: Manages chat state (messages, loading).
    *   **Flow**: User types -> calls `api.generateSql` -> displays "Processing" card -> receives SQL -> calls `api.executeSql` -> displays results.
*   **`components/visualization/ResultsVisualizer.tsx`**:
    *   **Function**: Renders the query results.
    *   **Features**: Client-side pagination (100 rows/page), CSV export, dynamic table rendering.
*   **`lib/api.ts`**:
    *   **Function**: Axios client for communicating with the Backend Server.

------------------

## 🚀 Execution Flow Example

**Scenario**: User asks "Show me all active users."

1.  **Frontend**: `ChatInterface` captures input and calls `api.generateSql("Show me all active users")`.
2.  **Backend (Route)**: `api.routes.ts` routes request to `sql.controller.ts`.
3.  **Backend (Controller)**: `sql.controller.ts` calls `llm.service.generateSql()`.
4.  **Backend (LLM Service)**:
    *   Fetches schema from `rag.service.ts`.
    *   Sends prompt to Gemini: "Given table 'application_user', write SQL for 'Show me all active users'."
    *   Gemini returns: `SELECT * FROM application_user WHERE is_active = true`.
    *   Calls `execution.service.formatSqlCasing()` -> `SELECT * FROM application_user WHERE is_active = true`.
    *   Calls `guardrails.service.validateSqlSyntax()` -> Valid.
5.  **Backend (Response)**: Returns SQL to Frontend.
6.  **Frontend**: `ChatInterface` receives SQL, displays it, and automatically calls `api.executeSql()`.
7.  **Backend (Execution)**: `execution.service.executeSql()` sends query to External DB API.
8.  **Backend (Response)**: Returns JSON data (rows of users).
9.  **Frontend**: `ResultsVisualizer` receives data and renders a paginated table.

------------------


>>>>>>> 46c142b (Converts NLP to SQL based on the schema provided)
