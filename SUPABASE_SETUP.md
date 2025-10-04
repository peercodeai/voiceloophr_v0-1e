# Supabase Setup Guide for VoiceLoop HR

This guide will help you set up Supabase for the simplified VoiceLoop HR platform.

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - Name: `VoiceLoop HR`
   - Database Password: (generate a strong password)
   - Region: Choose closest to your users
5. Click "Create new project"

## 2. Get Your Credentials

Once your project is created, go to Settings > API:

1. Copy the **Project URL** 
2. Copy the **anon public** key
3. Copy the **service_role** key (keep this secret!)

## 3. Set Up Environment Variables

Create a `.env.local` file in your project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# OpenAI Configuration (Required for RAG and embeddings)
OPENAI_API_KEY=sk-your-openai-key

# Optional: Disable authentication for demo mode
NEXT_PUBLIC_DISABLE_AUTH=false
```

## 4. Set Up Database Schema

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Create a new query and run the following migrations in order:

#### Step 1: Enable RAG functionality
Copy and run the contents of `database/migrations/rag_schema.sql`

#### Step 2: Create employees and calendar tables
Copy and run the contents of `database/migrations/005_create_employees_and_calendar.sql`

### Option B: Using psql command line

```bash
# Connect to your Supabase database
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Run the migrations
\i database/migrations/rag_schema.sql
\i database/migrations/005_create_employees_and_calendar.sql
```

## 5. Configure Authentication

1. Go to Authentication > Settings in your Supabase dashboard
2. Under "Auth Providers", ensure "Email" is enabled
3. Optionally configure email templates under "Email Templates"
4. Set up any custom SMTP settings if needed

## 6. Set Up Row Level Security (RLS)

The migration files already include RLS policies, but you can verify them:

1. Go to Authentication > Policies in your Supabase dashboard
2. You should see policies for:
   - `document_chunks` table
   - `employees` table  
   - `calendar_events` table

## 7. Optional: Import Sample Data

To populate the employee database with sample data:

```bash
# Make sure your .env.local is configured
node scripts/import-employee-data.js
```

## 8. Test Your Setup

1. Start your development server:
   ```bash
   pnpm dev
   ```

2. Visit `http://localhost:3000`
3. Try creating an account and uploading a document
4. Check the Staff Dashboard to see the employee interface

## 9. Production Considerations

### Environment Variables for Production
- Update `NEXT_PUBLIC_APP_URL` to your production domain
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is kept secure
- Consider using separate Supabase projects for development and production

### Database Backups
- Enable automatic backups in Supabase dashboard
- Set up point-in-time recovery if needed

### Monitoring
- Monitor database usage in Supabase dashboard
- Set up alerts for high usage or errors

## Troubleshooting

### Common Issues

1. **"Invalid API key" error**
   - Double-check your environment variables
   - Ensure you're using the correct keys from Supabase dashboard

2. **Database connection issues**
   - Verify your Supabase URL is correct
   - Check if your IP is allowed (Supabase allows all IPs by default)

3. **RLS policy errors**
   - Ensure the migration files ran successfully
   - Check that policies exist in Authentication > Policies

4. **Vector extension not found**
   - The `rag_schema.sql` file includes `CREATE EXTENSION IF NOT EXISTS vector;`
   - If this fails, contact Supabase support

### Getting Help

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- [VoiceLoop HR Issues](https://github.com/your-repo/issues)

## Next Steps

After setting up Supabase:

1. ✅ Upload and process documents
2. ✅ Use semantic search across documents
3. ✅ Manage employees in the Staff Dashboard
4. ✅ Schedule interviews and manage calendar events
5. ✅ Use the smart intent parser for unified search

Your simplified VoiceLoop HR platform is now ready to use!
