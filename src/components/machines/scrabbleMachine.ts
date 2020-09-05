import { Machine, assign } from 'xstate'
import _ from 'lodash'
import { v4 as uuidV4 } from 'uuid'

import {
  REALTIME_EVENTS,
  GameStartedData,
  TurnOverData,
  publishEvent,
} from '../../utils/realtime'
import {
  BoardLetters,
  LetterDistribution,
  Player,
  RackLetter,
  Rounds,
  TurnResult,
} from '../../utils/types'
import { getRackLetters, getSetOfLetters, getScore } from '../../utils/letters'

export enum ACTIONS {
  ADD_PLAYER = 'ADD_PLAYER',
  CHANGE_TURN = 'CHANGE_TURN',
  CHOOSE_PLAYER_UP = 'CHOOSE_PLAYER_UP',
  JOIN_ROOM = 'JOIN_ROOM',
  PICK_INITIAL_LETTERS = 'PICK_INITIAL_LETTERS',
  PICK_NEW_LETTERS = 'PICK_NEW_LETTERS',
  SET_LETTER_ON_BOARD = 'SET_LETTER_ON_BOARD',
  SET_LETTER_ON_RACK = 'SET_LETTER_ON_RACK',
  TALLY_SCORE = 'TALLY_SCORE',
  TRIGGER_GAME_STARTED = 'TRIGGER_GAME_STARTED',
  TRIGGER_TURN_OVER = 'TRIGGER_TURN_OVER',
  UPDATE_DRAGGING_LETTER = 'UPDATE_DRAGGING_LETTER',
  UPDATE_GAME_STARTED_DATA = 'UPDATE_GAME_STARTED_DATA',
  UPDATE_PLAYER_NAME = 'UPDATE_PLAYER_NAME',
  UPDATE_ROOM_NAME = 'UPDATE_ROOM_NAME',
  UPDATE_TURN_OVER_DATA = 'UPDATE_TURN_OVER_DATA',
}

export enum EVENTS {
  CREATE_ROOM = 'CREATE_ROOM',
  DRAG_STARTED = 'DRAG_STARTED',
  GAME_STARTED = 'GAME_STARTED',
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
  HAS_ROOM_NAME = 'HAS_ROOM_NAME',
  IS_UP = 'IS_UP',
}

export enum STATES {
  BOOT = 'BOOT',
  CREATING_ROOM = 'CREATING_ROOM',
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
  rackLettersToBoardCells: { [id: string]: number }
  remainingLetters: LetterDistribution
  roomName: string
  rounds: Rounds
  turnUsedLetters: Set<string>
}

type CreateRoom = { type: EVENTS.CREATE_ROOM }
type DragStarted = { letter: RackLetter; type: EVENTS.DRAG_STARTED }
type GameStarted = {
  data: GameStartedData
  type: EVENTS.GAME_STARTED
}
type JoinRoom = { type: EVENTS.JOIN_ROOM }
type NameChanged = {
  playerId: string
  type: EVENTS.NAME_CHANGED
  value: string
}
type PlayerJoined = {
  id: string
  name: string
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
  | GameStarted
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
      players: [{ id: uuidV4(), name: '', thisPlayer: true }],
      rackLetters: [],
      rackLettersToBoardCells: {},
      remainingLetters: getSetOfLetters(),
      roomName: '',
      rounds: [{}],
      turnUsedLetters: new Set(),
    },
    id: 'scrabble',
    initial: STATES.BOOT,
    states: {
      [STATES.BOOT]: {
        always: [
          { cond: GUARDS.HAS_ROOM_NAME, target: STATES.JOINING_ROOM },
          { target: STATES.CREATING_ROOM },
        ],
      },
      [STATES.CREATING_ROOM]: {
        on: {
          [EVENTS.NAME_CHANGED]: { actions: [ACTIONS.UPDATE_PLAYER_NAME] },
          [EVENTS.ROOM_NAME_CHANGED]: { actions: [ACTIONS.UPDATE_ROOM_NAME] },
          [EVENTS.CREATE_ROOM]: {
            actions: [ACTIONS.JOIN_ROOM],
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
      [STATES.WAITING_FOR_PLAYERS]: {
        on: {
          [EVENTS.GAME_STARTED]: {
            actions: [ACTIONS.UPDATE_GAME_STARTED_DATA],
            target: STATES.STARTING_GAME,
          },
          [EVENTS.PLAYER_JOINED]: { actions: [ACTIONS.ADD_PLAYER] },
          [EVENTS.START_GAME]: {
            actions: [ACTIONS.CHOOSE_PLAYER_UP],
            target: STATES.STARTING_GAME,
          },
        },
      },
      [STATES.STARTING_GAME]: {
        entry: [ACTIONS.PICK_INITIAL_LETTERS],
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
          [EVENTS.WORD_SUBMITTED]: {
            actions: [
              ACTIONS.TALLY_SCORE,
              ACTIONS.PICK_NEW_LETTERS,
              ACTIONS.CHANGE_TURN,
              ACTIONS.TRIGGER_TURN_OVER,
            ],
            target: STATES.WAITING_FOR_TURN,
          },
        },
      },
      [STATES.WAITING_FOR_TURN]: {
        on: {
          ...moveTileEvents,
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
          const { id, name } = event as PlayerJoined

          return _.uniqBy([...context.players, { id, name }], 'id')
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
          const newScore = getScore({
            letters: rackLetters.filter((letter) =>
              turnUsedLetters.has(letter.id)
            ),
          })

          const orderedUsedLetters = _.orderBy(
            _.map(rackLettersToBoardCells, (boardCellNum, letterId) => ({
              boardCellNum,
              letterId,
            })),
            'boardCellNum',
            'asc'
          )
          let direction = ''
          if (
            (orderedUsedLetters[1].boardCellNum -
              orderedUsedLetters[0].boardCellNum) %
              15 ===
            0
          ) {
            direction = 'down'
          } else if (
            orderedUsedLetters[1].boardCellNum -
              orderedUsedLetters[0].boardCellNum ===
            1
          ) {
            direction = 'left'
          } else {
            return rounds
          }

          let currentCellNum = orderedUsedLetters[0].boardCellNum
          while (true) {
            const previousCell =
              direction === 'down' ? currentCellNum - 15 : currentCellNum - 1
            const letter = boardLetters[previousCell]
            if (!letter) {
              break
            }

            currentCellNum = previousCell
          }

          let word = ''
          while (true) {
            const letter = boardLetters[currentCellNum]
            if (!letter) {
              break
            }

            word = word + letter.letter
            currentCellNum =
              direction === 'down' ? currentCellNum + 15 : currentCellNum + 1
          }

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
      [GUARDS.HAS_ROOM_NAME]: (context) => !!context.roomName,
      [GUARDS.IS_UP]: (context) => {
        const { playerUp, players } = context

        return _.find(players, 'thisPlayer')?.id === playerUp
      },
    },
  }
)
