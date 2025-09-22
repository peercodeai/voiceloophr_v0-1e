"use client"

import { useEffect, useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<'checking' | 'ok' | 'error'>('checking')

  useEffect(() => {
    const run = async () => {
      try {
        const supabase = getSupabaseBrowser()
        if (!supabase) {
          setStatus('error')
          return
        }
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          try {
            // Send message to parent window
            window.opener?.postMessage({ type: 'supabase-auth', ok: true }, '*')
            // Also try to redirect the parent window
            if (window.opener) {
              window.opener.location.href = '/'
            }
          } catch {}
          setStatus('ok')
          // Close the popup window
          setTimeout(() => {
            if (window.opener) {
              window.close()
            } else {
              // If no opener, redirect to home
              window.location.href = '/'
            }
          }, 1000)
        } else {
          setStatus('error')
        }
      } catch {
        setStatus('error')
      }
    }
    run()
  }, [])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column' }}>
      <div style={{ fontFamily: 'sans-serif', fontSize: 14, color: '#666', marginBottom: '20px' }}>
        {status === 'checking' && 'Completing sign in...'}
        {status === 'ok' && 'Signed in successfully!'}
        {status === 'error' && 'Authentication complete. You may close this window.'}
      </div>
      {status === 'ok' && (
        <button 
          onClick={() => {
            if (window.opener) {
              window.opener.location.href = '/'
              window.close()
            } else {
              window.location.href = '/'
            }
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Continue to App
        </button>
      )}
    </div>
  )
}


