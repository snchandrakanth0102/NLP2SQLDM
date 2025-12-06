"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Plus, MessageSquare, Trash2, Pencil, Check, X } from 'lucide-react';
import { Chat } from '@/lib/chat-storage';
import { cn } from '@/lib/utils';

interface SidebarProps {
    chats: Chat[];
    currentChatId: string | null;
    onSelectChat: (chatId: string) => void;
    onNewChat: () => void;
    onDeleteChat: (chatId: string) => void;
    onRenameChat: (chatId: string, newTitle: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    chats,
    currentChatId,
    onSelectChat,
    onNewChat,
    onDeleteChat,
    onRenameChat,
}) => {
    const [editingChatId, setEditingChatId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingChatId && inputRef.current) {
            inputRef.current.focus();
        }
    }, [editingChatId]);

    const startEditing = (e: React.MouseEvent, chat: Chat) => {
        e.stopPropagation();
        setEditingChatId(chat.id);
        setEditTitle(chat.title);
    };

    const saveEditing = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (editingChatId && editTitle.trim()) {
            onRenameChat(editingChatId, editTitle.trim());
            setEditingChatId(null);
        }
    };

    const cancelEditing = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingChatId(null);
    };
    return (
        <div className="w-[260px] bg-gray-50 text-gray-800 flex flex-col h-screen flex-shrink-0 border-r border-gray-200 transition-all duration-300 ease-in-out">
            {/* New Chat Button */}
            <div className="p-3">
                <button
                    onClick={onNewChat}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium text-gray-700 mb-4"
                >
                    <div className="p-1 bg-white border border-gray-200 rounded-md shadow-sm">
                        <Plus className="w-4 h-4" />
                    </div>
                    <span>New chat</span>
                </button>

                <div className="px-2 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Your chats
                </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto px-2 space-y-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                {chats.length === 0 ? (
                    <div className="text-center text-gray-500 py-8 text-sm">
                        No chats yet.
                    </div>
                ) : (
                    chats.map((chat) => (
                        <div
                            key={chat.id}
                            className={cn(
                                "group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm relative",
                                currentChatId === chat.id
                                    ? "bg-gray-200 text-gray-900 font-medium"
                                    : "hover:bg-gray-100 text-gray-600"
                            )}
                            onClick={() => onSelectChat(chat.id)}
                        >
                            <MessageSquare className="w-4 h-4 flex-shrink-0 text-gray-400" />

                            {editingChatId === chat.id ? (
                                <form
                                    onSubmit={saveEditing}
                                    className="flex-1 flex items-center gap-1 min-w-0"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        className="w-full bg-white border border-gray-300 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-blue-500"
                                        onBlur={() => setEditingChatId(null)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Escape') setEditingChatId(null);
                                        }}
                                    />
                                    <button type="submit" className="text-green-600 hover:bg-green-100 p-0.5 rounded">
                                        <Check className="w-3 h-3" />
                                    </button>
                                </form>
                            ) : (
                                <>
                                    <span className="flex-1 truncate">{chat.title || 'New Chat'}</span>

                                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 absolute right-2 bg-inherit pl-2">
                                        <button
                                            onClick={(e) => startEditing(e, chat)}
                                            className="text-gray-400 hover:text-blue-500 transition-colors p-1"
                                            title="Rename"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteChat(chat.id);
                                            }}
                                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 text-xs text-gray-500">
                <div className="flex items-center gap-3 px-3 py-3 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold border border-purple-200">
                        N
                    </div>
                    <div className="font-medium">NLP-to-SQL User</div>
                </div>
            </div>
        </div>
    );
};
