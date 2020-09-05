import { Machine, assign } from 'xstate'
import _ from 'lodash'

import { LetterDistribution, UserLetter } from '../../utils/types'
import { getSetOfLetters, getUserLetters } from '../../utils/letters'

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
  letter: UserLetter | null
  letters: Partial<{ [cellNum: number]: UserLetter }>
  remainingLetters: LetterDistribution
  usedLetters: Set<string>
  userLetters: UserLetter[]
  userLettersToCells: { [id: string]: number }
}

type DragStarted = { letter: UserLetter; type: EVENTS.DRAG_STARTED }
type TilePlacedOnBoard = { cellNum: number; type: EVENTS.TILE_PLACED_ON_BOARD }
type TilePlacedOnRack = {
  userLetterId: string
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
      letter: null,
      letters: {},
      remainingLetters: getSetOfLetters(),
      usedLetters: new Set(),
      userLetters: [],
      userLettersToCells: {},
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
          ...getUserLetters({
            numLetters: 7,
            remainingLetters: context.remainingLetters,
          }),
        }
      }),
      [ACTIONS.PICK_NEW_LETTERS]: assign((context) => {
        const { remainingLetters, usedLetters, userLetters } = context
        const {
          remainingLetters: newRemainingLetters,
          userLetters: newLettersToAdd,
        } = getUserLetters({
          numLetters: usedLetters.size,
          remainingLetters,
        })

        // We use this map instead of an array concatenation to maintain the user's tile order.
        const newUserLetters = userLetters.map((letter) => {
          // If this letter was used in the user's last round, take one of the new letters.
          if (usedLetters.has(letter.id)) {
            return newLettersToAdd.pop() as UserLetter
          }

          return letter
        })

        return {
          ...context,
          remainingLetters: newRemainingLetters,
          usedLetters: new Set(),
          userLetters: newUserLetters,
        }
      }),
      [ACTIONS.SET_LETTER_ON_BOARD]: assign<Context>((context, event) => {
        const { letter, letters, usedLetters, userLettersToCells } = context
        const { cellNum } = event as TilePlacedOnBoard

        if (!letter || letters[cellNum]) {
          return { ...context, letter: null }
        }

        const newLetters = {
          ...letters,
          [cellNum]: letter,
        }

        const newUsedLetters = new Set(usedLetters)
        newUsedLetters.add(letter.id)

        const newUserLettersToCells = { ...userLettersToCells }
        const oldCellNum = newUserLettersToCells[letter.id]
        if (oldCellNum) {
          delete newLetters[oldCellNum]
        }
        newUserLettersToCells[letter.id] = cellNum

        return {
          ...context,
          letter: null,
          letters: newLetters,
          usedLetters: newUsedLetters,
          userLettersToCells: newUserLettersToCells,
        }
      }),
      [ACTIONS.SET_LETTER_ON_RACK]: assign<Context>((context, event) => {
        const {
          letter,
          letters,
          usedLetters,
          userLetters,
          userLettersToCells,
        } = context
        const { userLetterId } = event as TilePlacedOnRack

        if (!letter) {
          return context
        }

        const newUsedLetters = new Set(usedLetters)
        newUsedLetters.delete(letter.id)

        const newLetters = { ...letters }
        const newUserLettersToCells = { ...userLettersToCells }
        const oldCellNum = newUserLettersToCells[letter.id]
        if (oldCellNum) {
          delete newLetters[oldCellNum]
        }
        delete newUserLettersToCells[letter.id]

        const newUserLetters = _.cloneDeep(userLetters)
        const newRackIndex = _.findIndex(userLetters, { id: userLetterId })
        const oldRackIndex = _.findIndex(userLetters, { id: letter.id })
        if (newRackIndex !== oldRackIndex) {
          const temp = newUserLetters[newRackIndex]
          newUserLetters[newRackIndex] = newUserLetters[oldRackIndex]
          newUserLetters[oldRackIndex] = temp
        }

        return {
          ...context,
          letter: null,
          letters: newLetters,
          usedLetters: newUsedLetters,
          userLetters: newUserLetters,
          userLettersToCells: newUserLettersToCells,
        }
      }),
      [ACTIONS.UPDATE_LETTER]: assign({
        letter: (_context, event) => (event as DragStarted).letter,
      }),
    },
  }
)
