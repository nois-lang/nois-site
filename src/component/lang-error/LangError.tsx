import { prettySourceMessage } from 'nois/error'
import { LocationRange } from 'nois/location'
import { Source } from 'nois/source'
import { Component } from 'solid-js'
import styles from './LangError.module.scss'

type LangErrorProps = { message: string; location: LocationRange; source: Source }

export const LangError: Component<LangErrorProps> = p => {
    let msg = prettySourceMessage(p.message, p.location, p.source)
    return <pre class={styles.LangError}>{msg}</pre>
}
