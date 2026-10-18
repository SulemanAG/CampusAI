import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import CommunityFeed from "@/components/CommunityFeed";
import { BackgroundGlow } from "@/components/ui/background-glow";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

const CommunityContent = () => {
    const { toggleSidebar, open } = useSidebar();
    const [searchParams, setSearchParams] = useSearchParams();
    const [showMyPosts, setShowMyPosts] = useState(false);

    useEffect(() => {
        if (searchParams.get("filter") === "myposts") {
            setShowMyPosts(true);
        } else {
            setShowMyPosts(false);
        }
    }, [searchParams]);

    const toggleMyPosts = () => {
        if (showMyPosts) {
            setSearchParams({});
        } else {
            setSearchParams({ filter: "myposts" });
        }
    };

    return (
        <div className="flex h-screen w-full bg-background overflow-hidden">
            <AppSidebar />

            <main className="flex-1 h-full bg-background overflow-y-auto relative">
                <UnifiedHeader
                    title="Community"
                    subtitle={showMyPosts ? "My Posts" : "Department"}
                    onSidebarToggle={toggleSidebar}
                    isSidebarOpen={open}
                    onMyPostsClick={toggleMyPosts}
                />

                <div className="relative flex justify-center min-h-[calc(100vh-4rem)]">
                    <BackgroundGlow />
                    <div className="relative z-10 w-full flex justify-center">
                        <CommunityFeed showMyPosts={showMyPosts} />
                    </div>
                </div>
            </main>
        </div>
    );
};

const Community = () => {
    return (
        <SidebarProvider>
            <CommunityContent />
        </SidebarProvider>
    );
};

export default Community;
