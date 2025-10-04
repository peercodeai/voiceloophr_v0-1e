# Developer Instructions: VoiceLoop HR Simplification and Enhancement

This document provides comprehensive instructions for simplifying the existing VoiceLoop HR application and integrating new features, including a staff-accessible dashboard with an interview calendar, an employee database, and an enhanced document search functionality utilizing Retrieval Augmented Generation (RAG) and semantic search. A smart parser will also be implemented to intelligently route user queries.

## 1. Project Setup and Initial Cleanup

Before implementing new features, the existing VoiceLoop HR repository (`voiceloophr_v0-1e`) needs to be streamlined by removing unnecessary components and text.

### 1.1. Clone the Repository

First, ensure you have the project cloned locally:

```bash
git clone https://github.com/peercodeai/voiceloophr_v0-1e.git
cd voiceloophr_v0-1e
```

### 1.2. Remove Unnecessary Files and Directories

Based on the simplified architecture, many existing files and directories related to features being removed can be deleted. This includes:

*   **Authentication Providers:** Remove code related to Google OAuth, Microsoft OAuth, and LinkedIn integration. This will likely involve files in `services/auth/` or similar directories, and modifications to `next.config.mjs` or environment variable handling.
*   **External Integrations:** Delete code and configurations for Google Drive and LinkedIn integrations.
*   **Specific AI Features:** Remove components related to Whisper integration and other AI analysis features not directly part of the RAG pipeline.
*   **Guest/Investor Modes:** Remove logic and UI components specific to guest and investor demo modes.
*   **Complex Document Processing:** Simplify or remove custom PDF parsers and other multi-method parsing logic, retaining only what's necessary for basic text extraction from PDF, DOCX, and TXT.
*   **Calendar Integrations:** Remove all code related to Google and Microsoft Calendar integrations.

**Example Cleanup Commands (conceptual - verify paths before execution):**

```bash
rm -rf components/auth/google \
         components/auth/microsoft \
         components/auth/linkedin
rm -rf services/google-drive \
         services/linkedin
rm -rf hooks/use-google-drive \
         hooks/use-linkedin
# Review and remove specific AI-related files if not used for RAG
# Review and remove guest/investor mode specific files
# Review and remove calendar integration files
```

### 1.3. Simplify `README.md` and Other Documentation

Edit the `README.md` and any other documentation files (e.g., `docs/`) to reflect the simplified feature set and new additions. Remove all mentions of features that are no longer supported.

## 2. Database Schema Updates

The existing PostgreSQL database with `pg_vector` will be used. New tables or modifications to existing ones are required for the employee database and calendar.

### 2.1. Employee Table

Create a new table for employee data. This table will store the synthetic employee data generated in the previous step.

```sql
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(50),
    job_title VARCHAR(255),
    department VARCHAR(100),
    hire_date DATE,
    salary DECIMAL(10, 2),
    address TEXT,
    skills TEXT[] -- Array of text for skills
);
```

### 2.2. Calendar Events Table

Create a table to store interview scheduling events.

