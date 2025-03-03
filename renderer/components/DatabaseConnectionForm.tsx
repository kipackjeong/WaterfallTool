import {
    Button,
    Flex,
    Icon,
    IconButton,
    Modal,
    ModalBody,
    ModalContent,
    ModalHeader,
    ModalOverlay,
    Radio,
    RadioGroup,
    useToast,
} from "@chakra-ui/react"
import { ElementType, useEffect, useState } from "react"
import { FaTimes } from "react-icons/fa"
import { useProjectStore } from "../lib/states/projectsState"
import TextInput from "./TextInput"
import { ProjectViewModel } from "@/lib/models"
import { useAuth } from "@/lib/contexts/authContext"

interface DatabaseConnectionFormProps {
    isOpen: boolean
}
function DatabaseConnectionForm({ isOpen }: DatabaseConnectionFormProps) {
    const { projectsArrState, addProject } = useProjectStore(state => state)
    const { user } = useAuth()
    const [projectName, setProjectName] = useState("sample")
    const [serverName, setServerName] = useState("sandboxvbasqlserver.database.windows.net")
    const [databaseName, setDatabaseName] = useState("sampledb")
    const [tableName, setTableName] = useState("DataSource")
    const [modelName, setModelName] = useState("")
    const [userName, setUser] = useState("") // State for username
    const [password, setPassword] = useState("") // State for password
    const [_isOpen, _setIsOpen] = useState(isOpen)
    const [connectionType, setConnectionType] = useState('local'); // New state for connection type

    const toast = useToast();

    useEffect(() => {
        _setIsOpen(isOpen)
    }, [isOpen])

    const connectToDatabase = async () => {
        try {
            //TODO: https://dev.to/abulhasanlakhani/connecting-to-sql-serverName-from-electron-react-1kdi
            const projectPayload: ProjectViewModel = {
                userId: user.id,
                name: projectName,
                sqlServerViewModels: [{
                    isRemote: connectionType == 'remote',
                    name: serverName,
                    databases: [{
                        server: serverName,
                        name: databaseName,
                        tables: [{ name: tableName }],
                        model: modelName
                    }],
                    sqlConfig: {
                        server: serverName,
                        database: databaseName,
                        table: tableName,
                        isRemote: connectionType == 'remote',
                        user: userName,
                        password,
                        port: 1433,
                        options: {
                            encrypt: true,
                            trustServerCertificate: true
                        }
                    }
                }]
            }

            addProject(projectPayload);
        } catch (err) {
            toast({
                title: 'Error',
                description: "Failed to connect to database",
                status: 'error',
                duration: 3000,
                isClosable: true,
            })
        }

    };

    return (
        <>
            <Modal isOpen={_isOpen} onClose={() => { }}>
                <ModalOverlay />
                <ModalContent style={{ paddingBottom: "16px" }}>
                    <ModalHeader display="flex" alignItems="center" justifyContent="space-between">
                        Connect to Database
                        <IconButton
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                _setIsOpen(false)
                            }}
                            aria-label="Close"
                        >
                            <Icon as={FaTimes as ElementType} />
                        </IconButton>
                    </ModalHeader>

                    <ModalBody>
                        <Flex gap={4} direction="column" alignItems="center" justifyContent="center">
                            <RadioGroup onChange={setConnectionType} value={connectionType}>
                                <Flex direction="row" gap={4}>
                                    <Radio value='local'>Local</Radio>
                                    <Radio value='remote'>Remote</Radio>
                                </Flex>
                            </RadioGroup>
                            <TextInput
                                labelText="ProjectViewModel"
                                value={projectName}
                                onChange={(event) =>
                                    setProjectName(event.target.value)
                                }
                            />
                            <TextInput
                                labelText="Server"
                                value={serverName}
                                onChange={(event) =>
                                    setServerName(event.target.value)
                                }
                            />
                            <TextInput
                                labelText="Database"
                                value={databaseName}
                                onChange={(event) =>
                                    setDatabaseName(event.target.value)
                                }
                            />
                            <TextInput
                                labelText="Table Name"
                                value={tableName}
                                onChange={(event) =>
                                    setTableName(event.target.value)
                                }
                            />
                            <TextInput
                                labelText="Model"
                                value={modelName}
                                onChange={(event) =>
                                    setModelName(event.target.value)
                                }
                            />
                            <TextInput
                                labelText="Username"
                                value={userName}
                                onChange={(event) =>
                                    setUser(event.target.value)
                                }
                            />
                            <TextInput
                                labelText="Password"
                                type="password"
                                value={password}
                                onChange={(event) =>
                                    setPassword(event.target.value)
                                }
                            />
                            <Button
                                variant="outline"
                                colorScheme="blue"
                                rounded="button"
                                width="200px"
                                onClick={() => {
                                    _setIsOpen(false)

                                    let valid = true;
                                    let inputError = "";
                                    if (!serverName) {
                                        inputError = inputError + "Server is required.\n";
                                        valid = false;
                                    }
                                    if (!databaseName) {
                                        inputError = inputError + "Database is required.\n";
                                        valid = false;
                                    }
                                    if (!tableName) {
                                        inputError = inputError + "Table name is required.\n";
                                        valid = false;
                                    }
                                    // if (!modelName) {
                                    //     inputError = inputError + "Model name is required.\n";
                                    //     valid = false;
                                    // }
                                    if (!userName) {
                                        inputError = inputError + "Username is required for remote connections.\n";
                                        valid = false;
                                    }

                                    if (valid) {
                                        connectToDatabase()
                                    }
                                    else {
                                        toast({
                                            title: "Input Error",
                                            description: inputError,
                                            status: "error",
                                            duration: 3000,
                                            isClosable: true,
                                        });
                                    }
                                }}
                            >
                                Connect
                            </Button>
                        </Flex>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </>
    )
}
export default DatabaseConnectionForm