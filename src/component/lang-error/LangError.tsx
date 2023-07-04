import { Source } from 'nois/dist/source'
import { Location } from 'nois/dist/location'
import { prettySourceMessage } from 'nois/dist/error'
import { Component } from 'solid-js'
import styles from './LangError.module.sass'

type LangErrorProps = { message: string, location: Location, source: Source }

export const LangError: Component<LangErrorProps> = p => {
    let msg = prettySourceMessage(p.message, p.location, p.source)
    return <pre class={styles.LangError}>{msg}</pre>
}
