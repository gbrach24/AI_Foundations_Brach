import { useState } from 'react'
import type { FormEvent, InputHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../lib/api'
import type { AuthUser } from '../lib/api'
import { useAuth } from '../lib/auth'
import { displayName } from '../lib/format'
import { Monogram } from '../components/Icons'

// Account forms backed by /api/auth/* (backend/main.py). Fields mirror the
// users table: first_name, last_name, email, and password (stored only as a hash).

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

type FieldErrors = Record<string, string>

function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="page auth-page">
      <div className="auth-shell">
        <aside className="auth-aside" aria-hidden="true">
          <Monogram size={64} />
          <p className="auth-aside-title">
            Your account, <em>your colors.</em>
          </p>
          <ul>
            <li>Chat history saved across visits</li>
            <li>A shop assistant that knows your name</li>
            <li>Bulldog pride, shipped anywhere</li>
          </ul>
          <div className="auth-aside-cheetah" />
        </aside>
        <div className="auth-card">
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  )
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  name: string
  error?: string
}

function Field({ label, name, error, ...inputProps }: FieldProps) {
  const errorId = `${name}-error`
  return (
    <label className={error ? 'has-error' : undefined}>
      {label}
      <input
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...inputProps}
      />
      {error && (
        <span id={errorId} className="field-error">
          {error}
        </span>
      )}
    </label>
  )
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p className="form-error" role="alert">
      {message}
    </p>
  )
}

/** Shown on /login and /create-account once someone is signed in. */
function SignedInCard({ user, heading }: { user: AuthUser; heading: string }) {
  const { logout } = useAuth()
  const [busy, setBusy] = useState(false)

  return (
    <AuthLayout title={heading} subtitle={`You’re signed in as ${user.email}.`}>
      <p className="success-note" role="status">
        ✓ Logged in as {user.name}
      </p>
      <div className="auth-actions">
        <Link to="/products" className="btn btn-primary full">
          Continue shopping
        </Link>
        <button
          className="btn btn-outline full"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            await logout().finally(() => setBusy(false))
          }}
        >
          Log out
        </button>
      </div>
    </AuthLayout>
  )
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.'
}

// ---------- Log in ----------

function validateLogin(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {}
  if (!email.trim()) errors.email = 'Email is required.'
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Enter a valid email address.'
  if (!password) errors.password = 'Password is required.'
  return errors
}

export function LoginPage() {
  const { user, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [attempted, setAttempted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [justLoggedIn, setJustLoggedIn] = useState(false)

  if (user) {
    return <SignedInCard user={user} heading={justLoggedIn ? `Welcome back, ${displayName(user)}!` : 'You’re logged in'} />
  }

  const errors = attempted ? validateLogin(email, password) : {}

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setAttempted(true)
    setFormError(null)
    if (Object.keys(validateLogin(email, password)).length > 0) return

    setSubmitting(true)
    try {
      await login(email.trim(), password)
      setJustLoggedIn(true)
    } catch (err) {
      setFormError(errorMessage(err))
      setPassword('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to your Campus Customs account.">
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <FormError message={formError} />
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          required
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          required
        />
        <button type="submit" className="btn btn-primary full" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="auth-switch">
        New here? <Link to="/create-account">Create an account</Link>
      </p>
    </AuthLayout>
  )
}

// ---------- Create account ----------

interface RegisterValues {
  first_name: string
  last_name: string
  email: string
  password: string
  confirm_password: string
}

const EMPTY_REGISTER: RegisterValues = { first_name: '', last_name: '', email: '', password: '', confirm_password: '' }

function validateRegister(values: RegisterValues): FieldErrors {
  const errors: FieldErrors = {}
  if (!values.first_name.trim()) errors.first_name = 'First name is required.'
  if (!values.last_name.trim()) errors.last_name = 'Last name is required.'
  if (!values.email.trim()) errors.email = 'Email is required.'
  else if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = 'Enter a valid email address, like name@yale.edu.'
  if (!values.password) errors.password = 'Password is required.'
  else if (values.password.length < MIN_PASSWORD_LENGTH)
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  if (!values.confirm_password) errors.confirm_password = 'Please confirm your password.'
  else if (values.password && values.confirm_password !== values.password)
    errors.confirm_password = 'Passwords do not match.'
  return errors
}

export function CreateAccountPage() {
  const { user, register } = useAuth()
  const [values, setValues] = useState<RegisterValues>(EMPTY_REGISTER)
  const [attempted, setAttempted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [serverFieldErrors, setServerFieldErrors] = useState<FieldErrors>({})
  const [justCreated, setJustCreated] = useState(false)

  if (user) {
    return (
      <SignedInCard
        user={user}
        heading={justCreated ? `Account created. Welcome, ${displayName(user)}!` : 'You’re already logged in'}
      />
    )
  }

  const errors = { ...serverFieldErrors, ...(attempted ? validateRegister(values) : {}) }

  function update(field: keyof RegisterValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setServerFieldErrors(({ [field]: _removed, ...rest }) => rest)
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setAttempted(true)
    setFormError(null)
    setServerFieldErrors({})
    if (Object.keys(validateRegister(values)).length > 0) {
      setFormError('Please fix the highlighted fields.')
      return
    }

    setSubmitting(true)
    try {
      await register({
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        email: values.email.trim(),
        password: values.password,
      })
      setValues(EMPTY_REGISTER)
      setJustCreated(true)
    } catch (err) {
      setFormError(errorMessage(err))
      if (err instanceof ApiError) setServerFieldErrors(err.fields)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Join the Campus Customs community.">
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <FormError message={formError} />
        <div className="form-row">
          <Field
            label="First name"
            name="first_name"
            autoComplete="given-name"
            value={values.first_name}
            onChange={(e) => update('first_name', e.target.value)}
            error={errors.first_name}
            required
          />
          <Field
            label="Last name"
            name="last_name"
            autoComplete="family-name"
            value={values.last_name}
            onChange={(e) => update('last_name', e.target.value)}
            error={errors.last_name}
            required
          />
        </div>
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(e) => update('email', e.target.value)}
          error={errors.email}
          required
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={(e) => update('password', e.target.value)}
          error={errors.password}
          required
        />
        <Field
          label="Confirm password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          value={values.confirm_password}
          onChange={(e) => update('confirm_password', e.target.value)}
          error={errors.confirm_password}
          required
        />
        <p className="field-hint">Use at least {MIN_PASSWORD_LENGTH} characters.</p>
        <button type="submit" className="btn btn-primary full" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="auth-switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </AuthLayout>
  )
}
