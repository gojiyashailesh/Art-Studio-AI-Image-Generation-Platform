export function Separator({ className = '' }) {
  return <div className={['ui-separator', className].filter(Boolean).join(' ')} aria-hidden="true" />
}
