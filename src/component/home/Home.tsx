import type { Component } from 'solid-js'
import logo from '../../assets/logo_full.svg'

import styles from './Home.module.sass'
import { A } from '@solidjs/router'

export const Home: Component = () => {
    return (
        <div class={styles.Home}>
            <div class={styles.content}>
                <div class={styles.header}>
                    <A href={'/'}>Home</A>
                    <A href={'/play'}>Playground</A>
                    <div class={styles.right}>
                        <A href={'https://github.com/nois-lang'}><i class="fa-brands fa-github"></i></A>
                    </div>
                </div>
                <div class={styles.hero}>
                    <img src={logo} alt={'Nois logo'}/>
                    <h1>Nois</h1>
                    <p>Statically typed programming language for the web</p>
                </div>
            </div>
        </div>
    )
}