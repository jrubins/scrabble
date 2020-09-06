import _ from 'lodash'
import { v4 as uuidV4 } from 'uuid'

import {
  BoardLetters,
  LetterDistribution,
  LettersToBoardCells,
  RackLetter,
  ScoreMultiplier,
  ScoreMultipliers,
} from './types'

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
 * This is a map of board cell numbers to score multipliers. This is only the top
 * half of the board. The bottom half is a mirror image of the top half and can
 * therefore be generated dynamically.
 */
const SCORE_MULTIPLIERS: ScoreMultipliers = {
  0: 'triple-word',
  3: 'double-letter',
  7: 'triple-word',
  11: 'double-letter',
  14: 'triple-word',
  16: 'double-word',
  20: 'triple-letter',
  24: 'triple-letter',
  28: 'double-word',
  32: 'double-word',
  36: 'double-letter',
  38: 'double-letter',
  42: 'double-word',
  45: 'double-letter',
  48: 'double-word',
  52: 'double-letter',
  56: 'double-word',
  59: 'double-letter',
  64: 'double-word',
  70: 'double-word',
  76: 'triple-letter',
  80: 'triple-letter',
  84: 'triple-letter',
  88: 'triple-letter',
  92: 'double-letter',
  96: 'double-letter',
  98: 'double-letter',
  102: 'double-letter',
  105: 'triple-word',
  108: 'double-letter',
  112: 'double-word',
  116: 'double-letter',
  119: 'triple-word',
}

/**
 * Returns the score multiplier for the provided cell.
 */
export function getCellScoreMultiplier(
  cellNum: number
): ScoreMultiplier | undefined {
  let adjustedCellNum = cellNum
  if (cellNum >= 120) {
    const rowsPastMidpoint = Math.ceil((cellNum + 1 - 120) / 15) * 2

    adjustedCellNum = cellNum - rowsPastMidpoint * 15
  }

  return SCORE_MULTIPLIERS[adjustedCellNum]
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
export function getScore({
  lettersToBoardCells,
  word,
}: {
  lettersToBoardCells: LettersToBoardCells
  word: RackLetter[]
}) {
  let wordMultiplier = 1
  const score = word.reduce((sum, currentLetter) => {
    let letterScore = LETTER_POINTS[currentLetter.letter]
    const cellNum = lettersToBoardCells[currentLetter.id]

    const scoreMultiple = getCellScoreMultiplier(cellNum)
    if (scoreMultiple === 'double-letter') {
      letterScore = letterScore * 2
    } else if (scoreMultiple === 'triple-letter') {
      letterScore = letterScore * 3
    } else if (scoreMultiple === 'double-word') {
      wordMultiplier = wordMultiplier * 2
    } else if (scoreMultiple === 'triple-word') {
      wordMultiplier = wordMultiplier * 3
    }

    return sum + letterScore
  }, 0)

  return score * wordMultiplier
}

/**
 * Returns all valid words that can be constructed on the board given
 * the letters to check. A valid word is one that is at least two letters
 * long vertically or horizontally. Additionally, this method returns
 * whether or not all the provided letters were used in a valid word.
 */
export function getWordsFromLetters({
  boardLetters,
  lettersToBoardCells,
  lettersToCheck,
}: {
  boardLetters: BoardLetters
  lettersToBoardCells: LettersToBoardCells
  lettersToCheck: RackLetter[]
}): { allLettersUsed: boolean; words: RackLetter[][] } {
  const validWords: RackLetter[][] = []
  const letterIdsVisited: Set<string> = new Set()

  const cellNum = lettersToBoardCells[lettersToCheck[0].id]
  letterIdsVisited.add(lettersToCheck[0].id)
  let cellAbove = cellNum - 15
  const verticalWord = [lettersToCheck[0]]
  let letterAbove = boardLetters[cellAbove]
  while (cellAbove > 0 && letterAbove) {
    letterIdsVisited.add(letterAbove.id)
    verticalWord.unshift(letterAbove)
    cellAbove = cellAbove - 15
    letterAbove = boardLetters[cellAbove]
  }

  let cellBelow = cellNum + 15
  let letterBelow = boardLetters[cellBelow]
  while (cellBelow < 15 * 15 && letterBelow) {
    letterIdsVisited.add(letterBelow.id)
    verticalWord.push(letterBelow)
    cellBelow = cellBelow + 15
    letterBelow = boardLetters[cellBelow]
  }

  if (verticalWord.length > 1) {
    validWords.push(verticalWord)
  }

  let cellLeft = cellNum - 1
  const horizontalWord = [lettersToCheck[0]]
  let letterLeft = boardLetters[cellLeft]
  while (cellLeft > 0 && letterLeft) {
    letterIdsVisited.add(letterLeft.id)
    horizontalWord.unshift(letterLeft)
    cellLeft = cellLeft - 1
    letterLeft = boardLetters[cellLeft]
  }

  let cellRight = cellNum + 1
  let letterRight = boardLetters[cellRight]
  while (cellRight < 15 * 15 && letterRight) {
    letterIdsVisited.add(letterRight.id)
    horizontalWord.push(letterRight)
    cellRight = cellRight + 1
    letterRight = boardLetters[cellRight]
  }

  if (horizontalWord.length > 1) {
    validWords.push(horizontalWord)
  }

  return {
    allLettersUsed: _.every(lettersToCheck, (letter) => {
      return letterIdsVisited.has(letter.id)
    }),
    words: validWords,
  }
}
