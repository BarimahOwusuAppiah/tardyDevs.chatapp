import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'
import { useAuthStore } from '../store/authStore'
import { Mail, Lock, Eye, EyeOff, ArrowRight, User, Phone } from 'lucide-react'
import { Logo } from '../components/Logo'

/* ─── Brand tokens ──────────────────────────────────────────────────────────
    #0F0F0F  Primary Background
    #202020  Surface / Card
    #5DD62C  Primary Accent
    #337418  Secondary Accent (hover)
    #F8F8F8  Text / Neutral
    ─────────────────────────────────────────────────────────────────────────── */

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  @keyframes tdFadeUp {
    from { opacity: 0; transform: translateY(28px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0)   scale(1);    }
  }
  @keyframes tdSpin {
    to { transform: rotate(360deg); }
  }
  @keyframes splashOrb1 {
    0%,100% { transform: translate(-50%, -50%) scale(1);    opacity: 0.7; }
    50%      { transform: translate(-50%, -50%) scale(1.15); opacity: 1;   }
  }
  @keyframes splashOrb2 {
    0%,100% { transform: translate(50%, 50%) scale(1);    opacity: 0.5; }
    50%      { transform: translate(50%, 50%) scale(1.2);  opacity: 0.8; }
  }

  /* ── Page ── */
  .td-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 16px;
    background: #0F0F0F;
    position: relative;
    overflow: hidden;
    font-family: 'Inter', system-ui, sans-serif;
  }

  /* ── Dot grid ── */
  .td-grid {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle, rgba(93,214,44,0.2) 1px, transparent 1px);
    background-size: 30px 30px;
    opacity: 0.18;
    pointer-events: none;
  }

  /* ── Ambient orbs ── */
  .td-orb-tl {
    position: absolute;
    top: 0; left: 0;
    width: 480px; height: 480px;
    background: radial-gradient(circle, rgba(93,214,44,0.18) 0%, transparent 65%);
    transform: translate(-50%, -50%);
    pointer-events: none;
    filter: blur(8px);
    animation: splashOrb1 5s ease-in-out infinite;
  }
  .td-orb-br {
    position: absolute;
    bottom: 0; right: 0;
    width: 420px; height: 420px;
    background: radial-gradient(circle, rgba(93,214,44,0.14) 0%, transparent 65%);
    transform: translate(50%, 50%);
    pointer-events: none;
    filter: blur(8px);
    animation: splashOrb2 6s ease-in-out infinite;
  }
  .td-orb-center {
    position: absolute;
    bottom: -40px; left: 50%;
    transform: translateX(-50%);
    width: 500px; height: 200px;
    background: radial-gradient(ellipse, rgba(93,214,44,0.22) 0%, transparent 70%);
    pointer-events: none;
    filter: blur(24px);
  }

  /* ── Decorative arc rings ── */
  .td-arc {
    position: absolute;
    border-radius: 50%;
    border: 1px solid rgba(93,214,44,0.12);
    pointer-events: none;
  }
  .td-arc-1 { width: 340px; height: 340px; top: -80px; left: -80px; }
  .td-arc-2 { width: 220px; height: 220px; bottom: 60px; right: -40px; }

  /* ── Card ── */
  .td-card {
    position: relative;
    z-index: 10;
    width: 100%;
    max-width: 420px;
    background: #202020;
    border: 1px solid rgba(93,214,44,0.2);
    border-radius: 24px;
    padding: 40px 36px 36px;
    box-shadow:
      0 0 0 1px rgba(93,214,44,0.06),
      0 32px 80px rgba(0,0,0,0.8),
      0 0 60px rgba(93,214,44,0.07);
    animation: tdFadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both;
  }

  /* top shimmer line */
  .td-card::before {
    content: '';
    position: absolute;
    top: 0; left: 15%; right: 15%;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(93,214,44,0.55), transparent);
    border-radius: 50%;
  }

  /* ── Logo area ── */
  .td-logo-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    margin-bottom: 24px;
  }
  .td-logo-icon {
    position: relative;
    width: 60px;
    height: 60px;
    margin-bottom: 2px;
  }
  .td-logo-icon-glow {
    position: absolute;
    inset: -10px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(93,214,44,0.3) 0%, transparent 70%);
    pointer-events: none;
  }
  .td-brand {
    display: flex;
    align-items: baseline;
    gap: 1px;
    line-height: 1;
  }
  .td-brand-white {
    font-size: 28px;
    font-weight: 800;
    color: #F8F8F8;
    letter-spacing: -0.02em;
  }
  .td-brand-green {
    font-size: 28px;
    font-weight: 800;
    color: #5DD62C;
    letter-spacing: -0.02em;
  }
  .td-tagline {
    font-size: 11px;
    letter-spacing: 0.2em;
    color: rgba(248,248,248,0.38);
    text-transform: uppercase;
    margin-top: 2px;
  }

  /* ── Divider ── */
  .td-divider {
    height: 1px;
    background: rgba(248,248,248,0.07);
    margin-bottom: 28px;
  }

  /* ── Heading ── */
  .td-heading {
    text-align: center;
    margin-bottom: 24px;
  }
  .td-heading h1 {
    font-size: 22px;
    font-weight: 700;
    color: #F8F8F8;
    margin: 0;
    letter-spacing: -0.01em;
  }
  .td-heading p {
    font-size: 14px;
    color: rgba(248,248,248,0.45);
    margin: 5px 0 0;
  }

  /* ── Error ── */
  .td-error {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 10px;
    background: rgba(239,68,68,0.1);
    border: 1px solid rgba(239,68,68,0.25);
    color: #f87171;
    font-size: 13px;
    margin-bottom: 20px;
  }

  /* ── Form ── */
  .td-form {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .td-field {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  .td-label {
    font-size: 13px;
    font-weight: 600;
    color: rgba(248,248,248,0.8);
    letter-spacing: 0.01em;
  }
  .td-input-wrap {
    position: relative;
  }
  .td-input-icon {
    position: absolute;
    left: 13px;
    top: 50%;
    transform: translateY(-50%);
    color: #5DD62C;
    opacity: 0.75;
    pointer-events: none;
    display: flex;
    align-items: center;
  }
  .td-input {
    width: 100%;
    padding: 13px 14px 13px 42px;
    background: rgba(15,15,15,0.9);
    border: 1.5px solid rgba(93,214,44,0.2);
    border-radius: 12px;
    color: #F8F8F8;
    font-size: 14px;
    font-family: inherit;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
    box-sizing: border-box;
  }
  .td-input::placeholder { color: rgba(248,248,248,0.25); }
  .td-input:focus {
    border-color: #5DD62C;
    box-shadow: 0 0 0 3px rgba(93,214,44,0.12);
  }
  .td-input-pr { padding-right: 44px; }

  .td-eye-btn {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    color: rgba(248,248,248,0.3);
    display: flex;
    align-items: center;
    padding: 2px;
    transition: color 0.15s;
  }
  .td-eye-btn:hover { color: #5DD62C; }

  /* ── Remember / Forgot row ── */
  .td-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .td-check-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    user-select: none;
  }
  .td-checkbox {
    width: 18px;
    height: 18px;
    border-radius: 5px;
    border: 1.5px solid rgba(93,214,44,0.45);
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.15s, border-color 0.15s;
  }
  .td-checkbox.on {
    background: #5DD62C;
    border-color: #5DD62C;
  }
  .td-check-text {
    font-size: 13px;
    color: rgba(248,248,248,0.75);
  }
  .td-forgot {
    font-size: 13px;
    font-weight: 600;
    color: #5DD62C;
    text-decoration: none;
    transition: color 0.15s;
  }
  .td-forgot:hover { color: #337418; }

  /* ── Primary button ── */
  .td-btn-primary {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px 20px;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 700;
    font-family: inherit;
    color: #0F0F0F;
    background: linear-gradient(135deg, #5DD62C 0%, #337418 100%);
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 24px rgba(93,214,44,0.4), inset 0 1px 0 rgba(255,255,255,0.15);
    transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
    letter-spacing: 0.01em;
  }
  .td-btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(93,214,44,0.55), inset 0 1px 0 rgba(255,255,255,0.15);
  }
  .td-btn-primary:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 2px 12px rgba(93,214,44,0.3);
  }
  .td-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

  /* ── Spinner ── */
  .td-spinner {
    width: 18px;
    height: 18px;
    border: 2.5px solid rgba(15,15,15,0.3);
    border-top-color: #0F0F0F;
    border-radius: 50%;
    animation: tdSpin 0.7s linear infinite;
  }

  /* ── Or divider ── */
  .td-or {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .td-or-line {
    flex: 1;
    height: 1px;
    background: rgba(248,248,248,0.09);
  }
  .td-or-text {
    font-size: 12px;
    color: rgba(248,248,248,0.3);
    white-space: nowrap;
  }

  /* ── Google button ── */
  .td-btn-google {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 13px 20px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 500;
    font-family: inherit;
    color: #F8F8F8;
    background: rgba(248,248,248,0.04);
    border: 1.5px solid rgba(248,248,248,0.12);
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s, transform 0.15s;
  }
  .td-btn-google:hover {
    background: rgba(248,248,248,0.08);
    border-color: rgba(248,248,248,0.22);
    transform: translateY(-1px);
  }
  .td-btn-google:active { transform: translateY(0); }

  /* ── Footer ── */
  .td-footer {
    text-align: center;
    font-size: 13px;
    color: rgba(248,248,248,0.4);
    margin-top: 24px;
  }
  .td-footer-link {
    color: #5DD62C;
    font-weight: 600;
    text-decoration: none;
    transition: color 0.15s;
  }
  .td-footer-link:hover { color: #337418; }

  /* ── Responsive ── */
  @media (max-width: 480px) {
    .td-card { padding: 32px 22px 28px; border-radius: 20px; }
    .td-brand-white, .td-brand-green { font-size: 24px; }
  }
`

export const LoginPage: React.FC<{ defaultRegister?: boolean }> = ({ defaultRegister = false }) => {
  const [isRegister, setIsRegister] = useState(defaultRegister)
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [username, setUsername]         = useState('')
  const [phoneNumber, setPhoneNumber]   = useState('')
  const [dateOfBirth, setDateOfBirth]   = useState('')
  const [gender, setGender]             = useState<'male' | 'female' | ''>('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe]     = useState(false)
  const [error, setError]               = useState('')
  const [isLoading, setIsLoading]       = useState(false)
  const navigate = useNavigate()
  const setUser  = useAuthStore((state) => state.setUser)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    try {
      if (isRegister) {
        const { user } = await authService.signUp(email, password, username)
        if (user) {
          setUser({
            id: user.id,
            email: user.email || '',
            username: username,
          })
          navigate('/chat')
        }
      } else {
        const { user } = await authService.signIn(email, password)
        if (user) {
          setUser({
            id: user.id,
            email: user.email || '',
            username: user.user_metadata?.username || '',
          })
          navigate('/chat')
        }
      }
    } catch (err: any) {
      setError(err.message || (isRegister ? 'Failed to create account' : 'Failed to sign in'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <style>{CSS}</style>

      <div className="td-page">
        {/* Dot grid */}
        <div className="td-grid" />

        {/* Ambient orbs */}
        <div className="td-orb-tl" />
        <div className="td-orb-br" />
        <div className="td-orb-center" />

        {/* Arc rings */}
        <div className="td-arc td-arc-1" />
        <div className="td-arc td-arc-2" />

        {/* ── Card ── */}
        <div className="td-card">

          {/* Logo */}
          <div className="td-logo-wrap">
            <div className="td-logo-icon">
              <div className="td-logo-icon-glow" />
              <Logo size={60} />
            </div>

            <div className="td-brand">
              <span className="td-brand-white">tardy</span>
              <span className="td-brand-green">Devs</span>
            </div>

            <p className="td-tagline">Build · Ship · Repeat</p>
          </div>

          {/* Divider */}
          <div className="td-divider" />

          {/* Heading */}
          <div className="td-heading">
            <h1>{isRegister ? 'Create Account' : 'Welcome back'}</h1>
            <p>{isRegister ? 'Join tardyDevs Chat today' : 'Sign in to your account'}</p>
          </div>

          {/* Error */}
          {error && (
            <div className="td-error">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="7" stroke="#f87171" strokeWidth="1.5"/>
                <path d="M8 5v3.5M8 11h.01" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="td-form">

            {/* Username (Register only) */}
            {isRegister && (
              <div className="td-field">
                <label htmlFor="register-username" className="td-label">Username</label>
                <div className="td-input-wrap">
                  <span className="td-input-icon">
                    <User size={16} aria-hidden="true" />
                  </span>
                  <input
                    id="register-username"
                    type="text"
                    autoComplete="username"
                    placeholder="johndoe"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="td-input"
                  />
                </div>
              </div>
            )}

            {/* Phone Number (Register only) */}
            {isRegister && (
              <div className="td-field">
                <label htmlFor="register-phone" className="td-label">Phone Number</label>
                <div className="td-input-wrap">
                  <span className="td-input-icon">
                    <Phone size={16} aria-hidden="true" />
                  </span>
                  <input
                    id="register-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+1 (555) 123-4567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="td-input"
                  />
                </div>
              </div>
            )}

            {/* Date of Birth (Register only) */}
            {isRegister && (
              <div className="td-field">
                <label htmlFor="register-dob" className="td-label">Date of Birth</label>
                <input
                  id="register-dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="td-input"
                  style={{ paddingLeft: '14px' }}
                />
              </div>
            )}

            {/* Gender (Register only) */}
            {isRegister && (
              <div className="td-field">
                <label className="td-label">Gender</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label className="td-check-label" style={{ marginBottom: 0 }}>
                    <div
                      className={`td-checkbox${gender === 'male' ? ' on' : ''}`}
                      role="radio"
                      aria-checked={gender === 'male'}
                      tabIndex={0}
                      onClick={() => setGender('male')}
                      onKeyDown={(e) => e.key === ' ' && setGender('male')}
                    >
                      {gender === 'male' && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                          <path d="M1.5 5L4 7.5L8.5 2.5" stroke="#0F0F0F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span className="td-check-text">Male</span>
                  </label>
                  <label className="td-check-label" style={{ marginBottom: 0 }}>
                    <div
                      className={`td-checkbox${gender === 'female' ? ' on' : ''}`}
                      role="radio"
                      aria-checked={gender === 'female'}
                      tabIndex={0}
                      onClick={() => setGender('female')}
                      onKeyDown={(e) => e.key === ' ' && setGender('female')}
                    >
                      {gender === 'female' && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                          <path d="M1.5 5L4 7.5L8.5 2.5" stroke="#0F0F0F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span className="td-check-text">Female</span>
                  </label>
                </div>
              </div>
            )}

            {/* Email */}
            <div className="td-field">
              <label htmlFor="login-email" className="td-label">Email</label>
              <div className="td-input-wrap">
                <span className="td-input-icon">
                  <Mail size={16} aria-hidden="true" />
                </span>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="td-input"
                />
              </div>
            </div>

            {/* Password */}
            <div className="td-field">
              <label htmlFor="login-password" className="td-label">Password</label>
              <div className="td-input-wrap">
                <span className="td-input-icon">
                  <Lock size={16} aria-hidden="true" />
                </span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="td-input td-input-pr"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(!showPassword)}
                  className="td-eye-btn"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember me + Forgot password (Login only) */}
            {!isRegister && (
              <div className="td-row">
                <label className="td-check-label" onClick={() => setRememberMe(!rememberMe)}>
                  <div
                    className={`td-checkbox${rememberMe ? ' on' : ''}`}
                    role="checkbox"
                    aria-checked={rememberMe}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === ' ' && setRememberMe(!rememberMe)}
                  >
                    {rememberMe && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                        <path d="M1.5 5L4 7.5L8.5 2.5" stroke="#0F0F0F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <span className="td-check-text">Remember me</span>
                </label>

                <a href="/forgot-password" className="td-forgot">
                  Forgot password?
                </a>
              </div>
            )}

            {/* Submit button */}
            <button type="submit" disabled={isLoading} className="td-btn-primary">
              {isLoading
                ? <span className="td-spinner" />
                : <><span>{isRegister ? 'Create Account' : 'Sign In'}</span><ArrowRight size={16} aria-hidden="true" /></>
              }
            </button>

            {/* Or divider (Login only) */}
            {!isRegister && (
              <>
                <div className="td-or">
                  <div className="td-or-line" />
                  <span className="td-or-text">or continue with</span>
                  <div className="td-or-line" />
                </div>

                {/* Google */}
                <button type="button" className="td-btn-google">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                    <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                  Sign in with Google
                </button>
              </>
            )}
          </form>

          {/* Footer */}
          <p className="td-footer">
            {isRegister ? 'Already have an account?' : "Don't have an account?"} {' '}
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister)
                setError('')
                setPassword('')
                setUsername('')
                setPhoneNumber('')
                setDateOfBirth('')
                setGender('')
              }}
              className="td-footer-link"
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              {isRegister ? 'Sign in' : 'Create one'}
            </button>
          </p>
        </div>
      </div>
    </>
  )
}
