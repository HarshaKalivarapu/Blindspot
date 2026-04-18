import { useState, useRef, useEffect } from 'react'
import WarningModal from '../components/WarningModal'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:5000'

function Scan() {
  const [showWarning, setShowWarning] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Scanner ready. Describe a target or ask a question to begin.',
    },
  ])
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || sending) return
    setMessages((m) => [...m, { role: 'user', text: trimmed }])
    setInput('')
    setSending(true)
    try {
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      })
      const data = await res.json()
      const reply = res.ok
        ? data.reply ?? '(empty response)'
        : `Error: ${data.error ?? res.statusText}`
      setMessages((m) => [...m, { role: 'assistant', text: reply }])
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: `Network error: ${err.message}` },
      ])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Recon Console
            </h1>
            <p className="text-xs text-slate-400">
              {authorized
                ? 'Active scanning authorized'
                : 'Awaiting authorization'}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              authorized
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-amber-500/10 text-amber-400'
            }`}
          >
            {authorized ? 'AUTHORIZED' : 'LOCKED'}
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-6">
        <div
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/40 p-4"
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${
                m.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-100'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSend} className="mt-4 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              authorized ? 'Send a message...' : 'Authorize to enable input'
            }
            disabled={!authorized || sending}
            className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm placeholder-slate-500 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!authorized || sending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </main>

      {showWarning && (
        <WarningModal
          onConfirm={() => {
            setAuthorized(true)
            setShowWarning(false)
          }}
          onCancel={() => {
            setAuthorized(false)
            setShowWarning(false)
          }}
        />
      )}
    </div>
  )
}

export default Scan
