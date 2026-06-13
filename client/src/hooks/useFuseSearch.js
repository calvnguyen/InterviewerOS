import { useMemo } from 'react'
import Fuse from 'fuse.js'

const FUSE_OPTIONS = {
  keys: [
    { name: 'company', weight: 0.4 },
    { name: 'role', weight: 0.3 },
    { name: 'notes', weight: 0.2 },
    { name: 'email_subject', weight: 0.05 },
    { name: 'email_snippet', weight: 0.05 },
  ],
  threshold: 0.4,
  includeMatches: true,
  minMatchCharLength: 2,
}

export function useFuseSearch(applications, query) {
  const fuse = useMemo(() => new Fuse(applications, FUSE_OPTIONS), [applications])

  return useMemo(() => {
    const q = query.trim()
    if (q.length < 2) return []
    return fuse.search(q).slice(0, 8)
  }, [fuse, query])
}
