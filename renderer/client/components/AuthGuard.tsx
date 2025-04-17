import { ReactNode, useState, useEffect } from 'react';
import { Box, useDisclosure, Flex } from '@chakra-ui/react';
import { useAuth } from '../../lib/contexts/authContext';
import LoginModal from './LoginModal';
import LoadingSpinner from '../common/LoadingSpinner';

interface AuthGuardProps {
  children: ReactNode;
}

const AuthGuard = ({ children }: AuthGuardProps) => {
  const { user, login, register, socialLogin } = useAuth();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Show loading state for a few seconds before determining authentication status
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500); // 2 seconds loading time

    return () => clearTimeout(timer);
  }, []);

  // Show loading spinner while determining auth status
  if (isLoading) {
    return (
      <Flex width="100vw" height="100vh" justifyContent="center" alignItems="center">
        <LoadingSpinner />
      </Flex>
    );
  }

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
              console.error('error:', error)
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
