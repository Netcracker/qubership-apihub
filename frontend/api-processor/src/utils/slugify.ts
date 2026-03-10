import createSlug, { Options } from 'slug'

export const SLUG_OPTIONS_DOCUMENT_ID: Options = {
    charmap: {
        ...createSlug.charmap,
        ...{
            '/': '-',
            '_': '_',
            '.': '-',
            '(': '-',
            ')': '-',
        },
    },
}

// Intended for human-readable titles (keeps original casing, uses spaces as separators)
export const SLUG_OPTIONS_TITLE: Options = {
    replacement: ' ',
    lower: false,
    trim: true,
    charmap: {
        ...createSlug.charmap,
        ...{
            '/': ' ',
            '_': ' ',
            '.': ' ',
            '(': ' ',
            ')': ' ',
            '-': ' ',
        },
    },
}

// additional characters are added for more selectivity
export const SLUG_OPTIONS_OPERATION_ID: Options = {
    charmap: {
        ...createSlug.charmap,
        ...{
            '/': '-',
            '_': '_',
            '(': '_',
            ')': '_',
            '[': '_',
            ']': '_',
            '{': '_',
            '}': '_',
            '*': '.',
            '.': '.',
        },
    },
    lower: false,   //for more selectivity
    trim: false,    //for more selectivity (trailing slashes case)
}

export const SLUG_OPTIONS_NORMALIZED_OPERATION_ID: Options = {
    ...SLUG_OPTIONS_OPERATION_ID,
    charmap: {
        ...SLUG_OPTIONS_OPERATION_ID.charmap,
        '*': '*',
    },
}

export const slugify = (text: string, options: Options, slugs: string[] = []): string => {
    if (!text) {
        return ''
    }

    const slug = createSlug(text, options)
    let suffix: string = ''
    // add suffix if not unique
    while (slugs.includes(slug + suffix)) { suffix = String(+suffix + 1) }
    return slug + suffix
}
