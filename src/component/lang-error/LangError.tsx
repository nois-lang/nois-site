import { prettySourceMessage } from 'nois/error'
import { Span } from 'nois/location'
import { Source } from 'nois/source'
import { Component } from 'solid-js'
import styles from './LangError.module.scss'

type LangErrorProps = { message: string; span: Span; source: Source }

export const LangError: Component<LangErrorProps> = p => {
    const msg = prettySourceMessage(p.message, p.span, p.source)
    return <pre class={styles.LangError}>{msg}</pre>
}
