"use client"
import { useMemo } from 'react'

// ─── Donut Chart ─────────────────────────────────────────────────────────────

interface DonutSegment {
  color: string
  value: number
}

interface DonutChartProps {
  segments: DonutSegment[]
  size?: number
  thickness?: number
  label?: string
  sublabel?: string
}

export function DonutChart({ segments, size = 220, thickness = 36, label, sublabel }: DonutChartProps) {
  const r = (size - thickness) / 2
  const cx = size / 2
  const cy = size / 2
  const circ = 2 * Math.PI * r
  const total = segments.reduce((s, d) => s + d.value, 0)

  const arcs = useMemo(() => {
    let offset = 0
    return segments.map(seg => {
      const len = total > 0 ? (seg.value / total) * circ : 0
      const arc = { ...seg, offset, len }
      offset += len
      return arc
    })
  }, [segments, total, circ])

  const font = 'var(--font-dm-sans), DM Sans, sans-serif'

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible', flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F0EFED" strokeWidth={thickness} />
      {arcs.filter(a => a.len > 0).map((arc, i) => (
        <circle
          key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={arc.color} strokeWidth={thickness}
          strokeDasharray={`${arc.len} ${circ}`}
          strokeDashoffset={-arc.offset}
          style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px`, transition: 'stroke-dasharray 0.4s ease' }}
        />
      ))}
      {label && (
        <text x={cx} y={cy + (sublabel ? -10 : 6)} textAnchor="middle"
          fontSize="20" fontWeight="600" fill="#1C1C1A" fontFamily={font}>
          {label}
        </text>
      )}
      {sublabel && (
        <text x={cx} y={cy + 14} textAnchor="middle"
          fontSize="11" fill="#888882" fontFamily={font} letterSpacing="0.3">
          {sublabel}
        </text>
      )}
    </svg>
  )
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

export interface BarData {
  label: string
  income: number
  expense: number
  isCurrent: boolean
}

interface BarChartProps {
  data: BarData[]
  height?: number
}

export function BarChart({ data, height = 200 }: BarChartProps) {
  const maxVal = Math.max(...data.flatMap(d => [d.income, d.expense]), 1)
  const BAR_W = 14, GAP = 6, GROUP_PAD = 24
  const groupW = BAR_W * 2 + GAP + GROUP_PAD
  const totalW = data.length * groupW + 10
  const chartH = height - 36
  const font = 'var(--font-dm-sans), DM Sans, sans-serif'

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${totalW} ${height}`}
      preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
      {data.map((d, i) => {
        const x = i * groupW + GROUP_PAD / 2
        const iH = Math.max((d.income / maxVal) * chartH, 2)
        const eH = Math.max((d.expense / maxVal) * chartH, 2)
        const alpha = d.isCurrent ? 1 : 0.45
        return (
          <g key={i}>
            <rect x={x} y={chartH - iH} width={BAR_W} height={iH} rx="3"
              fill={`oklch(58% 0.15 145 / ${alpha})`} />
            <rect x={x + BAR_W + GAP} y={chartH - eH} width={BAR_W} height={eH} rx="3"
              fill={`oklch(58% 0.15 25 / ${alpha})`} />
            <text x={x + BAR_W + GAP / 2} y={height - 6} textAnchor="middle"
              fontSize="10" fill={d.isCurrent ? '#1C1C1A' : '#AAAAAA'}
              fontFamily={font} fontWeight={d.isCurrent ? '600' : '400'}>
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Area Chart ───────────────────────────────────────────────────────────────

export interface AreaData {
  label: string
  value: number
}

interface AreaChartProps {
  data: AreaData[]
  height?: number
}

function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return ''
  let d = `M ${points[0].x},${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1], curr = points[i]
    const cpx = (prev.x + curr.x) / 2
    d += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`
  }
  return d
}

export function AreaChart({ data, height = 140 }: AreaChartProps) {
  if (!data || data.length < 2) return null

  const values = data.map(d => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values, min + 1)
  const range = max - min
  const W = 600, H = height
  const padX = 10, padY = 16
  const chartW = W - padX * 2
  const chartH = H - padY * 2 - 20
  const font = 'var(--font-dm-sans), DM Sans, sans-serif'

  const pts = data.map((d, i) => ({
    x: padX + (i / (data.length - 1)) * chartW,
    y: padY + (1 - (d.value - min) / range) * chartH,
    label: d.label,
  }))

  const linePath = smoothPath(pts)
  const areaPath = `${linePath} L${pts[pts.length - 1].x},${H - 20} L${pts[0].x},${H - 20} Z`
  const isPositive = data[data.length - 1].value >= data[0].value
  const lineColor = isPositive ? 'oklch(52% 0.16 145)' : 'oklch(52% 0.16 25)'
  const fillColor = isPositive ? 'oklch(68% 0.12 145)' : 'oklch(68% 0.12 25)'
  const gradId = `areaGrad_${isPositive ? 'pos' : 'neg'}`

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={fillColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={fillColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={lineColor} strokeWidth="2.5"
        strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4.5" fill={lineColor} stroke="white" strokeWidth="2.5" />
          <text x={p.x} y={H - 4} textAnchor="middle" fontSize="10" fill="#888882" fontFamily={font}>
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  )
}
