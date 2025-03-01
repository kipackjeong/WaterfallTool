import { type ReactNode, createContext, useRef, useContext } from 'react'
import { useStore } from 'zustand'
import { createInstanceStore, type InstanceStore } from './instance.store'

export type InstanceStoreApi = ReturnType<typeof createInstanceStore>

export const InstanceStoreContext = createContext<InstanceStoreApi | undefined>(
  undefined,
)

export interface InstanceStoreProviderProps {
  children: ReactNode
}

export const InstanceStoreProvider = ({ children }: InstanceStoreProviderProps) => {
  const storeRef = useRef<InstanceStoreApi>(null)
  if (!storeRef.current) {
    storeRef.current = createInstanceStore()
  }

  return (
    <InstanceStoreContext.Provider value={storeRef.current}>
      {children}
    </InstanceStoreContext.Provider>
  )
}

export const useInstanceStore = <T,>(
  selector: (store: InstanceStore) => T,
): T => {
  const instanceStoreContext = useContext(InstanceStoreContext)

  if (!instanceStoreContext) {
    throw new Error(`useInstanceStore must be used within InstanceStoreProvider`)
  }

  return useStore(instanceStoreContext, selector)
}

