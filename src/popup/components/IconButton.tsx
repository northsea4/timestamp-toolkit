import clsx from 'clsx'
import type { ReactNode } from 'react'
import styles from './IconButton.module.css'

export function IconButton({
  title,
  active,
  onClick,
  children
}: {
  title: string
  active?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      className={clsx(styles.iconButton, active && styles.active)}
      type="button"
      title={title}
      onClick={onClick}>
      {children}
    </button>
  )
}
