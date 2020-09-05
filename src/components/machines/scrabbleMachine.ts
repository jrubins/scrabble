import { Machine, assign } from 'xstate'
import _ from 'lodash'

import { LetterDistribution, RackLetter } from '../../utils/types'
import { getRackLetters, getSetOfLetters } from '../../utils/letters'

enum ACTIONS {
  PICK_INITIAL_LETTERS = 'PICK_INITIAL_LETTERS',
  PICK_NEW_LETTERS = 'PICK_NEW_LETTERS',
  SET_LETTER_ON_BOARD = 'SET_LETTER_ON_BOARD',
  SET_LETTER_ON_RACK = 'SET_LETTER_ON_RACK',
  UPDATE_LETTER = 'UPDATE_LETTER',
}

export enum EVENTS {
  DRAG_STARTED = 'DRAG_STARTED',
  TILE_PLACED_ON_BOARD = 'TILE_PLACED_ON_BOARD',
  TILE_PLACED_ON_RACK = 'TILE_PLACED_ON_RACK',
  WORD_SUBMITTED = 'WORD_SUBMITTED',
}

enum STATES {
  PLAYING = 'PLAYING',
}

export interface Context {
  boardLetters: Partial<{ [cellNum: number]: RackLetter }>
  draggingLetter: RackLetter | null
  rackLetters: RackLetter[]
  rackLettersToBoardCells: { [id: string]: number }
  remainingLetters: LetterDistribution
  turnUsedLetters: Set<string>
}

type DragStarted = { letter: RackLetter; type: EVENTS.DRAG_STARTED }
type TilePlacedOnBoard = { cellNum: number; type: EVENTS.TILE_PLACED_ON_BOARD }
type TilePlacedOnRack = {
  rackLetterId: string
  type: EVENTS.TILE_PLACED_ON_RACK
}
type WordSubmitted = { type: EVENTS.WORD_SUBMITTED }
export type Events =
  | DragStarted
  | TilePlacedOnBoard
  | TilePlacedOnRack
  | WordSubmitted

export const scrabbleMachine = Machine<Context, Events>(
  {
    context: {
      boardLetters: {},
      draggingLetter: null,
      rackLetters: [],
      rackLettersToBoardCells: {},
      remainingLetters: getSetOfLetters(),
      turnUsedLetters: new Set(),
    },
    initial: STATES.PLAYING,
    states: {
      [STATES.PLAYING]: {
        entry: [ACTIONS.PICK_INITIAL_LETTERS],
        on: {
          [EVENTS.DRAG_STARTED]: { actions: [ACTIONS.UPDATE_LETTER] },
          [EVENTS.TILE_PLACED_ON_BOARD]: {
            actions: [ACTIONS.SET_LETTER_ON_BOARD],
          },
          [EVENTS.TILE_PLACED_ON_RACK]: {
            actions: [ACTIONS.SET_LETTER_ON_RACK],
          },
          [EVENTS.WORD_SUBMITTED]: {
            actions: [ACTIONS.PICK_NEW_LETTERS],
          },
        },
      },
    },
  },
  {
    actions: {
      [ACTIONS.PICK_INITIAL_LETTERS]: assign((context) => {
        return {
          ...context,
          ...getRackLetters({
            numLetters: 7,
            remainingLetters: context.remainingLetters,
          }),
        }
      }),
      [ACTIONS.PICK_NEW_LETTERS]: assign((context) => {
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
          remainingLetters: newRemainingLetters,
          turnUsedLetters: new Set(),
        }
      }),
      [ACTIONS.SET_LETTER_ON_BOARD]: assign<Context>((context, event) => {
        const {
          boardLetters,
          draggingLetter,
          rackLettersToBoardCells,
          turnUsedLetters,
        } = context
        const { cellNum } = event as TilePlacedOnBoard

        if (!draggingLetter || boardLetters[cellNum]) {
          return { ...context, letter: null }
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
      }),
      [ACTIONS.SET_LETTER_ON_RACK]: assign<Context>((context, event) => {
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
      }),
      [ACTIONS.UPDATE_LETTER]: assign({
        draggingLetter: (_context, event) => (event as DragStarted).letter,
      }),
    },
  }
)
