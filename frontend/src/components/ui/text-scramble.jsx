import { useState, useCallback, useRef, useEffect } from "react"

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*"

export function TextScramble({ text, delay = 0 }) {
  const [displayText, setDisplayText] = useState("")
  const [isScrambling, setIsScrambling] = useState(false)
  const intervalRef = useRef(null)
  const frameRef = useRef(0)

  const scramble = useCallback(() => {
    setIsScrambling(true)
    frameRef.current = 0
    const duration = text.length * 3

    if (intervalRef.current) clearInterval(intervalRef.current)

    intervalRef.current = setInterval(() => {
      frameRef.current++
      const progress = frameRef.current / duration
      const revealedLength = Math.floor(progress * text.length)

      const newText = text
        .split("")
        .map((char, i) => {
          if (char === " ") return " "
          if (i < revealedLength) return text[i]
          return CHARS[Math.floor(Math.random() * CHARS.length)]
        })
        .join("")

      setDisplayText(newText)

      if (frameRef.current >= duration) {
        clearInterval(intervalRef.current)
        setDisplayText(text)
        setIsScrambling(false)
      }
    }, 30)
  }, [text])

  useEffect(() => {
    const timer = setTimeout(scramble, delay)
    return () => {
      clearTimeout(timer)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [scramble, delay])

  return (
    <span style={{ fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit', letterSpacing: 'inherit', color: 'inherit' }}>
      {displayText.split("").map((char, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            transition: 'color 150ms ease, transform 150ms ease',
            transitionDelay: `${i * 10}ms`,
            color: isScrambling && char !== text[i] ? 'rgba(22, 163, 74, 0.95)' : 'inherit',
            transform: isScrambling && char !== text[i] ? 'scale(1.1)' : 'scale(1)',
          }}
        >
          {char || '\u00A0'}
        </span>
      ))}
    </span>
  )
}
