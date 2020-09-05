import { hot } from 'react-hot-loader/root'
import React, { DragEvent, useEffect, useState } from 'react'
import { Route, Switch, useHistory, useParams } from 'react-router-dom'
import { useMachine } from '@xstate/react'
import cn from 'classnames'

import {
  ACTIONS as SCRABBLE_ACTIONS,
  EVENTS as SCRABBLE_EVENTS,
  STATES as SCRABBLE_STATES,
  Context as ScrabbleContext,
  Events as ScrabbleEvents,
  scrabbleMachine,
} from './machines/scrabbleMachine'
import { LETTER_POINTS } from '../utils/letters'
import { REALTIME_EVENTS, initRealtimeConnection } from '../utils/realtime'
import { Member, RackLetter as RackLetterType } from '../utils/types'

const board: number[] = []
for (let i = 0; i < 225; i++) {
  board.push(i)
}

const App: React.FC = () => {
  return (
    <Switch>
      <Route component={Room} path="/:room?" />
    </Switch>
  )
}

const Room: React.FC = () => {
  const history = useHistory()
  const { room } = useParams<{ room?: string }>()
  const [scrabbleState, send] = useMachine<ScrabbleContext, ScrabbleEvents>(
    scrabbleMachine.withContext({
      ...(scrabbleMachine.context as ScrabbleContext),
      roomName: room || '',
    }),
    {
      actions: {
        [SCRABBLE_ACTIONS.JOIN_ROOM]: (context) => {
          const { players, roomName } = context
          const userId = players[0].id
          const userName = players[0].name

          initRealtimeConnection({
            callbacks: {
              [REALTIME_EVENTS.GAME_STARTED]: (data) => {
                send({ data, type: SCRABBLE_EVENTS.GAME_STARTED })
              },
              [REALTIME_EVENTS.JOINED_ROOM]: (members) => {
                members.each(onMemberAdded)
              },
              [REALTIME_EVENTS.PLAYER_JOINED]: onMemberAdded,
              [REALTIME_EVENTS.TURN_OVER]: (data) => {
                send({ data, type: SCRABBLE_EVENTS.TURN_OVER })
              },
            },
            channel: roomName,
            userId,
            userName,
          })
        },
      },
      devTools: true,
    }
  )
  const {
    boardLetters,
    playerUp,
    players,
    rackLetters,
    roomName,
    rounds,
    turnUsedLetters,
  } = scrabbleState.context
  const isCreatingRoom = scrabbleState.matches(SCRABBLE_STATES.CREATING_ROOM)
  const isJoiningRoom = scrabbleState.matches(SCRABBLE_STATES.JOINING_ROOM)
  const isWaitingForPlayers = scrabbleState.matches(
    SCRABBLE_STATES.WAITING_FOR_PLAYERS
  )

  function onDragStart(letter: RackLetterType) {
    send({ letter, type: SCRABBLE_EVENTS.DRAG_STARTED })
  }

  function onMemberAdded(member: Member) {
    const { id, info } = member

    send({
      id,
      name: info.name,
      type: SCRABBLE_EVENTS.PLAYER_JOINED,
    })
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
      <div className="sidebar">
        <div className="sidebar-logo">Scrabble</div>
        {(isCreatingRoom || isJoiningRoom) && (
          <div>
            <input
              onChange={(event) => {
                send({
                  playerId: players[0].id,
                  type: SCRABBLE_EVENTS.NAME_CHANGED,
                  value: event.target.value,
                })
              }}
              placeholder="your name"
              type="text"
              value={players[0].name}
            />
            {isJoiningRoom && (
              <button
                onClick={() => {
                  send({ type: SCRABBLE_EVENTS.JOIN_ROOM })
                }}
              >
                Join
              </button>
            )}
            {isCreatingRoom && (
              <>
                <input
                  onChange={(event) => {
                    send({
                      type: SCRABBLE_EVENTS.ROOM_NAME_CHANGED,
                      value: event.target.value,
                    })
                  }}
                  placeholder="room name"
                  type="text"
                  value={roomName}
                />
                <button
                  onClick={() => {
                    send({ type: SCRABBLE_EVENTS.CREATE_ROOM })
                    history.push(`/${roomName}`)
                  }}
                >
                  Create Room
                </button>
              </>
            )}
          </div>
        )}
        {!isCreatingRoom && (
          <div className="scores-table">
            <div className="scores-header">
              <div></div>
              {players.map(({ id, name }) => {
                return (
                  <div
                    key={name}
                    className={cn('scores-header-player', {
                      'scores-header-player-up': playerUp === id,
                    })}
                  >
                    {name}
                  </div>
                )
              })}
            </div>
            <div className="scores-table-body">
              {rounds.map((round, i) => {
                const [firstPlayer, secondPlayer] = players
                const firstPlayerResult = firstPlayer
                  ? round[firstPlayer.id]
                  : undefined
                const secondPlayerResult = secondPlayer
                  ? round[secondPlayer.id]
                  : undefined

                return (
                  <div key={i} className="scores-table-row">
                    <div>{i + 1}</div>
                    <div>
                      {firstPlayerResult
                        ? `${firstPlayerResult.word} ${firstPlayerResult.score}`
                        : ''}
                    </div>
                    <div>
                      {secondPlayerResult
                        ? `${secondPlayerResult.word} ${secondPlayerResult.score}`
                        : ''}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        {isWaitingForPlayers && (
          <button
            onClick={() => {
              send({ type: SCRABBLE_EVENTS.START_GAME })
            }}
          >
            Start Game
          </button>
        )}
      </div>
      <div className="playing-surface">
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
      <div className="tile-letter-container">
        <span className="tile-letter">{letter}</span>
        <div className="tile-points">{LETTER_POINTS[letter]}</div>
      </div>
    </div>
  )
}

export default hot(App)
