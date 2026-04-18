import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import ShaderBackground from './ShaderBackground.jsx'

export default function AuthModal({ isOpen, onClose }) {
  const navigate = useNavigate()
  const [isSignUp, setIsSignUp] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    // Transition nicely rather than instantly
    onClose()
    setTimeout(() => navigate('/scan'), 300)
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
              maxWidth: 420,
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
                {isSignUp ? 'Sign up to configure your security scans.' : 'Log in to your account to continue scanning.'}
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24, width: '100%' }}>
                <GoogleLogin
                  onSuccess={(credentialResponse) => {
                    console.log("Login Success: ", credentialResponse)
                    onClose()
                    navigate('/scan')
                  }}
                  onError={() => {
                    console.log('Login Failed')
                  }}
                  theme="outline"
                  size="large"
                  width="340"
                  text={isSignUp ? 'signup_with' : 'signin_with'}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
                <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
                <span style={{ color: 'rgba(255,255,255,0.5)', padding: '0 12px', fontSize: 13, fontFamily: 'system-ui, sans-serif' }}>or email address</span>
                <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontFamily: 'system-ui, sans-serif', fontSize: 13, color: '#ffffff', fontWeight: 500, letterSpacing: '0.02em' }}>Email</label>
                  <input
                    type="email"
                    required
                    placeholder="you@company.com"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: 8,
                      padding: '12px 16px',
                      color: '#ffffff',
                      fontFamily: 'system-ui, sans-serif',
                      fontSize: 15,
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#ffffff')}
                    onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)')}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontFamily: 'system-ui, sans-serif', fontSize: 13, color: '#ffffff', fontWeight: 500, letterSpacing: '0.02em' }}>Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: 8,
                      padding: '12px 16px',
                      color: '#ffffff',
                      fontFamily: 'system-ui, sans-serif',
                      fontSize: 15,
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#ffffff')}
                    onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)')}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    marginTop: 12,
                    backgroundColor: '#ffffff',
                    color: '#0a0a0a',
                    border: 'none',
                    borderRadius: 8,
                    padding: '14px 0',
                    fontFamily: 'system-ui, sans-serif',
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: 'pointer',
                    width: '100%',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.target.style.backgroundColor = '#e5e5e5')}
                  onMouseLeave={(e) => (e.target.style.backgroundColor = '#ffffff')}
                >
                  {isSignUp ? 'Sign Up' : 'Log In'}
                </button>
              </form>

              <div style={{ marginTop: 28, textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontFamily: 'system-ui, sans-serif',
                    fontSize: 14,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    textUnderlineOffset: 4,
                  }}
                >
                  {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
