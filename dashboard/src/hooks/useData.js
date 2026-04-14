import { useState, useEffect } from 'react'

// If the API server is running, use it. Otherwise fall back to static JSON files.
const API_BASE = import.meta.env.VITE_API_URL ?? ''

async function fetchWithFallback(apiPath, staticPath) {
  try {
    const res = await fetch(`${API_BASE}${apiPath}`, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) throw new Error(`API ${res.status}`)
    return await res.json()
  } catch {
    console.warn(`API unavailable (${apiPath}), falling back to static file`)
    const res = await fetch(staticPath)
    if (!res.ok) throw new Error(`Static fallback failed: ${staticPath}`)
    return res.json()
  }
}

export function useData() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [source,  setSource]  = useState(null) // 'api' | 'static'

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        // Try API first for both data and rates, fall back to static JSON
        const [dataRes, ratesRes] = await Promise.all([
          fetchWithFallback('/api/data',  '/data.json'),
          fetchWithFallback('/api/rates', '/rates.json'),
        ])

        if (cancelled) return

        setData({ ...dataRes, rates: ratesRes })
        setSource(dataRes._source || 'api')
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  return { data, loading, error, source }
}
