import { ReactNode, useState } from 'react';
import { Box, useDisclosure } from '@chakra-ui/react';
import { useAuth } from '../../lib/contexts/authContext';
import LoginModal from './LoginModal';

interface AuthGuardProps {
  children: ReactNode;
}

const AuthGuard = ({ children }: AuthGuardProps) => {
  const { user, login, register, socialLogin } = useAuth();
  const [loginError, setLoginError] = useState<string | null>(null);

  // If user is not logged in, show login modal
  if (!user) {
    return (
      <>
        <LoginModal
          isOpen={true}
          onLogin={async (email, password) => {
            try {
              setLoginError(null);
              return await login(email, password);
            } catch (error) {
              console.log('error:', error)
              setLoginError(error.message || 'Authentication failed');
            }
          }}
          onRegister={async (email, password, firstName, lastName) => {
            try {
              setLoginError(null);
              return await register(email, password, firstName, lastName);
            } catch (error) {
              setLoginError(error.message || 'Registration failed');
            }
          }}
          onSocialLogin={async (provider) => {
            try {
              setLoginError(null);
              return await socialLogin(provider);
            } catch (error) {
              setLoginError(error.message || 'Social authentication failed');
            }
          }}
        />
      </>
    );
  }

  // If user is logged in, render children
  return <Box>{children}</Box>;
};

export default AuthGuard;
