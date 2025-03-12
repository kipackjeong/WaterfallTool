import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Flex,
  Input,
  Button,
  Text,
  VStack,
  HStack,
  IconButton,
  useColorModeValue,
  Spinner,
  Avatar,
  Tooltip,
  Divider,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Select,
  Badge,
  Icon
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { FaPaperPlane, FaRobot, FaUser, FaEllipsisV, FaTrash, FaPlus } from 'react-icons/fa';
import { IoMdRefresh } from 'react-icons/io';
import { ChatMessage, ChatSession, OllamaStatus, useChatStore } from '../states/chatState';

interface ChatBotProps {
  initialContext?: any;
  title?: string;
  height?: string | number;
  width?: string | number;
  showSessionManagement?: boolean;
  avatarUrl?: string;
  botName?: string;
  placeholder?: string;
  primaryColor?: string;
  showModelSelection?: boolean;
}

const MotionBox = motion(Box);

const ChatBot: React.FC<ChatBotProps> = ({
  initialContext = {},
  title = 'Assistant',
  height = '600px',
  width = '100%',
  showSessionManagement = true,
  avatarUrl,
  botName = 'AI Assistant',
  placeholder = 'Type your message...',
  primaryColor = 'blue.400',
  showModelSelection = true
}) => {
  const {
    sessions,
    currentSessionId,
    isLoading,
    error,
    ollamaStatus,
    selectedModel,
    createSession,
    deleteSession,
    setCurrentSession,
    sendMessage,
    clearMessages,
    updateSessionContext,
    checkOllamaStatus,
    setSelectedModel
  } = useChatStore();

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // Colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const userBubbleColor = useColorModeValue(primaryColor, 'blue.600');
  const botBubbleColor = useColorModeValue('gray.100', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');
  const placeholderColor = useColorModeValue('gray.400', 'gray.500');

  // Get current session
  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  // Refresh Ollama status
  const handleRefreshOllamaStatus = () => {
    checkOllamaStatus();
    toast({
      title: 'Checking Ollama status...',
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  };

  // Handle model change
  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModel(e.target.value);
    toast({
      title: `Model changed to ${e.target.value}`,
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  // Create initial session if none exists
  useEffect(() => {
    if (sessions.length === 0) {
      createSession(title, initialContext);
    } else if (!currentSessionId && sessions.length > 0) {
      setCurrentSession(sessions[0].id);
    }

    // Check Ollama status when component mounts
    checkOllamaStatus();
  }, [sessions, currentSessionId, createSession, setCurrentSession, title, initialContext, checkOllamaStatus]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Show error toast if there's an error
  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: error,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [error, toast]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    try {
      await sendMessage(inputValue);
      setInputValue('');
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewChat = () => {
    createSession(title, initialContext);
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Render message bubble
  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user';

    return (
      <Flex
        key={message.id}
        justify={isUser ? 'flex-end' : 'flex-start'}
        mb={2}
        w="100%"
      >
        <HStack spacing={2} maxW="80%" alignItems="flex-start">
          {!isUser && (
            <Avatar
              size="sm"
              name={botName}
              src={avatarUrl}
              // icon={FaRobot as any}
              bg={primaryColor}
            />
          )}

          <VStack alignItems={isUser ? 'flex-end' : 'flex-start'} spacing={0}>
            <Box
              bg={isUser ? userBubbleColor : botBubbleColor}
              color={isUser ? 'white' : textColor}
              px={4}
              py={2}
              borderRadius="lg"
              maxW="100%"
              wordBreak="break-word"
            >
              <Text>{message.content}</Text>
            </Box>
            <Text fontSize="xs" color="gray.500" mt={1}>
              {formatTimestamp(message.timestamp)}
            </Text>
          </VStack>

          {isUser && (
            <Avatar
              size="sm"
              name="User"
              icon={FaUser as any}
              bg="gray.500"
            />
          )}
        </HStack>
      </Flex>
    );
  };

  // Render session selector
  const renderSessionSelector = () => {
    if (!showSessionManagement) return null;

    return (
      <Flex justify="space-between" align="center" p={2} borderBottom="1px" borderColor={borderColor}>
        <Text fontWeight="bold" fontSize="md">{currentSession?.title || title}</Text>

        <HStack>
          <Tooltip label="New chat">
            <IconButton
              aria-label="New chat"
              icon={FaPlus as any}
              size="sm"
              variant="ghost"
              onClick={handleNewChat}
            />
          </Tooltip>

          <Menu>
            <MenuButton
              as={IconButton}
              aria-label="Options"
              // icon={FaEllipsisV as any}
              variant="ghost"
              size="sm"
            />
            <MenuList>
              {sessions.map(session => (
                <MenuItem
                  key={session.id}
                  onClick={() => setCurrentSession(session.id)}
                  fontWeight={session.id === currentSessionId ? 'bold' : 'normal'}
                >
                  {session.title}
                </MenuItem>
              ))}
              <Divider />
              <MenuItem
                // icon={FaTrash as any}
                onClick={() => clearMessages()}
                isDisabled={!messages.length}
              >
                Clear conversation
              </MenuItem>
              <MenuItem
                // icon={IoMdRefresh as any}
                onClick={handleRefreshOllamaStatus}
              >
                Check Ollama Status
              </MenuItem>
              {currentSessionId && (
                <MenuItem
                  // icon={FaTrash as any}
                  onClick={() => deleteSession(currentSessionId)}
                  color="red.500"
                >
                  Delete chat
                </MenuItem>
              )}
            </MenuList>
          </Menu>
        </HStack>
      </Flex>
    );
  };

  return (
    <MotionBox
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      w={width}
      h={height}
      borderRadius="lg"
      overflow="hidden"
      boxShadow="md"
      border="1px"
      borderColor={borderColor}
      bg={bgColor}
      display="flex"
      flexDirection="column"
    >
      {renderSessionSelector()}

      {/* Ollama Status Alert */}
      {!ollamaStatus?.ollamaRunning && (
        <Alert status="warning" m={4} borderRadius="md">
          <AlertIcon />
          <Box flex="1">
            <AlertTitle>Ollama Not Running</AlertTitle>
            <AlertDescription>
              Please install and start Ollama to use this chat feature.
              <Button
                size="sm"
                ml={2}
                colorScheme="blue"
                onClick={handleRefreshOllamaStatus}
              >
                Refresh Status
              </Button>
            </AlertDescription>
          </Box>
        </Alert>
      )}

      {ollamaStatus?.ollamaRunning && !ollamaStatus?.llamaAvailable && (
        <Alert status="info" m={4} borderRadius="md">
          <AlertIcon />
          <Box flex="1">
            <AlertTitle>Llama Model Not Found</AlertTitle>
            <AlertDescription>
              Ollama is running, but the Llama model is not installed.
              Please run: <code>ollama pull llama3</code> in your terminal.
              {ollamaStatus?.availableModels && ollamaStatus.availableModels.length > 0 && (
                <Text mt={1}>Available models: {ollamaStatus.availableModels.join(', ')}</Text>
              )}
            </AlertDescription>
          </Box>
        </Alert>
      )}

      {/* Model selection */}
      {showModelSelection && ollamaStatus?.availableModels && ollamaStatus.availableModels.length > 0 && (
        <Flex m={4} alignItems="center">
          <Text fontSize="sm" mr={2}>Model:</Text>
          <Select
            size="sm"
            value={selectedModel}
            onChange={handleModelChange}
            width="auto"
            maxW="200px"
          >
            {ollamaStatus.availableModels.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </Select>
          <Badge ml={2} colorScheme="green">Ollama Connected</Badge>
        </Flex>
      )}

      {/* Messages area */}
      <VStack
        flex="1"
        p={4}
        overflowY="auto"
        spacing={4}
        align="stretch"
        css={{
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: borderColor,
            borderRadius: '24px',
          },
        }}
      >
        {messages.length === 0 ? (
          <Flex
            direction="column"
            align="center"
            justify="center"
            h="100%"
            color="gray.500"
            textAlign="center"
            p={4}
          >
            <Box fontSize="40px" mb="16px"><Icon as={FaRobot as any} /></Box>
            <Text fontWeight="bold" fontSize="lg" mb={2}>
              {botName}
            </Text>
            <Text fontSize="sm">
              Ask me anything! I&apos;m here to help with your questions.
            </Text>
          </Flex>
        ) : (
          messages.map(renderMessage)
        )}

        {isLoading && (
          <Flex justify="flex-start" mb={2}>
            <HStack spacing={2} alignItems="center">
              <Avatar
                size="sm"
                name={botName}
                src={avatarUrl}
                icon={FaRobot as any}
                bg={primaryColor}
              />
              <Box
                bg={botBubbleColor}
                color={textColor}
                px={4}
                py={2}
                borderRadius="lg"
              >
                <Spinner size="sm" mr={2} />
                <Text as="span">Thinking...</Text>
              </Box>
            </HStack>
          </Flex>
        )}

        <div ref={messagesEndRef} />
      </VStack>

      {/* Input area */}
      <Flex
        p={3}
        borderTop="1px"
        borderColor={borderColor}
        align="center"
      >
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          size="md"
          mr={2}
          _placeholder={{ color: placeholderColor }}
          disabled={isLoading}
        />
        <IconButton
          aria-label="Send message"
          icon={FaPaperPlane as any}
          colorScheme="blue"
          onClick={handleSendMessage}
          isLoading={isLoading}
          isDisabled={!inputValue.trim() || isLoading || !ollamaStatus?.ollamaRunning}
        />
      </Flex>
    </MotionBox>
  );
};

export default ChatBot;
