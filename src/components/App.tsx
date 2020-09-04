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
import { UserLetter } from '../utils/types'
import { getRandomLetters } from '../utils/letters'

const board: number[] = []
for (let i = 0; i < 225; i++) {
  board.push(i)
}

const App = () => {
  const [scrabbleState, send] = useMachine<ScrabbleContext, ScrabbleEvents>(
    scrabbleMachine.withContext({
      ...(scrabbleMachine.context as ScrabbleContext),
      userLetters: getRandomLetters({ numLetters: 7 }),
    })
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
        {userLetters.map((letter) => {
          return (
            <UserLetterCell
              key={letter.id}
              letter={usedLetters.has(letter.id) ? null : letter}
              onDragStart={onDragStart}
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
                send({ cellNum, type: SCRABBLE_EVENTS.DRAG_STOPPED })
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

const UserLetterCell: React.FC<{
  letter: UserLetter | null
  onDragStart: (letter: UserLetter) => void
}> = ({ letter, onDragStart }) => {
  return (
    <div
      className="user-letter-cell"
      draggable="true"
      onDragStart={letter ? () => onDragStart(letter) : undefined}
    >
      {letter?.letter}
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
      {cellLetter}
    </div>
  )
}

export default hot(App)
