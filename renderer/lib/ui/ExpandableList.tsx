import { Flex, Text, Icon, IconButton, FlexProps, IconButtonProps } from "@chakra-ui/react";
import { IoClose } from "react-icons/io5";
import { ElementType, ReactNode, useState } from "react";
import { MdKeyboardArrowDown, MdKeyboardArrowRight } from "react-icons/md";

interface ExpandableListProps {
  title: string | ReactNode;
  titleIcon?: ElementType;
  items: ReactNode[];
  initialExpanded?: boolean;
  onToggle?: (expanded: boolean) => void;
  hoverColor?: string;
  headerProps?: FlexProps;
  containerProps?: FlexProps;
  showChevron?: boolean;
  onDelete?: () => void;
  deleteButtonProps?: IconButtonProps;
  deleteConfirmMessage?: string;
}

const ExpandableList = ({
  title,
  titleIcon,
  items,
  initialExpanded = true,
  onToggle,
  hoverColor = "blue.400",
  headerProps,
  containerProps,
  showChevron = true,
  onDelete,
  deleteButtonProps,
  deleteConfirmMessage,
}: ExpandableListProps) => {
  const [expanded, setExpanded] = useState(initialExpanded);

  const toggleExpand = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    if (onToggle) {
      onToggle(newExpanded);
    }
  };

  return (
    <Flex direction="column" width="100%" justifyContent="center" {...containerProps}>
      <Flex
        sx={{
          position: "relative",
          justifyContent: "start",
          alignItems: "center",
          gap: 2,
          cursor: "pointer",
          _hover: {
            color: hoverColor,
            '.delete-icon': {
              display: 'flex'
            }
          },
        }}
        onClick={toggleExpand}
        {...headerProps}
      >
        {showChevron && (
          <Icon
            as={(expanded ? MdKeyboardArrowDown : MdKeyboardArrowRight) as ElementType}
            fontSize="sm"
          />
        )}
        {titleIcon && <Icon as={titleIcon as ElementType} />}
        {typeof title === "string" ? <Text noOfLines={1} overflow="hidden" textOverflow="ellipsis" maxWidth="100%">{title}</Text> : title}

        {onDelete && (
          <IconButton
            aria-label="Delete item"
            icon={<Icon as={IoClose as ElementType} fontSize="sm" />}
            size="sm"
            variant="ghost"
            colorScheme="orange"
            className="delete-icon"
            sx={{
              position: 'absolute',
              right: '0px',
              background: 'transparent',
              display: "none",
              minWidth: "auto",
              height: "auto",
              padding: "4px",
              _hover: {
                background: 'transparent',
              },
              ...deleteButtonProps?.sx
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(deleteConfirmMessage || `Are you sure you want to delete this item?`)) {
                onDelete();
              }
            }}
            {...(deleteButtonProps || {})}
          />
        )}
      </Flex>

      {expanded && items.map((item, index) => (
        <Flex key={index} pl={4}>
          {item}
        </Flex>
      ))}
    </Flex>
  );
};

export default ExpandableList;
