import _ from 'lodash'

import { Player } from './types'

/**
 * Returns the current player.
 */
export function getMe(players: Player[]): Player | undefined {
  const me = _.find(players, 'thisPlayer')

  return me
}
