import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
    Loader2,
    Building2,
    MapPin,
    Globe,
    Phone,
    FileText,
    ShieldAlert,
    Save,
    Trash2
} from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface UniversityProfileSectionProps {
    email: string;
}

interface UniversityData {
    universityId: string;
    email: string;
    universityName: string;
    universityType: string;
    city: string;
    state: string;
    country: string;
    websiteUrl: string;
    establishedDate: string;
    studentEmailExtension: string;
    description: string;
    phoneNumber: string;
    accreditation: string;
    read_website: boolean;
    isActive: boolean;
    apiKeyInfo?: {
        keyId: string;
        assignedAt: string;
    };
    ragStore?: {
        storeName: string;
    };
}

export const UniversityProfileSection = ({ email }: UniversityProfileSectionProps) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [data, setData] = useState<UniversityData | null>(null);

    // Form states
    const [formData, setFormData] = useState({
        city: "",
        state: "",
        country: "",
        description: "",
        phoneNumber: "",
        websiteUrl: "",
        read_website: false,
        isActive: true,
    });

    useEffect(() => {
        if (email) {
            fetchProfile();
        }
    }, [email]);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const response = await fetch(`https://campusai-916628151603.asia-south1.run.app/university/profile/${email}`);
            const result = await response.json();

            if (response.ok) {
                setData(result);
                setFormData({
                    city: result.city || "",
                    state: result.state || "",
                    country: result.country || "",
                    description: result.description || "",
                    phoneNumber: result.phoneNumber || "",
                    websiteUrl: result.websiteUrl || "",
                    read_website: result.read_website,
                    isActive: result.isActive,
                });
            } else {
                toast({
                    title: "Error fetching profile",
                    description: result.error || "Failed to load profile data",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Network Error",
                description: "Could not connect to server",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSwitchChange = (name: string, checked: boolean) => {
        setFormData(prev => ({ ...prev, [name]: checked }));
    };

    const handleSave = async () => {
        if (!data) return;
        setSaving(true);

        try {
            // Construct query parameters
            const params = new URLSearchParams();
            params.append("email", email);
            params.append("city", formData.city);
            params.append("state", formData.state);
            params.append("country", formData.country);
            params.append("description", formData.description);
            params.append("phoneNumber", formData.phoneNumber);
            // Note: websiteUrl updates might not be supported based on API spec (only listed field1=value1 etc for city, state, etc)
            // The spec lists: city, state, country, description, phoneNumber, read_website, isActive.
            // It does NOT list websiteUrl as updatable in the text description ("Any updatable field: ..."), 
            // but I'll include it if it was changed just in case, or stick to the list.
            // Sticking to the list to be safe, but phoneNumber was listed.

            params.append("read_website", String(formData.read_website));
            params.append("isActive", String(formData.isActive));

            const response = await fetch(`https://campusai-916628151603.asia-south1.run.app/university/update-profile?${params.toString()}`, {
                method: 'GET', // Using GET as per observed patterns and implicit spec
            });

            const result = await response.json();

            if (response.ok) {
                toast({
                    title: "Profile Updated",
                    description: "University profile updated successfully.",
                });
                // Update local data with result.university
                setData(result.university);
                // Update localStorage if needed? The SettingsDialog reads from it on mount.
                // We might want to update it so if they reopen dialog it's fresh, but SettingsDialog fetches from localStorage only on mount.
                // Ideally we update the localStorage too.
                const localData = localStorage.getItem("universityData");
                if (localData) {
                    const parsed = JSON.parse(localData);
                    // Merge updates
                    const updated = { ...parsed, ...result.university };
                    localStorage.setItem("universityData", JSON.stringify(updated));
                }
            } else {
                toast({
                    title: "Update Failed",
                    description: result.error || "Could not update profile",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to save changes",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const response = await fetch(`https://campusai-916628151603.asia-south1.run.app/university/delete-university?email=${email}`, {
                method: 'GET', // Spec implies GET for delete typically if just parameterized in URL, though usually DELETE. 
                // Given headers/body aren't specified but params are, and previous patterns, checking... 
                // "complete example url" acts like a GET link.
            });
            const result = await response.json();

            if (response.ok) {
                toast({
                    title: "University Deleted",
                    description: "Account and data have been permanently removed.",
                    variant: "destructive",
                });
                // Logout user
                localStorage.clear();
                window.location.href = "/";
            } else {
                toast({
                    title: "Delete Failed",
                    description: result.error || "Could not delete university",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to perform delete operation",
                variant: "destructive",
            });
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex bg-background items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex bg-background flex-col items-center justify-center h-full text-muted-foreground">
                <Building2 className="h-12 w-12 mb-4 opacity-50" />
                <p>No profile data available</p>
            </div>
        );
    }

    // Check if form is modified
    const isModified = data && (
        formData.city !== (data.city || "") ||
        formData.state !== (data.state || "") ||
        formData.country !== (data.country || "") ||
        formData.description !== (data.description || "") ||
        formData.phoneNumber !== (data.phoneNumber || "") ||
        formData.read_website !== data.read_website ||
        formData.isActive !== data.isActive
    );

    return (
        <div className="bg-background space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 pb-10">
            <div className="mb-6">
                <h3 className="text-2xl font-semibold tracking-tight mb-2">University Profile</h3>
                <p className="text-muted-foreground">Manage your university's public information and settings.</p>
            </div>

            <div className="grid gap-6">
                {/* Identity Card */}
                <Card className="border-border/40 shadow-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-primary" />
                            <CardTitle className="text-lg">Identity</CardTitle>
                        </div>
                        <CardDescription>Basic information about the university.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label className="text-muted-foreground text-xs uppercase tracking-wider">University Name</Label>
                            <div className="font-medium">{data.universityName}</div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Type</Label>
                            <div className="font-medium">{data.universityType}</div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Email Extension</Label>
                            <div className="font-mono text-sm bg-muted/30 px-2 py-1 rounded w-fit">{data.studentEmailExtension}</div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Accreditation</Label>
                            <div className="font-medium">{data.accreditation}</div>
                        </div>
                    </CardContent>
                </Card>

                {/* Contact & Location Form */}
                <Card className="border-border/40 shadow-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-primary" />
                            <CardTitle className="text-lg">Contact & Location</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="phoneNumber">Phone Number</Label>
                                <Input
                                    id="phoneNumber"
                                    name="phoneNumber"
                                    value={formData.phoneNumber}
                                    onChange={handleInputChange}
                                    placeholder="+91..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="city">City</Label>
                                <Input
                                    id="city"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="state">State</Label>
                                <Input
                                    id="state"
                                    name="state"
                                    value={formData.state}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="country">Country</Label>
                                <Input
                                    id="country"
                                    name="country"
                                    value={formData.country}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Description & Website */}
                <Card className="border-border/40 shadow-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <Globe className="h-5 w-5 text-primary" />
                            <CardTitle className="text-lg">Online Presence</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Website URL (Read-only)</Label>
                            <div className="text-sm text-muted-foreground">{data.websiteUrl}</div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">About</Label>
                            <Textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                className="min-h-[100px]"
                                placeholder="Describe your university..."
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Settings & Automation */}
                <Card className="border-border/40 shadow-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            <CardTitle className="text-lg">Configuration</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">Website Reading</Label>
                                <p className="text-sm text-muted-foreground">Allow AI to crawl official website</p>
                            </div>
                            <Switch
                                checked={formData.read_website}
                                onCheckedChange={(c) => handleSwitchChange('read_website', c)}
                            />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">Generic Active Status</Label>
                                <p className="text-sm text-muted-foreground">Master switch for university account activation</p>
                            </div>
                            <Switch
                                checked={formData.isActive}
                                onCheckedChange={(c) => handleSwitchChange('isActive', c)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Save Changes */}
                <div className="flex justify-end pt-4">
                    <Button onClick={handleSave} disabled={saving || !isModified} className="min-w-[150px]">
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Save Changes
                            </>
                        )}
                    </Button>
                </div>

                <div className="mt-8 border-t border-red-200/20 pt-8"></div>

                {/* Danger Zone */}
                <Card className="border-red-500/20 bg-red-500/5 shadow-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2 text-red-500">
                            <ShieldAlert className="h-5 w-5" />
                            <CardTitle className="text-lg">Danger Zone</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h4 className="font-medium text-red-500/90">Delete University Account</h4>
                                <p className="text-sm text-red-500/60 max-w-sm">
                                    Permanently delete this university and all associated data, students, and configurations. This action cannot be undone.
                                </p>
                            </div>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete University
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete
                                            <span className="font-semibold text-foreground"> {data.universityName} </span>
                                            and remove all data from our servers.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                                            {deleting ? "Deleting..." : "Yes, delete everything"}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
