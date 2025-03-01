import { IconButton, useColorMode } from '@chakra-ui/react'
import { SunIcon, MoonIcon } from '@chakra-ui/icons'


export const DarkModeSwitch = () => {
  const { colorMode, toggleColorMode } = useColorMode()
  const isDark = colorMode === 'dark'
  return (
    <IconButton
      position='absolute'
      bottom={0}
      left={2}
      zIndex={100}
      aria-label="Toggle Theme"
      colorScheme="blue"
      onClick={toggleColorMode}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </IconButton>
  )
}