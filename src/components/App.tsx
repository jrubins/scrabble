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
import { RackLetter as RackLetterType } from '../utils/types'

const board: number[] = []
for (let i = 0; i < 225; i++) {
  board.push(i)
}

const App = () => {
  const [scrabbleState, send] = useMachine<ScrabbleContext, ScrabbleEvents>(
    scrabbleMachine
  )
  const { boardLetters, rackLetters, turnUsedLetters } = scrabbleState.context

  function onDragStart(letter: RackLetterType) {
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
      <div className="rack-letters">
        {rackLetters.map((rackLetter) => {
          return (
            <RackLetter
              key={rackLetter.id}
              onDragStart={onDragStart}
              onLetterDropped={() => {
                send({
                  rackLetterId: rackLetter.id,
                  type: SCRABBLE_EVENTS.TILE_PLACED_ON_RACK,
                })
              }}
              rackLetter={
                turnUsedLetters.has(rackLetter.id) ? null : rackLetter
              }
            />
          )
        })}
      </div>
      <div className="board">
        {board.map((cellNum) => {
          return (
            <BoardCell
              key={cellNum}
              letter={boardLetters[cellNum]}
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

const RackLetter: React.FC<{
  onDragStart: (letter: RackLetterType) => void
  onLetterDropped: () => void
  rackLetter: RackLetterType | null
}> = ({ onDragStart, onLetterDropped, rackLetter }) => {
  const letter = rackLetter?.letter

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
  }

  function onDrop() {
    onLetterDropped()
  }

  return (
    <div
      className="rack-letter"
      draggable="true"
      onDragOver={onDragOver}
      onDragStart={rackLetter ? () => onDragStart(rackLetter) : undefined}
      onDrop={onDrop}
    >
      {letter && <Tile letter={letter} />}
    </div>
  )
}

const BoardCell: React.FC<{
  letter?: RackLetterType
  onDragStart: (letter: RackLetterType) => void
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
