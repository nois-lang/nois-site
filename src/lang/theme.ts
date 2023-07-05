import { editor } from 'monaco-editor/esm/vs/editor/editor.api'

export const lightRuleThemes: editor.ITokenThemeRule[] = [
    { token: 'keyword', foreground: '#5c2e81' },
    { token: 'string', foreground: '#3a6e1f' },
    { token: 'number', foreground: '#a65437' },
    { token: 'comment', foreground: '#444444' },
]

export const darkRuleThemes: editor.ITokenThemeRule[] = [
    { token: 'keyword', foreground: '#d3a8ef' },
    { token: 'string', foreground: '#a6d189' },
    { token: 'number', foreground: '#ffb499' },
    { token: 'comment', foreground: '#cccccc' },
]

export const noisLightTheme: editor.IStandaloneThemeData = {
    base: 'vs',
    inherit: false,
    rules: lightRuleThemes,
    colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#000000',
    }
}

export const noisDarkTheme: editor.IStandaloneThemeData = {
    base: 'vs-dark',
    inherit: false,
    rules: darkRuleThemes,
    colors: {
        'editor.background': '#222222',
        'editor.foreground': '#ffffff',
    },
}
