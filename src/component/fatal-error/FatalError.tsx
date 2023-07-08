import { Component } from 'solid-js'
import styles from './FatalError.module.sass'
import { Toolbar } from '../toolbar/Toolbar'

type FatalErrorProps = { message: string }

export const FatalError: Component<FatalErrorProps> = p => {
    return <div class={styles.FatalError}>
        <p>Congratulations! You broke the compiler. 😑</p>
        <p><a href={'https://github.com/nois-lang/nois/issues'}>Report</a> the message below:</p>
        <div class={styles.container}>
            <Toolbar>
                <button
                    type={'button'}
                    title={'Copy message to clipboard'}
                    onClick={() => copyToClipboard(p.message)}
                >
                    <i class="fa-solid fa-clipboard"/>
                </button>
            </Toolbar>
            <pre>{p.message}</pre>
        </div>
    </div>
}

const copyToClipboard = (msg: string) => {
    navigator.clipboard.writeText(msg)
}
