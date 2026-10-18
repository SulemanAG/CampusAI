
const BASE_URL = "https://campusai-916628151603.asia-south1.run.app/api/student";

interface NonPrimaryAccount {
    accountEmail: string;
    accountName: string;
    storeName: string;
}

interface InitiateResponse {
    message: string;
    email: string;
    universityName: string;
    universityEmail: string;
    nonPrimaryAccounts: NonPrimaryAccount[];
}

interface Student {
    studentId: string;
    email: string;
    name: string;
    universityEmail: string;
    universityName: string;
    selectedNonPrimaryAccount: {
        accountId: string;
        accountEmail: string;
        accountName: string;
    };
    accessibleStores: {
        storeName: string;
        storeResource: string;
        accountEmail: string;
    }[];
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

interface CompleteResponse {
    message: string;
    studentId: string;
    student: Student;
}

interface LoginResponse {
    message: string;
    student: Student;
}

export interface Ticket {
    ticketId: string;
    studentEmail: string;
    accountEmail: string;
    universityEmail: string;
    problem: string;
    status: "pending" | "completed" | "in_progress";
    solution: string;
    createdAt: string;
    updatedAt: string;
}

interface TicketListResponse {
    studentEmail: string;
    totalTickets: number;
    tickets: Ticket[];
}

export interface AccessibleAccount {
    accountName: string;
    accountEmail: string;
}

interface AccessibleAccountsResponse {
    studentEmail: string;
    studentName: string;
    universityName: string;
    totalAccessibleAccounts: number;
    accounts: AccessibleAccount[];
}

interface CreateTicketResponse {
    message: string;
    ticket: Ticket;
}

// Helper to handle API errors
const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
};

export const studentApi = {
    // API 1: Initiate Registration
    initiateRegistration: async (email: string, password: string): Promise<InitiateResponse> => {
        const response = await fetch(
            `${BASE_URL}/register/initiate?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
            {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            }
        );
        return handleResponse(response);
    },

    // API 2: Complete Registration
    completeRegistration: async (
        email: string,
        name: string,
        selectedNonPrimaryAccountEmail: string
    ): Promise<CompleteResponse> => {
        const response = await fetch(
            `${BASE_URL}/register/complete?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&selectedNonPrimaryAccountEmail=${encodeURIComponent(selectedNonPrimaryAccountEmail)}`,
            {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            }
        );
        return handleResponse(response);
    },

    // API 3: Student Login
    login: async (email: string, password: string): Promise<LoginResponse> => {
        const response = await fetch(
            `${BASE_URL}/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
            {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            }
        );
        return handleResponse(response);
    },

    // API 4: Get Student Profile
    getProfile: async (email: string): Promise<Student> => {
        const response = await fetch(`${BASE_URL}/profile/${encodeURIComponent(email)}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });
        return handleResponse(response);
    },

    // API 10: Get All Tickets for a Student
    getTickets: async (email: string): Promise<TicketListResponse> => {
        const response = await fetch(`${BASE_URL}/ticket/list/${encodeURIComponent(email)}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });
        return handleResponse(response);
    },

    // API 5: Get Accessible Department Accounts
    getAccessibleAccounts: async (email: string): Promise<AccessibleAccountsResponse> => {
        const response = await fetch(`${BASE_URL}/accessible-accounts/${encodeURIComponent(email)}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });
        return handleResponse(response);
    },

    // API 9: Create Support Ticket
    createTicket: async (studentEmail: string, accountEmail: string, problem: string): Promise<CreateTicketResponse> => {
        const response = await fetch(
            `${BASE_URL}/ticket/create?studentEmail=${encodeURIComponent(studentEmail)}&accountEmail=${encodeURIComponent(accountEmail)}&problem=${encodeURIComponent(problem)}`,
            {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            }
        );
        return handleResponse(response);
    },

    // API 11: Delete Ticket
    deleteTicket: async (studentEmail: string, ticketId: string): Promise<any> => {
        const response = await fetch(
            `${BASE_URL}/ticket/delete?studentEmail=${encodeURIComponent(studentEmail)}&ticketId=${encodeURIComponent(ticketId)}`,
            {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            }
        );
        return handleResponse(response);
    },

    // API 12: Add Feedback
    submitFeedback: async (studentEmail: string, accountEmail: string, rating: number, feedbackText: string): Promise<any> => {
        const response = await fetch(
            `${BASE_URL}/feedback/add?studentEmail=${encodeURIComponent(studentEmail)}&accountEmail=${encodeURIComponent(accountEmail)}&rating=${rating}&feedbackText=${encodeURIComponent(feedbackText)}`,
            {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            }
        );
        return handleResponse(response);
    },
};
