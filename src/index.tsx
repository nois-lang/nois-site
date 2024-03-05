/* @refresh reload */
import { Route, Router } from '@solidjs/router'
import { render } from 'solid-js/web'
import { Home } from './component/home/Home'
import { Playground } from './component/playground/Playground'
import './index.scss'

render(
    () => (
        <Router explicitLinks={true}>
            <Route path={'/'} component={Home} />
            <Route path={'/play'} component={Playground} />
        </Router>
    ),
    document.getElementById('root')!
)
