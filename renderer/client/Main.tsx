'use client'
import React from 'react'
import { Flex } from '@chakra-ui/react'
import { InstanceView } from './components/InstanceView'
import { useInstanceStore } from '@/lib/states/instanceState';
import { MappingsStoreProvider } from '@/lib/states/mappingsState';
import Dashboard from './components/Dashboard';

export default function Main() {
    const { InstanceState } = useInstanceStore((state) => state);

    return (
        <Flex width="100%" direction="column" position="relative">
            <MappingsStoreProvider>
                {InstanceState ? <InstanceView /> : <Dashboard />}
            </MappingsStoreProvider>

        </Flex>
    )
}