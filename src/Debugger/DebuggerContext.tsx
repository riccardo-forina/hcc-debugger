import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface DebuggerContextType {
  overriddenFlags: Record<string, boolean>;
  markFlagOverridden: (flagName: string) => void;
  clearOverrides: () => void;
  isFlagOverridden: (flagName: string) => boolean;
  overrideCount: number;
}

const DebuggerContext = createContext<DebuggerContextType | null>(null);

export const useDebuggerContext = (): DebuggerContextType => {
  const context = useContext(DebuggerContext);
  if (!context) {
    throw new Error('useDebuggerContext must be used within a DebuggerProvider');
  }
  return context;
};

interface DebuggerProviderProps {
  children: ReactNode;
}

export const DebuggerProvider = ({ children }: DebuggerProviderProps) => {
  const [overriddenFlags, setOverriddenFlags] = useState<Record<string, boolean>>({});

  const markFlagOverridden = useCallback((flagName: string) => {
    setOverriddenFlags((prev) => ({
      ...prev,
      [flagName]: true,
    }));
  }, []);

  const clearOverrides = useCallback(() => {
    setOverriddenFlags({});
  }, []);

  const isFlagOverridden = useCallback(
    (flagName: string) => Boolean(overriddenFlags[flagName]),
    [overriddenFlags]
  );

  const overrideCount = Object.keys(overriddenFlags).length;

  return (
    <DebuggerContext.Provider
      value={{
        overriddenFlags,
        markFlagOverridden,
        clearOverrides,
        isFlagOverridden,
        overrideCount,
      }}
    >
      {children}
    </DebuggerContext.Provider>
  );
};

