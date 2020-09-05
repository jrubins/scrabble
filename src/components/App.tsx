import { hot } from 'react-hot-loader/root'
import React, { DragEvent, useEffect, useState } from 'react'
import { useMachine } from '@xstate/react'
import cn from 'classnames'

import {
  EVENTS as SCRABBLE_EVENTS,
  Context as ScrabbleContext,
  Events as ScrabbleEvents,
  scrabbleMachine,
} from './machines/scrabbleMachine'
import { LETTER_POINTS } from '../utils/letters'
import { UserLetter } from '../utils/types'

const board: number[] = []
for (let i = 0; i < 225; i++) {
  board.push(i)
}

const App = () => {
  const [scrabbleState, send] = useMachine<ScrabbleContext, ScrabbleEvents>(
    scrabbleMachine
  )
  const { letters, userLetters, usedLetters } = scrabbleState.context

  function onDragStart(letter: UserLetter) {
    send({ letter, type: SCRABBLE_EVENTS.DRAG_STARTED })
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Enter') {
        send({ type: SCRABBLE_EVENTS.WORD_SUBMITTED })
      }
    }

    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [send])

  return (
    <div className="app">
      <div className="user-letters">
        {userLetters.map((userLetter) => {
          return (
            <UserLetterCell
              key={userLetter.id}
              onDragStart={onDragStart}
              onLetterDropped={() => {
                send({
                  userLetterId: userLetter.id,
                  type: SCRABBLE_EVENTS.TILE_PLACED_ON_RACK,
                })
              }}
              userLetter={usedLetters.has(userLetter.id) ? null : userLetter}
            />
          )
        })}
      </div>
      <div className="board">
        {board.map((cellNum) => {
          return (
            <BoardCell
              key={cellNum}
              letter={letters[cellNum]}
              onDragStart={onDragStart}
              onLetterDropped={() => {
                send({ cellNum, type: SCRABBLE_EVENTS.TILE_PLACED_ON_BOARD })
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

const UserLetterCell: React.FC<{
  onDragStart: (letter: UserLetter) => void
  onLetterDropped: () => void
  userLetter: UserLetter | null
}> = ({ onDragStart, onLetterDropped, userLetter }) => {
  const letter = userLetter?.letter

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
  }

  function onDrop() {
    onLetterDropped()
  }

  return (
    <div
      className="user-letter-cell"
      draggable="true"
      onDragOver={onDragOver}
      onDragStart={userLetter ? () => onDragStart(userLetter) : undefined}
      onDrop={onDrop}
    >
      {letter && <Tile letter={letter} />}
    </div>
  )
}

const BoardCell: React.FC<{
  letter?: UserLetter
  onDragStart: (letter: UserLetter) => void
  onLetterDropped: () => void
}> = ({ letter, onDragStart, onLetterDropped }) => {
  const [isOver, setIsOver] = useState(false)
  const cellLetter = letter?.letter

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsOver(true)
  }

  function onDragLeave() {
    setIsOver(false)
  }

  function onDrop() {
    onLetterDropped()
    setIsOver(false)
  }

  return (
    <div
      className={cn('board-cell', {
        'board-cell-hovered': isOver,
        'board-cell-taken': !!cellLetter,
      })}
      draggable="true"
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDragStart={letter ? () => onDragStart(letter) : undefined}
      onDrop={onDrop}
    >
      {cellLetter && <Tile letter={cellLetter} />}
    </div>
  )
}

const Tile: React.FC<{ letter: string }> = ({ letter }) => {
  return (
    <div className="tile">
      <span>{letter}</span>
      <div className="tile-points">{LETTER_POINTS[letter]}</div>
    </div>
  )
}

export default hot(App)
