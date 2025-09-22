# VoiceLoop HR - Project Structure

## 🏗️ **High-Level Architecture**

```
voiceloophr_v0-1e/
├── 📱 app/                    # Next.js App Router
├── 🧩 components/             # Reusable UI Components
├── 📚 lib/                    # Core Libraries & Utilities
├── 🗄️ database/              # Database Schema & Scripts
├── 📖 docs/                   # Project Documentation
├── 🧪 __tests__/              # Test Suite
├── 🔧 scripts/                # Build & Utility Scripts
└── 📋 Configuration Files
```

## 📱 **App Directory** (`/app`)

Next.js 13+ App Router structure with API routes and pages.

```
app/
├── (auth)/                    # Authentication routes
│   └── login/
├── api/                       # API endpoints
│   ├── analyze/               # Document analysis
│   ├── chat/                  # AI chat functionality
│   ├── documents/             # Document management
│   ├── process/               # Document processing
│   ├── rag/                   # RAG operations
│   ├── stt/                   # Speech-to-text
│   ├── tts/                   # Text-to-speech
│   └── upload/                # File upload
├── auth/                      # Auth callbacks
├── calendar/                  # Calendar integration
├── chat/                      # Chat interface
├── dashboard/                 # Main dashboard
├── results/                   # Document results
├── search/                    # Search interface
├── settings/                  # User settings
└── upload/                    # File upload interface
```

## 🧩 **Components Directory** (`/components`)

Reusable UI components organized by functionality.

```
components/
├── ui/                        # Base UI components
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   └── ...
├── upload/                    # Upload-related components
│   ├── FileUploadArea.tsx
│   ├── FileList.tsx
│   └── UploadProgress.tsx
├── auth-modal.tsx             # Authentication modal
├── calendar-integration.tsx   # Calendar features
├── document-viewer.tsx        # Document display
├── navigation.tsx             # Main navigation
├── search-interface.tsx       # Search functionality
├── theme-provider.tsx         # Theme management
└── voice-chat.tsx             # Voice chat interface
```

## 📚 **Lib Directory** (`/lib`)

Core libraries, utilities, and business logic.

```
lib/
├── types/                     # TypeScript type definitions
│   ├── index.ts              # Core types
│   └── services.ts           # Service-specific types
├── services/                  # Business logic services
│   ├── documentService.ts    # Document operations
│   ├── google-calendar.ts    # Calendar integration
│   └── openai.ts             # OpenAI integration
├── processors/                # File processing utilities
│   ├── documentProcessor.ts  # Document parsing
│   └── audioProcessor.ts     # Audio processing
├── aiService.ts              # AI operations
├── auth.ts                   # Authentication utilities
├── global-storage.ts         # Global state management
├── ragService.ts             # RAG operations
├── supabase.ts               # Database client
├── supabase-browser.ts       # Browser database client
└── validation.ts             # Input validation
```

## 🗄️ **Database Directory** (`/database`)

Database schema, migrations, and maintenance scripts.

```
database/
├── migrations/                # Database migrations
│   ├── rag_schema.sql        # Original schema
│   ├── updated_schema.sql    # Complete schema
│   ├── migration_script.sql  # Full migration
│   └── step_by_step_migration.sql
├── scripts/                   # Database utilities
│   ├── check-tables.sql      # Table verification
│   ├── check-saved-document.sql
│   ├── test-rag-with-proper-vector.sql
│   └── fix-*.sql             # Various fixes
└── README.md                 # Database documentation
```

## 📖 **Docs Directory** (`/docs`)

Comprehensive project documentation.

```
docs/
├── guides/                    # Setup and configuration guides
│   ├── AWS_ENVIRONMENT_SETUP.md
│   ├── SUPABASE_SETUP_INSTRUCTIONS.md
│   ├── PRODUCTION_DEPLOYMENT.md
│   ├── SECURITY.md
│   └── PROJECT_OVERVIEW.md
├── development/               # Development documentation
│   ├── development_instructions_critical_issues.md
│   ├── development_instructions_high_priority_issues.md
│   └── PRE_PUSH_CHECKLIST.md
├── analysis/                  # Project analysis
│   ├── PM_SUMMARY.md
│   ├── strategic_recommendations.md
│   └── Comprehensive PM Report_ VoiceLoop HR Analysis.md
├── archive/                   # Legacy documentation
│   └── VoiceLoopHR Upgrade Instructions.md
├── openapi.yaml              # API documentation
└── README.md                 # Documentation index
```

## 🧪 **Test Directory** (`/__tests__`)

Comprehensive test suite with unit and integration tests.

```
__tests__/
├── api/                       # API endpoint tests
│   └── upload.test.ts
├── hooks/                     # React hook tests
│   └── useAuth.test.tsx
├── services/                  # Service layer tests
│   └── documentService.test.ts
├── utils/                     # Utility function tests
│   └── documentProcessor.test.ts
└── setup.ts                  # Test configuration
```

## 🔧 **Scripts Directory** (`/scripts`)

Build, deployment, and utility scripts.

```
scripts/
├── cleanup.js                # Pre-push cleanup
├── build.js                  # Build script
├── deploy.js                 # Deployment script
├── test.js                   # Test runner
├── lint.js                   # Linting script
└── migrate.js                # Database migration
```

## 📋 **Configuration Files**

Project configuration and environment setup.

```
├── package.json              # Dependencies and scripts
├── next.config.mjs           # Next.js configuration
├── tailwind.config.ts        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
├── jest.config.js            # Jest test configuration
├── postcss.config.mjs        # PostCSS configuration
├── components.json            # UI component configuration
├── vercel.json               # Vercel deployment configuration
├── amplify.yml               # AWS Amplify configuration
├── env.example               # Environment variables template
└── .gitignore                # Git ignore rules
```

## 🚀 **Key Features**

### **Frontend**
- **Next.js 13+** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **React Hooks** for state management
- **Responsive Design** for all devices

### **Backend**
- **API Routes** for serverless functions
- **Supabase** for database and authentication
- **OpenAI API** for AI features
- **File Processing** for document handling
- **RAG System** for semantic search

### **Database**
- **PostgreSQL** with pg_vector extension
- **Row Level Security** for data protection
- **Vector Search** for semantic similarity
- **Full-Text Search** for keyword matching
- **Audit Trail** for data tracking

### **Testing**
- **Jest** for unit testing
- **React Testing Library** for component testing
- **API Testing** for endpoint validation
- **Integration Tests** for full workflows

## 🔒 **Security Features**

- **Environment Variables** for sensitive data
- **Input Validation** with Zod schemas
- **Authentication** with Supabase Auth
- **Row Level Security** for database access
- **API Rate Limiting** for OpenAI requests
- **Error Handling** without data leakage

## 📈 **Performance Optimizations**

- **Code Splitting** with dynamic imports
- **Image Optimization** with Next.js
- **Caching** for API responses
- **Pagination** for large datasets
- **Batch Processing** for AI operations
- **Memory Management** with cleanup functions

---

**Last Updated**: September 2025  
**Version**: 2.0.0  
**Maintainer**: VoiceLoop HR Development Team
