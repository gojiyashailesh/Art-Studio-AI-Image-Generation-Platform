function classList(...values) {
  return values.filter(Boolean).join(' ')
}

export function Card({ children, className = '' }) {
  return <section className={classList('ui-card', className)}>{children}</section>
}

export function CardContent({ children, className = '' }) {
  return <div className={classList('ui-card__content', className)}>{children}</div>
}
