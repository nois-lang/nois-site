/* @refresh reload */
import { render } from 'solid-js/web'
import './index.scss'
import { Playground } from './component/playground/Playground'
import { Route, Router } from '@solidjs/router'
import { Home } from './component/home/Home'

render(
    () => (
        <Router>
            <Route path={'/'} component={Home} />
            <Route path={'/play'} component={Playground} />
        </Router>
    ),
    document.getElementById('root')!
)
