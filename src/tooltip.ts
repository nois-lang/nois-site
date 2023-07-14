import tippy from 'tippy.js'

export const showTooltip = (ref: HTMLElement, content: string): void => {
    tippy(ref, { content, showOnCreate: true, theme: 'nois', onHidden: t => t.destroy(), delay: [0, 200] })
}
