import { Span } from 'nois/location'
import { Package } from 'nois/package'
import { createSignal } from 'solid-js'
import { CodeExample } from './editor'

export interface RefSpanPair {
    ref: HTMLDivElement
    span: Span
}

export type Tab = 'parse-tree' | 'ast-tree' | 'diagnostics' | 'emitted-declaration' | 'emitted-output'

export const [hovered, setHovered] = createSignal<RefSpanPair>()
export const [showGroups, setShowGroups] = createSignal(false)
export const [tab, setTab] = createSignal<Tab>('emitted-output')
export const [example, setExample] = createSignal<CodeExample>('welcome')
export const [std, setStd] = createSignal<Package>()
