/**
 * pages/Chatbot.jsx — Customer Chat / CRM Interface
 * ─────────────────────────────────────────────
 * Real-time chat with Socket.io integration.
 * Features: Conversation list, message thread, admin reply,
 *           status management, unread badge.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { chatAPI } from '../services/api';
import { io } from 'socket.io-client';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const statusColor = {
  open:        'text-info-600 bg-info-50',
  in_progress: 'text-warning-600 bg-warning-50',
  resolved:    'text-success-600 bg-success-50',
  closed:      'text-primary-400 bg-surface-200',
};

const priorityDot = {
  low:    'bg-success-500',
  medium: 'bg-warning-500',
  high:   'bg-danger-500',
};

const Chatbot = () => {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // ─── Fetch chat list ───────────────────────
  const fetchChats = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await chatAPI.getAll({ status: statusFilter, limit: 50 });
      setChats(data.data || []);
    } catch {}
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetchChats(); }, [fetchChats]);

  // ─── Socket.io ────────────────────────────
  useEffect(() => {
    socketRef.current = io(SOCKET_URL, { withCredentials: true });
    return () => socketRef.current?.disconnect();
  }, []);

  // ─── Open chat ────────────────────────────
  const openChat = async (chat) => {
    setSelectedChat(chat);

    try {
      const { data } = await chatAPI.getById(chat._id);
      setMessages(data.data?.messages || []);
    } catch {}

    // Leave previous room, join new one
    if (socketRef.current) {
      socketRef.current.emit('join_room', { chatId: chat._id });
      socketRef.current.off('receive_message');
      socketRef.current.on('receive_message', (msg) => {
        setMessages((prev) => [...prev, msg]);
      });
    }

    // Update unread count in list
    setChats((prev) => prev.map((c) => c._id === chat._id ? { ...c, unreadCount: 0 } : c));
  };

  // ─── Auto-scroll ──────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Send reply ───────────────────────────
  const sendReply = async () => {
    if (!reply.trim() || !selectedChat) return;
    setSending(true);
    try {
      await chatAPI.reply(selectedChat._id, { content: reply.trim() });
      setReply('');
    } catch {
      toast.error('Failed to send message.');
    } finally { setSending(false); }
  };

  // ─── Update status ────────────────────────
  const updateStatus = async (chatId, status) => {
    try {
      await chatAPI.updateStatus(chatId, { status });
      toast.success(`Marked as ${status}.`);
      setChats((prev) => prev.map((c) => c._id === chatId ? { ...c, status } : c));
      if (selectedChat?._id === chatId) setSelectedChat((c) => ({ ...c, status }));
    } catch {}
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); }
  };

  return (
    <div className="page-container !p-0 h-[calc(100vh-64px)] flex overflow-hidden">
      {/* ─── Left: Chat List ──────────────────── */}
      <div className="w-80 flex-shrink-0 border-r border-surface-200 flex flex-col bg-white dark:bg-primary-800">
        {/* Header */}
        <div className="p-4 border-b border-surface-100">
          <h2 className="font-heading text-lg font-semibold text-primary-600">Customer Chats</h2>
          <div className="mt-2">
            <select className="form-select text-xs w-full" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Conversations</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {/* Chat Items */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-primary-300 text-sm">Loading...</div>
          ) : chats.length === 0 ? (
            <div className="text-center p-8 text-primary-300 text-sm">No conversations yet.</div>
          ) : (
            chats.map((chat) => (
              <button
                key={chat._id}
                onClick={() => openChat(chat)}
                className={clsx(
                  'w-full text-left px-4 py-3 border-b border-surface-100 hover:bg-primary-50 transition-colors',
                  selectedChat?._id === chat._id && 'bg-primary-50 border-l-2 border-l-primary-500'
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-xl bg-gradient-coastal flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    {chat.customerName?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-medium text-primary-700 text-sm truncate">{chat.customerName}</span>
                      <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', priorityDot[chat.priority])} />
                    </div>
                    <p className="text-xs text-primary-400 truncate">{chat.subject || chat.customerEmail}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className={clsx('text-[10px] font-medium px-1.5 py-0.5 rounded-full', statusColor[chat.status])}>
                        {chat.status?.replace('_', ' ')}
                      </span>
                      {chat.unreadCount > 0 && (
                        <span className="bg-primary-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ─── Right: Message Thread ─────────────── */}
      {selectedChat ? (
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="px-6 py-4 border-b border-surface-200 bg-white dark:bg-primary-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-coastal flex items-center justify-center text-white font-semibold">
                {selectedChat.customerName?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-primary-700">{selectedChat.customerName}</p>
                <p className="text-xs text-primary-400">{selectedChat.customerEmail} · {selectedChat.customerContact}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="form-select text-xs w-36"
                value={selectedChat.status}
                onChange={(e) => updateStatus(selectedChat._id, e.target.value)}
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-surface-50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={clsx('flex', msg.sender === 'admin' ? 'justify-end' : 'justify-start')}
              >
                {msg.sender === 'customer' && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-coastal flex items-center justify-center text-white text-xs font-semibold mr-2 flex-shrink-0 self-end">
                    {selectedChat.customerName?.[0]?.toUpperCase()}
                  </div>
                )}
                <div className={clsx(
                  'max-w-xs lg:max-w-md rounded-2xl px-4 py-2.5 text-sm shadow-sm',
                  msg.sender === 'admin'
                    ? 'bg-primary-500 text-white rounded-br-sm'
                    : 'bg-white text-primary-700 rounded-bl-sm'
                )}>
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  <p className={clsx('text-[10px] mt-1', msg.sender === 'admin' ? 'text-white/60' : 'text-primary-300')}>
                    {msg.sentAt ? format(new Date(msg.sentAt), 'h:mm a') : ''}
                  </p>
                </div>
                {msg.sender === 'admin' && (
                  <div className="w-8 h-8 rounded-xl bg-primary-200 flex items-center justify-center text-primary-600 text-xs font-semibold ml-2 flex-shrink-0 self-end">
                    A
                  </div>
                )}
              </div>
            ))}
            {messages.length === 0 && (
              <div className="text-center text-primary-300 text-sm py-12">No messages yet. Start the conversation!</div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply Box */}
          <div className="px-4 py-3 bg-white dark:bg-primary-800 border-t border-surface-200">
            <div className="flex items-end gap-3 bg-surface-50 rounded-2xl p-2">
              <textarea
                className="flex-1 bg-transparent text-sm text-primary-700 placeholder-primary-300 resize-none outline-none min-h-[40px] max-h-32 py-2 px-2"
                placeholder="Type your reply... (Enter to send)"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button
                onClick={sendReply}
                disabled={!reply.trim() || sending}
                className="btn-primary rounded-xl px-4 py-2 flex-shrink-0 disabled:opacity-50"
              >
                {sending ? (
                  <div className="spinner !w-4 !h-4 !border-white/30 !border-t-white" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                  </svg>
                )}
              </button>
            </div>
            <p className="text-[10px] text-primary-300 text-center mt-1.5">
              Press Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center bg-surface-50 text-center p-8">
          <div className="w-20 h-20 bg-primary-100 rounded-3xl flex items-center justify-center mb-5">
            <svg className="w-10 h-10 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
          </div>
          <h3 className="font-heading text-lg text-primary-500 mb-2">Select a Conversation</h3>
          <p className="text-primary-300 text-sm max-w-xs">Choose a chat from the left panel to view and respond to customer messages.</p>
        </div>
      )}
    </div>
  );
};

export default Chatbot;
