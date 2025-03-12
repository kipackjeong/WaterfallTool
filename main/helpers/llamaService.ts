import { ipcMain } from 'electron';
import axios from 'axios';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Ollama API configuration
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';
let CURRENT_MODEL = 'llama3';

// Initialize Llama service
export function initLlamaService() {
  // Handle chat message requests from renderer process
  ipcMain.handle('chat:send-message', async (_, payload) => {
    try {
      const { messages, context = {}, model } = payload;
      
      // Use specified model or fall back to current model
      const modelToUse = model || CURRENT_MODEL;
      
      // Prepare system message with context if available
      const systemMessage = {
        role: 'system',
        content: generateSystemPrompt(context)
      };
      
      // Format messages for Ollama API
      const ollamaMessages = [
        systemMessage,
        ...messages
      ];
      
      // Call Ollama API
      const res = await axios.post(
        `${OLLAMA_API_URL}/api/chat`,
        {
          model: modelToUse,
          messages: ollamaMessages,
          options: {
            temperature: 0.7,
            num_predict: 1000,
          },
          stream: false
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Extract and return the assistant's response
      return res.data.message;
      
    } catch (err: unknown) {
      console.error('Error in Llama service:', err);
      
      // Return a user-friendly error
      if (err instanceof Error) {
        const error = err as any; // Type assertion for accessing response/request properties
        if (error.response) {
          // Ollama API error
          throw new Error(`API Error: ${error.response.data?.error || 'Unknown API error'}`);
        } else if (error.request) {
          // Network error
          throw new Error('Cannot connect to Ollama. Please make sure Ollama is installed and running.');
        } else {
          // Other errors
          throw new Error(error.message || 'An unknown error occurred');
        }
      } else {
        // Non-Error object
        throw new Error('An unknown error occurred');
      }
    }
  });

  // Check if Ollama is installed and running
  ipcMain.handle('chat:check-ollama', async () => {
    try {
      const response = await axios.get(`${OLLAMA_API_URL}/api/tags`);
      
      // Check if Llama model is available
      const models = response.data.models || [];
      const llamaAvailable = models.some((model: any) => 
        model.name.toLowerCase().includes('llama')
      );
      
      return {
        ollamaRunning: true,
        llamaAvailable,
        availableModels: models.map((model: any) => model.name)
      };
    } catch (err: unknown) {
      console.error('Error checking Ollama:', err);
      return {
        ollamaRunning: false,
        llamaAvailable: false,
        error: err instanceof Error ? err.message : 'Cannot connect to Ollama'
      };
    }
  });
}

// Helper function to generate system prompt based on context
function generateSystemPrompt(context: any): string {
  // Default system prompt for M&A analysis
  let systemPrompt = 'You are an AI assistant specializing in Mergers & Acquisitions analysis. Provide concise, accurate, and insightful responses to financial and business questions.';
  
  // Add context-specific instructions if available
  if (context) {
    if (context.role) {
      systemPrompt = `You are ${context.role}. ${systemPrompt}`;
    }
    
    if (context.knowledge) {
      systemPrompt += ` You have specific knowledge about: ${context.knowledge}.`;
    }
    
    if (context.constraints) {
      systemPrompt += ` Please adhere to these constraints: ${context.constraints}.`;
    }
    
    if (context.customInstructions) {
      systemPrompt += ` ${context.customInstructions}`;
    }
  }
  
  return systemPrompt;
}
