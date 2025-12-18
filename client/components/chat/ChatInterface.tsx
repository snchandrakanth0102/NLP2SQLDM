"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, CheckCircle2, Circle, Menu, Database, Copy, Check, Sparkles, Plus } from 'lucide-react';
import { generateSql, executeSql, generateInsights } from '@/lib/api';
import { ResultsVisualizer } from '../visualization/ResultsVisualizer';
import { Sidebar } from '../layout/Sidebar';
import { cn } from '@/lib/utils';
import { chatStorage, Chat, Message } from '@/lib/chat-storage';

type QueryStatus = 'idle' | 'generating' | 'executing' | 'complete' | 'error';

export const ChatInterface: React.FC = () => {
    const [input, setInput] = useState('');
    const [status, setStatus] = useState<QueryStatus>('idle');
    const [chats, setChats] = useState<Chat[]>([]);
    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [copiedSqlIndex, setCopiedSqlIndex] = useState<number | null>(null);
    const [insightsEnabled, setInsightsEnabled] = useState(false);
    const [generatingInsights, setGeneratingInsights] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load chats from storage on mount
    useEffect(() => {
        const storedChats = chatStorage.getAllChats();
        setChats(storedChats);

        // Create initial chat if none exist
        if (storedChats.length === 0) {
            const newChat = chatStorage.createNewChat();
            chatStorage.saveChat(newChat);
            setChats([newChat]);
            setCurrentChatId(newChat.id);
            setCurrentMessages([]);
        } else {
            setCurrentChatId(storedChats[0].id);
            setCurrentMessages(storedChats[0].messages);
        }
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [currentMessages, status]);

    const handleNewChat = () => {
        const newChat = chatStorage.createNewChat();
        chatStorage.saveChat(newChat);
        setChats([newChat, ...chats]);
        setCurrentChatId(newChat.id);
        setCurrentMessages([]);
    };

    const handleSelectChat = (chatId: string) => {
        const chat = chatStorage.getChat(chatId);
        if (chat) {
            setCurrentChatId(chatId);
            setCurrentMessages(chat.messages);
        }
    };

    const handleDeleteChat = (chatId: string) => {
        chatStorage.deleteChat(chatId);
        const updatedChats = chatStorage.getAllChats();
        setChats(updatedChats);

        if (chatId === currentChatId) {
            if (updatedChats.length > 0) {
                setCurrentChatId(updatedChats[0].id);
                setCurrentMessages(updatedChats[0].messages);
            } else {
                const newChat = chatStorage.createNewChat();
                chatStorage.saveChat(newChat);
                setChats([newChat]);
                setCurrentChatId(newChat.id);
                setCurrentMessages([]);
            }
        }
    };

    const handleRenameChat = (chatId: string, newTitle: string) => {
        chatStorage.renameChat(chatId, newTitle);
        setChats(chatStorage.getAllChats());
    };

    const saveCurrentChat = (messages: Message[]) => {
        if (!currentChatId) return;

        const chat = chatStorage.getChat(currentChatId);
        if (chat) {
            chat.messages = messages;
            chat.updatedAt = Date.now();
            chatStorage.saveChat(chat);

            // Update title from first user message
            if (messages.length > 0 && chat.title === 'New Chat') {
                const firstUserMessage = messages.find(m => m.role === 'user');
                if (firstUserMessage) {
                    chatStorage.updateChatTitle(currentChatId, firstUserMessage.content);
                    setChats(chatStorage.getAllChats());
                }
            }
        }
    };

    const handleCopySql = async (sql: string, index: number) => {
        try {
            await navigator.clipboard.writeText(sql);
            setCopiedSqlIndex(index);
            setTimeout(() => setCopiedSqlIndex(null), 2000);
        } catch (err) {
            console.error('Failed to copy SQL:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || status !== 'idle' || !currentChatId) return;

        const userMessage: Message = {
            role: 'user',
            content: input,
            timestamp: Date.now()
        };

        const newMessages = [...currentMessages, userMessage];
        setCurrentMessages(newMessages);
        saveCurrentChat(newMessages);

        setInput('');
        setStatus('generating');

        try {
            // Step 1: Generate SQL
            console.log('📝 [FRONTEND] Calling generateSql...');
            const { sql } = await generateSql(userMessage.content);
            console.log('✅ [FRONTEND] SQL generated:', sql);

            setStatus('executing');

            // Step 2: Execute SQL
            console.log('🔄 [FRONTEND] Calling executeSql...');
            const response = await executeSql(sql);
            console.log('✅ [FRONTEND] SQL executed, result:', response.result);

            const assistantMessage: Message = {
                role: 'assistant',
                content: '',
                sql: sql,
                result: response.result,
                timestamp: Date.now()
            };

            const finalMessages = [...newMessages, assistantMessage];
            setCurrentMessages(finalMessages);
            saveCurrentChat(finalMessages);
            setStatus('complete');

            // Generate insights if enabled
            if (insightsEnabled && response.result?.data?.length > 0) {
                setGeneratingInsights(true);
                try {
                    const insightsResponse = await generateInsights(sql, response.result.data);

                    // Update the assistant message with insights
                    assistantMessage.insights = insightsResponse.insights;
                    const updatedMessages = [...newMessages, assistantMessage];
                    setCurrentMessages(updatedMessages);
                    saveCurrentChat(updatedMessages);
                } catch (error) {
                    console.error('Failed to generate insights:', error);
                } finally {
                    setGeneratingInsights(false);
                }
            }

            setTimeout(() => setStatus('idle'), 2000);

        } catch (error: any) {
            console.error(error);
            const errorMessage: Message = {
                role: 'assistant',
                content: error.response?.data?.error || 'Sorry, something went wrong.',
                timestamp: Date.now()
            };
            const finalMessages = [...newMessages, errorMessage];
            setCurrentMessages(finalMessages);
            saveCurrentChat(finalMessages);
            setStatus('error');
            setTimeout(() => setStatus('idle'), 3000);
        }
    };

    return (
        <div className="flex h-screen bg-white text-gray-800">
            {/* Sidebar */}
            {sidebarOpen && (
                <Sidebar
                    chats={chats}
                    currentChatId={currentChatId}
                    onSelectChat={handleSelectChat}
                    onNewChat={handleNewChat}
                    onDeleteChat={handleDeleteChat}
                    onRenameChat={handleRenameChat}
                />
            )}

            {/* Main Chat Area */}
            <div className="flex flex-col flex-1">
                {/* Header */}
                <header className="bg-white p-4 flex items-center justify-between gap-3 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <h1 className="text-lg font-semibold text-gray-700">
                            {currentChatId ? chatStorage.getChat(currentChatId)?.title || 'NLP-to-SQL Reporter' : 'NLP-to-SQL Reporter'}
                        </h1>
                    </div>

                    {/* AI Insights Toggle */}
                    <div className="flex items-center gap-2">
                        <Sparkles className={cn("w-4 h-4", insightsEnabled ? "text-purple-600" : "text-gray-400")} />
                        <label className="flex items-center gap-2 cursor-pointer">
                            <span className="text-sm text-gray-600 font-medium">AI Insights</span>
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={insightsEnabled}
                                    onChange={(e) => setInsightsEnabled(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                            </div>
                        </label>
                    </div>
                </header>

                {/* Messages */}
                <main className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent p-4">
                    {currentMessages.map((msg, idx) => (
                        <div key={idx} className={`w-full mb-6 ${msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}`}>
                            <div className={`max-w-3xl flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                {msg.role === 'assistant' && (
                                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                                        {/* Icon removed as per request */}
                                    </div>
                                )}

                                <div className={`flex-1 space-y-4 overflow-hidden ${msg.role === 'user' ? 'bg-gray-100 rounded-2xl rounded-tr-sm p-4' : 'bg-transparent pt-1'}`}>
                                    <div className={`prose prose-slate max-w-none text-sm md:text-base leading-7 ${msg.role === 'user' ? 'text-gray-800' : 'text-gray-800'}`}>
                                        {msg.content}
                                    </div>

                                    {/* Generated SQL */}
                                    {msg.sql && (
                                        <div className="mt-4 w-full max-w-4xl space-y-2">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2 text-sm font-medium text-gray-400">
                                                    <Database className="w-4 h-4" />
                                                    <span>SQL</span>
                                                </div>
                                                <button
                                                    onClick={() => handleCopySql(msg.sql!, idx)}
                                                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                                                >
                                                    {copiedSqlIndex === idx ? (
                                                        <>
                                                            <Check className="w-3.5 h-3.5" />
                                                            <span>Copied!</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="w-3.5 h-3.5" />
                                                            <span>Copy code</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                            <div className="p-4 bg-gray-50 rounded-lg text-xs font-mono text-gray-800 border border-gray-200 whitespace-pre-wrap shadow-sm max-h-60 overflow-y-auto leading-relaxed">
                                                {msg.sql}
                                            </div>
                                        </div>
                                    )}

                                    {/* Results */}
                                    {msg.result && (
                                        <div className="mt-4 w-full max-w-4xl">
                                            <ResultsVisualizer result={msg.result} />
                                        </div>
                                    )}

                                    {/* AI Insights */}
                                    {msg.insights && msg.insights.length > 0 && (
                                        <div className="mt-4 w-full max-w-4xl space-y-2">
                                            <div className="flex items-center gap-2 text-sm font-medium text-purple-400">
                                                <Sparkles className="w-4 h-4" />
                                                <span>AI-Powered Insights</span>
                                            </div>
                                            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 space-y-3">
                                                {msg.insights.map((insight, i) => (
                                                    <div key={i} className="flex gap-3">
                                                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold">
                                                            {i + 1}
                                                        </div>
                                                        <p className="text-sm text-gray-700 leading-relaxed">{insight}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Progress Indicator */}
                    {/* Progress Indicator */}
                    {status !== 'idle' && status !== 'complete' && status !== 'error' && (
                        <div className="w-full mb-6 flex justify-start">
                            <div className="max-w-3xl w-full flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8"></div> {/* Spacer to align with messages */}
                                <div className="w-full max-w-md p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                                    <h3 className="text-sm font-bold text-gray-700 mb-3">Processing Request...</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            {status === 'generating' ? (
                                                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                                            ) : (
                                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                            )}
                                            <span className={cn("text-sm", status === 'generating' ? "text-blue-600 font-medium" : "text-gray-600")}>
                                                Understanding your question...
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {status === 'generating' ? (
                                                <Circle className="w-5 h-5 text-gray-300" />
                                            ) : status === 'executing' ? (
                                                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                                            ) : (
                                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                            )}
                                            <span className={cn("text-sm", status === 'executing' ? "text-blue-600 font-medium" : "text-gray-600")}>
                                                Getting results...
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </main>

                {/* Input */}
                <footer className="bg-white p-4 md:p-6">
                    <div className="max-w-3xl mx-auto relative">
                        <form onSubmit={handleSubmit} className="relative flex items-center w-full p-2 bg-gray-50 rounded-full border border-gray-200 shadow-sm focus-within:border-gray-300 focus-within:shadow-md transition-all">
                            <div className="p-2 text-gray-400 hover:text-gray-600 cursor-pointer">
                                <Plus className="w-5 h-5" />
                            </div>
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask a question about your data..."
                                disabled={status !== 'idle'}
                                className="flex-1 bg-transparent border-none focus:ring-0 text-gray-800 placeholder-gray-400 text-sm md:text-base m-0 w-full resize-none outline-none py-2 px-2"
                            />
                            <button
                                type="submit"
                                disabled={status !== 'idle' || !input.trim()}
                                className="p-2 bg-black text-white rounded-full hover:bg-gray-800 disabled:opacity-40 disabled:hover:bg-black transition-colors"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                        <div className="text-center text-xs text-gray-400 mt-2">
                            NLP-to-SQL can make mistakes. Consider checking important information.
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
};
