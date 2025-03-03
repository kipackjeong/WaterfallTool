import { ChakraProvider, theme, useToast } from '@chakra-ui/react'

import { AppProps } from 'next/app'
import MainLayout from '../layouts/MainLayout'
import { InstanceStoreProvider } from '../lib/states/instanceState'
import { ProjectStoreProvider } from '../lib/states/projectsState'
import { AuthProvider } from '../lib/contexts/authContext'
import AuthGuard from '../components/AuthGuard'
import { toastEvents } from '@/lib/helpers/toastEvents'
import { useEffect } from 'react'

function MyApp({ Component, pageProps }: AppProps) {
  const toast = useToast();

  useEffect(() => {
    return toastEvents.addListener((message, status) => {
      toast({
        title: status === 'error' ? 'Error' : 'Info',
        description: message,
        status: status as any,
        duration: 5000,
        isClosable: true
      });
    });
  }, [toast]);
  return (
    <ChakraProvider theme={theme}>
      <AuthProvider>
        <ProjectStoreProvider>
          <InstanceStoreProvider>
            <AuthGuard>
              <MainLayout>
                <Component {...pageProps} />
              </MainLayout>
            </AuthGuard>
          </InstanceStoreProvider>
        </ProjectStoreProvider>
      </AuthProvider>
    </ChakraProvider>
  )
}

export default MyApp
