
import { Flex } from "@chakra-ui/react";
import Sidebar from "../components/Sidebar";

function MainLayout({ children }) {
    return (
        <main style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "row" }} >
            <Sidebar />
            <Flex style={{ width: "100%", padding: "16px", overflowY: "scroll", msOverflowStyle: "scrollbar", msOverflowY: "scroll" }} >
                {children}
            </Flex>
        </main>
    )
}

export default MainLayout