export function SortableTh({ label, col, sortKey, sortDir, onSort, className = '', right = false }) {
  const active = sortKey === col
  return (
    <th
      className={`cursor-pointer select-none group transition-colors hover:bg-gray-100 ${className}`}
      onClick={() => onSort(col)}
    >
      <span className={`flex items-center gap-1 ${right ? 'justify-end' : 'justify-between'}`}>
        <span>{label}</span>
        <span className={`text-[11px] transition-colors ${active ? 'text-primary' : 'text-gray-300 group-hover:text-gray-400'}`}>
          {active ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </span>
    </th>
  )
}
