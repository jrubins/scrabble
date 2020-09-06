import React from 'react'

const Input: React.FC<{
  name: string
  onChange: (value: string) => void
  type: 'number' | 'text'
  value: string
}> = ({ name, onChange, value, type }) => {
  return (
    <input
      className="input"
      id={name}
      name={name}
      onChange={(event) => {
        onChange(event.target.value)
      }}
      type={type}
      value={value}
    />
  )
}

export default Input
