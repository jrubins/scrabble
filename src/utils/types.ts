export type BoardLetters = Partial<{ [cellNum: number]: RackLetter }>

export interface GenericObject {
  [fieldName: string]: any
}

export interface LetterDistribution {
  [letter: string]: number
}

export interface LettersToBoardCells {
  [id: string]: number
}

export interface Member {
  id: string
  info: { name: string }
}

export interface Members {
  count: number
  each: (cb: (member: Member) => void) => void
  me: Member
}

export interface Player {
  id: string
  name: string
  thisPlayer?: boolean
}

export interface RackLetter {
  id: string
  letter: string
}

export type Rounds = Partial<{
  [playerId: string]: TurnResult
}>[]

export type ScoreMultiplier =
  | 'double-letter'
  | 'double-word'
  | 'triple-letter'
  | 'triple-word'

export interface ScoreMultipliers {
  [cellNum: number]: ScoreMultiplier
}

export interface TurnResult {
  score: number
  word: string
}
