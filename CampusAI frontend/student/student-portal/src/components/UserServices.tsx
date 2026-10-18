import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, HardHat, MessageSquarePlus, Laptop, Radio, Wrench, Bot, Brain } from "lucide-react";
import { useState, useEffect } from "react";
import { FeedbackDialog } from "./FeedbackDialog";
import { GlowingCard } from "@/components/ui/glowing-card";
import { studentApi, AccessibleAccount } from "@/lib/api";
import { toast } from "@/components/ui/use-toast";

// Constant set of 7 icons as requested
const ICONS = [Laptop, Radio, Zap, Wrench, HardHat, Bot, Brain];

// Constant set of styles matching the icons for visual appeal
const STYLES = [
    { color: "text-blue-500", bgColor: "bg-blue-500/10" },
    { color: "text-green-500", bgColor: "bg-green-500/10" },
    { color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
    { color: "text-red-500", bgColor: "bg-red-500/10" },
    { color: "text-orange-500", bgColor: "bg-orange-500/10" },
    { color: "text-purple-500", bgColor: "bg-purple-500/10" },
    { color: "text-pink-500", bgColor: "bg-pink-500/10" },
];

const UserServices = () => {
    const [accounts, setAccounts] = useState<AccessibleAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedService, setSelectedService] = useState<{ accountName: string; accountEmail: string } | null>(null);

    useEffect(() => {
        const fetchAccounts = async () => {
            const studentDataStr = localStorage.getItem("studentData");
            if (!studentDataStr) {
                setLoading(false);
                return;
            }
            try {
                const student = JSON.parse(studentDataStr);
                const response = await studentApi.getAccessibleAccounts(student.email);
                setAccounts(response.accounts || []);
            } catch (error) {
                console.error("Failed to fetch accessible accounts", error);
                toast({
                    title: "Error",
                    description: "Failed to load departments.",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        fetchAccounts();
    }, []);

    if (loading) {
        return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div>;
    }

    return (
        <div className="w-full max-w-7xl mx-auto p-6 h-full overflow-y-auto pb-24">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {accounts.map((account, index) => {
                    const Icon = ICONS[index % 7];
                    const style = STYLES[index % 7];

                    return (
                        <GlowingCard key={account.accountEmail} className="group p-6 h-full flex flex-col justify-between min-h-[200px] hover:scale-[1.02] transition-transform duration-300">
                            <div className="space-y-4">
                                <CardHeader className="p-0 relative z-10">
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className={`p-3 rounded-xl ${style.bgColor} transition-transform group-hover:scale-110 duration-300`}>
                                            <Icon className={`h-6 w-6 ${style.color}`} />
                                        </div>
                                        <CardTitle className="text-lg font-bold leading-tight break-words line-clamp-2">
                                            {account.accountName}
                                        </CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0 relative z-10">
                                    {/* Description can be dynamic if available in future, for now generic or simplified */}
                                    {/* Using email as a subtitle for context */}
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/30 p-2 rounded-lg w-fit mb-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary/50"></div>
                                        {account.accountEmail}
                                    </div>
                                </CardContent>
                            </div>

                            <div className="pt-6 mt-auto relative z-10">
                                <Button
                                    className="w-full gap-2 font-semibold shadow-md hover:shadow-lg transition-all h-10 text-sm group-hover:bg-primary group-hover:text-primary-foreground"
                                    variant="secondary"
                                    onClick={() => setSelectedService(account)}
                                >
                                    <MessageSquarePlus className="h-4 w-4" />
                                    Give Feedback
                                </Button>
                            </div>
                        </GlowingCard>
                    );
                })}
                {accounts.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-24 text-muted-foreground bg-muted/5 rounded-2xl border border-dashed border-border text-center">
                        <div className="bg-muted/20 p-4 rounded-full mb-4">
                            <Zap className="h-10 w-10 opacity-30" />
                        </div>
                        <p className="text-lg font-medium">No accessible departments found</p>
                    </div>
                )}
            </div>

            <FeedbackDialog
                open={!!selectedService}
                onOpenChange={(open) => !open && setSelectedService(null)}
                service={selectedService}
            />
        </div>
    );
};

export default UserServices;
