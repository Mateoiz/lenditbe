'use client'

import { useEffect, useState } from 'react'

const phrases = [
  'Track every borrower.',
  'Schedule every payment.',
  'Collect on time, every time.',
  'See your whole portfolio at a glance.',
]

export default function CyclingPhrase() {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      const timeout = setTimeout(() => {
        setIndex((i) => (i + 1) % phrases.length)
        setVisible(true)
      }, 300)
      return () => clearTimeout(timeout)
    }, 2600)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className="font-mono text-sm mb-2 h-5 transition-opacity duration-300"
      style={{ color: '#2563EB', opacity: visible ? 1 : 0 }}
    >
      {phrases[index]}
    </div>
  )
}