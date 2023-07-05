import { languages } from 'monaco-editor/esm/vs/editor/editor.api'

export const noisLanguageConfiguration: languages.LanguageConfiguration = {
    comments: {
        lineComment: '//'
    },
    brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')']
    ],
    autoClosingPairs: [
        { open: '[', close: ']' },
        { open: '{', close: '}' },
        { open: '(', close: ')' },
        { open: '"', close: '"', notIn: ['string'] }
    ],
    surroundingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: '\'', close: '\'' }
    ]
}

export const noisMonarchLanguage: languages.IMonarchLanguage = {
    tokenPostfix: '.nois',
    defaultToken: 'unknown',
    keywords: [
        'use',
        'type',
        'kind',
        'if',
        'else',
        'return',
        'impl',
        'let',
        'fn',
        'while',
        'for',
        'in',
        'match',

        'self'
    ],
    escapes: /\\([nrt0"'\\]|xh{2}|u\{h{1,6}})/,
    delimiters: /[,]/,
    symbols: /[!%&*+\-.\/:<=>@^|_]+/,

    tokenizer: {
        root: [
            [
                /[a-zA-Z][a-zA-Z0-9_]*!?|_[a-zA-Z0-9_]+/,
                {
                    cases: {
                        '@keywords': 'keyword',
                        '@default': 'identifier'
                    }
                }
            ],
            [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],
            [/'/, { token: 'char.quote', bracket: '@open', next: '@char' }],
            { include: '@numbers' },
            { include: '@whitespace' },
            [
                /@delimiters/,
                {
                    cases: {
                        '@keywords': 'keyword',
                        '@default': 'delimiter'
                    }
                }
            ],
            [/[{}()\[\]<>]/, '@brackets'],
        ],
        whitespace: [
            [/[ \t\r\n]+/, 'white'],
            [/\/\*/, 'comment', '@comment'],
            [/\/\/.*$/, 'comment']
        ],
        comment: [
            [/[^\/*]+/, 'comment'],
            [/\/\*/, 'comment', '@push'],
            ['\\*/', 'comment', '@pop'],
            [/[\/*]/, 'comment']
        ],
        string: [
            [/[^\\"]+/, 'string'],
            [/@escapes/, 'string.escape'],
            [/\\./, 'string.escape.invalid'],
            [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
        ],
        char: [
            [/[^\\']+/, 'char'],
            [/@escapes/, 'char.escape'],
            [/\\./, 'char.escape.invalid'],
            [/'/, { token: 'char.quote', bracket: '@close', next: '@pop' }]
        ],
        numbers: [
            //Float
            [/\b(\d\.?[\d_]*)\b/, { token: 'number' }],
            //Integer
            [/[\d][\d_]*/, { token: 'number' }]
        ]
    }
}
