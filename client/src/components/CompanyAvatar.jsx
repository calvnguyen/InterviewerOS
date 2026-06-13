import { useState } from 'react'

const COLOR_PALETTE = [
  'bg-indigo-500',
  'bg-sky-500',
  'bg-amber-500',
  'bg-green-500',
  'bg-rose-500',
  'bg-violet-500',
  'bg-orange-500',
  'bg-teal-500',
]

function hashString(str) {
  if (!str) return 0
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

function getInitials(company) {
  if (!company) return '?'
  const words = company.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0][0].toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

const SIZE_CLASSES = {
  sm: 'h-6 w-6 text-[9px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-12 w-12 text-sm',
}

export default function CompanyAvatar({ company = '', domain, size = 'md' }) {
  const [imgError, setImgError] = useState(false)

  const colorClass = COLOR_PALETTE[hashString(company) % COLOR_PALETTE.length]
  const initials = getInitials(company)
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md

  const showImg = domain && !imgError

  return (
    <div
      className={`${sizeClass} ${showImg ? 'bg-white border border-slate-100' : colorClass} rounded-lg flex items-center justify-center shrink-0 overflow-hidden`}
      title={company}
    >
      {showImg ? (
        <img
          src={`https://logo.dev/${domain}?token=pk_B2oNLU6tQpqQjSC5GjJSFQ`}
          alt={company}
          className="w-full h-full object-contain"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="font-bold text-white leading-none">{initials}</span>
      )}
    </div>
  )
}
