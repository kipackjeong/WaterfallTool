import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

const handler = {
  invoke(channel: string, ...args: unknown[]) : Promise<any>{
    return ipcRenderer.invoke(channel, ...args)
  },
  send(channel: string, value: unknown) {
    ipcRenderer.send(channel, value)
  },
  on(channel: string, callback: (...args: unknown[]) => void) {
    const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
      callback(...args)
    ipcRenderer.on(channel, subscription)

    return () => {
      ipcRenderer.removeListener(channel, subscription)
    }
  },
}

contextBridge.exposeInMainWorld('ipc', handler)

export type IpcHandler = typeof handler
export const ipcHandler = handler
