import _ from 'lodash'
import Pusher, { Channel } from 'pusher-js'

import {
  BoardLetters,
  LetterDistribution,
  Member,
  Members,
  Rounds,
} from './types'

export enum REALTIME_EVENTS {
  GAME_STARTED = 'client-game_started',
  JOINED_ROOM = 'pusher:subscription_succeeded',
  PING_GAME_STATE = 'client-game_state_ping',
  PONG_GAME_STATE = 'client-game_state_pong',
  PLAYER_JOINED = 'pusher:member_added',
  TURN_OVER = 'client-turn_over',
}

interface EventCallbacks {
  [REALTIME_EVENTS.GAME_STARTED]: (data: GameStartedData) => void
  [REALTIME_EVENTS.JOINED_ROOM]: (members: Members) => void
  [REALTIME_EVENTS.PING_GAME_STATE]: () => void
  [REALTIME_EVENTS.PONG_GAME_STATE]: (data: PongGameStateData) => void
  [REALTIME_EVENTS.PLAYER_JOINED]: (member: Member) => void
  [REALTIME_EVENTS.TURN_OVER]: (data: TurnOverData) => void
}

export interface GameStartedData {
  playerUp: string
  remainingLetters: LetterDistribution
}

export type PongGameStateData =
  | {
      stage: 'waiting'
    }
  | {
      boardLetters: BoardLetters
      playerUp: string
      remainingLetters: LetterDistribution
      rounds: Rounds
      stage: 'playing'
    }

export interface TurnOverData {
  boardLetters: BoardLetters
  playerUp: string
  remainingLetters: LetterDistribution
  rounds: Rounds
}

let pusher: Pusher | null = null
let subscription: Channel | null = null

/**
 * Sets up the
 */
export function initRealtimeConnection({
  callbacks,
  channel,
  userId,
  userName,
}: {
  callbacks: EventCallbacks
  channel: string
  userId: string
  userName: string
}) {
  const pusherAppKey = process.env.PUSHER_APP_KEY
  if (!pusherAppKey) {
    throw new Error('Please add the PUSHER_APP_KEY environment variable.')
  }

  pusher = new Pusher(pusherAppKey, {
    auth: { params: { userId, userName } },
    authEndpoint: `${process.env.API_BASE_URL}/pusher-auth`,
    cluster: 'us2',
  })

  subscription = pusher.subscribe(`presence-${channel}`)

  _.forEach(callbacks, (callback, event) => {
    if (!subscription) {
      return
    }

    subscription.bind(event, callback)
  })
}

/**
 * Sends an event. Note that data is required even
 * if it's an empty object.
 */
export function publishEvent<T extends REALTIME_EVENTS>({
  data,
  eventName,
}:
  | {
      data: GameStartedData
      eventName: REALTIME_EVENTS.GAME_STARTED
    }
  | {
      data: TurnOverData
      eventName: REALTIME_EVENTS.TURN_OVER
    }
  | {
      data: {}
      eventName: REALTIME_EVENTS.PING_GAME_STATE
    }
  | {
      data: PongGameStateData
      eventName: REALTIME_EVENTS.PONG_GAME_STATE
    }) {
  if (!subscription) {
    return
  }

  subscription.trigger(eventName, data)
}
