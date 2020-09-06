import { Machine, assign } from 'xstate'
import _ from 'lodash'

import {
  REALTIME_EVENTS,
  GameStartedData,
  PongGameStateData,
  TurnOverData,
  publishEvent,
} from '../../utils/realtime'
import {
  BoardLetters,
  LetterDistribution,
  LettersToBoardCells,
  Member,
  Members,
  Player,
  RackLetter,
  Rounds,
  TurnResult,
} from '../../utils/types'
import { getMe } from '../../utils/players'
import {
  getRackLetters,
  getScore,
  getSetOfLetters,
  getWordsFromLetters,
} from '../../utils/letters'
import { info } from '../../utils/logs'
import { persistRack, persistRoomInfo } from '../../utils/storage'

export enum ACTIONS {
  ADD_PLAYER = 'ADD_PLAYER',
  CHANGE_TURN = 'CHANGE_TURN',
  CHOOSE_PLAYER_UP = 'CHOOSE_PLAYER_UP',
  JOIN_ROOM = 'JOIN_ROOM',
  PERSIST_RACK = 'PERSIST_RACK',
  PERSIST_ROOM_INFO = 'PERSIST_ROOM_INFO',
  PICK_INITIAL_LETTERS = 'PICK_INITIAL_LETTERS',
  PICK_NEW_LETTERS = 'PICK_NEW_LETTERS',
  PING_GAME_STATE = 'PING_GAME_STATE',
  PONG_GAME_STATE_PLAYING = 'PONG_GAME_STATE_PLAYING',
  PONG_GAME_STATE_WAITING = 'PONG_GAME_STATE_WAITING',
  SET_LETTER_ON_BOARD = 'SET_LETTER_ON_BOARD',
  SET_LETTER_ON_RACK = 'SET_LETTER_ON_RACK',
  TALLY_SCORE = 'TALLY_SCORE',
  TRIGGER_GAME_STARTED = 'TRIGGER_GAME_STARTED',
  TRIGGER_TURN_OVER = 'TRIGGER_TURN_OVER',
  UPDATE_DRAGGING_LETTER = 'UPDATE_DRAGGING_LETTER',
  UPDATE_GAME_STARTED_DATA = 'UPDATE_GAME_STARTED_DATA',
  UPDATE_IN_PROGRESS_GAME = 'UPDATE_IN_PROGRESS_GAME',
  UPDATE_PLAYER_NAME = 'UPDATE_PLAYER_NAME',
  UPDATE_PLAYERS = 'UPDATE_PLAYERS',
  UPDATE_ROOM_HOST = 'UPDATE_ROOM_HOST',
  UPDATE_ROOM_NAME = 'UPDATE_ROOM_NAME',
  UPDATE_TURN_OVER_DATA = 'UPDATE_TURN_OVER_DATA',
}

export enum EVENTS {
  CREATE_ROOM = 'CREATE_ROOM',
  DRAG_STARTED = 'DRAG_STARTED',
  FINISHED_JOINING_ROOM = 'FINISHED_JOINING_ROOM',
  GAME_STARTED = 'GAME_STARTED',
  GAME_STATE_PINGED = 'GAME_STATE_PINGED',
  GAME_STATE_RESPONSE_RECEIVED = 'GAME_STATE_RESPONSE_RECEIVED',
  JOIN_ROOM = 'JOIN_ROOM',
  NAME_CHANGED = 'NAME_CHANGED',
  PLAYER_JOINED = 'PLAYER_JOINED',
  ROOM_NAME_CHANGED = 'ROOM_NAME_CHANGED',
  START_GAME = 'START_GAME',
  TILE_PLACED_ON_BOARD = 'TILE_PLACED_ON_BOARD',
  TILE_PLACED_ON_RACK = 'TILE_PLACED_ON_RACK',
  TURN_OVER = 'TURN_OVER',
  WORD_SUBMITTED = 'WORD_SUBMITTED',
}

