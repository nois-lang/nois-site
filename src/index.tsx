/* @refresh reload */
import { render } from 'solid-js/web'

import './index.sass'
import App from './component/app/App'

render(() => <App/>, (document.getElementById('root'))!)
