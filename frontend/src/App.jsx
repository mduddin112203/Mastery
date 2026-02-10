import { BrowserRouter as Router } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './services/supabase'

function App() {
  const [status, setStatus] = useState('checking...')

  useEffect(() => {
    // quick check that supabase is reachable
    supabase.from('profiles').select('id').limit(1)
      .then(({ error }) => {
        if (error) setStatus('connected (tables may not be set up yet)')
        else setStatus('connected')
      })
      .catch(() => setStatus('failed to connect'))
  }, [])

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <h1 className="text-3xl font-bold text-center pt-20 text-indigo-600">
          Mastery
        </h1>
        <p className="text-center mt-4 text-slate-500">
          Daily practice for tech interviews
        </p>
        <p className="text-center mt-2 text-sm text-slate-400">
          Supabase: {status}
        </p>
      </div>
    </Router>
  )
}

export default App
