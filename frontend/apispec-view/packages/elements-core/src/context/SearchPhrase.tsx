import * as React from 'react';
import { useContext } from 'react';

const SearchPhraseContext = React.createContext<string | undefined>(undefined);
SearchPhraseContext.displayName = 'SearchPhraseContext';

export const useSearchPhrase = () => useContext(SearchPhraseContext);

export { SearchPhraseContext };

