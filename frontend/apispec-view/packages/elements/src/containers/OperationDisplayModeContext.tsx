import React from 'react';

export const DEFAULT_DISPLAY_MODE = 'default';
export const COMPARE_DISPLAY_MODE = 'compare';
export type OperationDisplayMode = typeof DEFAULT_DISPLAY_MODE | typeof COMPARE_DISPLAY_MODE;

export const OperationDisplayModeContext = React.createContext<OperationDisplayMode>(null!);

export const useOperationDisplayMode = () => React.useContext(OperationDisplayModeContext);
