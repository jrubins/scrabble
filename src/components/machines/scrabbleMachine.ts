import { Machine, assign } from 'xstate'

import { getRandomLetters } from '../../utils/letters'
import { UserLetter } from '../../utils/types'

enum ACTIONS {
  PICK_NEW_LETTERS = 'PICK_NEW_LETTERS',
  SET_LETTER_ON_BOARD = 'SET_LETTER_ON_BOARD',
  UPDATE_LETTER = 'UPDATE_LETTER',
}

export enum EVENTS {
  DRAG_STARTED = 'DRAG_STARTED',
  DRAG_STOPPED = 'DRAG_STOPPED',
  WORD_SUBMITTED = 'WORD_SUBMITTED',
}

enum STATES {
  IDLE = 'IDLE',
}

export interface Context {
  letter: UserLetter | null
  letters: Partial<{ [cellNum: number]: UserLetter }>
  usedLetters: Set<string>
  userLetters: UserLetter[]
  userLettersToCells: { [id: string]: number }
}

type DragStarted = { letter: UserLetter; type: EVENTS.DRAG_STARTED }
type DragStopped = { cellNum: number; type: EVENTS.DRAG_STOPPED }
type WordSubmitted = { type: EVENTS.WORD_SUBMITTED }
export type Events = DragStarted | DragStopped | WordSubmitted

export const scrabbleMachine = Machine<Context, Events>(
  {
    context: {
      letter: null,
      letters: {},
      usedLetters: new Set(),
      userLetters: [],
      userLettersToCells: {},
    },
    initial: STATES.IDLE,
    states: {
      [STATES.IDLE]: {
        on: {
          [EVENTS.DRAG_STARTED]: { actions: [ACTIONS.UPDATE_LETTER] },
          [EVENTS.DRAG_STOPPED]: {
            actions: [ACTIONS.SET_LETTER_ON_BOARD],
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
      [ACTIONS.PICK_NEW_LETTERS]: assign<Context>({
        userLetters: (context) => {
          const { usedLetters, userLetters } = context
          const newLetters = getRandomLetters({
            numLetters: usedLetters.size,
          })

          return userLetters.map((letter) => {
            if (usedLetters.has(letter.id)) {
              return newLetters.pop() as UserLetter
            }

            return letter
          })
        },
        usedLetters: new Set(),
      }),
      [ACTIONS.SET_LETTER_ON_BOARD]: assign<Context>((context, event) => {
        const { letter, letters, usedLetters, userLettersToCells } = context
        const { cellNum } = event as DragStopped

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
      [ACTIONS.UPDATE_LETTER]: assign({
        letter: (_context, event) => (event as DragStarted).letter,
      }),
    },
  }
)
