"use client"

export default function TestEnvPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Environment Variables Test</h1>
      
      <div className="space-y-4">
        <div>
          <strong>NEXT_PUBLIC_SUPABASE_URL:</strong> 
          <span className="ml-2 font-mono bg-gray-100 p-1 rounded">
            {process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET'}
          </span>
        </div>
        
        <div>
          <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY:</strong> 
          <span className="ml-2 font-mono bg-gray-100 p-1 rounded">
            {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET (hidden)' : 'NOT SET'}
          </span>
        </div>
        
        <div>
          <strong>NODE_ENV:</strong> 
          <span className="ml-2 font-mono bg-gray-100 p-1 rounded">
            {process.env.NODE_ENV || 'NOT SET'}
          </span>
        </div>
      </div>
    </div>
  )
}
