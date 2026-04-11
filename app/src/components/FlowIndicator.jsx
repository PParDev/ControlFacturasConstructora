export function FlowIndicator({ steps }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap mb-4">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-gray-400 text-xs">›</span>}
          <div className={[
            'flow-step',
            s.done     ? 'flow-step-done'     : '',
            s.active   ? 'flow-step-active'   : '',
            s.optional ? 'flow-step-optional' : '',
          ].join(' ')}>
            {s.done   && '✓ '}
            {s.active && '● '}
            {s.label}
          </div>
        </div>
      ))}
    </div>
  )
}
