import React, { useState } from 'react';
import TextInput from './TextInput';

interface WaterfallInputProps {
  value: string;
  sx?: any;
  onBlur?: (newVal: string) => void;
}

const WaterfallInput: React.FC<WaterfallInputProps> = ({ value, sx, onBlur }) => {
  const [waterfallValue, setWaterfallValue] = useState(value);

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