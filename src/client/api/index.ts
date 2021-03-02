import { v4 as uuid } from 'uuid'
import dayjs from 'dayjs'

import { NoteItem, SyncPayload, SettingsState, CategoryItem, SyncNotePayload } from '@/types'

function getCookieValue(a: string) {
  var b = document.cookie.match('(^|;)\\s*' + a + '\\s*=\\s*([^;]+)')

  return b ? b.pop() : ''
}

declare const window: any

const project_key = getCookieValue('pk')
const deta = window.Deta(project_key)

async function putNote(payload: any, key: string) {
  const item = JSON.parse(payload)
  item.key = key
  const db = deta.Base('notes')
  db.put(item).then((data: any) => {
    return data
  })
}

async function putCategories(payload: any) {
  const item = JSON.parse(payload)
  const cats = deta.Base('categories')
  cats.put({ key: 'categories', value: item })
}

async function putSettings(payload: any) {
  const item = payload
  item.key = 'settings'
  const sets = deta.Base('settings')
  sets.put(item)
}

const scratchpadNote = {
  id: uuid(),
  text: `# Scratchpad

The easiest note to find.`,
  category: '',
  scratchpad: true,
  favorite: false,
  created: dayjs().format(),
  lastUpdated: dayjs().format(),
}

const markdown = `# Welcome to Takenote!

TakeNote is a free, open-source notes app for the web. It is a demo project only, and does not integrate with any database or cloud. Your notes are saved in local storage and will not be permanently persisted, but are available for download.

View the source on [Github](https://github.com/taniarascia/takenote).

## Features

- **Plain text notes** - take notes in an IDE-like environment that makes no assumptions
- **Markdown preview** - view rendered HTML
- **Linked notes** - use \`{{uuid}}\` syntax to link to notes within other notes
- **Syntax highlighting** - light and dark mode available (based on the beautiful [New Moon theme](https://taniarascia.github.io/new-moon/))
- **Keyboard shortcuts** - use the keyboard for all common tasks - creating notes and categories, toggling settings, and other options
- **Drag and drop** - drag a note or multiple notes to categories, favorites, or trash
- **Multi-cursor editing** - supports multiple cursors and other [Codemirror](https://codemirror.net/) options
- **Search notes** - easily search all notes, or notes within a category
- **Prettify notes** - use Prettier on the fly for your Markdown
- **No WYSIWYG** - made for developers, by developers
- **No database** - notes are only stored in the browser's local storage and are available for download and export to you alone
- **No tracking or analytics** - 'nuff said
- **GitHub integration** - self-hosted option is available for auto-syncing to a GitHub repository (not available in the demo)
`

const welcomeNote = {
  id: uuid(),
  text: markdown,
  category: '',
  favorite: false,
  created: dayjs().format(),
  lastUpdated: dayjs().format(),
}

type PromiseCallback = (value?: any) => void
type GetLocalStorage = (
  key: string,
  errorMessage?: string
) => (resolve: PromiseCallback, reject: PromiseCallback) => void

const getCategories: GetLocalStorage = (key, errorMessage = 'Something went wrong') => async (
  resolve,
  reject
) => {
  const cats = deta.Base('categories')
  var data = await cats.get('categories')
  data = data.value
  if (data) {
    resolve(data)
  } else {
    reject({ message: errorMessage })
  }
}

const getSettings: GetLocalStorage = (key, errorMessage = 'Something went wrong') => async (
  resolve,
  reject
) => {
  const sets = deta.Base('settings')
  var data = await sets.get('settings')
  data = data
  if (data) {
    resolve(data)
  } else {
    reject({ message: errorMessage })
  }
}

const getUserNotes = () => async (resolve: PromiseCallback, reject: PromiseCallback) => {
  const db = deta.Base('notes')
  var values = await db.fetch().next()

  const notes: any = values.value

  // check if there is any data in localstorage
  if (!notes) {
    // if there is none (i.e. new user), create the welcomeNote and scratchpadNote
    resolve([scratchpadNote, welcomeNote])
  } else if (Array.isArray(notes)) {
    // if there is (existing user), show the user's notes
    resolve(
      // find does not work if the array is empty.
      notes.length === 0 || !notes.find((note: NoteItem) => note.scratchpad)
        ? [scratchpadNote, ...notes]
        : notes
    )
  } else {
    reject({
      message: 'Something went wrong',
    })
  }
}

export const saveState = ({ categories, notes }: SyncPayload) =>
  new Promise((resolve) => {
    localStorage.setItem('categories', JSON.stringify(categories))
    localStorage.setItem('notes', JSON.stringify(notes))

    resolve({
      categories: JSON.parse(localStorage.getItem('categories') || '[]'),
      notes: JSON.parse(localStorage.getItem('notes') || '[]'),
    })
  })

export const saveCats = (categories: CategoryItem[]) =>
  new Promise((resolve) => {
    const cats = putCategories(JSON.stringify(categories))
    resolve({
      categories: categories,
    })
  })

export const saveNotes = (notes: NoteItem[]) =>
  new Promise((resolve) => {
    for (var i = 0; i < notes.length; i++) {
      var saved = putNote(JSON.stringify(notes[i]), notes[i].id)
    }
  })
export const saveNote = ({ note, categories }: SyncNotePayload) =>
  new Promise((resolve) => {
    const noteId = note.id
    const saved = putNote(JSON.stringify(note), noteId)
    const cats = putCategories(JSON.stringify(categories))
    resolve({
      note: note,
      categories: categories,
    })
  })
export const saveSettings = ({ isOpen, ...settings }: SettingsState) => {
  Promise.resolve(putSettings(settings))
}
export const requestNotes = () => new Promise(getUserNotes())
export const requestCategories = () => new Promise(getCategories('categories'))
export const requestSettings = () => new Promise(getSettings('settings'))
