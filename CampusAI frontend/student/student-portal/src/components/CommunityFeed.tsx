import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlowingCard } from "@/components/ui/glowing-card";
import { socialApi } from "@/services/socialApi";

import {
    Image as ImageIcon,
    Heart,
    MessageCircle,
    Share,
    MoreHorizontal,
    X,
    ArrowBigUp,
    Trash2,
    TrendingUp,
    Users,
    Calendar,
    Newspaper,
    Hash,
    Loader2
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface Comment {
    id: string; // API uses commentId
    user: {
        name: string;
        handle: string;
        avatar: string;
        initials: string;
        email: string;
    };
    content: string;
    time: string;
}

interface Post {
    id: string; // API uses postId
    user: {
        name: string;
        handle: string;
        avatar: string;
        initials: string;
        email: string;
    };
    content: string;
    image?: string;
    time: string;
    likes: number;
    comments: number;
    upvotes: number;
    isLiked: boolean;
    isUpvoted: boolean;
    showComments: boolean;
    commentsList: Comment[];
}

interface CommunityFeedProps {
    showMyPosts?: boolean;
}

const CommunityFeed = ({ showMyPosts = false }: CommunityFeedProps) => {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [commentDrafts, setCommentDrafts] = useState<{ [key: string]: string }>({});
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [postToDelete, setPostToDelete] = useState<string | null>(null);
    const [showAllNews, setShowAllNews] = useState(false);
    const [loading, setLoading] = useState(false);
    const [posts, setPosts] = useState<Post[]>([]);

    // Dynamic User State
    const [currentUser, setCurrentUser] = useState({
        name: "Student User",
        handle: "@student_019",
        email: "01fe23bci019@kletech.ac.in",
        password: "12345678",
        avatar: "/placeholder-avatar.jpg",
        initials: "SU"
    });

    useEffect(() => {
        const storedData = localStorage.getItem("studentData");
        if (storedData) {
            try {
                const parsed = JSON.parse(storedData);
                if (parsed.name) {
                    const initials = parsed.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase()
                        .substring(0, 2);

                    const handle = `@${parsed.name.replace(/\s+/g, "_").toLowerCase()}`;

                    setCurrentUser({
                        name: parsed.name,
                        handle: parsed.handle || handle,
                        email: parsed.email || "01fe23bci019@kletech.ac.in",
                        password: parsed.password || "12345678",
                        avatar: parsed.avatar || "/placeholder-avatar.jpg",
                        initials: initials
                    });
                }
            } catch (e) {
                console.error("Failed to parse student data", e);
            }
        }
    }, []);

    // Format time helper
    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return "Just now";
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
        return `${Math.floor(diffInSeconds / 86400)}d`;
    };

    // Transform API post to Component Post
    const transformPost = (apiPost: any): Post => {
        const userEmail = currentUser.email;
        // Check if likes/upvotes is array of emails or just count (API doc ambiguous, example implied array for checks)
        // Assuming API returns arrays of emails for likes/upvotes based on standard practices if we need to check isLiked
        // But response says "totalLikes": 15 in like action. The feed response usually has array of likers if we need to know IF we liked it.
        // Let's assume apiPost.likes is array of strings (emails).

        const likes = Array.isArray(apiPost.likes) ? apiPost.likes : [];
        const upvotes = Array.isArray(apiPost.upvotes) ? apiPost.upvotes : [];

        // Extract image
        let image = undefined;
        if (apiPost.images && apiPost.images.length > 0) {
            // Check if it's the object format or string
            try {
                // If it's a string, try parsing it, otherwise use it
                const imgData = typeof apiPost.images[0] === 'string' ? JSON.parse(apiPost.images[0]) : apiPost.images[0];
                if (imgData && imgData.data) {
                    image = `data:${imgData.mimeType};base64,${imgData.data}`;
                }
            } catch (e) {
                console.log("Error parsing image", e);
            }
        }

        const commentsList = (apiPost.comments || []).map((c: any) => ({
            id: c.commentId || `c_${Date.now()}_${Math.random()}`,
            user: {
                name: c.authorName || "Unknown",
                handle: `@${(c.authorName || "user").replace(/\s+/g, "_").toLowerCase()}`,
                avatar: "",
                initials: (c.authorName || "U").substring(0, 2).toUpperCase(),
                email: c.authorEmail
            },
            content: c.comment,
            time: formatTime(c.createdAt)
        }));

        return {
            id: apiPost.postId,
            user: {
                name: apiPost.authorName || "Unknown",
                handle: `@${(apiPost.authorName || "user").replace(/\s+/g, "_").toLowerCase()}`,
                avatar: "", // API doesn't seem to provide avatar url, use placeholder or initials
                initials: (apiPost.authorName || "Unknown").split(" ").map((n: any) => n[0]).join("").substring(0, 2).toUpperCase(),
                email: apiPost.authorEmail
            },
            content: apiPost.text,
            image: image,
            time: formatTime(apiPost.createdAt),
            likes: likes.length,
            comments: commentsList.length,
            upvotes: upvotes.length,
            isLiked: likes.includes(userEmail),
            isUpvoted: upvotes.includes(userEmail),
            showComments: false,
            commentsList: commentsList
        }
    };

    const fetchPosts = async () => {
        setLoading(true);
        try {
            let data;
            if (showMyPosts) {
                data = await socialApi.getPostsByEmail(currentUser.email);
            } else {
                data = await socialApi.getHomeFeed(50);
            }

            if (data && data.posts) {
                const transformed = data.posts.map(transformPost);
                setPosts(transformed);
            }
        } catch (error) {
            console.error("Error fetching posts:", error);
            toast({
                title: "Error",
                description: "Failed to load posts. Please try again.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, [showMyPosts, currentUser.email]); // Re-fetch when view changes or user loads

    const [newPostContent, setNewPostContent] = useState("");

    const handleLike = async (id: string) => {
        // Optimistic update
        setPosts(posts.map(post => {
            if (post.id === id) {
                const newIsLiked = !post.isLiked;
                return {
                    ...post,
                    likes: newIsLiked ? post.likes + 1 : post.likes - 1,
                    isLiked: newIsLiked
                };
            }
            return post;
        }));

        try {
            await socialApi.likePost(currentUser.email, id);
        } catch (error) {
            console.error("Like failed", error);
            // Revert on failure could be added here
        }
    };

    const handleUpvote = async (id: string) => {
        setPosts(posts.map(post => {
            if (post.id === id) {
                const newIsUpvoted = !post.isUpvoted;
                return {
                    ...post,
                    upvotes: newIsUpvoted ? post.upvotes + 1 : post.upvotes - 1,
                    isUpvoted: newIsUpvoted
                };
            }
            return post;
        }));

        try {
            await socialApi.upvotePost(currentUser.email, id);
        } catch (error) {
            console.error("Upvote failed", error);
        }
    };

    const toggleComments = (id: string) => {
        setPosts(posts.map(post => {
            if (post.id === id) {
                return { ...post, showComments: !post.showComments };
            }
            return post;
        }));
    };

    const handleDraftCommentChange = (postId: string, text: string) => {
        setCommentDrafts({ ...commentDrafts, [postId]: text });
    };

    const submitComment = async (postId: string) => {
        const text = commentDrafts[postId];
        if (!text?.trim()) return;

        // Optimistic update not easy without ID, so wait for response
        try {
            const response = await socialApi.addComment(currentUser.email, postId, text);
            if (response && response.comment) {
                // Add new comment
                const newComment = {
                    id: response.comment.commentId,
                    user: {
                        name: response.comment.authorName,
                        handle: currentUser.handle,
                        avatar: currentUser.avatar,
                        initials: currentUser.initials,
                        email: currentUser.email
                    },
                    content: response.comment.comment,
                    time: "Just now"
                };

                setPosts(posts.map(post => {
                    if (post.id === postId) {
                        return {
                            ...post,
                            comments: post.comments + 1,
                            commentsList: [...post.commentsList, newComment]
                        };
                    }
                    return post;
                }));
                setCommentDrafts({ ...commentDrafts, [postId]: "" });
            }
        } catch (error) {
            console.error("Comment failed", error);
            toast({ title: "Error", description: "Failed to post comment", variant: "destructive" });
        }
    };

    const handleImageClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setSelectedImage(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handlePost = async () => {
        if (!newPostContent && !selectedImage) return;

        setLoading(true);
        try {
            const images = selectedImage ? [{
                data: selectedImage.split(',')[1], // Remove data:image/type;base64,
                mimeType: selectedImage.split(';')[0].split(':')[1]
            }] : [];

            const response = await socialApi.createPost(
                currentUser.email,
                currentUser.password,
                newPostContent,
                images.length ? images : undefined
            );

            if (response && response.post) {
                const newPost = transformPost(response.post);
                // Prepend to posts if in 'My Posts' or 'Home Feed' (assuming home feed should show it)
                setPosts([newPost, ...posts]);
                setNewPostContent("");
                setSelectedImage(null);
                toast({ title: "Success", description: "Post created successfully!" });
            }
        } catch (error) {
            console.error("Create post failed", error);
            toast({ title: "Error", description: "Failed to create post", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = (id: string) => {
        setPostToDelete(id);
        setDeleteDialogOpen(true);
    };

    const handleDeletePost = async () => {
        if (postToDelete) {
            try {
                await socialApi.deletePost(currentUser.email, currentUser.password, postToDelete);
                setPosts(posts.filter(p => p.id !== postToDelete));
                setDeleteDialogOpen(false);
                setPostToDelete(null);
                toast({ title: "Deleted", description: "Post deleted successfully" });
            } catch (error) {
                console.error("Delete failed", error);
                toast({ title: "Error", description: "Failed to delete post", variant: "destructive" });
            }
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-6 flex flex-col min-h-full">


            <div className="w-full grid grid-cols-1 lg:grid-cols-4 gap-6 relative">
                {/* Left Sidebar - Events & Groups */}
                <div className="hidden lg:flex flex-col gap-6 sticky top-4 h-fit pr-2">
                    <Card className="bg-card/30 backdrop-blur-sm border-2 border-border/60 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-primary" />
                                Campus Events
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-3 items-start p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                                <div className="bg-primary/10 text-primary rounded-md p-2 text-center min-w-[50px]">
                                    <span className="block text-xs font-bold uppercase">Feb</span>
                                    <span className="block text-xl font-bold">15</span>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm line-clamp-1">Annual Hackathon 2025</h4>
                                    <p className="text-xs text-muted-foreground mt-1">Auditorium • 9:00 AM</p>
                                </div>
                            </div>
                            <div className="flex gap-3 items-start p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                                <div className="bg-primary/10 text-primary rounded-md p-2 text-center min-w-[50px]">
                                    <span className="block text-xs font-bold uppercase">Feb</span>
                                    <span className="block text-xl font-bold">22</span>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm line-clamp-1">Robotics Workshop</h4>
                                    <p className="text-xs text-muted-foreground mt-1">Lab 3 • 2:00 PM</p>
                                </div>
                            </div>
                            <Button variant="ghost" className="w-full text-xs text-primary">View All Events</Button>
                        </CardContent>
                    </Card>

                    <Card className="bg-card/30 backdrop-blur-sm border-2 border-border/60 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <Users className="h-5 w-5 text-blue-500" />
                                My Groups
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {["C.S.E. Dept", "Coding Club", "Placement Cell", "Hostel A"].map((group) => (
                                <div key={group} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                                    <span className="text-sm font-medium">{group}</span>
                                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Center Feed */}
                <GlowingCard containerClassName="lg:col-span-2 w-full h-auto" className="flex flex-col p-0 overflow-hidden shadow-2xl bg-card/10 backdrop-blur-sm border-2 border-border/60 rounded-xl justify-start gap-0 h-auto">
                    {/* Sticky Glass Header */}
                    <div className="sticky top-0 z-20 w-full bg-background/70 backdrop-blur-xl border-b border-border/40 px-4 py-3 flex justify-between items-center transition-all duration-200">
                        <h2 className="text-lg font-semibold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                            {showMyPosts ? "My Posts" : "Campus Feed"}
                        </h2>
                        <Button variant="ghost" size="icon" onClick={() => setShowAllNews(!showAllNews)} className={showAllNews ? "bg-primary/10 text-primary" : ""}>
                            <Newspaper className="h-5 w-5" />
                        </Button>
                    </div>

                    <div className="flex-1">
                        {/* Create Post */}
                        {!showMyPosts && (
                            <div className="p-4 border-b border-border/40 bg-card/20">
                                <div className="flex gap-4">
                                    <Avatar className="h-10 w-10 ring-2 ring-border/50">
                                        <AvatarImage src={currentUser.avatar} />
                                        <AvatarFallback>{currentUser.initials}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 space-y-4">
                                        <Input
                                            placeholder="What's happening on campus?"
                                            className="border-none shadow-none text-lg px-0 focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground/70"
                                            value={newPostContent}
                                            onChange={(e) => setNewPostContent(e.target.value)}
                                        />

                                        {/* Image Preview Area */}
                                        {selectedImage && (
                                            <div className="relative mt-2 animate-in zoom-in-95 duration-200">
                                                <img src={selectedImage} alt="Selected" className="rounded-2xl max-h-[300px] w-auto object-cover border border-border/40 shadow-lg" />
                                                <Button
                                                    variant="secondary"
                                                    size="icon"
                                                    className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm"
                                                    onClick={removeImage}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}

                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                        />

                                        <div className="flex justify-between items-center pt-2 border-t border-border/40">
                                            <div className="flex gap-1 text-primary">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-full text-primary hover:bg-primary/10 transition-colors"
                                                    onClick={handleImageClick}
                                                >
                                                    <ImageIcon className="h-5 w-5" />
                                                </Button>
                                            </div>
                                            <Button
                                                className="rounded-full px-6 font-bold shadow-lg hover:shadow-primary/25 transition-all"
                                                disabled={!newPostContent && !selectedImage}
                                                onClick={handlePost}
                                            >
                                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Posts List */}
                        <div>
                            {loading && posts.length === 0 ? (
                                <div className="p-12 flex justify-center text-muted-foreground">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
                            ) : posts.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    {showMyPosts ? "You haven't posted anything yet." : "No posts to show."}
                                </div>
                            ) : (
                                posts.map((post) => (
                                    <div key={post.id} className="p-4 border-b border-border/40 hover:bg-muted/5 transition-colors cursor-pointer group">
                                        <div className="flex gap-4">
                                            <Avatar className="h-10 w-10 ring-1 ring-border/40">
                                                <AvatarImage src={post.user.avatar} />
                                                <AvatarFallback>{post.user.initials}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 space-y-2">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold hover:underline cursor-pointer text-[15px]">{post.user.name}</span>
                                                        <span className="text-muted-foreground text-sm">{post.user.handle}</span>
                                                        <span className="text-muted-foreground text-xs">•</span>
                                                        <span className="text-muted-foreground hover:underline cursor-pointer text-sm">{post.time}</span>
                                                    </div>

                                                    {/* Allow delete if it's the current user's post */}
                                                    {(post.user.email === currentUser.email) && (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem
                                                                    className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        confirmDelete(post.id);
                                                                    }}
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                    <span className="font-bold">Delete</span>
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                </div>

                                                <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-foreground/90">{post.content}</p>

                                                {post.image && (
                                                    <div className="mt-3 rounded-2xl overflow-hidden border border-border/40 shadow-sm">
                                                        <img src={post.image} alt="Post content" className="w-full h-auto max-h-[500px] object-cover hover:scale-[1.01] transition-transform duration-500" />
                                                    </div>
                                                )}

                                                <div className="flex justify-between items-center pt-3 pr-12 max-w-md">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="group flex gap-2 text-muted-foreground hover:text-primary hover:bg-transparent p-0 h-auto"
                                                        onClick={() => toggleComments(post.id)}
                                                    >
                                                        <div className="p-2 rounded-full group-hover:bg-primary/10 transition-colors">
                                                            <MessageCircle className="h-4.5 w-4.5" />
                                                        </div>
                                                        <span className="text-xs font-medium">{post.comments}</span>
                                                    </Button>

                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className={`group flex gap-2 hover:bg-transparent p-0 h-auto ${post.isUpvoted ? "text-green-500" : "text-muted-foreground hover:text-green-500"}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleUpvote(post.id);
                                                        }}
                                                    >
                                                        <div className="p-2 rounded-full group-hover:bg-green-500/10 transition-colors">
                                                            <ArrowBigUp className={`h-5 w-5 ${post.isUpvoted ? "fill-current" : ""}`} />
                                                        </div>
                                                        <span className="text-xs font-medium">{post.upvotes}</span>
                                                    </Button>

                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className={`group flex gap-2 hover:bg-transparent p-0 h-auto ${post.isLiked ? "text-pink-600" : "text-muted-foreground hover:text-pink-600"}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleLike(post.id);
                                                        }}
                                                    >
                                                        <div className="p-2 rounded-full group-hover:bg-pink-600/10 transition-colors">
                                                            <Heart className={`h-4.5 w-4.5 ${post.isLiked ? "fill-current" : ""}`} />
                                                        </div>
                                                        <span className="text-xs font-medium">{post.likes}</span>
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="group flex gap-2 text-muted-foreground hover:text-primary hover:bg-transparent p-0 h-auto">
                                                        <div className="p-2 rounded-full group-hover:bg-primary/10 transition-colors">
                                                            <Share className="h-4.5 w-4.5" />
                                                        </div>
                                                    </Button>
                                                </div>

                                                {/* Comments Section */}
                                                {post.showComments && (
                                                    <div className="mt-4 pt-4 border-t border-border/40 animate-in fade-in slide-in-from-top-2">
                                                        <div className="space-y-4 mb-4">
                                                            {post.commentsList.map((comment) => (
                                                                <div key={comment.id} className="flex gap-3">
                                                                    <Avatar className="h-8 w-8">
                                                                        <AvatarFallback>{comment.user.initials}</AvatarFallback>
                                                                    </Avatar>
                                                                    <div className="bg-muted/30 p-3 rounded-2xl rounded-tl-none flex-1">
                                                                        <div className="flex justify-between items-baseline mb-1">
                                                                            <span className="font-bold text-sm">{comment.user.name}</span>
                                                                            <span className="text-xs text-muted-foreground">{comment.time}</span>
                                                                        </div>
                                                                        <p className="text-sm">{comment.content}</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {post.commentsList.length === 0 && (
                                                                <div className="text-sm text-muted-foreground italic pl-2">No comments yet.</div>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-3 items-center">
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarFallback>{currentUser.initials}</AvatarFallback>
                                                            </Avatar>
                                                            <Input
                                                                placeholder="Write a reply..."
                                                                className="rounded-full bg-muted/50 border-transparent focus:bg-background focus:border-primary"
                                                                value={commentDrafts[post.id] || ""}
                                                                onChange={(e) => handleDraftCommentChange(post.id, e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') submitComment(post.id);
                                                                }}
                                                            />
                                                            <Button
                                                                size="sm"
                                                                className="rounded-full"
                                                                disabled={!commentDrafts[post.id]}
                                                                onClick={() => submitComment(post.id)}
                                                            >
                                                                Reply
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}

                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </GlowingCard>

                {/* Right Sidebar - Trending */}
                <div className="hidden lg:flex flex-col gap-6 sticky top-4 h-fit pl-2">
                    <Card className="bg-card/30 backdrop-blur-sm border-2 border-border/60 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-pink-500" />
                                Trending Now
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {[
                                { tag: "ExamResults", posts: "2.4k posts" },
                                { tag: "KLETechFest", posts: "1.8k posts" },
                                { tag: "CampusDiaries", posts: "950 posts" },
                                { tag: "Placement2025", posts: "500 posts" }
                            ].map((topic) => (
                                <div key={topic.tag} className="flex justify-between items-center group cursor-pointer">
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-semibold group-hover:text-primary transition-colors">#{topic.tag}</p>
                                        <p className="text-xs text-muted-foreground">{topic.posts}</p>
                                    </div>
                                    <MoreHorizontal className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            ))}
                            <Button variant="ghost" className="w-full text-xs text-primary">Show More</Button>
                        </CardContent>
                    </Card>

                    <Card className="bg-card/30 backdrop-blur-sm border-2 border-border/60 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <Hash className="h-5 w-5 text-purple-500" />
                                Topics
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-2">
                            {["StudentLife", "Engineering", "Hostel", "Sports", "Library", "Canteen"].map(tag => (
                                <div key={tag} className="px-3 py-1 rounded-full bg-secondary/50 text-xs font-medium hover:bg-primary/20 hover:text-primary transition-colors cursor-pointer border border-transparent hover:border-primary/30">
                                    {tag}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete post?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This can't be undone and it will be removed from your profile, the timeline of any accounts that follow you, and from search results.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={handleDeletePost}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default CommunityFeed;
