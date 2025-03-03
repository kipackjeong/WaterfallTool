// toastEvents.ts
type Listener = (message: string, status: string) => void;
const listeners: Listener[] = [];

export const toastEvents = {
    addListener: (listener: Listener) => {
        listeners.push(listener);
        return () => toastEvents.removeListener(listener);
    },
    removeListener: (listener: Listener) => {
        const index = listeners.indexOf(listener);
        if (index > -1) listeners.splice(index, 1);
    },
    emit: (message: string, status: string) => {
        listeners.forEach(listener => listener(message, status));
    }
};