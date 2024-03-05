import { ParseNode, getSpan } from 'nois/parser'
import { Component } from 'solid-js'
import { hovered, setHovered } from '../../state'
import styles from './ParseTreePreview.module.scss'

type ParseTreePreviewProps = { node: ParseNode }

export const ParseTreePreview: Component<ParseTreePreviewProps> = p => {
    // biome-ignore lint: breaking
    let ref: HTMLDivElement | undefined = undefined
    return (
        <div
            ref={ref}
            class={styles.node}
            classList={{ [styles.hover]: hovered()?.ref === ref }}
            onpointerover={e => {
                if (!ref?.contains(e.target)) return
                setHovered({ ref, span: getSpan(p.node) })
                e.stopPropagation()
            }}
            onpointerleave={e => {
                if (!ref?.contains(e.target)) return
                setHovered(undefined)
            }}
        >
            <p class={styles.kind}>
                {p.node.kind}
                {'value' in p.node ? <code class={styles.value}>{formatValue(p.node.value)}</code> : ''}
            </p>
            <div class={styles.children}>
                {'nodes' in p.node ? p.node.nodes.map(n => <ParseTreePreview node={n} />) : ''}
            </div>
        </div>
    )
}

const formatValue = (value: string): string => {
    return value
        .replace('\b', '\\b')
        .replace('\t', '\\t')
        .replace('\n', '\\n')
        .replace('\v', '\\v')
        .replace('\f', '\\f')
        .replace('\r', '\\r')
}
