/**
 * Google Authentication Service
 * 
 * This service handles Google Sign-In integration for the application.
 * It uses the Google Identity Services JavaScript library to manage authentication.
 */

// Define the Google credential response interface
interface GoogleCredentialResponse {
  clientId: string;
  credential: string;
  select_by: string;
}

/**
 * Initialize Google Sign-In
 * This function dynamically loads the Google Identity Services script
 * and configures the authentication client.
 */
export const initGoogleAuth = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      // Check if the script is already loaded
      if (document.querySelector('script#google-identity-services')) {
        resolve();
        return;
      }
      
      // Create script element
      const script = document.createElement('script');
      script.id = 'google-identity-services';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      
      // Handle script load events
      script.onload = () => resolve();
      script.onerror = (error) => reject(new Error('Failed to load Google Identity Services: ' + error));
      
      // Append the script to the document
      document.head.appendChild(script);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Render a Google Sign-In button
 * @param containerId The ID of the container element where the button will be rendered
 * @param clientId Your Google Client ID
 * @param onSuccess Callback function when authentication succeeds
 * @param onError Callback function when authentication fails
 */
export const renderGoogleButton = (
  containerId: string,
  clientId: string,
  onSuccess: (response: any) => void,
  onError: (error: Error) => void
): void => {
  try {
    // Check if google object is available
    if (!window.google) {
      onError(new Error('Google Identity Services not loaded'));
      return;
    }
    
    // Initialize Google Sign-In
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: GoogleCredentialResponse) => {
        if (response.credential) {
          onSuccess(response);
        } else {
          onError(new Error('Google authentication failed'));
        }
      },
      cancel_on_tap_outside: false
    });
    
    // Render the button
    window.google.accounts.id.renderButton(
      document.getElementById(containerId) as HTMLElement,
      { 
        theme: 'outline', 
        size: 'large',
        type: 'standard',
        shape: 'rectangular',
        text: 'signin_with',
        logo_alignment: 'left'
      }
    );
  } catch (error) {
    onError(error);
  }
};

/**
 * Prompt the user for Google Sign-In
 * @param clientId Your Google Client ID
 * @returns Promise that resolves with the credential response
 */
export const promptGoogleSignIn = (clientId: string): Promise<GoogleCredentialResponse> => {
  return new Promise((resolve, reject) => {
    try {
      // Check if google object is available
      if (!window.google) {
        reject(new Error('Google Identity Services not loaded'));
        return;
      }
      
      // Initialize Google Sign-In
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: GoogleCredentialResponse) => {
          if (response.credential) {
            resolve(response);
          } else {
            reject(new Error('Google authentication failed'));
          }
        },
        cancel_on_tap_outside: false
      });
      
      // Prompt one-tap sign-in
      window.google.accounts.id.prompt();
    } catch (error) {
      reject(error);
    }
  });
};

// Add TypeScript declaration for the global google object
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (container: HTMLElement, options: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}
