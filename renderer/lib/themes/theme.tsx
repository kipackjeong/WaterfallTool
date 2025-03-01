import { transparentize } from "@chakra-ui/theme-tools";

export const getDarkestThemeColor = (colorMode: 'light' | 'dark'): string => {
    return colorMode === 'light' ? 'gray.800' : 'gray.700';
};
export const getTableBorderColor = (colorMode: 'light' | 'dark', transparency?: number): any => {
    const color = colorMode === 'light' ? 'blue.300' : 'blue.200';
    return transparentize(color, transparency || 0.3);
};

export const getHeadTextColor = (colorMode: 'light' | 'dark'): any => {
    const color = colorMode === 'light' ? 'blue.700' : 'blue.200';
    return color;
};