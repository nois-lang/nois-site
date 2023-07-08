import { Component, ParentProps } from 'solid-js'
import styles from './Toolbar.module.sass'

export const Toolbar: Component<ParentProps> = p => {
    return (
        <div class={styles.Toolbar}>
            {p.children}
        </div>
    )
}
