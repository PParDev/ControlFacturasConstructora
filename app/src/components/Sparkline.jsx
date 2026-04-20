import { LineChart, Line, ResponsiveContainer, ReferenceLine, YAxis, Tooltip } from 'recharts'

export function Sparkline({ data = [], referencia = null, width = 100, height = 30, stroke = '#3b82f6' }) {
  if (!data || data.length === 0) {
    return <span className="text-[10px] text-gray-300">— sin datos —</span>
  }

  const chartData = data.map((d, i) => ({
    idx: i,
    precio: d.precio_unitario,
    fecha: d.fecha
  }))

  const valores = data.map(d => d.precio_unitario)
  const min = Math.min(...valores, referencia ?? Infinity)
  const max = Math.max(...valores, referencia ?? -Infinity)

  return (
    <div style={{ width, height }} className="inline-block align-middle">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <YAxis hide domain={[min * 0.95, max * 1.05]} />
          <Tooltip
            cursor={{ stroke: '#94a3b8', strokeDasharray: '3 3' }}
            contentStyle={{ fontSize: 11, padding: '4px 8px', borderRadius: 4 }}
            formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Precio']}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.fecha?.slice(0, 10) || ''}
          />
          {referencia != null && referencia > 0 && (
            <ReferenceLine y={referencia} stroke="#94a3b8" strokeDasharray="2 2" />
          )}
          <Line
            type="monotone"
            dataKey="precio"
            stroke={stroke}
            strokeWidth={1.5}
            dot={{ r: 1.5, fill: stroke }}
            activeDot={{ r: 3 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
