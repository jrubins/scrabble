import React from 'react'

const Input: React.FC<{
  onChange: (value: string) => void
  value: string
}> = ({ onChange, value }) => {
  return (
    <input
      className="input"
      onChange={(event) => {
        onChange(event.target.value)
      }}
      type="text"
      value={value}
    />
  )
}

export default Input
