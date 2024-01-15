import { Component, ParentProps } from 'solid-js'
import styles from './Toolbar.module.scss'

export const Toolbar: Component<ParentProps> = p => {
    return <div class={styles.Toolbar}>{p.children}</div>
}
