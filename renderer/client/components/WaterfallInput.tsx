import React, { useState, useEffect } from 'react';
import TextInput from './TextInput';

interface WaterfallInputProps {
  value: string;
  sx?: any;
  onBlur?: (newVal: string) => void;
}

const WaterfallInput: React.FC<WaterfallInputProps> = ({ value, sx, onBlur }) => {
  const [waterfallValue, setWaterfallValue] = useState(value);

  // Update local state when prop value changes (e.g., during sorting)
  useEffect(() => {
    setWaterfallValue(value);
  }, [value]);

  return (
    <TextInput
      sx={sx}
      value={waterfallValue}
      onChange={(e) => {
        const newVal = e.target.value;
        setWaterfallValue(newVal);
      }}
      onBlur={() => {
        onBlur && onBlur(waterfallValue);
      }}
    />
  );
};

export default WaterfallInput;