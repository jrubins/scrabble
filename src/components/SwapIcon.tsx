import React from 'react'

const SwapIcon: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <svg className="swap-icon" onClick={onClick} viewBox="0 0 24 24">
      <title>Swap Tiles</title>
      <path d="M0 0h24v24H0z" fill="none" />
      <path d="M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3L5 6.99h3V14h2V6.99h3L9 3z" />
    </svg>
  )
}

export default SwapIcon
