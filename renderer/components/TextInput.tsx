import { SystemStyleObject, Container, Input, InputProps as ChakraInputProps, Text, Box } from "@chakra-ui/react";

type TextInputProps = {
  sx?: SystemStyleObject & {
    type?: string;
    width?: string;
    _focus?: SystemStyleObject;
  };
  value: string;
  placeholder?: string;
  type?: string;
  width?: string;
  labelText?: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;

} & Partial<ChakraInputProps>

const TextInput: React.FC<TextInputProps> = ({
  value,
  placeholder,
  labelText,
  sx = {
    type: 'text',
    width: '200px',
    _focus: {}
  },
  onChange,
  onBlur
}: TextInputProps) => {
  return (
    <Container p={0} alignItems="left" width={sx.width}>
      {labelText && (
        <Text
          fontSize="sm"
          fontWeight="semibold"
        >
          {labelText}
        </Text>
      )}
      <Input
        sx={{ ...sx }}
        width="100%"
        padding="0rem 0.5rem"
        borderRadius="md"
        borderWidth="1px"
        borderColor="gray.300"
        type={sx.type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onBlur={onBlur}
        _focus={{
          borderColor: 'blue.500',
          boxShadow: '0 0 0 1px blue.500',
          ...sx?._focus
        }}
      />
    </Container>
  );
};

export default TextInput;
