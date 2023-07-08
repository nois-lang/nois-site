import { Component, JSX } from 'solid-js'
import styles from './Toolbar.module.sass'

export const Toolbar: Component = (p): JSX.Element => {
    return (
        <div class={styles.Toolbar}>
            {p.children}
        </div>
    )
}
