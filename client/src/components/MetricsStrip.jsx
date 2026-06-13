export default function MetricsStrip({ applications = [] }) {
  const total = applications.length

  const active = applications.filter(
    a => a.stage === 'applied' || a.stage === 'phone_screen' || a.stage === 'interview'
  ).length

  const interviews = applications.filter(a => a.stage === 'interview').length
  const offers = applications.filter(a => a.stage === 'offer').length

  const responded = applications.filter(
    a =>
      a.stage === 'phone_screen' ||
      a.stage === 'interview' ||
      a.stage === 'offer' ||
      a.stage === 'rejected'
  ).length

  const responseRate = total > 0 ? Math.round((responded / total) * 100) + '%' : '—'

  const stats = [
    { label: 'Total', value: total },
    { label: 'Active', value: active },
    { label: 'Interviews', value: interviews },
    { label: 'Offers', value: offers },
    { label: 'Response Rate', value: responseRate },
  ]

  return (
    <div className="grid grid-cols-5 gap-3 mb-4">
      {stats.map(stat => (
        <div
          key={stat.label}
          className="bg-white border border-slate-100 rounded-xl px-4 py-3 flex flex-col items-start"
        >
          <span className="text-xl font-bold text-slate-900 leading-tight">{stat.value}</span>
          <span className="text-[11px] text-slate-400 mt-0.5">{stat.label}</span>
        </div>
      ))}
    </div>
  )
}