enum GUARDS {
  AM_I_PLAYING = 'AM_I_PLAYING',
  AM_I_WAITING = 'AM_I_WAITING',
  HAS_ALL_JOIN_DATA = 'HAS_ALL_JOIN_DATA',
  HAS_ROOM_NAME = 'HAS_ROOM_NAME',
  IS_EMPTY_ROOM = 'IS_EMPTY_ROOM',
  IS_GAME_WAITING = 'IS_GAME_WAITING',
  IS_UP = 'IS_UP',
  IS_WORD_VALID = 'IS_WORD_VALID',
}

export enum STATES {
  BOOT = 'BOOT',
  CREATING_ROOM = 'CREATING_ROOM',
  DETERMINING_GAME_STATE = 'DETERMINING_GAME_STATE',
  JOINING_ROOM = 'JOINING_ROOM',
  PLAYING = 'PLAYING',
  STARTING_GAME = 'STARTING_GAME',
  WAITING_FOR_TURN = 'WAITING_FOR_TURN',
  WAITING_FOR_PLAYERS = 'WAITING_FOR_PLAYERS',
}

export interface Context {
  boardLetters: BoardLetters
  draggingLetter: RackLetter | null
  playerUp: string
  players: Player[]
  rackLetters: RackLetter[]
  rackLettersToBoardCells: LettersToBoardCells
  remainingLetters: LetterDistribution
  roomHost: string
  roomName: string
  rounds: Rounds
  turnUsedLetters: Set<string>
}

type CreateRoom = { type: EVENTS.CREATE_ROOM }
type DragStarted = { letter: RackLetter; type: EVENTS.DRAG_STARTED }
type FinishedJoiningRoom = {
  members: Members
  type: EVENTS.FINISHED_JOINING_ROOM
}
type GameStarted = {
  data: GameStartedData
  type: EVENTS.GAME_STARTED
}
type GameStatePinged = { type: EVENTS.GAME_STATE_PINGED }
type GameStateResponseReceived = {
  data: PongGameStateData
  type: EVENTS.GAME_STATE_RESPONSE_RECEIVED
}
type JoinRoom = { type: EVENTS.JOIN_ROOM }
type NameChanged = {
  playerId: string
  type: EVENTS.NAME_CHANGED
  value: string
}
type PlayerJoined = {
  member: Member
  type: EVENTS.PLAYER_JOINED
}
type RoomNameChanged = {
  type: EVENTS.ROOM_NAME_CHANGED
  value: string
}
type StartGame = { type: EVENTS.START_GAME }
type TilePlacedOnBoard = { cellNum: number; type: EVENTS.TILE_PLACED_ON_BOARD }
type TilePlacedOnRack = {
  rackLetterId: string
  type: EVENTS.TILE_PLACED_ON_RACK
}
type TurnOver = { data: TurnOverData; type: EVENTS.TURN_OVER }
type WordSubmitted = { type: EVENTS.WORD_SUBMITTED }
export type Events =
  | CreateRoom
  | DragStarted
  | FinishedJoiningRoom
  | GameStarted
  | GameStatePinged
  | GameStateResponseReceived
  | JoinRoom
  | NameChanged
  | PlayerJoined
  | RoomNameChanged
  | StartGame
  | TilePlacedOnBoard
  | TilePlacedOnRack
  | TurnOver
  | WordSubmitted

const moveTileEvents = {
  [EVENTS.DRAG_STARTED]: { actions: [ACTIONS.UPDATE_DRAGGING_LETTER] },
  [EVENTS.TILE_PLACED_ON_BOARD]: {
    actions: [ACTIONS.SET_LETTER_ON_BOARD],
  },
  [EVENTS.TILE_PLACED_ON_RACK]: {
    actions: [ACTIONS.SET_LETTER_ON_RACK],
  },
}

