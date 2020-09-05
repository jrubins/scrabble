import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter } from 'react-router-dom'
import { inspect } from '@xstate/inspect'
import { setConfig } from 'react-hot-loader'

// Import the entry SCSS file for styles.
import './styles/main.scss'

import App from './components/App'

inspect({ iframe: false })

setConfig({
  reloadHooks: false,
})

ReactDOM.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
  document.getElementById('app')
)
