'use client'
import React from 'react'
import { Flex } from '@chakra-ui/react'
import { InstanceView } from './components/InstanceView'
import { useInstanceStore } from '@/lib/states/instanceState';
// Removed MappingsStoreProvider import since stores are now merged
import Dashboard from './components/Dashboard';

export default function Main() {
    const { instanceState } = useInstanceStore((state) => state);

    return (
        <Flex width="100%" direction="column" position="relative">
            {instanceState ? <InstanceView /> : <Dashboard />}

        </Flex>
    )
}