export const scrabbleMachine = Machine<Context, Events>(
  {
    context: {
      boardLetters: {},
      draggingLetter: null,
      playerUp: '',
      players: [],
      rackLetters: [],
      rackLettersToBoardCells: {},
      remainingLetters: getSetOfLetters(),
      roomHost: '',
      roomName: '',
      rounds: [{}],
      turnUsedLetters: new Set(),
    },
    id: 'scrabble',
    initial: STATES.BOOT,
    states: {
      [STATES.BOOT]: {
        always: [
          {
            cond: GUARDS.HAS_ALL_JOIN_DATA,
            target: STATES.DETERMINING_GAME_STATE,
          },
          { cond: GUARDS.HAS_ROOM_NAME, target: STATES.JOINING_ROOM },
          { target: STATES.CREATING_ROOM },
        ],
      },
      [STATES.CREATING_ROOM]: {
        on: {
          [EVENTS.NAME_CHANGED]: { actions: [ACTIONS.UPDATE_PLAYER_NAME] },
          [EVENTS.ROOM_NAME_CHANGED]: { actions: [ACTIONS.UPDATE_ROOM_NAME] },
          [EVENTS.CREATE_ROOM]: {
            actions: [ACTIONS.UPDATE_ROOM_HOST, ACTIONS.JOIN_ROOM],
            target: [STATES.WAITING_FOR_PLAYERS],
          },
        },
      },
      [STATES.JOINING_ROOM]: {
        on: {
          [EVENTS.NAME_CHANGED]: { actions: [ACTIONS.UPDATE_PLAYER_NAME] },
          [EVENTS.JOIN_ROOM]: {
            actions: [ACTIONS.JOIN_ROOM],
            target: [STATES.WAITING_FOR_PLAYERS],
          },
        },
      },
      [STATES.DETERMINING_GAME_STATE]: {
        entry: [ACTIONS.JOIN_ROOM],
        on: {
          [EVENTS.FINISHED_JOINING_ROOM]: [
            {
              actions: [ACTIONS.UPDATE_PLAYERS],
              cond: GUARDS.IS_EMPTY_ROOM,
              target: STATES.WAITING_FOR_PLAYERS,
            },
            { actions: [ACTIONS.UPDATE_PLAYERS, ACTIONS.PING_GAME_STATE] },
          ],
          [EVENTS.GAME_STATE_RESPONSE_RECEIVED]: [
            {
              cond: GUARDS.IS_GAME_WAITING,
              target: STATES.WAITING_FOR_PLAYERS,
            },
            {
              actions: [ACTIONS.UPDATE_IN_PROGRESS_GAME],
              cond: GUARDS.AM_I_PLAYING,
              target: STATES.PLAYING,
            },
            {
              actions: [ACTIONS.UPDATE_IN_PROGRESS_GAME],
              cond: GUARDS.AM_I_WAITING,
              target: STATES.WAITING_FOR_TURN,
            },
          ],
        },
      },
      [STATES.WAITING_FOR_PLAYERS]: {
        on: {
          [EVENTS.FINISHED_JOINING_ROOM]: [
            { actions: [ACTIONS.UPDATE_PLAYERS, ACTIONS.PERSIST_ROOM_INFO] },
          ],
          [EVENTS.GAME_STARTED]: {
            actions: [ACTIONS.UPDATE_GAME_STARTED_DATA],
            target: STATES.STARTING_GAME,
          },
          [EVENTS.GAME_STATE_PINGED]: {
            actions: [ACTIONS.PONG_GAME_STATE_WAITING],
          },
          [EVENTS.PLAYER_JOINED]: { actions: [ACTIONS.ADD_PLAYER] },
          [EVENTS.START_GAME]: {
            actions: [ACTIONS.CHOOSE_PLAYER_UP],
            target: STATES.STARTING_GAME,
          },
        },
      },
      [STATES.STARTING_GAME]: {
        entry: [ACTIONS.PICK_INITIAL_LETTERS, ACTIONS.PERSIST_RACK],
        exit: [ACTIONS.TRIGGER_GAME_STARTED],
        always: [
          {
            cond: GUARDS.IS_UP,
            target: STATES.PLAYING,
          },
          { target: STATES.WAITING_FOR_TURN },
        ],
      },
      [STATES.PLAYING]: {
        on: {
          ...moveTileEvents,
          [EVENTS.GAME_STATE_PINGED]: {
            actions: [ACTIONS.PONG_GAME_STATE_PLAYING],
          },
          [EVENTS.WORD_SUBMITTED]: {
            actions: [
              ACTIONS.TALLY_SCORE,
              ACTIONS.PICK_NEW_LETTERS,
              ACTIONS.PERSIST_RACK,
              ACTIONS.CHANGE_TURN,
              ACTIONS.TRIGGER_TURN_OVER,
            ],
            cond: GUARDS.IS_WORD_VALID,
            target: STATES.WAITING_FOR_TURN,
          },
        },
      },
      [STATES.WAITING_FOR_TURN]: {
        on: {
          ...moveTileEvents,
          [EVENTS.GAME_STATE_PINGED]: {
            actions: [ACTIONS.PONG_GAME_STATE_PLAYING],
          },
          [EVENTS.TURN_OVER]: {
            actions: [ACTIONS.UPDATE_TURN_OVER_DATA],
            target: STATES.PLAYING,
          },
        },
      },
    },
  },
  {
    actions: {
      [ACTIONS.ADD_PLAYER]: assign({
        players: (context, event): Player[] => {
          const { member } = event as PlayerJoined

          return _.uniqBy(
            [...context.players, { id: member.id, name: member.info.name }],
            'id'
          )
        },
      }),
      [ACTIONS.CHANGE_TURN]: assign({
        playerUp: (context): string => {
          const { playerUp, players } = context
          const nextPlayerUp = _.find(players, ({ id }) => {
            return id !== playerUp
          })

          return nextPlayerUp?.id || playerUp
        },
      }),
      [ACTIONS.CHOOSE_PLAYER_UP]: assign(
        (context): Context => {
          const shuffledPlayers = _.shuffle(context.players)

          return {
            ...context,
            playerUp: shuffledPlayers[0].id,
          }
        }
      ),
      [ACTIONS.PERSIST_RACK]: (context): void => {
        persistRack({
          rack: context.rackLetters,
          roomName: context.roomName,
        })
      },
      [ACTIONS.PERSIST_ROOM_INFO]: (context): void => {
        const me = getMe(context.players)
        if (!me) {
          return
        }

        persistRoomInfo({
          roomHost: context.roomHost,
          roomName: context.roomName,
          userId: me.id,
          userName: me.name,
        })
      },
      [ACTIONS.PICK_INITIAL_LETTERS]: assign(
        (context): Context => {
          return {
            ...context,
            ...getRackLetters({
              numLetters: 7,
              remainingLetters: context.remainingLetters,
            }),
          }
        }
      ),
      [ACTIONS.PICK_NEW_LETTERS]: assign(
        (context): Context => {
          const { rackLetters, remainingLetters, turnUsedLetters } = context
          const {
            rackLetters: newLettersToAdd,
            remainingLetters: newRemainingLetters,
          } = getRackLetters({
            numLetters: turnUsedLetters.size,
            remainingLetters,
          })

          // We use this map instead of an array concatenation to maintain the user's tile order.
          const newRackLetters = rackLetters.map((letter) => {
            // If this letter was used in the user's last round, take one of the new letters.
            if (turnUsedLetters.has(letter.id)) {
              return newLettersToAdd.pop() as RackLetter
            }

            return letter
          })

          return {
            ...context,
            rackLetters: newRackLetters,
            rackLettersToBoardCells: {},
            remainingLetters: newRemainingLetters,
            turnUsedLetters: new Set(),
          }
        }
      ),
      [ACTIONS.PING_GAME_STATE]: (): void => {
        info('Pinging current game state...')

        publishEvent({
          data: {},
          eventName: REALTIME_EVENTS.PING_GAME_STATE,
        })
      },
      [ACTIONS.PONG_GAME_STATE_PLAYING]: (context): void => {
        info('Ponging game state playing...')

        publishEvent({
          data: {
            boardLetters: context.boardLetters,
            playerUp: context.playerUp,
            remainingLetters: context.remainingLetters,
            rounds: context.rounds,
            stage: 'playing',
          },
          eventName: REALTIME_EVENTS.PONG_GAME_STATE,
        })
      },
      [ACTIONS.PONG_GAME_STATE_WAITING]: (): void => {
        info('Ponging game state waiting...')

        publishEvent({
          data: {
            stage: 'waiting',
          },
          eventName: REALTIME_EVENTS.PONG_GAME_STATE,
        })
      },
      [ACTIONS.SET_LETTER_ON_BOARD]: assign<Context>(
        (context, event): Context => {
          const {
            boardLetters,
            draggingLetter,
            rackLettersToBoardCells,
            turnUsedLetters,
          } = context
          const { cellNum } = event as TilePlacedOnBoard

          if (!draggingLetter || boardLetters[cellNum]) {
            return { ...context, draggingLetter: null }
          }

          const newBoardLetters = {
            ...boardLetters,
            [cellNum]: draggingLetter,
          }

          const newTurnUsedLetters = new Set(turnUsedLetters)
          newTurnUsedLetters.add(draggingLetter.id)

          const newRackLettersToBoardCells = { ...rackLettersToBoardCells }
          const oldCellNum = newRackLettersToBoardCells[draggingLetter.id]
          if (oldCellNum) {
            delete newBoardLetters[oldCellNum]
          }
          newRackLettersToBoardCells[draggingLetter.id] = cellNum

          return {
            ...context,
            boardLetters: newBoardLetters,
            draggingLetter: null,
            rackLettersToBoardCells: newRackLettersToBoardCells,
            turnUsedLetters: newTurnUsedLetters,
          }
        }
      ),
      [ACTIONS.SET_LETTER_ON_RACK]: assign<Context>(
        (context, event): Context => {
          const {
            boardLetters,
            draggingLetter,
            rackLetters,
            rackLettersToBoardCells,
            turnUsedLetters,
          } = context
          const { rackLetterId } = event as TilePlacedOnRack

          if (!draggingLetter) {
            return context
          }

          const newTurnUsedLetters = new Set(turnUsedLetters)
          newTurnUsedLetters.delete(draggingLetter.id)

          const newBoardLetters = { ...boardLetters }
          const newRackLettersToBoardCells = { ...rackLettersToBoardCells }
          const oldCellNum = newRackLettersToBoardCells[draggingLetter.id]
          if (oldCellNum) {
            delete newBoardLetters[oldCellNum]
          }
          delete newRackLettersToBoardCells[draggingLetter.id]

          const newRackLetters = _.cloneDeep(rackLetters)
          const newRackIndex = _.findIndex(newRackLetters, { id: rackLetterId })
          const oldRackIndex = _.findIndex(newRackLetters, {
            id: draggingLetter.id,
          })
          if (newRackIndex !== oldRackIndex) {
            const temp = newRackLetters[newRackIndex]
            newRackLetters[newRackIndex] = newRackLetters[oldRackIndex]
            newRackLetters[oldRackIndex] = temp
          }

          return {
            ...context,
            boardLetters: newBoardLetters,
            draggingLetter: null,
            rackLetters: newRackLetters,
            rackLettersToBoardCells: newRackLettersToBoardCells,
            turnUsedLetters: newTurnUsedLetters,
          }
        }
      ),
      [ACTIONS.TALLY_SCORE]: assign({
        rounds: (context): Rounds => {
          const {
            boardLetters,
            playerUp,
            players,
            rackLetters,
            rackLettersToBoardCells,
            rounds,
            turnUsedLetters,
          } = context
          const newRounds = _.cloneDeep(rounds)
          const { words } = getWordsFromLetters({
            boardLetters,
            lettersToBoardCells: rackLettersToBoardCells,
            lettersToCheck: rackLetters.filter((letter) =>
              turnUsedLetters.has(letter.id)
            ),
          })

          let newScore = 0
          words.forEach((word) => {
            newScore =
              newScore +
              getScore({
                lettersToBoardCells: rackLettersToBoardCells,
                word,
              })
          })

          // Might want to display all words or the longest word at some point.
          const word = words[0].reduce((sum, { letter }) => {
            return sum + letter
          }, '')

          const turnResult: TurnResult = {
            score: newScore,
            word,
          }
          const currentRound = newRounds[newRounds.length - 1]
          currentRound[playerUp] = turnResult

          const haveAllPlayersGone = _.every(players, ({ id }) => {
            return currentRound[id]
          })
          if (haveAllPlayersGone) {
            newRounds.push({})
          }

          return newRounds
        },
      }),
      [ACTIONS.TRIGGER_GAME_STARTED]: (context): void => {
        publishEvent({
          data: {
            playerUp: context.playerUp,
            remainingLetters: context.remainingLetters,
          },
          eventName: REALTIME_EVENTS.GAME_STARTED,
        })
      },
      [ACTIONS.TRIGGER_TURN_OVER]: (context): void => {
        publishEvent({
          data: {
            boardLetters: context.boardLetters,
            playerUp: context.playerUp,
            remainingLetters: context.remainingLetters,
            rounds: context.rounds,
          },
          eventName: REALTIME_EVENTS.TURN_OVER,
        })
      },
      [ACTIONS.UPDATE_DRAGGING_LETTER]: assign({
        draggingLetter: (_context, event): RackLetter | null =>
          (event as DragStarted).letter,
      }),
      [ACTIONS.UPDATE_GAME_STARTED_DATA]: assign(
        (context, event): Context => {
          return {
            ...context,
            ...(event as GameStarted).data,
          }
        }
      ),
      [ACTIONS.UPDATE_IN_PROGRESS_GAME]: assign(
        (context, event): Context => {
          const { data } = event as GameStateResponseReceived
          const { stage, ...rest } = data

          if (stage === 'playing') {
            return {
              ...context,
              ...rest,
            }
          }

          return context
        }
      ),
      [ACTIONS.UPDATE_PLAYER_NAME]: assign({
        players: (context, event): Player[] => {
          const { playerId, value } = event as NameChanged
          const newPlayers = [...context.players]

          const playerToUpdate = _.find(newPlayers, { id: playerId })
          if (playerToUpdate) {
            playerToUpdate.name = value
          }

          return newPlayers
        },
      }),
      [ACTIONS.UPDATE_PLAYERS]: assign({
        players: (context, event): Player[] => {
          const { players } = context
          const { members } = event as FinishedJoiningRoom
          const newPlayers = [...players]

          members.each((member) => {
            newPlayers.push({ id: member.id, name: member.info.name })
          })

          return _.uniqBy(newPlayers, 'id')
        },
      }),
      [ACTIONS.UPDATE_ROOM_HOST]: assign({
        roomHost: (context): string => {
          const thisPlayer = _.find(context.players, 'thisPlayer')
          if (thisPlayer) {
            return thisPlayer.id
          }

          return context.roomHost
        },
      }),
      [ACTIONS.UPDATE_ROOM_NAME]: assign({
        roomName: (_context, event): string => {
          return (event as RoomNameChanged).value
        },
      }),
      [ACTIONS.UPDATE_TURN_OVER_DATA]: assign(
        (context, event): Context => {
          return {
            ...context,
            ...(event as TurnOver).data,
            rackLettersToBoardCells: {},
            turnUsedLetters: new Set(),
          }
        }
      ),
    },
    guards: {
      [GUARDS.AM_I_PLAYING]: (context, event) => {
        const me = getMe(context.players)
        const { data } = event as GameStateResponseReceived
        const { stage, ...rest } = data

        if (stage === 'playing' && me && 'playerUp' in rest) {
          return me.id === rest.playerUp
        }

        return false
      },
      [GUARDS.AM_I_WAITING]: (context, event) => {
        const me = getMe(context.players)
        const { data } = event as GameStateResponseReceived
        const { stage, ...rest } = data

        if (stage === 'playing' && me && 'playerUp' in rest) {
          return me.id !== rest.playerUp
        }

        return false
      },
      [GUARDS.HAS_ALL_JOIN_DATA]: (context) =>
        !!context.roomName && !!context.players[0].name,
      [GUARDS.HAS_ROOM_NAME]: (context) => !!context.roomName,
      [GUARDS.IS_EMPTY_ROOM]: (_context, event) => {
        return (event as FinishedJoiningRoom).members.count === 1
      },
      [GUARDS.IS_GAME_WAITING]: (_context, event) => {
        return (event as GameStateResponseReceived).data.stage === 'waiting'
      },
      [GUARDS.IS_WORD_VALID]: (context) => {
        const { allLettersUsed, words } = getWordsFromLetters({
          boardLetters: context.boardLetters,
          lettersToBoardCells: context.rackLettersToBoardCells,
          lettersToCheck: context.rackLetters.filter((letter) => {
            return context.turnUsedLetters.has(letter.id)
          }),
        })

        return words.length > 0 && allLettersUsed
      },
      [GUARDS.IS_UP]: (context) => {
        const { playerUp, players } = context

        return _.find(players, 'thisPlayer')?.id === playerUp
      },
    },
  }
)
