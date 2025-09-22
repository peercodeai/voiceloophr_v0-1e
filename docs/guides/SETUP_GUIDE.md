# VoiceLoop HR - Complete Setup Guide

This guide walks you through setting up VoiceLoop HR for local development and production deployment with Google OAuth and Supabase authentication.

## 🚀 Quick Start

1. **Copy environment file**: `cp env.example .env.local`
2. **Set up Supabase**: Create project and get credentials
3. **Set up Google OAuth**: Create OAuth client and configure redirects
4. **Deploy to Vercel**: Set environment variables and deploy

---

## 📋 Prerequisites

- [Node.js 18+](https://nodejs.org/)
- [pnpm](https://pnpm.io/) (or npm/yarn)
- [Supabase account](https://supabase.com/)
- [Google Cloud account](https://cloud.google.com/)
- [Vercel account](https://vercel.com/)

---

## 🔧 Step 1: Local Development Setup

### 1.1 Clone and Install
```bash
git clone <your-repo-url>
cd voiceloophr_v0-1e
pnpm install
```

### 1.2 Environment Variables
```bash
# Copy the example file
cp env.example .env.local

# Edit .env.local with your credentials
nano .env.local
```

**Required for local development:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GOOGLE_OAUTH_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-google-client-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 1.3 Run Locally
```bash
pnpm dev
```

---

## 🗄️ Step 2: Supabase Setup

### 2.1 Create Supabase Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Choose organization and enter project details
4. Wait for project to be created

### 2.2 Get Supabase Credentials
1. Go to **Settings** → **API**
2. Copy the following:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

### 2.3 Set Up Database Schema
1. Go to **SQL Editor**
2. Run the schema from `database/rag_schema.sql`:
```sql
-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document_chunks table for RAG
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  chunk_index INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own documents" ON documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" ON documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" ON documents
  FOR DELETE USING (auth.uid() = user_id);
```

---

## 🔐 Step 3: Google OAuth Setup

### 3.1 Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Enter project name and create

### 3.2 Enable Required APIs
1. Go to **APIs & Services** → **Library**
2. Enable these APIs:
   - **Google+ API**
   - **Google Drive API** (for file import)

### 3.3 Create OAuth 2.0 Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **"Create Credentials"** → **"OAuth 2.0 Client ID"**
3. Choose **"Web application"**
4. Add **Authorized Redirect URIs**:
   ```
   http://localhost:3000/auth/callback
   https://your-vercel-app.vercel.app/auth/callback
   https://your-project-id.supabase.co/auth/v1/callback
   ```
5. Copy **Client ID** and **Client Secret**

### 3.4 Configure Supabase Google Provider
1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → Your Project
2. Navigate to **Authentication** → **Providers**
3. Find **Google** and click **"Enable"**
4. Add your Google OAuth credentials:
   - **Client ID**: Your Google Client ID
   - **Client Secret**: Your Google Client Secret
5. Set **Redirect URL**: `https://your-vercel-app.vercel.app/auth/callback`

---

## 🚀 Step 4: Vercel Deployment

### 4.1 Deploy to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"New Project"**
3. Import your GitHub repository
4. Vercel will auto-detect Next.js settings

### 4.2 Set Environment Variables
1. Go to **Settings** → **Environment Variables**
2. Add all variables from your `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   GOOGLE_OAUTH_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   GOOGLE_OAUTH_CLIENT_SECRET=your-google-client-secret
   NEXT_PUBLIC_APP_URL=https://your-vercel-app.vercel.app
   OPENAI_API_KEY=sk-your-openai-key (optional)
   ELEVENLABS_API_KEY=your-elevenlabs-key (optional)
   ```

### 4.3 Update Google OAuth Redirect URIs
1. Go back to [Google Cloud Console](https://console.cloud.google.com/)
2. Edit your OAuth 2.0 Client ID
3. Add your actual Vercel URL to **Authorized Redirect URIs**:
   ```
   https://your-actual-vercel-url.vercel.app/auth/callback
   ```

---

## ✅ Step 5: Verification

### 5.1 Test Local Development
```bash
pnpm dev
# Open http://localhost:3000
# Try "Sign in with Google" button
```

### 5.2 Test Production
1. Visit your Vercel URL
2. Click **"Sign in with Google"**
3. Complete OAuth flow
4. Verify you're signed in

### 5.3 Test Features
- ✅ Upload a document
- ✅ View document analysis
- ✅ Use voice chat
- ✅ Save documents to database
- ✅ Search through documents

---

## 🔧 Troubleshooting

### Common Issues

**"Auth not configured" error:**
- Check that all Supabase environment variables are set
- Verify Supabase project is active

**Google OAuth redirect mismatch:**
- Ensure redirect URIs match exactly in Google Cloud Console
- Check that Vercel URL is correct

**"Failed to fetch file data" error:**
- Check Supabase service role key is set
- Verify database schema is created

**Document upload fails:**
- Check OpenAI API key is set
- Verify file size limits (100MB max)

### Debug Steps
1. Check Vercel function logs
2. Check browser console for errors
3. Verify all environment variables are set
4. Test with a simple document first

---

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

---

## 🆘 Support

If you encounter issues:
1. Check this guide first
2. Review error logs in Vercel dashboard
3. Check Supabase logs
4. Verify all environment variables are correctly set

---

**Happy coding! 🚀**
