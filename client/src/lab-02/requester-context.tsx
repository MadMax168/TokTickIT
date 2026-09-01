import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type DevelopmentRequester = {
  id: number
  name: string
  email: string
}

type RequesterContextValue = {
  requester: DevelopmentRequester | null
  selectRequester: (requester: DevelopmentRequester) => void
  clearRequester: () => void
}

const RequesterContext = createContext<RequesterContextValue | null>(null)

export function RequesterProvider({ children }: { children: ReactNode }) {
  const [requester, setRequester] = useState<DevelopmentRequester | null>(null)
  const value = useMemo(
    () => ({
      requester,
      selectRequester: setRequester,
      clearRequester: () => setRequester(null),
    }),
    [requester],
  )

  return <RequesterContext.Provider value={value}>{children}</RequesterContext.Provider>
}

export function useRequesterContext() {
  const context = useContext(RequesterContext)
  if (!context) {
    throw new Error('useRequesterContext must be used inside RequesterProvider')
  }
  return context
}
