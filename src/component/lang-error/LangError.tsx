import { prettySourceMessage } from 'nois/dist/error'
import { LocationRange } from 'nois/dist/location'
import { Source } from 'nois/dist/source'
import { Component } from 'solid-js'
import styles from './LangError.module.scss'

type LangErrorProps = { message: string; location: LocationRange; source: Source }

export const LangError: Component<LangErrorProps> = p => {
    let msg = prettySourceMessage(p.message, p.location, p.source)
    return <pre class={styles.LangError}>{msg}</pre>
}
