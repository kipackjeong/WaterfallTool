'use client'
import React, { useEffect } from 'react'
import { ChakraProvider, ColorModeScript, Flex, theme, useToast } from '@chakra-ui/react'
import { AuthProvider } from '@/lib/contexts/authContext'
import { InstanceStoreProvider } from '@/lib/states/instanceState'
import { ProjectStoreProvider } from '@/lib/states/projectsState'
import { toastEvents } from '@/lib/utils/toastEvents'
import AuthGuard from './components/AuthGuard'
import MainLayout from './layouts/MainLayout'
import Main from './Main'

export default function App() {
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
                                <ColorModeScript />
                                <Main />
                            </MainLayout>
                        </AuthGuard>
                    </InstanceStoreProvider>
                </ProjectStoreProvider>
            </AuthProvider>
        </ChakraProvider>
    )
}