import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import ShaderBackground from './ShaderBackground.jsx'
import { supabase } from '../../lib/supabase.js'

export default function AuthModal({ isOpen, onClose }) {
  const navigate = useNavigate()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [disclaimerOpen, setDisclaimerOpen] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (isSignUp && password !== confirmPassword) { setError('Passwords do not match'); return }
    setLoading(true)
    const { error: authError } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (authError) { setError(authError.message); return }
    onClose()
    setTimeout(() => navigate('/scan'), 300)
  }

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/scan' },
    })
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           style={{
             position: 'fixed',
             inset: 0,
             zIndex: 9999,
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'center',
             backgroundColor: 'rgba(0, 0, 0, 0.4)',
             backdropFilter: 'blur(4px)',
             willChange: 'opacity',
             isolation: 'isolate',
           }}
           onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.4, type: 'spring', bounce: 0.2 }}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 480,
              borderRadius: 16,
              overflow: 'hidden',
              border: '1px solid #ffffff',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <ShaderBackground />
            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.25)' }} />

            <div style={{ position: 'relative', zIndex: 1, padding: 40 }}>
              <h2
                style={{
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontSize: 32,
                  fontWeight: 600,
                  color: '#ffffff',
                  marginBottom: 8,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2
                }}
              >
                {isSignUp ? 'Create an account' : 'Welcome back'}
              </h2>
              <p
                style={{
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontSize: 15,
                  color: 'rgba(255, 255, 255, 0.65)',
                  marginBottom: 32,
                }}
              >
                {isSignUp ? 'Sign up to configure your security scans.' : 'Sign in to begin scanning.'}
              </p>

              <button
                type="button"
                onClick={() => loginWithGoogle()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  width: '100%',
                  backgroundColor: '#ffffff',
                  color: '#0a0a0a',
                  border: 'none',
                  borderRadius: 8,
                  padding: '14px 0',
                  fontFamily: 'system-ui, sans-serif',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  marginBottom: 24,
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = '#e5e5e5')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = '#ffffff')}
              >
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{display: 'block', width: '18px', height: '18px'}}>
                  <g>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    <path fill="none" d="M0 0h48v48H0z" />
                  </g>
                </svg>
                {isSignUp ? 'Sign up with Google' : 'Sign in with Google'}
              </button>

              {/* or email address divider — removed, Google OAuth only */}
              {/* <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
                <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
                <span style={{ color: 'rgba(255,255,255,0.5)', padding: '0 12px', fontSize: 13, fontFamily: 'system-ui, sans-serif' }}>or email address</span>
                <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
              </div> */}

              {/* email/password form — removed, Google OAuth only */}
              {/* <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                ...
              </form> */}

              {/* account toggle — removed, Google OAuth only */}
              {/* <div style={{ marginTop: 28, textAlign: 'center' }}>
                <button type="button" onClick={() => setIsSignUp(!isSignUp)} ...>
                  {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
                </button>
              </div> */}

              <motion.button
                type="button"
                onClick={() => setDisclaimerOpen(o => !o)}
                style={{
                  marginTop: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: disclaimerOpen ? '8px 8px 0 0' : 8,
                  padding: '14px 18px',
                  cursor: 'pointer',
                }}
              >
                <span style={{
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.85)',
                  letterSpacing: '0.01em',
                }}>
                  Disclaimer
                </span>
                <motion.span
                  animate={{ rotate: disclaimerOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, display: 'inline-block' }}
                >
                  ▾
                </motion.span>
              </motion.button>

              <AnimatePresence>
                {disclaimerOpen && (
                  <motion.div
                    key="disclaimer-body"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    style={{
                      overflow: 'hidden',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderTop: 'none',
                      borderRadius: '0 0 8px 8px',
                      backgroundColor: 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <p style={{
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      fontSize: 14,
                      color: 'rgba(255,255,255,0.6)',
                      margin: 0,
                      padding: '16px 18px',
                      lineHeight: 1.7,
                    }}>
                      <strong style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>Authorized Use Only.</strong>{' '}
                      Blindspot is a security scanning platform intended solely for use on systems you own or have received explicit written authorization to test. By signing in, you confirm that you accept full legal responsibility for all scans initiated through your account. Unauthorized scanning of third-party systems is prohibited and may violate applicable laws. This platform is provided for legitimate cybersecurity purposes only. Scan results may not be fully comprehensive or 100% accurate — Blindspot was built by four college computer science students and is not a substitute for a formal security audit.
                      <br /><br />
                      <strong style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>Best experienced on a desktop web browser.</strong>{' '}
                      This application is optimized for use in a modern desktop web browser. Mobile and tablet experiences may be limited.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
