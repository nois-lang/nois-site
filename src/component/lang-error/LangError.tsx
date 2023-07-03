import { Source } from 'nois/dist/source'
import { Location } from 'nois/dist/location'
import { prettySourceMessage } from 'nois/dist/error'
import { Component } from 'solid-js'
import styles from './LangError.module.sass'

export const LangError: Component<{ message: string, location: Location, source: Source }> = (props) => {
    let msg = prettySourceMessage(props.message, props.location, props.source)
    return <pre class={styles.LangError}>{msg}</pre>
}
