export interface Message {
    role: 'user' | 'assistant';
    content: string;
    sql?: string;
    result?: any;
    insights?: string[];
    timestamp: number;
}

export interface Chat {
    id: string;
    title: string;
    messages: Message[];
    createdAt: number;
    updatedAt: number;
}

const STORAGE_KEY = 'nlp2sql_chats';

export const chatStorage = {
    getAllChats(): Chat[] {
        if (typeof window === 'undefined') return [];
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    },

    getChat(id: string): Chat | null {
        const chats = this.getAllChats();
        return chats.find(c => c.id === id) || null;
    },

    saveChat(chat: Chat): void {
        const chats = this.getAllChats();
        const index = chats.findIndex(c => c.id === chat.id);

        if (index >= 0) {
            chats[index] = chat;
        } else {
            chats.unshift(chat);
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
    },

    deleteChat(id: string): void {
        const chats = this.getAllChats().filter(c => c.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
    },

    createNewChat(): Chat {
        return {
            id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: 'New Chat',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
    },

    updateChatTitle(id: string, firstQuestion: string): void {
        const chat = this.getChat(id);
        if (chat && chat.title === 'New Chat') {
            chat.title = firstQuestion.slice(0, 50) + (firstQuestion.length > 50 ? '...' : '');
            this.saveChat(chat);
        }
    },

    renameChat(id: string, newTitle: string): void {
        const chat = this.getChat(id);
        if (chat) {
            chat.title = newTitle;
            this.saveChat(chat);
        }
    }
};