```sql
CREATE TABLE calendar_events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL, -- Link to employee
    interviewer_id INTEGER REFERENCES employees(id) ON DELETE SET NULL, -- Link to interviewer
    location VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2.3. Document Embeddings Table (Existing)

Ensure the existing `documents` table (or similar) has a column for vector embeddings, typically named `embedding` with type `vector` (from `pg_vector`).

```sql
-- Example (adjust as per existing schema)
ALTER TABLE documents ADD COLUMN embedding vector(1536); -- Assuming OpenAI's text-embedding-ada-002 model output dimension
```

## 3. Implement New Features

### 3.1. Staff Dashboard Page

Create a new page for staff access, accessible via the main dashboard. This page will serve as a central hub for the calendar and employee database.

*   **File Structure:** Create a new file, e.g., `app/dashboard/staff/page.tsx`.
*   **Navigation:** Add a link to this new page in the dashboard navigation component.
*   **Layout:** Design a layout that can host the calendar and employee database components.

### 3.2. Interview Calendar

Integrate a calendar component into the new staff dashboard page.

*   **Frontend Component:** Use a React calendar library (e.g., `react-calendar`, `react-big-calendar`) to display and interact with events.
*   **API Endpoints:** Create Next.js API routes (`/api/calendar`) to handle CRUD operations for `calendar_events`:
    *   `GET /api/calendar`: Fetch all events.
    *   `POST /api/calendar`: Create a new event.
    *   `PUT /api/calendar/[id]`: Update an existing event.
    *   `DELETE /api/calendar/[id]`: Delete an event.
*   **Data Flow:** The frontend calendar component will interact with these API endpoints to display and manage interview schedules.

### 3.3. Employee Database

Create a component to display and manage employee data, integrated into the staff dashboard.

*   **Frontend Component:** Develop a React component to display employee data in a table format, with search and filtering capabilities.
*   **API Endpoints:** Create Next.js API routes (`/api/employees`) to handle CRUD operations for `employees`:
    *   `GET /api/employees`: Fetch all employees (or paginated list).
    *   `GET /api/employees/[id]`: Fetch a single employee.
    *   `POST /api/employees`: Add a new employee.
    *   `PUT /api/employees/[id]`: Update an employee.
    *   `DELETE /api/employees/[id]`: Delete an employee.
*   **Data Import:** Implement a script or API endpoint to import the `synthetic_employee_data.json` into the `employees` table.

## 4. Document Upload and RAG Semantic Search

Enhance the document upload and search functionality to leverage RAG and semantic search.

### 4.1. Document Processing Pipeline

When a document is uploaded:

1.  **Parse Document:** Extract text content from PDF, DOCX, or TXT files. Libraries like `pdf-parse` (for PDF) and `mammoth` (for DOCX) can be used.
2.  **Chunking:** Divide the extracted text into smaller, semantically meaningful chunks.
3.  **Generate Embeddings:** Use OpenAI's embedding API (e.g., `text-embedding-ada-002`) to generate vector embeddings for each text chunk.
4.  **Store in Database:** Store the original document content, text chunks, and their corresponding embeddings in the PostgreSQL database.

### 4.2. Semantic Search Implementation

Modify the existing search API (`/api/search/semantic`) or create a new one:

1.  **User Query Embedding:** When a user submits a search query, generate an embedding for the query using OpenAI's embedding API.
2.  **Vector Similarity Search:** Perform a vector similarity search in the database to find the most relevant document chunks based on the query embedding. The `pg_vector` extension is crucial here.
3.  **RAG (Retrieval Augmented Generation):** Pass the user's query along with the retrieved relevant document chunks to a large language model (LLM) like OpenAI's GPT-4. Instruct the LLM to generate a comprehensive answer based *only* on the provided context.
4.  **Best Example Identification:** For the 

question "which of the documents is the best example?", the RAG system should be designed to identify and highlight the document chunk that most directly and comprehensively answers the user's implicit or explicit question, providing a citation to the source document.

## 5. Smart Parser (Intent Detection)

Implement a smart parser to direct user queries to the appropriate search domain (documents, calendar, or employees).

### 5.1. API Endpoint

Create a new API endpoint, e.g., `/api/parse-intent`, that takes a user query as input.

### 5.2. Intent Classification Logic

Inside the `parse-intent` endpoint, implement logic to classify the user's intent. A simple keyword-based approach can be used initially:

*   **Calendar Intent:** If the query contains keywords like "schedule," "interview," "meeting," "calendar," "when is," etc., classify as `calendar_search`.
*   **Employee Intent:** If the query contains keywords like "employee," "staff," "who is," "contact," "department," or likely names, classify as `employee_search`.
*   **Document Intent:** For all other queries, default to `document_search`.

### 5.3. Frontend Integration

Modify the main search input component in the frontend to first send the user's query to the `/api/parse-intent` endpoint. Based on the returned intent, route the query to the appropriate backend API (e.g., `/api/search/semantic`, `/api/calendar`, `/api/employees`).

## 6. Frontend UI/UX Enhancements

*   **Unified Search Bar:** The main search bar should be capable of handling all types of queries (documents, calendar, employees).
*   **Dashboard Integration:** Ensure the new staff page, calendar, and employee database are seamlessly integrated into the existing dashboard UI.
*   **Responsive Design:** Maintain the existing responsive design principles for optimal viewing across devices.

## 7. Deployment

Follow the existing deployment procedures for the Next.js application. Ensure all new environment variables (e.g., for OpenAI API key) are properly configured in your deployment environment.

## 8. Testing

*   **Unit Tests:** Write unit tests for new API routes and utility functions.
*   **Integration Tests:** Test the end-to-end flow for document upload, search, calendar scheduling, and employee database interactions.
*   **Semantic Search Validation:** Verify that semantic search returns relevant results and RAG provides accurate, context-aware answers.
*   **Intent Parser Validation:** Test the smart parser with various queries to ensure correct intent classification.

## References

*   [Next.js Documentation](https://nextjs.org/docs)
*   [Supabase Documentation](https://supabase.com/docs)
*   [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
*   [pg_vector GitHub Repository](https://github.com/pgvector/pgvector)
*   [Faker Library](https://faker.readthedocs.io/en/master/)

