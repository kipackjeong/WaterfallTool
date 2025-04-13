import { transparentize } from "@chakra-ui/theme-tools";

/**
 * Returns the darkest color for UI elements based on the current color mode.
 * 
 * @param colorMode - The current color mode ('light' or 'dark')
 * @returns A Chakra UI color string representing the darkest shade appropriate for the current mode
 */
export const getDarkestThemeColor = (colorMode: 'light' | 'dark'): string => {
    return colorMode === 'light' ? 'gray.800' : 'gray.700';
};

/**
 * Generates a semi-transparent border color for tables that adapts to the current theme.
 * 
 * @param colorMode - The current color mode ('light' or 'dark')
 * @param transparency - Optional transparency level between 0 and 1 (default: 0.3)
 * @returns A Chakra UI color value with applied transparency
 */
export const getTableBorderColor = (colorMode: 'light' | 'dark', transparency?: number): any => {
    const color = colorMode === 'light' ? 'blue.700' : 'blue.200';
    return transparentize(color, transparency || 0.3);
};

/**
 * Returns the appropriate text color for table headers based on the current theme.
 * 
 * @param colorMode - The current color mode ('light' or 'dark')
 * @returns A Chakra UI color string suitable for header text in the current theme
 */
export const getHeadTextColor = (colorMode: 'light' | 'dark'): any => {
    const color = colorMode === 'light' ? 'blue.700' : 'blue.200';
    return color;
};