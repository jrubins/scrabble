import React, { ReactElement } from 'react'
import cn from 'classnames'

const Button: React.FC<{
  children: ReactElement | string
  isInverse?: boolean
  onClick: () => void
}> = ({ children, isInverse = false, onClick }) => {
  return (
    <button
      className={cn('button', { 'button-inverse': isInverse })}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export default Button
