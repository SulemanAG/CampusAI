const BASE_URL = 'https://campusai-916628151603.asia-south1.run.app/api/social';

export const socialApi = {
    createPost: async (email: string, password: string, text?: string, images?: any[]) => {
        const params = new URLSearchParams({ email, password });
        if (text) params.append('text', text);
        if (images) params.append('images', JSON.stringify(images));

        const response = await fetch(`${BASE_URL}/post/create?${params.toString()}`);
        return response.json();
    },

    getPostsByEmail: async (email: string) => {
        const response = await fetch(`${BASE_URL}/posts/${email}`);
        return response.json();
    },

    getHomeFeed: async (limit: number = 50) => {
        const params = new URLSearchParams({ limit: limit.toString() });
        const response = await fetch(`${BASE_URL}/posts/feed/all?${params.toString()}`);
        return response.json();
    },

    deletePost: async (email: string, password: string, postId: string) => {
        const params = new URLSearchParams({ email, password, postId });
        const response = await fetch(`${BASE_URL}/post/delete?${params.toString()}`);
        return response.json();
    },

    likePost: async (email: string, postId: string) => {
        const params = new URLSearchParams({ email, postId });
        const response = await fetch(`${BASE_URL}/post/like?${params.toString()}`);
        return response.json();
    },

    upvotePost: async (email: string, postId: string) => {
        const params = new URLSearchParams({ email, postId });
        const response = await fetch(`${BASE_URL}/post/upvote?${params.toString()}`);
        return response.json();
    },

    addComment: async (email: string, postId: string, comment: string) => {
        const params = new URLSearchParams({ email, postId, comment });
        const response = await fetch(`${BASE_URL}/post/comment/add?${params.toString()}`);
        return response.json();
    },

    deleteComment: async (email: string, postId: string, commentId: string) => {
        const params = new URLSearchParams({ email, postId, commentId });
        const response = await fetch(`${BASE_URL}/post/comment/delete?${params.toString()}`);
        return response.json();
    }
};
