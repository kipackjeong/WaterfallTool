import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  context?: any; // Custom context that can be passed to the AI
  createdAt: number;
  updatedAt: number;
}

export interface OllamaStatus {
  ollamaRunning: boolean;
  llamaAvailable: boolean;
  availableModels?: string[];
  error?: string;
}

interface ChatState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  isLoading: boolean;
  error: string | null;
  ollamaStatus: OllamaStatus | null;
  selectedModel: string;
  
  // Actions
  createSession: (title?: string, context?: any) => string;
  deleteSession: (sessionId: string) => void;
  setCurrentSession: (sessionId: string) => void;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: (sessionId?: string) => void;
  updateSessionContext: (sessionId: string, context: any) => void;
  checkOllamaStatus: () => Promise<void>;
  setSelectedModel: (model: string) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,
      isLoading: false,
      error: null,
      ollamaStatus: null,
      selectedModel: 'llama3',

      createSession: (title = 'New Chat', context = {}) => {
        const id = uuidv4();
        const newSession: ChatSession = {
          id,
          title,
          messages: [],
          context,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          sessions: [...state.sessions, newSession],
          currentSessionId: id,
        }));

        return id;
      },

      deleteSession: (sessionId) => {
        set((state) => {
          const newSessions = state.sessions.filter((s) => s.id !== sessionId);
          let newCurrentSessionId = state.currentSessionId;
          
          // If we're deleting the current session, select another one or null
          if (state.currentSessionId === sessionId) {
            newCurrentSessionId = newSessions.length > 0 ? newSessions[0].id : null;
          }
          
          return {
            sessions: newSessions,
            currentSessionId: newCurrentSessionId,
          };
        });
      },

      setCurrentSession: (sessionId) => {
        set({ currentSessionId: sessionId });
      },

      addMessage: (messageData) => {
        const { currentSessionId, sessions } = get();
        if (!currentSessionId) return;

        const message: ChatMessage = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          ...messageData,
        };

        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === currentSessionId
              ? {
                  ...session,
                  messages: [...session.messages, message],
                  updatedAt: Date.now(),
                }
              : session
          ),
        }));
      },

      sendMessage: async (content) => {
        const { currentSessionId, sessions, addMessage, ollamaStatus, selectedModel } = get();
        if (!currentSessionId) return;

        // Check if Ollama is running
        if (!ollamaStatus?.ollamaRunning) {
          set({ error: 'Ollama is not running. Please install and start Ollama to use the chat feature.' });
          return;
        }

        // Find current session
        const currentSession = sessions.find((s) => s.id === currentSessionId);
        if (!currentSession) return;

        // Add user message
        addMessage({ role: 'user', content });
        
        // Set loading state
        set({ isLoading: true, error: null });

        try {
          // Get all messages to maintain conversation context
          const messages = currentSession.messages.map(({ role, content }) => ({ role, content }));
          
          // Add the new user message
          messages.push({ role: 'user', content });

          // Check if window.electron is available
          if (!window.electron || !window.electron.ipcRenderer) {
            console.error('Electron IPC not available. Running in browser mode or preload script not configured properly.');
            set({ 
              error: 'Electron IPC not available. Please run the application in Electron mode.'
            });
            return;
          }

          // Call the API through the main process
          const response = await window.electron.ipcRenderer.invoke('chat:send-message', {
            messages,
            context: currentSession.context,
            model: selectedModel
          });

          // Add assistant response
          addMessage({ role: 'assistant', content: response.content });
        } catch (err) {
          console.error('Error sending message:', err);
          set({ error: typeof err === 'object' && err !== null && 'message' in err ? (err as Error).message : 'Failed to get response' });
        } finally {
          set({ isLoading: false });
        }
      },

      clearMessages: (sessionId) => {
        const targetSessionId = sessionId || get().currentSessionId;
        if (!targetSessionId) return;

        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === targetSessionId
              ? { ...session, messages: [] }
              : session
          ),
        }));
      },

      updateSessionContext: (sessionId, context) => {
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? { ...session, context }
              : session
          ),
        }));
      },

      checkOllamaStatus: async () => {
        set({ isLoading: true, error: null });
        
        try {
          // Check if window.electron is available
          if (!window.electron || !window.electron.ipcRenderer) {
            console.error('Electron IPC not available. Running in browser mode or preload script not configured properly.');
            set({ 
              ollamaStatus: { ollamaRunning: false, llamaAvailable: false },
              error: 'Electron IPC not available. Please run the application in Electron mode.'
            });
            return;
          }
          
          const status = await window.electron.ipcRenderer.invoke('chat:check-ollama');
          set({ ollamaStatus: status });
          
          // If Llama is not available but other models are, select the first available model
          if (!status.llamaAvailable && status.availableModels && status.availableModels.length > 0) {
            set({ selectedModel: status.availableModels[0] });
          }
          
          if (!status.ollamaRunning) {
            set({ error: 'Ollama is not running. Please install and start Ollama to use the chat feature.' });
          }
        } catch (err) {
          console.error('Error checking Ollama status:', err);
          set({ 
            error: err.message || 'Failed to check Ollama status',
            ollamaStatus: { ollamaRunning: false, llamaAvailable: false }
          });
        } finally {
          set({ isLoading: false });
        }
      },
      
      setSelectedModel: (model) => {
        set({ selectedModel: model });
        // Notify main process about model change
        window.electron.ipcRenderer.invoke('chat:set-model', model);
      },
    }),
    {
      name: 'chat-storage',
      partialize: (state) => ({
        sessions: state.sessions,
        currentSessionId: state.currentSessionId,
        selectedModel: state.selectedModel,
      }),
    }
  )
);
