/**
 * Google Authentication Test
 * 
 * This file demonstrates how to use the Google authentication service.
 * This is just for testing and educational purposes.
 */

import { authService } from '../lib/services/authService';
import { GOOGLE_CLIENT_ID } from '../lib/config/auth';

/**
 * Test function to demonstrate the Google authentication flow
 */
async function testGoogleAuth() {
  try {
    console.log('Initializing Google Authentication...');
    await authService.initGoogleAuth();
    console.log('Google Authentication initialized successfully');
    
    console.log('Rendering Google Sign-In button...');
    // This would normally be called in a component's useEffect
    authService.renderGoogleButton(
      'google-button-container', // ID of the HTML element where the button will be rendered
      GOOGLE_CLIENT_ID,
      (response) => {
        console.log('Successfully authenticated with Google');
        console.log('Google ID token:', response.credential);
        
        // Now we would process this token with our backend
        // authService.googleLogin(response.credential).then(user => {
        //   console.log('User authenticated:', user);
        // });
      },
      (error) => {
        console.error('Google authentication error:', error);
      }
    );
    
    // Alternatively, we can use the prompt method
    console.log('You can also prompt for Google Sign-In directly:');
    // authService.promptGoogleSignIn(GOOGLE_CLIENT_ID).then(response => {
    //   console.log('Successfully authenticated with Google');
    //   console.log('Google ID token:', response.credential);
    // });
    
  } catch (error) {
    console.error('Error testing Google authentication:', error);
  }
}

/**
 * To run this test in a browser environment, you would do:
 * 
 * 1. Create a HTML element with the specified ID:
 *    <div id="google-button-container"></div>
 * 
 * 2. Call the test function:
 *    testGoogleAuth();
 * 
 * 3. Make sure you have a valid Google Client ID in your auth.ts config file
 * 
 * Note: This test cannot be run in a Node.js environment as it requires browser APIs.
 */

export { testGoogleAuth };
