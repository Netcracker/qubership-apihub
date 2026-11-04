import { createContext } from 'react';
import { DEFAULT_REVIEWER_ORDER } from './board/reviewers.ts';
import type { ReviewerGroup } from './board/reviewers.ts';
import type { Notes } from './board/notes.ts';
import { REST_URL } from './github/rest.ts';
import { DEFAULT_RULES } from './model/rules.ts';
import type { Rules } from './model/rules.ts';

// The viewer's attention rules, for components deep in the table.
export const RulesContext = createContext<Rules>(DEFAULT_RULES);

// How a row's controls name its PR to screen readers: "PR #12", or "PR gadgets#12" when the board shows several
// repositories, since a PR is identified by repository and number (DATA-20).
export const PrNameContext = createContext('PR');

// Where the comments panel loads the full list, and the viewer's token if there is one.
interface Api {
  token: string;
  restUrl: string;
}
export const ApiContext = createContext<Api>({ token: '', restUrl: REST_URL });

// Notes per PR (NOTE-1), for the note buttons and panels. A change renders those buttons again, and only the row
// of that note, since the other rows keep their identity (useNoteText).
interface NotesApi {
  notes: Notes;
  update: (key: string, text: string) => void;
  // The last change could not be written to this browser's storage.
  saveFailed: boolean;
}
export const NotesContext = createContext<NotesApi>({ notes: {}, update: () => {}, saveFailed: false });

// How the Review column shows reviews (SET-20), and who is looking, so their own review stands out (TABLE-30).
interface ReviewView {
  list: boolean;
  viewer: string;
  // The order of the reviewer groups (SET-25).
  order: ReviewerGroup[];
}
export const ReviewViewContext = createContext<ReviewView>({ list: false, viewer: '', order: DEFAULT_REVIEWER_ORDER });
