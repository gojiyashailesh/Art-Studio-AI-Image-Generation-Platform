import { useEffect, useState } from 'react'
import { Card } from '../components/ui/Card.jsx'
import { Input } from '../components/ui/Input.jsx'
import './auth-page.css'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function AuthPage({
  notice,
  onClearNotice,
  onSignIn,
  onSignUp,
}) {
  const [mode, setMode] = useState('signin')
  const [feedback, setFeedback] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signinEmail, setSigninEmail] = useState('')
  const [signinPassword, setSigninPassword] = useState('')

  useEffect(() => {
    if (!notice) return
    setFeedback('')
    setMode('signin')
  }, [notice])

  const validateSignup = () => {
    const name = signupName.trim()
    const email = signupEmail.trim().toLowerCase()
    const password = signupPassword

    if (name.length < 2) return 'Name must be at least 2 characters.'
    if (!EMAIL_RE.test(email)) return 'Enter a valid email address.'
    if (password.length < 8) return 'Password must be at least 8 characters.'
    if (!/[a-z]/.test(password)) return 'Password must include lowercase.'
    if (!/[A-Z]/.test(password)) return 'Password must include uppercase.'
    if (!/\d/.test(password)) return 'Password must include a number.'
    return ''
  }

  const validateSignIn = () => {
    const email = signinEmail.trim().toLowerCase()
    if (!EMAIL_RE.test(email)) return 'Enter a valid email address.'
    if (!signinPassword) return 'Enter your password.'
    return ''
  }

  const handleSignUp = async (event) => {
    event.preventDefault()
    const validationError = validateSignup()
    if (validationError) {
      setFeedback(validationError)
      return
    }

    setIsSubmitting(true)
    setFeedback('')
    onClearNotice?.()

    try {
      await onSignUp?.({
        name: signupName.trim(),
        email: signupEmail.trim().toLowerCase(),
        password: signupPassword,
      })
    } catch (error) {
      setFeedback(error.message || 'Could not create account.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSignIn = async (event) => {
    event.preventDefault()
    const validationError = validateSignIn()
    if (validationError) {
      setFeedback(validationError)
      return
    }

    setIsSubmitting(true)
    setFeedback('')
    onClearNotice?.()

    try {
      await onSignIn?.({
        email: signinEmail.trim().toLowerCase(),
        password: signinPassword,
      })
    } catch (error) {
      setFeedback(error.message || 'Could not sign in.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-page__logo-panel">
        <img
          className="auth-page__logo-image"
          src="/Imagination to Reality.svg"
          alt="Imagination to Reality"
        />
      </div>

      <Card
        className={`auth-card${
          mode === 'signup' ? ' auth-card--right-panel-active' : ''
        }`}
      >
        <div className="auth-card__form-pane auth-card__form-pane--signup">
          <form className="auth-form" onSubmit={handleSignUp}>
            <h1 className="auth-card__title">Create Account</h1>
            <Input
              type="text"
              placeholder="Name"
              autoComplete="name"
              value={signupName}
              onChange={(event) => setSignupName(event.target.value)}
              required
            />
            <Input
              type="email"
              placeholder="Email"
              autoComplete="email"
              value={signupEmail}
              onChange={(event) => setSignupEmail(event.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              autoComplete="new-password"
              value={signupPassword}
              onChange={(event) => setSignupPassword(event.target.value)}
              required
            />
            <button type="submit" className="auth-button" disabled={isSubmitting}>
              {isSubmitting && mode === 'signup' ? 'Creating...' : 'Sign Up'}
            </button>
          </form>
        </div>

        <div className="auth-card__form-pane auth-card__form-pane--signin">
          <form className="auth-form" onSubmit={handleSignIn}>
            <h1 className="auth-card__title">Sign In</h1>
            <Input
              type="email"
              placeholder="Email"
              autoComplete="email"
              value={signinEmail}
              onChange={(event) => setSigninEmail(event.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              value={signinPassword}
              onChange={(event) => setSigninPassword(event.target.value)}
              required
            />
            <button type="button" className="auth-form__forgot">
              Forgot your password?
            </button>
            <button type="submit" className="auth-button" disabled={isSubmitting}>
              {isSubmitting && mode === 'signin' ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <div className="auth-card__overlay-shell" aria-hidden="true">
          <div className="auth-card__overlay">
            <div className="auth-card__overlay-panel auth-card__overlay-panel--left">
              <h1 className="auth-card__eyebrow">Welcome Back!</h1>
              <p className="auth-card__body">
                To keep connected with us please login with your personal info.
              </p>
              <button
                type="button"
                className="auth-button auth-button--ghost"
                onClick={() => {
                  setMode('signin')
                  setFeedback('')
                  onClearNotice?.()
                }}
              >
                Sign In
              </button>
            </div>

            <div className="auth-card__overlay-panel auth-card__overlay-panel--right">
              <h1 className="auth-card__eyebrow">Hello, Friend!</h1>
              <p className="auth-card__body">
                Enter your personal details and start your journey with us.
              </p>
              <button
                type="button"
                className="auth-button auth-button--ghost"
                onClick={() => {
                  setMode('signup')
                  setFeedback('')
                  onClearNotice?.()
                }}
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </Card>

      {(notice || feedback) && (
        <p className="auth-page__notice">{notice || feedback}</p>
      )}

      <div className="auth-page__mobile-switch">
        <span className="auth-page__mobile-label">
          {mode === 'signin'
            ? 'Need a new account?'
            : 'Already have an account?'}
        </span>
        <button
          type="button"
          className="auth-page__mobile-toggle"
          onClick={() => {
            setMode((current) => (current === 'signin' ? 'signup' : 'signin'))
            setFeedback('')
            onClearNotice?.()
          }}
        >
          {mode === 'signin' ? 'Sign Up' : 'Sign In'}
        </button>
      </div>
    </section>
  )
}
