import { useState, useEffect, useRef } from 'react'
import { X, Send, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react'

interface FeedbackModalProps {
  open: boolean
  onClose: () => void
}

export default function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      textareaRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    setStatus('sending')
    try {
      const res = await fetch('https://formspree.io/f/xlgwaajk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(name.trim() && { name: name.trim() }),
          ...(email.trim() && { email: email.trim() }),
          message,
          _subject: 'Stocky Analyse Feedback',
        }),
      })
      if (res.ok) {
        setStatus('sent')
        setTimeout(() => {
          onClose()
          setStatus('idle')
          setName('')
          setEmail('')
          setMessage('')
        }, 2000)
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} color="var(--accent)" />
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              Send Feedback
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X size={16} color="var(--text-secondary)" />
          </button>
        </div>

        {status === 'sent' ? (
          <div className="flex flex-col items-center py-8">
            <CheckCircle size={40} color="var(--accent-green)" />
            <p className="text-sm mt-3 font-medium" style={{ color: 'var(--accent-green)' }}>
              Thank you! Feedback received.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              className="modal-input"
              placeholder="Your name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              type="email"
              className="modal-input"
              placeholder="Your email (optional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <textarea
              ref={textareaRef}
              className="modal-input"
              placeholder="What's on your mind? Bug reports, feature requests, or general feedback..."
              rows={5}
              style={{ resize: 'vertical', minHeight: 100 }}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
            {status === 'error' && (
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--accent-red)' }}>
                <AlertCircle size={14} />
                Failed to send. Please try again.
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={!message.trim() || status === 'sending'}
                style={{ opacity: !message.trim() || status === 'sending' ? 0.5 : 1 }}
              >
                <Send size={14} />
                {status === 'sending' ? 'Sending...' : 'Send Feedback'}
              </button>
            </div>
            <p className="text-xs text-center pt-2" style={{ color: 'var(--text-muted)' }}>
              Add your name & email for calculating points against your Stocky Analyse access in the future
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
