'use client'
import React from 'react'
import { Flex } from '@chakra-ui/react'
import InstanceView from './components/InstanceView'
import { useInstanceStore } from '@/lib/states/instanceState';

export default function Main() {
    const { instanceViewState } = useInstanceStore((state) => state);

    return (
        <Flex width="100%" direction="column" position="relative">
            {instanceViewState && <InstanceView />}
        </Flex>
    )
}