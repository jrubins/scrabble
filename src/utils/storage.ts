import { RackLetter } from './types'
import { error } from './logs'

/**
 * The key we use to persist information in local storage.
 */
const STORAGE_KEY = 'scrabble-info'

export interface PersistedInfo {
  [roomName: string]: {
    rack: RackLetter[]
    roomHost: string
    userId: string
    userName: string
  }
}

/**
 * Returns the persisted information from local storage.
 */
export function getPersistedInfo(): PersistedInfo {
  try {
    const persistedInfo = window.localStorage.getItem(STORAGE_KEY)
    if (persistedInfo) {
      return JSON.parse(persistedInfo)
    }
  } catch (err) {
    error('Failed to parse persisted information. Error:', err.message)
  }

  return {}
}

/**
 * Persists the user's current rack letters.
 */
export function persistRack({
  rack,
  roomName,
}: {
  rack: RackLetter[]
  roomName: string
}): void {
  const persistedInfo = getPersistedInfo()
  const newPersistedInfo = {
    ...persistedInfo,
    [roomName]: {
      ...persistedInfo[roomName],
      rack,
    },
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newPersistedInfo))
  } catch (err) {
    error('Failed to persist rack to local storage. Error:', err.message)
  }
}

/**
 * Persists the user's information for the room into local storage.
 */
export function persistRoomInfo({
  roomHost,
  roomName,
  userId,
  userName,
}: {
  roomHost: string
  roomName: string
  userId: string
  userName: string
}): void {
  try {
    const infoToPersist: PersistedInfo = {
      [roomName]: { rack: [], roomHost, userId, userName },
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(infoToPersist))
  } catch (err) {
    error(
      'Failed to persist room information to local storage. Error:',
      err.message
    )
  }
}
