import _ from 'lodash'
import { v4 as uuidV4 } from 'uuid'

import { UserLetter } from './types'

const ALL_LETTERS = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
]

/**
 * Returns a random selection of available letters.
 */
export function getRandomLetters({
  numLetters,
}: {
  numLetters: number
}): UserLetter[] {
  return _.shuffle(ALL_LETTERS)
    .slice(0, numLetters)
    .map((letter) => {
      return {
        id: uuidV4(),
        letter,
      }
    })
}
