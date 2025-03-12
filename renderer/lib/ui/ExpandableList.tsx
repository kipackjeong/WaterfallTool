import { Flex, Text, Icon, IconButton, FlexProps, IconButtonProps, Button } from "@chakra-ui/react";
import { IoClose } from "react-icons/io5";
import { ElementType, ReactNode, useState } from "react";
import { MdKeyboardArrowDown, MdKeyboardArrowRight } from "react-icons/md";
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import { motion, AnimatePresence } from "framer-motion";

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
        }}
        {...headerProps}
      >
        <Button
          variant="ghost"
          color="white"
          sx={{
            padding: 0,
            height: '24px',
            width: '100%',
            justifyContent: "flex-start",
            alignItems: "center",
            cursor: "pointer",
            position: "relative",
            _hover: {
              color: hoverColor,
            },
          }}
          leftIcon={
            <Flex gap={2} alignItems="center">
              {showChevron && (
                <motion.div
                  animate={{ rotate: expanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Icon as={ChevronDownIcon} />
                </motion.div>
              )}
              {titleIcon && <Icon as={titleIcon as ElementType} />}
            </Flex>
          }
          onClick={toggleExpand}
        >
          {typeof title === "string" ? <Text noOfLines={1} overflow="hidden" textOverflow="ellipsis" maxWidth="100%">{title}</Text> : title}
        </Button>
      </Flex>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="content"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            {items.map((item, index) => (
              <Flex key={index} pl={4}>
                {item}
              </Flex>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </Flex >
  );
};

export default ExpandableList;
