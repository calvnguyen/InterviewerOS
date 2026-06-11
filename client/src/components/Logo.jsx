export default function Logo({ size = 30 }) {
  const radius = Math.round(size * 0.22)
  const iconScale = size / 64

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx={radius / iconScale} fill="#6366f1" />
      <rect x="12" y="6" width="36" height="44" rx="5" stroke="white" strokeWidth="3.5" />
      <path d="M32 40V24" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M24 31L32 23L40 31" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="20" y1="52" x2="44" y2="52" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  )
}
