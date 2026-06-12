export default function Logo({ size = 30 }) {
  const radius = Math.round(size * 0.22)
  const iconScale = size / 64

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx={radius / iconScale} fill="#6366f1" />
      <rect x="9" y="26" width="46" height="29" rx="5" stroke="white" strokeWidth="3" fill="none" />
      <path d="M22 26L22 21C22 18.239 24.239 16 27 16H37C39.761 16 42 18.239 42 21L42 26" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="9" y1="38" x2="55" y2="38" stroke="white" strokeWidth="2.5" />
      <rect x="27.5" y="33" width="9" height="10" rx="2" stroke="white" strokeWidth="2.5" fill="none" />
    </svg>
  )
}
