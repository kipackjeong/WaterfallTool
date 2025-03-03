import React, { useEffect } from 'react'
import Head from 'next/head'
import { Flex } from '@chakra-ui/react'
import { useInstanceStore } from '../lib/states/instanceState'
import InstanceView from '../components/InstanceView'

export default function HomePage() {
    const { instanceViewState } = useInstanceStore(state => state)
    useEffect(() => {
        console.log('HomePage setup')

        return () => {
            console.log('HomePage cleanup')
        }
    }, [])

    return (
        <React.Fragment>
            <Head>
                <title>Waterfall Tool</title>
            </Head>
            <Flex width="100%">
                {instanceViewState && <InstanceView />}
            </Flex>
        </React.Fragment>
    )
}