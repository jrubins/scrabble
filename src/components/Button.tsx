import React, { ReactElement } from 'react'

const Button: React.FC<{
  children: ReactElement | string
  onClick: () => void
}> = ({ children, onClick }) => {
  return (
    <button className="button" onClick={onClick}>
      {children}
    </button>
  )
}

export default Button
