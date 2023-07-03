/* @refresh reload */
import { render } from 'solid-js/web'

import './index.sass'
import { Playground } from './component/playground/Playground'
import { Route, Router, Routes } from '@solidjs/router'
import { Home } from './component/home/Home'

render(
    () => (
        <Router>
            <Routes>
                <Route path={'/'} component={Home}/>
                <Route path={'/play'} component={Playground}/>
            </Routes>
        </Router>
    ),
    document.getElementById('root')!
)
