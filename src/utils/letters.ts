import _ from 'lodash'
import { v4 as uuidV4 } from 'uuid'

import { LetterDistribution, RackLetter } from './types'

const LETTER_DISTRIBUTION = {
  A: 9,
  B: 2,
  C: 2,
  D: 4,
  E: 12,
  F: 2,
  G: 3,
  H: 2,
  I: 9,
  J: 1,
  K: 1,
  L: 4,
  M: 2,
  N: 6,
  O: 8,
  P: 2,
  Q: 1,
  R: 6,
  S: 4,
  T: 6,
  U: 4,
  V: 2,
  W: 2,
  X: 1,
  Y: 2,
  Z: 1,
}

export const LETTER_POINTS = {
  A: 1,
  B: 3,
  C: 3,
  D: 2,
  E: 1,
  F: 4,
  G: 2,
  H: 4,
  I: 1,
  J: 8,
  K: 5,
  L: 1,
  M: 3,
  N: 1,
  O: 1,
  P: 3,
  Q: 10,
  R: 1,
  S: 1,
  T: 1,
  U: 1,
  V: 4,
  W: 4,
  X: 8,
  Y: 4,
  Z: 10,
}

/**
 * Returns a random selection of available letters.
 */
export function getRackLetters({
  numLetters,
  remainingLetters,
}: {
  numLetters: number
  remainingLetters: LetterDistribution
}): { rackLetters: RackLetter[]; remainingLetters: LetterDistribution } {
  const rackLetters: RackLetter[] = []
  const newRemainingLetters = { ...remainingLetters }

  // Get all letters that still are available in the letter distribution.
  let availableLetters = Object.keys(LETTER_POINTS).filter((letter) => {
    return newRemainingLetters[letter] > 0
  })

  while (rackLetters.length < numLetters && availableLetters.length > 0) {
    const randomLetter = _.shuffle(availableLetters)[0]
    newRemainingLetters[randomLetter] = Math.max(
      newRemainingLetters[randomLetter] - 1,
      0
    )

    // If this was the last instance of this letter, remove it from the available letters.
    if (newRemainingLetters[randomLetter] === 0) {
      availableLetters = availableLetters.filter((letter) => {
        return letter !== randomLetter
      })
    }

    rackLetters.push({
      id: uuidV4(),
      letter: randomLetter,
    })
  }

  return { rackLetters, remainingLetters: newRemainingLetters }
}

/**
 * Returns a full set of letters.
 */
export function getSetOfLetters(): LetterDistribution {
  return { ...LETTER_DISTRIBUTION }
}

/**
 * Returns the score for a word represented by its letters.
 */
export function getScore({ letters }: { letters: RackLetter[] }) {
  return letters.reduce((sum, currentLetter) => {
    return sum + LETTER_POINTS[currentLetter.letter]
  }, 0)
}
