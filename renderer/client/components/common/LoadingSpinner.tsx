import React from 'react';
import { Flex, Spinner, SpinnerProps } from '@chakra-ui/react';

interface LoadingSpinnerProps {
  size?: SpinnerProps['size'];
  zIndex?: number;
  position?: 'fixed' | 'absolute';
  backgroundColor?: string;
  top?: number | string;
}

/**
 * A reusable loading spinner component that can be placed over content
 * while data is being fetched or processed.
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'xl',
  zIndex = 1000,
  position = 'absolute',
  top = 0,
  backgroundColor = 'rgba(255, 255, 255, 0.7)',
}) => (
  <Flex sx={{ width: "100%", height: "100%" }}>
    <Flex
      sx={{
        width: "100%",
        height: "100%",
        position,
        top,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex,
        backgroundColor
      }}
    >
      <Spinner size={size} />
    </Flex>
  </Flex>

);

export default LoadingSpinner;
