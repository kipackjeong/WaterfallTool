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
    Text,
    useToast,
} from "@chakra-ui/react"
import { ElementType, useEffect, useState } from "react"
import { FaTimes } from "react-icons/fa"
import useSqlQuery from "../lib/hooks/useSqlQuery"
import { useProjectStore } from "../lib/states/projects.provider"
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
    const [server, setServerName] = useState("sandboxvbasqlserver")
    const [database, setDatabaseName] = useState("sampledb")
    const [table, setTableName] = useState("DataSource")
    const [modelName, setModelName] = useState("")
    const [_isOpen, _setIsOpen] = useState(isOpen)
    const [connectionType, setConnectionType] = useState('local'); // New state for connection type

    const toast = useToast();

    useEffect(() => {
        _setIsOpen(isOpen)
    }, [isOpen])
    const { runSqlServerHandshake } = useSqlQuery()

    const connectToDatabase = async () => {
        //TODO: https://dev.to/abulhasanlakhani/connecting-to-sql-server-from-electron-react-1kdi
        const projectPayload: ProjectViewModel = {
            userId: user.id,
            name: projectName,
            sqlServerViewModels: [{
                isRemote: connectionType == 'remote',
                name: server,
                databases: [{
                    server: server,
                    name: database,
                    tables: [{ name: table }],
                    model: ''
                }]
            }]
        }

        addProject(projectPayload);

        runSqlServerHandshake({ server: server, database, table, isRemote: connectionType == 'remote' }).then(async (res) => {
            if (!res) return;
            await addProject(projectPayload)
        })
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
                                value={server}
                                onChange={(event) =>
                                    setServerName(event.target.value)
                                }
                            />
                            <TextInput
                                labelText="Database"
                                value={database}
                                onChange={(event) =>
                                    setDatabaseName(event.target.value)
                                }
                            />
                            <TextInput
                                labelText="Table Name"
                                value={table}
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
                            <Button
                                variant="outline"
                                colorScheme="blue"
                                rounded="button"
                                width="200px"
                                onClick={() => {
                                    _setIsOpen(false)

                                    let valid = true;
                                    let inputError = "";
                                    if (!server) {
                                        inputError = inputError + "Server is required.\n";
                                        valid = false;
                                    }
                                    if (!database) {
                                        inputError = inputError + "Database is required.\n";
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