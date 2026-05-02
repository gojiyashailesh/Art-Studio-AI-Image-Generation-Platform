import { useEffect, useState } from 'react'
import { getCurrentUser, signIn, signUp } from './api.js'
import { AuthPage } from './pages/AuthPage.jsx'
import { ThumbnailStudioPage } from './pages/ThumbnailStudioPage.jsx'
import { ROUTES, getRouteByPath, normalizePath } from './routes.js'
import './App.css'

const AUTH_TOKEN_KEY = 'thumbnail-auth-token'

function readAuthToken() {
  try {
    return window.localStorage.getItem(AUTH_TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

function writeAuthToken(value) {
  try {
    if (value) {
      window.localStorage.setItem(AUTH_TOKEN_KEY, value)
    } else {
      window.localStorage.removeItem(AUTH_TOKEN_KEY)
    }
  } catch {
    // Ignore storage errors and keep the in-memory state as the fallback.
  }
}

function commitNavigation(pathname, setPathname, replace = false) {
  const nextPath = normalizePath(pathname)
  if (nextPath === normalizePath(window.location.pathname)) return
  const method = replace ? 'replaceState' : 'pushState'
  window.history[method]({}, '', nextPath)
  setPathname(nextPath)
}

export default function App() {
  const [pathname, setPathname] = useState(() =>
    normalizePath(window.location.pathname),
  )
  const [authToken, setAuthToken] = useState(() => readAuthToken())
  const [currentUser, setCurrentUser] = useState(null)
  const [authNotice, setAuthNotice] = useState('')

  useEffect(() => {
    const current = normalizePath(window.location.pathname)
    const resolved = getRouteByPath(current) ? current : ROUTES.auth

    if (resolved === ROUTES.generator && !readAuthToken()) {
      setAuthNotice('Create an account first. The studio unlocks after sign up.')
      window.history.replaceState({}, '', ROUTES.auth)
      setPathname(ROUTES.auth)
    } else {
      if (resolved !== current) {
        window.history.replaceState({}, '', resolved)
      }
      setPathname(resolved)
    }

    const handlePopState = () => {
      const nextPath = normalizePath(window.location.pathname)
      const safePath = getRouteByPath(nextPath) ? nextPath : ROUTES.auth
      if (safePath === ROUTES.generator && !readAuthToken()) {
        setAuthToken('')
        setCurrentUser(null)
        setAuthNotice('Create an account first. The studio unlocks after sign up.')
        window.history.replaceState({}, '', ROUTES.auth)
        setPathname(ROUTES.auth)
        return
      }

      setAuthNotice('')
      setPathname(safePath)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (!authToken) {
      setCurrentUser(null)
      return undefined
    }

    let cancelled = false

    getCurrentUser(authToken)
      .then((user) => {
        if (!cancelled) setCurrentUser(user)
      })
      .catch(() => {
        if (cancelled) return
        setAuthToken('')
        setCurrentUser(null)
        writeAuthToken('')
        setAuthNotice('Please sign in again to access the studio.')
        if (normalizePath(window.location.pathname) === ROUTES.generator) {
          commitNavigation(ROUTES.auth, setPathname, true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [authToken])

  const handleAuthSuccess = (authResponse) => {
    setAuthToken(authResponse.access_token)
    setCurrentUser(authResponse.user)
    writeAuthToken(authResponse.access_token)
    setAuthNotice('')
    commitNavigation(ROUTES.generator, setPathname)
  }

  const currentRoute = getRouteByPath(pathname) ?? getRouteByPath(ROUTES.auth)

  return (
    <div
      className={
        currentRoute.path === ROUTES.generator ? 'shell' : 'shell shell--auth'
      }
    >
      <main className="shell__main">
        {currentRoute.path === ROUTES.generator ? (
          <ThumbnailStudioPage authToken={authToken} currentUser={currentUser} />
        ) : (
          <AuthPage
            notice={authNotice}
            onClearNotice={() => setAuthNotice('')}
            onSignIn={async (payload) => {
              const authResponse = await signIn(payload)
              handleAuthSuccess(authResponse)
            }}
            onSignUp={async (payload) => {
              const authResponse = await signUp(payload)
              handleAuthSuccess(authResponse)
            }}
          />
        )}
      </main>
    </div>
  )
}
