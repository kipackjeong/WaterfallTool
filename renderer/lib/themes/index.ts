import colors from './colors';
import typography from './typography';
import spacing from './spacing';
import { extendTheme } from '@chakra-ui/react';

const customTheme = extendTheme({
  colors,
  fonts: typography.fonts,
  fontSizes: typography.fontSizes,
  space: spacing,
});

export default customTheme;
