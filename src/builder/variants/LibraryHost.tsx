import { Suspense, lazy } from 'react'
import { useLibrary } from './libraryState'

const DesignLibrary = lazy(() => import('./DesignLibrary'))
const Gallery = lazy(() => import('./Gallery'))
const query = new URLSearchParams(window.location.search)

/** Mounts the (lazily loaded) design library while it is open; `?gallery=<kind>` opens the design review page. */
export function LibraryHost() {
  const state = useLibrary()
  return (
    <Suspense fallback={null}>
      {state && <DesignLibrary state={state} />}
      {query.get('gallery') && <Gallery query={query} />}
    </Suspense>
  )
}
