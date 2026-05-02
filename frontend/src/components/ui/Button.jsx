function buttonClassName({ variant, size, className }) {
  return [
    'ui-button',
    `ui-button--${variant}`,
    `ui-button--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(' ')
}

export function Button({
  children,
  className = '',
  size = 'md',
  type = 'button',
  variant = 'default',
  ...props
}) {
  return (
    <button
      type={type}
      className={buttonClassName({ variant, size, className })}
      {...props}
    >
      {children}
    </button>
  )
}
