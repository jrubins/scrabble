import { hot } from 'react-hot-loader/root'
import React, { DragEvent, useEffect, useState } from 'react'
import { Route, Switch, useHistory, useParams } from 'react-router-dom'
import { useMachine } from '@xstate/react'
import { v4 as uuidV4 } from 'uuid'
import _ from 'lodash'
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
import CheckmarkIcon from './CheckmarkIcon'
import CloseIcon from './CloseIcon'
import Input from './Input'
import ShuffleIcon from './ShuffleIcon'
import StarIcon from './StarIcon'
import SwapIcon from './SwapIcon'

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
        [SCRABBLE_ACTIONS.UPDATE_URL_WITH_ROOM]: (context) => {
          history.push(`/${context.roomName}`)
        },
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
    rackLettersToSwap,
    roomHost,
    roomName,
    rounds,
    showSwapModal,
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
  const isHost = me ? me.id === roomHost : false

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
              }
            }}
            roomName={roomName}
          />
        )}
        {isDeterminingGameState && <div>Loading...</div>}
        {isWaitingForPlayers && (
          <div>
            {players.length < 2 && isHost && (
              <>
                <p>
                  Invite players to this room by sending them the below link.
                </p>
                <a
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href)
                  }}
                >
                  Copy link to room
                </a>
              </>
            )}
            {players.length >= 2 && (
              <>
                <div className="players-in-room">
                  <div className="players-in-room-header">Players</div>
                  {players.map((player) => {
                    return <div key={player.id}>{player.name}</div>
                  })}
                </div>
                {players.length === 2 && (
                  <>
                    {!isHost && <div>Waiting for host to start game...</div>}
                    {isHost && (
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
              <div className="scores-table-row">
                <div></div>
                <div>
                  {rounds.reduce((sum, round) => {
                    return sum + (round[players[0].id]?.score || 0)
                  }, 0)}
                </div>
                <div>
                  {rounds.reduce((sum, round) => {
                    return sum + (round[players[1].id]?.score || 0)
                  }, 0)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="playing-surface">
        <div className="playing-surface-items">
          <div className="above-board-row">
            <div className="rack-letters">
              {!isPlaying &&
                _.fill(new Array(7), null).map((rackLetter, i) => {
                  return <RackLetter key={i} rackLetter={rackLetter} />
                })}
              {isPlaying && (
                <>
                  <div className="shuffle-icon-container">
                    <ShuffleIcon
                      onClick={() => {
                        send({ type: SCRABBLE_EVENTS.SHUFFLE_RACK })
                      }}
                    />
                    <div className="shuffle-icon-text">Shuffle</div>
                  </div>
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
                </>
              )}
            </div>
            <div className="swap-icon-container">
              <SwapIcon
                onClick={() => {
                  send({ type: SCRABBLE_EVENTS.SHOW_SWAP_MODAL })
                }}
              />
              <div className="swap-icon-text">Swap</div>
            </div>
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
                    send({
                      cellNum,
                      type: SCRABBLE_EVENTS.TILE_PLACED_ON_BOARD,
                    })
                  }}
                />
              )
            })}
          </div>
        </div>
        {showSwapModal && (
          <>
            <div className="swap-modal-overlay" />
            <div className="swap-modal">
              <CloseIcon
                onClick={() => {
                  send({ type: SCRABBLE_EVENTS.HIDE_SWAP_MODAL })
                }}
              />
              <div className="swap-modal-content">
                <div className="swap-modal-title">Swap Tiles</div>
                <p>Click on tiles to swap.</p>
                <div className="swap-modal-choose-tiles">
                  {rackLetters.map((rackLetter) => {
                    return (
                      <RackLetterToSwap
                        key={rackLetter.id}
                        isChosenToSwap={rackLettersToSwap.has(rackLetter.id)}
                        onClick={() => {
                          send({
                            id: rackLetter.id,
                            type: SCRABBLE_EVENTS.TOGGLE_RACK_LETTER_TO_SWAP,
                          })
                        }}
                        rackLetter={rackLetter}
                      />
                    )
                  })}
                </div>
                <div className="swap-modal-actions">
                  <Button
                    isInverse={true}
                    onClick={() => {
                      send({ type: SCRABBLE_EVENTS.HIDE_SWAP_MODAL })
                    }}
                  >
                    Nevermind
                  </Button>
                  <Button
                    onClick={() => {
                      send({ type: SCRABBLE_EVENTS.SWAP_TILES })
                    }}
                  >
                    Swap
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
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
      <label htmlFor="player-name">Your Name</label>
      <Input
        name="player-name"
        onChange={onChangeName}
        type="text"
        value={name}
      />
      {!isJoining && (
        <>
          <label htmlFor="room-name">Room Name</label>
          <Input
            name="room-name"
            onChange={onChangeRoomName}
            type="text"
            value={roomName}
          />
        </>
      )}
      <Button onClick={onSubmit}>{isJoining ? 'Join' : 'Create Room'}</Button>
    </div>
  )
}

const RackLetter: React.FC<{
  onDragStart?: (letter: RackLetterType) => void
  onLetterDropped?: () => void
  rackLetter: RackLetterType | null
}> = ({ onDragStart, onLetterDropped, rackLetter }) => {
  const letter = rackLetter?.letter

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
  }

  return (
    <div
      className="rack-letter"
      draggable="true"
      onDragOver={onDragOver}
      onDragStart={
        rackLetter && onDragStart ? () => onDragStart(rackLetter) : undefined
      }
      onDrop={onLetterDropped}
    >
      {letter && <Tile letter={letter} />}
    </div>
  )
}

const RackLetterToSwap: React.FC<{
  isChosenToSwap: boolean
  onClick: () => void
  rackLetter: RackLetterType
}> = ({ isChosenToSwap, onClick, rackLetter }) => {
  return (
    <div className="rack-letter-to-swap" onClick={onClick}>
      {isChosenToSwap && <CheckmarkIcon />}
      <RackLetter rackLetter={rackLetter} />
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
