export type BoardLetters = Partial<{ [cellNum: number]: RackLetter }>

export interface LetterDistribution {
  [letter: string]: number
}

export interface Member {
  id: string
  info: { name: string }
}

export interface Members {
  count: number
  each: (cb: (member: Member) => void) => void
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

export interface TurnResult {
  score: number
  word: string
}
