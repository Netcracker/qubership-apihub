import React from 'react';

const DiffBlockIdPrefixContext = React.createContext<string>('');

export const useDiffBlockIdPrefixContext = () => React.useContext(DiffBlockIdPrefixContext);

export const DiffBlockIdPrefixContextProvider: React.FC<{ idPrefix: string }> = React.memo(({ idPrefix, children }) => (
  <DiffBlockIdPrefixContext.Provider value={idPrefix}>{children}</DiffBlockIdPrefixContext.Provider>
));
