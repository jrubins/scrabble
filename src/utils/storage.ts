import { error } from './logs'

/**
 * The key we use to persist information in local storage.
 */
const STORAGE_KEY = 'scrabble-info'

export interface PersistedUserInfo {
  [roomName: string]: {
    userId: string
    userName: string
  }
}

/**
 * Persists the user's information for the room into local storage.
 */
export function getPersistedUserInfo(): PersistedUserInfo {
  try {
    const persistedInfo = window.localStorage.getItem(STORAGE_KEY)
    if (persistedInfo) {
      return JSON.parse(persistedInfo)
    }
  } catch (err) {
    error('Failed to parse persisted user information. Error:', err.message)
  }

  return {}
}

/**
 * Persists the user's information for the room into local storage.
 */
export function persistUserInfo({
  roomName,
  userId,
  userName,
}: {
  roomName: string
  userId: string
  userName: string
}) {
  try {
    const infoToPersist: PersistedUserInfo = {
      [roomName]: { userId, userName },
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(infoToPersist))
  } catch (err) {
    error(
      'Failed to persist user information to local storage. Error:',
      err.message
    )
  }
}
