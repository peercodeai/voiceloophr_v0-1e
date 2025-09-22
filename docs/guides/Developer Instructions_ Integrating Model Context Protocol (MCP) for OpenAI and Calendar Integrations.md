# Developer Instructions: Integrating Model Context Protocol (MCP) for OpenAI and Calendar Integrations

## 1. Introduction

This document provides developer instructions for integrating the Model Context Protocol (MCP) into the VoiceLoop HR platform. MCP is an open protocol that enables seamless integration between LLM applications and external data sources and tools. By adopting MCP, VoiceLoop HR can standardize how it connects with services like OpenAI and calendar providers, leading to a more modular, scalable, and maintainable architecture.

**Benefits of MCP Integration:**

*   **Standardization:** MCP provides a common language for AI applications and external services to communicate, reducing the complexity of custom integrations.
*   **Modularity:** By decoupling the core application from specific service implementations, MCP allows for easier replacement and addition of new services.
*   **Scalability:** The protocol is designed to handle complex interactions and large volumes of data, enabling the platform to scale effectively.
*   **Enhanced Capabilities:** MCP's features, such as Resources, Prompts, and Tools, will allow VoiceLoop HR to expose a richer set of functionalities to the user and the AI model.

This guide will focus on two key areas: integrating the existing OpenAI services and adding new Calendar integration capabilities using MCP.




## 2. Model Context Protocol (MCP) Overview

The Model Context Protocol (MCP) is an open standard designed to facilitate robust and secure communication between Large Language Model (LLM) applications and various external data sources and tools. It acts as a universal connector, similar to how USB-C standardizes physical connections, for AI applications to access and utilize contextual information and external functionalities. The protocol is built upon JSON-RPC 2.0 messages, enabling a structured and efficient exchange of information.

### 2.1 Core Components of MCP

MCP defines three primary roles in its communication architecture:

*   **Hosts**: These are the LLM applications that initiate connections and manage the overall interaction. In the context of VoiceLoop HR, the main application serving as the interface for users and the orchestrator of AI tasks would be considered the Host.

*   **Clients**: These are connectors embedded within the Host application. Clients are responsible for communicating with Servers and translating data between the Host's internal format and MCP's standardized format. For VoiceLoop HR, components that interact with external services like OpenAI or a Calendar API would function as Clients.

