import { ElementType, useState, useEffect, useRef } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Button,
  VStack,
  Text,
  Box,
  Flex,
  Heading,
  InputGroup,
  InputRightElement,
  useToast,
  Divider,
  useColorMode,
  Icon,
  useDisclosure,
} from '@chakra-ui/react';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaGoogle } from 'react-icons/fa';
import { SiApple } from 'react-icons/si';
import { authService } from '../../lib/services/authService';
import { GOOGLE_CLIENT_ID } from '../../lib/config/auth';
import { User } from 'next-auth';

// Types for the login modal props
interface LoginModalProps {
  isOpen: boolean;
  onLogin?: (email: string, password: string) => Promise<User | null>;
  onRegister?: (email: string, password: string, firstName?: string, lastName?: string) => Promise<User | null>;
  onSocialLogin?: (provider: 'google' | 'apple') => Promise<User | null>;
  preventClose?: boolean;
}

const LoginModal = ({
  isOpen,
  onLogin,
  onRegister,
  onSocialLogin,
}: LoginModalProps) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { colorMode } = useColorMode();
  const { isOpen: _isOpen, onOpen, onClose } = useDisclosure({ defaultIsOpen: true });

  const toast = useToast();

  // Reference to Google button container
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const navyColor = {
    500: '#1a365d', // Navy primary
    600: '#153e75', // Navy hover
    700: '#0f2d53', // Navy active
  };

  const darkNavyBg = '#0a192f';
  const lightNavyBg = '#f0f4f8';
  const bgColor = colorMode === 'dark' ? darkNavyBg : lightNavyBg;
  const textColor = colorMode === 'dark' ? '#e6f1ff' : '#0a192f';
  const borderColor = colorMode === 'dark' ? '#172a45' : '#cbd5e0';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Form validation
    if (!email || !password) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      let result;

      if (isRegistering && onRegister) {
        // Call register function
        result = await onRegister(email, password, firstName, lastName);
      } else if (onLogin) {
        // Call login function
        result = await onLogin(email, password);
      }

      // Check if login/register was successful
      if (!result) {
        console.log('result:', result)
        throw new Error(isRegistering ? 'Registration failed' : 'Authentication failed');
      }

      // Clear form
      setEmail('');
      setPassword('');
      setDisplayName('');
      setFirstName('');
      setLastName('');

      // Close modal on success
      onClose();

      toast({
        title: 'Success',
        description: isRegistering ? 'Registration successful' : 'Login successful',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'An error occurred',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    if (!onSocialLogin) return;

    setIsLoading(true);
    try {
      if (provider === 'apple') {
        // For Apple, we'll just call the existing handler
        const result = await onSocialLogin(provider);
        if (!result) throw new Error('Social login failed');
        return result;
      }
      onClose();
      // Google Sign-In is handled by the Google button itself
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'An error occurred',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize Google Sign-In
  useEffect(() => {
    if (_isOpen && googleButtonRef.current) {
      // Initialize Google auth when modal opens
      authService.initGoogleAuth().then(() => {
        // Render the Google Sign-In button
        authService.renderGoogleButton(
          'google-sign-in-button',
          GOOGLE_CLIENT_ID,
          async (response) => {
            try {
              // Call our social login handler with the Google credential
              if (onSocialLogin) {
                await onSocialLogin('google');
                onClose();
              }
            } catch (error) {
              toast({
                title: 'Google Login Error',
                description: error.message || 'Failed to sign in with Google',
                status: 'error',
                duration: 3000,
                isClosable: true,
              });
            }
          },
          (error) => {
            toast({
              title: 'Google Login Error',
              description: error.message || 'Failed to initialize Google Sign-In',
              status: 'error',
              duration: 3000,
              isClosable: true,
            });
          }
        );
      }).catch(error => {
        console.error('Error initializing Google auth:', error);
      });
    }
  }, [_isOpen, onSocialLogin, onClose, toast]);

  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleAuthMode = () => setIsRegistering(!isRegistering);

  return (
    <Modal isOpen={_isOpen} onClose={onClose} size="md" isCentered>
      <ModalOverlay backdropFilter="blur(3px)" />
      <ModalContent
        bg={bgColor}
        color={textColor}
        borderRadius="xl"
        boxShadow="2xl"
        borderColor={borderColor}
        borderWidth="1px"
      >
        <Box px={8} py={6}>
          <ModalHeader p={0} mb={6}>
            <Heading size="lg" fontWeight="bold" textAlign="center">
              {isRegistering ? 'Create Account' : 'Welcome Back'}
            </Heading>
            <Text mt={2} textAlign="center" fontSize="sm" opacity={0.8}>
              {isRegistering
                ? 'Create an account to continue'
                : 'Sign in to access your account'}
            </Text>
          </ModalHeader>
          <ModalCloseButton color={textColor} />

          <ModalBody p={0} mb={6}>
            <form onSubmit={handleSubmit}>
              <VStack spacing={4} w="full">
                <FormControl id="email" isRequired>
                  <FormLabel fontSize="sm">Email Address</FormLabel>
                  <InputGroup size="md">
                    <Input
                      type="email"
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      pr="4.5rem"
                      borderColor={borderColor}
                      _hover={{ borderColor: 'blue.300' }}
                      _focus={{ borderColor: 'blue.500', boxShadow: 'none' }}
                      bg={colorMode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'white'}
                      color={textColor}
                    />
                    <InputRightElement width="4.5rem">
                      <Icon as={FaEnvelope as ElementType} color="gray.400" />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>

                {isRegistering && (
                  <>
                    <FormControl id="firstName" isRequired>
                      <FormLabel fontSize="sm">First Name</FormLabel>
                      <Input
                        type="text"
                        placeholder="Your First Name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        borderColor={borderColor}
                        _hover={{ borderColor: 'blue.300' }}
                        _focus={{ borderColor: 'blue.500', boxShadow: 'none' }}
                        bg={colorMode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'white'}
                        color={textColor}
                      />
                    </FormControl>
                    <FormControl id="lastName" isRequired>
                      <FormLabel fontSize="sm">Last Name</FormLabel>
                      <Input
                        type="text"
                        placeholder="Your Last Name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        borderColor={borderColor}
                        _hover={{ borderColor: 'blue.300' }}
                        _focus={{ borderColor: 'blue.500', boxShadow: 'none' }}
                        bg={colorMode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'white'}
                        color={textColor}
                      />
                    </FormControl>
                  </>
                )}

                <FormControl id="password" isRequired>
                  <FormLabel fontSize="sm">Password</FormLabel>
                  <InputGroup>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="********"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      pr="4.5rem"
                      borderColor={borderColor}
                      _hover={{ borderColor: 'blue.300' }}
                      _focus={{ borderColor: 'blue.500', boxShadow: 'none' }}
                      bg={colorMode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'white'}
                      color={textColor}
                    />
                    <InputRightElement width="4.5rem">
                      {showPassword ? (
                        <Icon as={FaEyeSlash as ElementType} color="gray.400" onClick={togglePasswordVisibility} />
                      ) : (
                        <Icon as={FaEye as ElementType} color="gray.400" onClick={togglePasswordVisibility} />
                      )}
                    </InputRightElement>
                  </InputGroup>
                </FormControl>

                {!isRegistering && (
                  <Text
                    alignSelf="flex-end"
                    color={navyColor[600]}
                    fontSize="sm"
                    cursor="pointer"
                    _hover={{ textDecoration: 'underline' }}
                    mb={2}
                  >
                    Forgot password?
                  </Text>
                )}

                <Button
                  colorScheme="blue"
                  bg={navyColor[500]}
                  _hover={{ bg: navyColor[600] }}
                  _active={{ bg: navyColor[700] }}
                  size="md"
                  w="full"
                  isLoading={isLoading}
                  type="submit"
                  fontWeight="bold"
                  borderRadius="md"
                  py={6}
                  mt={2}
                >
                  {isRegistering ? 'Create Account' : 'Sign In'}
                </Button>
              </VStack>
            </form>

            {/* OAuth Providers */}
            <Box mt={6}>
              <Divider mb={6} />
              <Text mb={4} textAlign="center">
                Or continue with
              </Text>
              <Flex justifyContent="center" gap={4}>
                <Button
                  onClick={() => handleSocialLogin('google')}
                  leftIcon={<Icon as={FaGoogle as ElementType} />}
                  isLoading={isLoading}
                  colorScheme="gray"
                  variant="outline"
                  w="100%"
                >
                  Google
                </Button>
                <Button
                  onClick={() => handleSocialLogin('apple')}
                  leftIcon={<Icon as={SiApple as ElementType} />}
                  isLoading={isLoading}
                  colorScheme="gray"
                  variant="outline"
                  w="100%"
                >
                  Apple
                </Button>
              </Flex>
            </Box>

            <Flex justify="center" mt={6}>
              <Text fontSize="sm">
                {isRegistering ? 'Already have an account?' : "Don't have an account?"}
              </Text>
              <Text
                ml={1}
                color={navyColor[500]}
                fontWeight="bold"
                fontSize="sm"
                cursor="pointer"
                onClick={toggleAuthMode}
                _hover={{ textDecoration: 'underline' }}
              >
                {isRegistering ? 'Sign In' : 'Create one'}
              </Text>
            </Flex>
          </ModalBody>
        </Box>
      </ModalContent>
    </Modal>
  );
};

export default LoginModal;
