import { hot } from 'react-hot-loader/root'
import React, { DragEvent, useEffect, useState } from 'react'
import { Route, Switch, useHistory, useParams } from 'react-router-dom'
import { useMachine } from '@xstate/react'
import { v4 as uuidV4 } from 'uuid'
import cn from 'classnames'

import {
  ACTIONS as SCRABBLE_ACTIONS,
  EVENTS as SCRABBLE_EVENTS,
  STATES as SCRABBLE_STATES,
  Context as ScrabbleContext,
  Events as ScrabbleEvents,
  scrabbleMachine,
} from './machines/scrabbleMachine'
import { LETTER_POINTS, getCellScoreMultiplier } from '../utils/letters'
import { REALTIME_EVENTS, initRealtimeConnection } from '../utils/realtime'
import { RackLetter as RackLetterType } from '../utils/types'
import { getMe } from '../utils/players'
import { getPersistedInfo } from '../utils/storage'
import { info } from '../utils/logs'

import Button from './Button'
import Input from './Input'
import StarIcon from './StarIcon'

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
  const persistedInfo = getPersistedInfo()
  const roomInfo = room ? persistedInfo[room] : null
  const [scrabbleState, send] = useMachine<ScrabbleContext, ScrabbleEvents>(
    scrabbleMachine.withContext({
      ...(scrabbleMachine.context as ScrabbleContext),
      players: [
        {
          id: roomInfo?.userId || uuidV4(),
          name: roomInfo?.userName || '',
          thisPlayer: true,
        },
      ],
      rackLetters: roomInfo?.rack || [],
      roomHost: roomInfo?.roomHost || '',
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
                info('Scrabble game started...')

                send({ data, type: SCRABBLE_EVENTS.GAME_STARTED })
              },
              [REALTIME_EVENTS.JOINED_ROOM]: (members) => {
                info('Finished joining room. Players:', members)

                send({ members, type: SCRABBLE_EVENTS.FINISHED_JOINING_ROOM })
              },
              [REALTIME_EVENTS.PING_GAME_STATE]: () => {
                info('Received ping game state request...')

                send({
                  type: SCRABBLE_EVENTS.GAME_STATE_PINGED,
                })
              },
              [REALTIME_EVENTS.PONG_GAME_STATE]: (data) => {
                info('Received ping game state response:', data)

                send({
                  data,
                  type: SCRABBLE_EVENTS.GAME_STATE_RESPONSE_RECEIVED,
                })
              },
              [REALTIME_EVENTS.PLAYER_JOINED]: (member) => {
                info('New player joined room. Player:', member)

                send({
                  member,
                  type: SCRABBLE_EVENTS.PLAYER_JOINED,
                })
              },
              [REALTIME_EVENTS.TURN_OVER]: (data) => {
                info('Player turn over...')

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
    roomHost,
    roomName,
    rounds,
    turnUsedLetters,
  } = scrabbleState.context
  const isCreatingRoom = scrabbleState.matches(SCRABBLE_STATES.CREATING_ROOM)
  const isJoiningRoom = scrabbleState.matches(SCRABBLE_STATES.JOINING_ROOM)
  const isDeterminingGameState = scrabbleState.matches(
    SCRABBLE_STATES.DETERMINING_GAME_STATE
  )
  const isWaitingForPlayers = scrabbleState.matches(
    SCRABBLE_STATES.WAITING_FOR_PLAYERS
  )
  const isPlaying =
    scrabbleState.matches(SCRABBLE_STATES.PLAYING) ||
    scrabbleState.matches(SCRABBLE_STATES.WAITING_FOR_TURN)
  const me = getMe(players)

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
      <div className="sidebar">
        <div className="sidebar-logo">Scrabble</div>
        {(isCreatingRoom || isJoiningRoom) && (
          <EnterRoomForm
            isJoining={isJoiningRoom}
            name={players[0].name}
            onChangeName={(value) => {
              send({
                playerId: players[0].id,
                type: SCRABBLE_EVENTS.NAME_CHANGED,
                value,
              })
            }}
            onChangeRoomName={(value) => {
              send({
                type: SCRABBLE_EVENTS.ROOM_NAME_CHANGED,
                value,
              })
            }}
            onSubmit={() => {
              if (isJoiningRoom) {
                send({ type: SCRABBLE_EVENTS.JOIN_ROOM })
              } else {
                send({ type: SCRABBLE_EVENTS.CREATE_ROOM })
                history.push(`/${roomName}`)
              }
            }}
            roomName={roomName}
          />
        )}
        {isDeterminingGameState && <div>Loading...</div>}
        {isWaitingForPlayers && (
          <div>
            {players.length < 2 && <div>Waiting for players to join...</div>}
            {players.length >= 2 && (
              <>
                <div>
                  <div>Players</div>
                  {players.map((player) => {
                    return (
                      <div key={player.id}>
                        {player.name}
                        {player.thisPlayer ? '(You)' : ''}
                      </div>
                    )
                  })}
                </div>
                {players.length === 2 && me?.id === roomHost && (
                  <Button
                    onClick={() => {
                      send({ type: SCRABBLE_EVENTS.START_GAME })
                    }}
                  >
                    Start Game
                  </Button>
                )}
              </>
            )}
          </div>
        )}
        {isPlaying && (
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
                cellNum={cellNum}
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

const EnterRoomForm: React.FC<{
  isJoining: boolean
  name: string
  onChangeName: (value: string) => void
  onChangeRoomName: (value: string) => void
  onSubmit: () => void
  roomName: string
}> = ({
  isJoining,
  name,
  onChangeName,
  onChangeRoomName,
  onSubmit,
  roomName,
}) => {
  return (
    <div className="enter-room-form">
      <Input onChange={onChangeName} value={name} />
      {!isJoining && <Input onChange={onChangeRoomName} value={roomName} />}
      <Button onClick={onSubmit}>{isJoining ? 'Join' : 'Create Room'}</Button>
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
  cellNum: number
  letter?: RackLetterType
  onDragStart: (letter: RackLetterType) => void
  onLetterDropped: () => void
}> = ({ cellNum, letter, onDragStart, onLetterDropped }) => {
  const [isOver, setIsOver] = useState(false)
  const cellLetter = letter?.letter
  const scoreMultiplier = getCellScoreMultiplier(cellNum)

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
        [`board-cell-${scoreMultiplier}`]: scoreMultiplier,
      })}
      draggable="true"
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDragStart={letter ? () => onDragStart(letter) : undefined}
      onDrop={onDrop}
    >
      {cellLetter && <Tile letter={cellLetter} />}
      {cellNum === 112 && <StarIcon />}
      {cellNum !== 112 && (
        <div className="board-cell-score-multiplier">
          {scoreMultiplier === 'double-word' && <span>Double Word Score</span>}
          {scoreMultiplier === 'triple-word' && <span>Triple Word Score</span>}
          {scoreMultiplier === 'double-letter' && (
            <span>Double Letter Score</span>
          )}
          {scoreMultiplier === 'triple-letter' && (
            <span>Triple Letter Score</span>
          )}
        </div>
      )}
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