*   **Servers**: These are external services or systems that provide specific context or capabilities to the LLM application. Examples include databases, knowledge bases, external APIs (like OpenAI's API), or calendar services. These Servers expose their functionalities through MCP, allowing Hosts to leverage them in a standardized manner.

### 2.2 Key Features and Capabilities

MCP provides a rich set of features that enable sophisticated interactions between LLMs and external systems:

#### 2.2.1 Server-Offered Features (to Clients)

*   **Resources**: This feature allows Servers to provide contextual data to the LLM or the user. This could include documents, database records, or any other relevant information that the AI model needs to perform its tasks effectively. For VoiceLoop HR, this could involve providing employee records, policy documents, or extracted information from uploaded files as resources to the OpenAI model.

*   **Prompts**: Servers can offer templated messages or workflows that guide the LLM's behavior or user interactions. This helps in standardizing common tasks and ensuring consistent output from the AI. For instance, a Server could provide a pre-defined prompt for summarizing a document or generating a specific type of report.

*   **Tools**: This is a crucial feature that allows Servers to expose functions or actions that the AI model can execute. These tools enable the LLM to interact with the real world, perform calculations, retrieve specific information, or trigger external processes. For VoiceLoop HR, a 


tool could be an action to schedule a meeting, update an employee record, or search a specific database.

#### 2.2.2 Client-Offered Features (to Servers)

*   **Sampling**: This enables server-initiated agentic behaviors and recursive LLM interactions. Essentially, it allows the server to request the LLM to perform further reasoning or generate additional content based on previous outputs.

*   **Roots**: This feature allows servers to initiate inquiries into URI or filesystem boundaries to operate within. This is particularly useful for defining the scope of operations or data access for the LLM.

*   **Elicitation**: Servers can use this to request additional information from users. This is vital for interactive processes where the LLM needs more input from the human user to complete a task.

### 2.3 Security and Trust & Safety

Given the powerful capabilities enabled by MCP, especially concerning data access and code execution, security and trust are paramount. The protocol emphasizes several key principles:

1.  **User Consent and Control**: Users must explicitly consent to and understand all data access and operations. They must retain control over what data is shared and what actions are taken.

2.  **Data Privacy**: Hosts must obtain explicit user consent before exposing user data to servers and must not transmit resource data elsewhere without user consent.

3.  **Tool Safety**: Tools represent arbitrary code execution. Hosts must obtain explicit user consent before invoking any tool, and users should understand what each tool does before authorizing its use.

4.  **LLM Sampling Controls**: Users must explicitly approve any LLM sampling requests and should control whether sampling occurs, the prompt sent, and what results the server can see.

Implementers are strongly encouraged to build robust consent and authorization flows, provide clear documentation of security implications, implement appropriate access controls, and follow general security best practices.



## 3. Current OpenAI Integration Analysis

The VoiceLoop HR platform currently integrates with OpenAI for document analysis and summarization. The core logic for this integration resides in `lib/services/openai.ts`. This service directly interacts with the OpenAI API by constructing prompts and sending requests to the `https://api.openai.com/v1/chat/completions` endpoint.

### 3.1 `OpenAIService` Overview

The `OpenAIService` class is responsible for:

*   **Configuration**: It takes an `OpenAIConfig` object, which includes the API key, model, max tokens, and temperature.
*   **Prompt Construction**: The `buildAnalysisPrompt` method dynamically creates a prompt based on the document content, file name, and file type. This prompt instructs the OpenAI model to perform a comprehensive business analysis and return the results in a specific JSON format.
*   **API Call**: The `callOpenAI` method handles the actual HTTP POST request to the OpenAI API endpoint, including setting the authorization header with the API key and sending the JSON payload.
*   **Response Parsing**: The `parseAnalysisResponse` method extracts and parses the JSON response from OpenAI, providing fallbacks for missing or invalid data.
*   **Error Handling**: Basic error handling is implemented to catch API errors and parsing failures.

### 3.2 Limitations of Current Approach for MCP Integration

The current direct integration with the OpenAI API, while functional, presents several limitations when considering a transition to MCP:

*   **Tight Coupling**: The `OpenAIService` is tightly coupled to the OpenAI API. Any changes to the OpenAI API (e.g., new versions, different endpoints, or authentication mechanisms) would require direct modifications to this service. MCP aims to abstract this away.
*   **Lack of Standardization**: The prompt construction and response parsing are custom implementations. MCP provides standardized ways to define `Prompts` and `Resources`, which would make the integration more consistent and reusable.
*   **Limited Tooling**: The current integration primarily focuses on sending text and receiving JSON. MCP's `Tools` feature allows the LLM to invoke specific functions or actions, which is not directly supported by the current `OpenAIService`.
*   **Context Management**: While the prompt includes document content, MCP offers more sophisticated mechanisms for managing and providing context to LLMs through `Resources` and `Roots`.
*   **Security**: The API key is directly used within the service. While this is common, MCP's emphasis on user consent and controlled access to resources and tools provides a more robust security framework, especially when dealing with sensitive data.

### 3.3 Proposed MCP Integration for OpenAI

To integrate OpenAI using MCP, the `OpenAIService` would need to be refactored to act as an MCP Client, interacting with an MCP Server that encapsulates the OpenAI API. This MCP Server could be a local service or a remote one, depending on the deployment strategy.

**Key changes would involve:**

1.  **MCP Server for OpenAI**: Develop a dedicated MCP Server that exposes OpenAI functionalities (e.g., text completion, chat, embeddings) as MCP `Tools` and `Resources`. This server would handle the direct communication with the OpenAI API, including API key management and rate limiting.
2.  **MCP Client in VoiceLoop HR**: The `OpenAIService` (or a new MCP client module) would communicate with this MCP Server using MCP messages. Instead of building raw prompts, it would utilize MCP `Prompts` provided by the server or construct MCP `Tool` invocation requests.
3.  **Context Provisioning**: Document content and other relevant information would be provided to the MCP Server as `Resources`, allowing the server to manage the context for the OpenAI model more effectively.
4.  **Tool Invocation**: If VoiceLoop HR needs to leverage more advanced OpenAI capabilities (e.g., function calling), these would be exposed as MCP `Tools` by the MCP Server, and the VoiceLoop HR application would invoke them via MCP messages.

This approach would decouple VoiceLoop HR from the specifics of the OpenAI API, making the system more flexible, maintainable, and aligned with the MCP standard.



## 4. Calendar Integration Analysis

The VoiceLoop HR platform currently has a very limited, almost placeholder, integration with calendar functionalities. Based on the code analysis, the term "Calendar integration" appears in `PM_RESEARCH_REQUEST.md` as a stated feature and in `components/DocumentViewer.tsx` as a UI icon, but there is no apparent backend logic or API calls related to actual calendar operations (e.g., scheduling events, fetching availability, or syncing with external calendar services like Google Calendar or Outlook Calendar).

### 4.1 Current State

*   **`PM_RESEARCH_REQUEST.md`**: This document lists "Calendar integration" as a stated capability of the VoiceLoop HR Assistant. This indicates a clear intention or future requirement for such functionality.
*   **`components/DocumentViewer.tsx`**: The `Calendar` icon from `lucide-react` is imported and used within the `DocumentViewer` component. This suggests that there might be a visual element or a planned feature related to calendars in the user interface, but it is not currently hooked up to any functional backend logic.

There are no explicit API routes (e.g., in `app/api/calendar`) or service files (e.g., `lib/services/calendar.ts`) that handle calendar-specific operations. This implies that the calendar integration is either: 

1.  **Conceptual/Planned**: A feature that has been identified as necessary but not yet implemented.
2.  **Placeholder**: UI elements are present, but the underlying functionality is absent.
3.  **External/Manual**: Calendar-related tasks are expected to be handled outside the application or manually by the user based on information provided by the HR Assistant.

### 4.2 Proposed MCP Integration for Calendar

Given the current nascent state of calendar integration, MCP provides an excellent framework to build this functionality from the ground up in a standardized and extensible manner. The calendar integration would primarily leverage MCP's `Tools` feature, allowing the LLM to perform actions related to scheduling and managing events.

**Key steps for MCP-based Calendar Integration:**

1.  **Define Calendar MCP Server**: Create a new MCP Server specifically for calendar operations. This server would encapsulate the logic for interacting with various calendar APIs (e.g., Google Calendar API, Microsoft Graph API for Outlook). It would expose standardized MCP `Tools` for common calendar actions.

2.  **Implement Calendar MCP Tools**: The MCP Server would define `Tools` such as:
    *   `schedule_meeting(title: string, startTime: datetime, endTime: datetime, attendees: list[string], description: string)`: A tool to create a new calendar event.
    *   `find_free_time(attendees: list[string], duration: int, dateRange: tuple[datetime, datetime])`: A tool to find available time slots for a group of attendees.
    *   `list_events(dateRange: tuple[datetime, datetime])`: A tool to retrieve a user's upcoming events.
    *   `update_event(eventId: string, updates: dict)`: A tool to modify an existing event.
    *   `cancel_event(eventId: string)`: A tool to cancel a calendar event.

3.  **Develop MCP Client in VoiceLoop HR**: The VoiceLoop HR application would act as an MCP Client. When the LLM (via the OpenAI integration) identifies a user intent related to calendar operations (e.g., "Schedule a meeting with John and Jane next Tuesday at 2 PM"), the LLM would invoke the appropriate MCP Calendar Tool.

4.  **User Consent and Authentication**: Implement robust user authentication and authorization flows for calendar access. Before invoking any calendar tool, the VoiceLoop HR application (as the MCP Host) MUST obtain explicit user consent to access their calendar data and perform actions on their behalf. This would likely involve OAuth 2.0 flows with the respective calendar providers.

5.  **Contextual Information (Resources)**: If the LLM needs to be aware of a user's existing calendar events to provide better suggestions (e.g., "You have a conflict at that time, would you like to reschedule?"), the Calendar MCP Server could provide these as `Resources` to the LLM.

6.  **UI Integration**: Update the `DocumentViewer.tsx` and other relevant UI components to reflect the status of calendar integrations, provide feedback on scheduled events, and allow users to manage their calendar connections.

By implementing calendar integration through MCP, VoiceLoop HR can provide powerful scheduling capabilities to its users, driven by the LLM, while maintaining a clean, modular, and secure architecture. This approach also makes it easier to add support for multiple calendar providers in the future without significant refactoring of the core application logic.



## 5. Architectural Changes for MCP Integration

Implementing MCP in VoiceLoop HR will require significant architectural changes to decouple existing direct API calls and introduce MCP-compliant communication. The goal is to transform VoiceLoop HR into an MCP Host, interacting with dedicated MCP Servers for specific functionalities like OpenAI and Calendar.

### 5.1 High-Level Architecture Diagram

```mermaid
graph TD
    A[VoiceLoop HR Application (MCP Host)] -->|MCP Messages| B(MCP Client Module)
    B -->|MCP Messages| C(OpenAI MCP Server)
    B -->|MCP Messages| D(Calendar MCP Server)
    C -->|OpenAI API Calls| E[OpenAI API]
    D -->|Calendar API Calls| F[Google Calendar API]
    D -->|Calendar API Calls| G[Outlook Calendar API]

    subgraph External Services
        E
        F
        G
    end

    subgraph VoiceLoop HR Backend
        A
        B
        C
        D
    end

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#ccf,stroke:#333,stroke-width:2px
    style C fill:#cfc,stroke:#333,stroke-width:2px
    style D fill:#cfc,stroke:#333,stroke-width:2px
    style E fill:#fcc,stroke:#333,stroke-width:2px
    style F fill:#fcc,stroke:#333,stroke-width:2px
    style G fill:#fcc,stroke:#333,stroke-width:2px
```

**Explanation of Components:**

*   **VoiceLoop HR Application (MCP Host)**: This is the main application, responsible for user interaction, orchestrating workflows, and initiating MCP communications. It will no longer directly call external APIs.
*   **MCP Client Module**: This module acts as the central point for all outgoing MCP messages from the VoiceLoop HR application. It handles the routing of messages to the appropriate MCP Servers and manages the MCP communication lifecycle.
*   **OpenAI MCP Server**: A new, dedicated service that acts as an MCP Server. It exposes OpenAI functionalities as MCP `Tools` and `Resources`. This server is responsible for making direct API calls to the OpenAI API, handling authentication, rate limiting, and response parsing.
*   **Calendar MCP Server**: Another new, dedicated service that acts as an MCP Server. It exposes calendar functionalities (e.g., scheduling, event lookup) as MCP `Tools`. This server will integrate with various calendar providers (Google Calendar, Outlook Calendar, etc.) and abstract their specific APIs.
*   **External Services (OpenAI API, Google Calendar API, Outlook Calendar API)**: These are the third-party services that provide the core functionalities. The MCP Servers will be responsible for interacting with these services.

### 5.2 Refactoring `OpenAIService` to an MCP Client

The existing `lib/services/openai.ts` needs to be refactored. Instead of directly calling the OpenAI API, it will now construct MCP messages and send them to the MCP Client Module, which then forwards them to the OpenAI MCP Server.

**Example (Conceptual `lib/services/openai.ts` after refactoring):**

```typescript
// lib/services/openai.ts (Refactored to be an MCP Client)

import { MCPClient } from ".//mcpClient"; // Assuming a new MCP Client module
import { DocumentAnalysis } from "./types"; // Existing types

export class OpenAIService {
  private mcpClient: MCPClient;

  constructor(mcpClient: MCPClient) {
    this.mcpClient = mcpClient;
  }

  async analyzeDocument(
    text: string,
    fileName: string,
    fileType: string
  ): Promise<DocumentAnalysis> {
    try {
      // Construct an MCP message to invoke a 'documentAnalysis' tool on the OpenAI MCP Server
      const response = await this.mcpClient.sendRequest(
        "openai/documentAnalysis", // MCP method/tool identifier
        {
          documentContent: text,
          fileName: fileName,
          fileType: fileType,
        }
      );

      // The MCP Server will return the DocumentAnalysis directly
      return response as DocumentAnalysis;
    } catch (error) {
      console.error("MCP OpenAI analysis failed:", error);
      throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Other OpenAI-related functionalities would also be refactored to use mcpClient.sendRequest
}
```

### 5.3 Developing the OpenAI MCP Server

This will be a new service, potentially a separate microservice or a module within the existing backend, responsible for:

*   **Listening for MCP Messages**: It will receive MCP requests from the MCP Client Module.
*   **Mapping MCP Tools to OpenAI API**: It will translate MCP tool invocations (e.g., `documentAnalysis`) into specific OpenAI API calls.
*   **Handling OpenAI API Interactions**: This includes managing API keys, handling rate limits, retries, and parsing raw OpenAI responses into MCP-compliant `Resources` or direct return values.
*   **Exposing OpenAI Capabilities as MCP Tools/Resources**: Define the schema for the `documentAnalysis` tool, and any other OpenAI features (e.g., chat completions, embeddings) that VoiceLoop HR needs to expose.

**Example (Conceptual `openai-mcp-server/src/index.ts`):**

```typescript
// openai-mcp-server/src/index.ts (Conceptual MCP Server for OpenAI)

import { MCPServer } from ".//mcpServer"; // Assuming an MCP Server framework
import { OpenAI } from "openai"; // OpenAI Node.js library

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const openaiMCPServer = new MCPServer();

openaiMCPServer.registerTool(
  "openai/documentAnalysis",
  async (params: { documentContent: string; fileName: string; fileType: string }) => {
    const prompt = `Analyze the following document...`; // Re-use or adapt existing prompt logic
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      // ... other OpenAI parameters
    });
    const analysis = JSON.parse(completion.choices[0].message.content || "{}");
    return analysis; // Return the structured analysis as an MCP result
  }
);

// Register other OpenAI tools (e.g., chat, embeddings) as needed

openaiMCPServer.start();
```

### 5.4 Developing the Calendar MCP Server

This will also be a new service, similar in structure to the OpenAI MCP Server. It will abstract the complexities of various calendar APIs and expose a unified set of MCP `Tools`.

**Example (Conceptual `calendar-mcp-server/src/index.ts`):**

```typescript
// calendar-mcp-server/src/index.ts (Conceptual MCP Server for Calendar)

import { MCPServer } from ".//mcpServer";
import { google } from "googleapis"; // Example for Google Calendar
// import { Client } from "@microsoft/microsoft-graph-client"; // Example for Outlook Calendar

const calendarMCPServer = new MCPServer();

calendarMCPServer.registerTool(
  "calendar/scheduleMeeting",
  async (params: { title: string; startTime: string; endTime: string; attendees: string[]; description: string }) => {
    // Logic to interact with Google Calendar API or Outlook Calendar API
    // Example for Google Calendar:
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    auth.setCredentials({ access_token: "USER_ACCESS_TOKEN" }); // User's access token

    const calendar = google.calendar({ version: "v3", auth });

    const event = {
      summary: params.title,
      description: params.description,
      start: { dateTime: params.startTime, timeZone: "America/Los_Angeles" },
      end: { dateTime: params.endTime, timeZone: "America/Los_Angeles" },
      attendees: params.attendees.map(email => ({ email })),
    };

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
    });

    return { success: true, eventId: response.data.id };
  }
);

calendarMCPServer.registerTool(
  "calendar/findFreeTime",
  async (params: { attendees: string[]; duration: number; dateRange: { start: string; end: string } }) => {
    // Logic to find free time using Google Calendar API or Outlook Calendar API
    // This would involve more complex logic to query free/busy schedules
    return { availableSlots: [] }; // Placeholder
  }
);

// Register other calendar tools (list_events, update_event, cancel_event) as needed

calendarMCPServer.start();
```

### 5.5 User Authentication and Authorization for Calendar

For calendar integrations, user authentication and authorization are critical. The VoiceLoop HR application (Host) will need to manage OAuth 2.0 flows with Google Calendar, Outlook Calendar, etc., to obtain access tokens on behalf of the user. These access tokens would then be securely passed to the Calendar MCP Server for making API calls.

**Key considerations:**

*   **OAuth 2.0 Flow**: Implement the standard OAuth 2.0 authorization code flow to allow users to grant VoiceLoop HR access to their calendars.
*   **Token Storage**: Securely store refresh tokens (encrypted) to obtain new access tokens without requiring the user to re-authenticate frequently.
*   **Consent Management**: Clearly inform users about the permissions being requested and provide an easy way to revoke access.
*   **MCP Security Principles**: Adhere strictly to MCP's security principles, especially user consent and control over data access and tool invocation. Before any calendar action is performed by the LLM, the user should be explicitly prompted for confirmation, especially for sensitive actions like scheduling or canceling meetings.



## 6. Implementation Roadmap

Implementing MCP will be a multi-phase process. This roadmap outlines the key steps and considerations.

### Phase 1: MCP Core Infrastructure Setup

*   **Task 1.1: MCP Client Module Development**: Create a generic MCP Client module within the VoiceLoop HR application. This module will be responsible for sending and receiving MCP messages, handling connection management with MCP Servers, and routing responses.
*   **Task 1.2: MCP Server Framework**: Choose or develop a framework for building MCP Servers. This could be a lightweight Node.js/TypeScript application that can easily register and expose tools and resources.
*   **Task 1.3: Basic MCP Communication Test**: Implement a simple MCP Server and Client to verify basic message exchange and tool invocation. This could be a "ping-pong" tool or a simple data retrieval tool.

### Phase 2: OpenAI MCP Integration

*   **Task 2.1: Develop OpenAI MCP Server**: Create the dedicated MCP Server for OpenAI. This server will encapsulate the existing `OpenAIService` logic and expose its functionalities as MCP `Tools` (e.g., `documentAnalysis`, `chatCompletion`).
*   **Task 2.2: Refactor `OpenAIService`**: Modify the `lib/services/openai.ts` to use the new MCP Client module, sending requests to the OpenAI MCP Server instead of directly calling the OpenAI API.
*   **Task 2.3: Update AI-related API Routes**: Adjust `app/api/analyze/route.ts`, `app/api/chat/route.ts`, and other relevant API routes to interact with the refactored `OpenAIService`.
*   **Task 2.4: Testing and Validation**: Thoroughly test the OpenAI integration to ensure that document analysis, summarization, and chat functionalities work correctly through the MCP layer. Pay close attention to performance and error handling.

### Phase 3: Calendar MCP Integration

*   **Task 3.1: Develop Calendar MCP Server**: Create the dedicated MCP Server for calendar operations. This server will integrate with at least one calendar provider (e.g., Google Calendar) initially.
*   **Task 3.2: Define Calendar MCP Tools**: Implement MCP `Tools` for key calendar functionalities such as `schedule_meeting`, `find_free_time`, `list_events`, `update_event`, and `cancel_event`.
*   **Task 3.3: Implement OAuth 2.0 Flow**: Develop the necessary backend and frontend components within VoiceLoop HR to handle OAuth 2.0 authentication with calendar providers, securely storing and managing user tokens.
*   **Task 3.4: Integrate Calendar Tools with LLM**: Enable the LLM (via the OpenAI MCP Server) to recognize user intents related to calendar actions and invoke the appropriate Calendar MCP Tools. This will likely involve fine-tuning the LLM or using function calling mechanisms.
*   **Task 3.5: UI Integration**: Update the VoiceLoop HR frontend (e.g., `components/DocumentViewer.tsx` and potentially new calendar-specific components) to display calendar information and provide user controls for calendar interactions.
*   **Task 3.6: Testing and Validation**: Test the end-to-end calendar integration, including authentication, scheduling, and data retrieval. Ensure user consent and security best practices are followed.

### Phase 4: Advanced MCP Features and Refinements

*   **Task 4.1: Implement MCP `Resources`**: Explore using MCP `Resources` to provide richer context to the LLM, such as user profiles, document metadata, or historical interaction data.
*   **Task 4.2: Implement MCP `Prompts`**: Standardize common LLM prompts using MCP `Prompts` to ensure consistency and reusability across different AI tasks.
*   **Task 4.3: Error Handling and Logging**: Enhance error handling and logging across the MCP layers for better debugging and monitoring.
*   **Task 4.4: Performance Optimization**: Profile and optimize the MCP communication and server logic for improved performance and reduced latency.
*   **Task 4.5: Security Audit**: Conduct a comprehensive security audit of the MCP implementation, focusing on data privacy, access control, and tool safety.

This roadmap provides a structured approach to integrating MCP into VoiceLoop HR, enabling a more robust, flexible, and intelligent platform. Each phase can be broken down into smaller, manageable tasks, allowing for iterative development and continuous testing.

