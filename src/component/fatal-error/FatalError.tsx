import { Component } from 'solid-js'
import styles from './FatalError.module.sass'
import { Toolbar } from '../toolbar/Toolbar'
import tippy from 'tippy.js'
import 'tippy.js/dist/tippy.css'

type FatalErrorProps = { message: string }

export const FatalError: Component<FatalErrorProps> = p => {
    const copyToClipboard = async () => {
        await navigator.clipboard.writeText(p.message)
        tippy(copyButton!, {
            content: 'copied!',
            showOnCreate: true,
            theme: 'nois',
            onHidden: t => t.destroy(),
            delay: [0, 200]
        })
    }

    let copyButton: HTMLButtonElement | undefined
    return <div class={styles.FatalError}>
        <p>Congratulations! You broke the compiler. 😑</p>
        <p><a href={'https://github.com/nois-lang/nois/issues'}>Report</a> the message below:</p>
        <div class={styles.container}>
            <Toolbar>
                <button
                    ref={copyButton}
                    type={'button'}
                    title={'Copy message to clipboard'}
                    onClick={copyToClipboard}
                >
                    <i class="fa-solid fa-clipboard"/>
                </button>
            </Toolbar>
            <pre>{p.message}</pre>
        </div>
    </div>
}

