import { LayoutDashboard, Ticket, AlertTriangle, MessageSquare, Radio, LogOut, Users, Bot, GraduationCap, Shield } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
// import govtLogo from "@/assets/emblem-new.jpg";

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarFooter,
    useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Information Broadcast", url: "/notifications", icon: Radio },
    { title: "Tickets", url: "/tickets", icon: Ticket },
    { title: "Community", url: "/community", icon: Users },
    { title: "Feedback", url: "/feedback", icon: MessageSquare },
    { title: "Student's End", url: "/user-login", icon: Bot },
];

export function AppSidebar() {
    const { state } = useSidebar();
    const location = useLocation();
    const navigate = useNavigate();
    const currentPath = location.pathname;
    const [userLocation, setUserLocation] = useState<{ state: string; city: string } | null>(null);

    const isActive = (path: string) => currentPath === path;
    const isCollapsed = state === "collapsed";

    useEffect(() => {
        const userState = localStorage.getItem("userState");
        const userCity = localStorage.getItem("userCity");
        if (userState && userCity) {
            setUserLocation({ state: userState, city: userCity });
        }
    }, []);

    const handleLogout = () => {
        // Add logout logic here
        navigate("/");
    };

    return (
        <Sidebar collapsible="icon" className="border-r-0 glass">
            {/* Logo Header */}
            <div className={`${isCollapsed ? "py-4" : "p-6"} mb-4 transition-all`}>
                <div className={`flex items-center ${isCollapsed ? "justify-center w-full" : "gap-3"}`}>
                    <div className={`${isCollapsed ? "h-12 w-12 flex items-center justify-center" : "h-10 w-10"}`}>
                        <NavLink to="/dashboard" className="block w-full h-full flex items-center justify-center">
                            <div className="h-full w-full rounded-full border border-border flex items-center justify-center bg-background hover:ring-2 hover:ring-primary transition-all cursor-pointer">
                                <GraduationCap className="h-6 w-6 text-primary" />
                            </div>
                        </NavLink>
                    </div>
                    {!isCollapsed && (
                        <div className="flex flex-col">
                            <span className="font-poppins font-extrabold text-[12px] uppercase tracking-wide">UNIVERSITY ADMIN PORTAL</span>
                            {userLocation && (
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                    {userLocation.state} | {userLocation.city}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <SidebarContent className={`${isCollapsed ? "px-2" : "px-3"} transition-all`}>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu className="space-y-2">
                            {menuItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild size="lg" className={`rounded-xl hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 ${isCollapsed ? "!w-full !h-12 !p-0 justify-center" : ""}`}>
                                        <NavLink
                                            to={item.url}
                                            end
                                            className={`flex items-center gap-3 w-full h-full ${isCollapsed ? "justify-center" : "px-3"}`}
                                            activeClassName="glass text-primary font-semibold"
                                        >
                                            <item.icon className="h-5 w-5 shrink-0" />
                                            {!isCollapsed && <span>{item.title}</span>}
                                        </NavLink>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            {/* Logout at Bottom */}
            <SidebarFooter className="p-4">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton onClick={handleLogout} className="h-12 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors">
                            <LogOut className="h-5 w-5" />
                            {!isCollapsed && <span>Logout</span>}
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
