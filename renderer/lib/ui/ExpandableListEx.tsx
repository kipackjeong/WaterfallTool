import { GoServer, GoDatabase } from "react-icons/go";
import { Flex, Text } from "@chakra-ui/react";
import { ElementType } from "react";
import ExpandableList from "./ExpandableList";

// Example of nested expandable lists
const ExpandableListExample = () => {
    // Sample data
    const servers = [
        {
            name: "Server 1",
            databases: [
                { name: "Database 1", tables: ["Table 1", "Table 2"] },
                { name: "Database 2", tables: ["Table 3", "Table 4", "Table 5"] }
            ]
        },
        {
            name: "Server 2",
            databases: [
                { name: "Database 3", tables: ["Table 6", "Table 7"] }
            ]
        }
    ];

    return (
        <Flex direction="column" p={4} width="300px">
            <Text fontSize="xl" fontWeight="bold" mb={4}>Expandable List Example</Text>

            {servers.map((server, index) => (
                <ExpandableList
                    key={index}
                    title={server.name}
                    titleIcon={GoServer as ElementType}
                    items={server.databases.map((database, dbIndex) => (
                        <ExpandableList
                            key={dbIndex}
                            title={database.name}
                            titleIcon={GoDatabase as ElementType}
                            items={database.tables.map((table, tableIndex) => (
                                <Text key={tableIndex} pl={2} py={1}>
                                    {table}
                                </Text>
                            ))}
                            hoverColor="teal.400"
                        />
                    ))}
                />
            ))}
        </Flex>
    );
};

export default ExpandableListExample;
