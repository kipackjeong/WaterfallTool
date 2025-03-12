'use client'
import React, { useState } from 'react';
import { Box, Container, Heading, Text, VStack, HStack, FormControl, FormLabel, Input, Select, Switch, Button, useColorModeValue } from '@chakra-ui/react';
import ChatBot from '../../lib/ui/ChatBot';

const ChatBotExample = () => {
  const [context, setContext] = useState({
    role: 'M&A Analysis Assistant',
    knowledge: 'Mergers and Acquisitions, financial analysis, due diligence',
    constraints: 'Keep responses concise and focused on M&A topics',
    customInstructions: 'Provide specific examples when appropriate'
  });

  const [config, setConfig] = useState({
    title: 'M&A Assistant',
    botName: 'M&A Helper',
    showSessionManagement: true,
    height: '600px',
    primaryColor: 'blue.400'
  });

  const handleContextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setContext(prev => ({ ...prev, [name]: value }));
  };

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleToggleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setConfig(prev => ({ ...prev, [name]: checked }));
  };

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        <Box>
          <Heading as="h1" size="xl" mb={2}>ChatBot Component Demo</Heading>
          <Text>This page demonstrates the reusable ChatBot component integrated with Llama.</Text>
        </Box>

        <HStack spacing={8} align="flex-start" flexWrap={{ base: 'wrap', lg: 'nowrap' }}>
          {/* Configuration Panel */}
          <Box
            flex="1"
            bg={cardBg}
            p={6}
            borderRadius="lg"
            boxShadow="md"
            border="1px"
            borderColor={borderColor}
            minW={{ base: '100%', lg: '400px' }}
            mb={{ base: 4, lg: 0 }}
          >
            <Heading as="h2" size="md" mb={4}>Configure ChatBot</Heading>

            <VStack spacing={4} align="stretch">
              <Heading as="h3" size="sm">UI Configuration</Heading>

              <FormControl>
                <FormLabel>Title</FormLabel>
                <Input
                  name="title"
                  value={config.title}
                  onChange={handleConfigChange}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Bot Name</FormLabel>
                <Input
                  name="botName"
                  value={config.botName}
                  onChange={handleConfigChange}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Primary Color</FormLabel>
                <Select
                  name="primaryColor"
                  value={config.primaryColor}
                  onChange={handleConfigChange}
                >
                  <option value="blue.400">Blue</option>
                  <option value="green.400">Green</option>
                  <option value="purple.400">Purple</option>
                  <option value="red.400">Red</option>
                  <option value="orange.400">Orange</option>
                </Select>
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0">Show Session Management</FormLabel>
                <Switch
                  name="showSessionManagement"
                  isChecked={config.showSessionManagement}
                  onChange={handleToggleChange}
                />
              </FormControl>

              <Heading as="h3" size="sm" mt={2}>Context Configuration</Heading>

              <FormControl>
                <FormLabel>Assistant Role</FormLabel>
                <Input
                  name="role"
                  value={context.role}
                  onChange={handleContextChange}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Knowledge Areas</FormLabel>
                <Input
                  name="knowledge"
                  value={context.knowledge}
                  onChange={handleContextChange}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Constraints</FormLabel>
                <Input
                  name="constraints"
                  value={context.constraints}
                  onChange={handleContextChange}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Custom Instructions</FormLabel>
                <Input
                  name="customInstructions"
                  value={context.customInstructions}
                  onChange={handleContextChange}
                />
              </FormControl>
            </VStack>
          </Box>

          {/* ChatBot Component */}
          <Box flex="2">
            <ChatBot
              initialContext={context}
              title={config.title}
              botName={config.botName}
              height={config.height}
              showSessionManagement={config.showSessionManagement}
              primaryColor={config.primaryColor}
              placeholder="Ask me about M&A analysis..."
            />
          </Box>
        </HStack>
      </VStack>
    </Container>
  );
};

export default ChatBotExample;
