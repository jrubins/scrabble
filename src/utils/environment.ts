/**
 * Returns the name of the app environment.
 */
export function getAppEnvironment() {
  return process.env.APP_ENV
}

/**
 * Returns if we're currently in development or not.
 */
export function isDevelopment() {
  return process.env.NODE_ENV === 'development'
}

/**
 * Returns if we're currently in local or not.
 */
export function isLocal() {
  return getAppEnvironment() === 'local'
}

/**
 * Returns if we're currently in production or not.
 */
export function isProduction() {
  return getAppEnvironment() === 'production'
}
