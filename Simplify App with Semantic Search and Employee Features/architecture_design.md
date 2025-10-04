# Simplified VoiceLoop HR Architecture

This document outlines the simplified architecture for the VoiceLoop HR application, focusing on core features and a modern RAG-based approach.

## 1. Core Components

The simplified application will consist of the following core components:

*   **Frontend:** A clean, responsive user interface built with Next.js and Tailwind CSS.
*   **Backend:** Next.js API routes for handling business logic.
*   **Database:** PostgreSQL with the `pg_vector` extension for storing structured data and vector embeddings.
*   **Authentication:** Supabase for user management and authentication.
*   **Document Storage:** Supabase Storage for storing uploaded documents.
*   **AI & Search:** OpenAI for embeddings and RAG, and a custom smart parser for intent detection.

## 2. Feature Set

The application will be streamlined to focus on the following key features:

### 2.1. Document Management

*   **Upload:** Users can upload documents (PDF, DOCX, TXT). The uploaded files will be stored in Supabase Storage.
*   **Processing:** Upon upload, documents will be parsed, chunked, and converted into vector embeddings using OpenAI's API. These embeddings will be stored in the PostgreSQL database.
*   **Semantic Search:** A unified search interface will allow users to perform semantic searches across all uploaded documents. The system will use RAG to provide context-aware answers based on the document content.

### 2.2. Interview Scheduling

*   **Calendar:** A new calendar page will be added to the dashboard for scheduling interviews. This will be a custom implementation and will not rely on external calendar integrations like Google or Microsoft Calendar.
*   **Events:** Users can create, view, update, and delete interview events on the calendar.

### 2.3. Employee Database

*   **Database:** A new page accessible from the dashboard will provide access to an employee database.
*   **Data Model:** The employee database will store synthetic employee data, including name, position, contact information, and other relevant details.
*   **Search:** The employee database will be searchable via the main search interface, with the smart parser directing queries to the employee data.

## 3. Smart Parser (Intent Detection)

A key component of the simplified architecture is a smart parser that sits in front of the search functionality. This parser will analyze the user's query and determine the user's intent.

*   **Intent-Based Routing:** The parser will classify the query into one of the following intents:
    *   `document_search`: For queries related to finding information within uploaded documents.
    *   `calendar_search`: For queries related to finding or scheduling interviews.
    *   `employee_search`: For queries related to finding employees in the database.
*   **Implementation:** The smart parser will be implemented as a simple keyword-based routing system. For example, queries containing terms like "interview," "schedule," or "meeting" will be routed to the calendar. Queries with names or employee-related terms will be routed to the employee database. All other queries will be treated as document searches.

## 4. Simplification and Removal of Existing Features

To simplify the application, the following features from the original `voiceloophr_v0-1e` repository will be removed:

*   **Multi-format document support:** Support will be limited to PDF, DOCX, and TXT to reduce complexity.
*   **AI-Powered Analysis (Whisper, etc.):** The focus will be on RAG-based document search, so other AI analysis features will be removed.
*   **Advanced Document Processing:** The complex multi-method parsing will be replaced with a simpler, more focused document processing pipeline.
*   **Authentication Providers:** Authentication will be limited to Supabase email/password to simplify the login process. Google and Microsoft OAuth will be removed.
*   **Platform Integrations (LinkedIn, Google Drive):** All third-party platform integrations will be removed to create a more self-contained application.
*   **Guest Mode & Investor Demo Mode:** These modes will be removed to simplify the user experience.
*   **Mobile Optimization:** While the app will be responsive, the extensive mobile-specific optimizations will be removed for simplicity.
*   **Calendar Integrations:** The existing Google and Microsoft Calendar integrations will be removed in favor of a simpler, built-in calendar.

