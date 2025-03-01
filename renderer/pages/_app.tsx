import { ChakraProvider, theme } from '@chakra-ui/react'

import { AppProps } from 'next/app'
import MainLayout from '../layouts/MainLayout'
import { InstanceStoreProvider } from '../lib/states/instance.provider'
import { ProjectStoreProvider } from '../lib/states/projects.provider'
import { AuthProvider } from '../lib/contexts/authContext'
import AuthGuard from '../components/AuthGuard'

function MyApp({ Component, pageProps }: AppProps) {
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
