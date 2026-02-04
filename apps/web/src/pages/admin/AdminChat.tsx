import { useState, useEffect, useRef } from 'react';
import { useI18n } from '../../lib/i18n';
import {
  MessageSquare,
  Send,
  Users,
  Search,
  MoreVertical,
  X,
  Check,
  CheckCheck,
  Clock,
  User,
  Building2,
  Circle,
  ArrowLeft,
  Paperclip,
  Smile,
  Phone,
  Video,
  Info,
} from 'lucide-react';

type SessionStatus = 'active' | 'waiting' | 'closed';
type MessageSender = 'customer' | 'admin' | 'system';

interface ChatSession {
  id: string;
  customerUserId: string;
  customerEmail: string;
  customerName?: string;
  organizationName?: string;
  status: SessionStatus;
  subject?: string;
  messagesCount: number;
  customerOnline: boolean;
  customerTyping: boolean;
  lastMessage?: string;
  lastMessageAt?: string;
  assignedAdminEmail?: string;
  createdAt: string;
}

interface ChatMessage {
  id: string;
  senderType: MessageSender;
  senderName?: string;
  content: string;
  createdAt: string;
  readByAdmin: boolean;
  readByCustomer: boolean;
}

// Online Status Indicator
function OnlineStatus({ online, size = 'sm' }: { online: boolean; size?: 'sm' | 'md' }) {
  const sizeClasses = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3';
  return (
    <span 
      className={`${sizeClasses} rounded-full ${online ? 'animate-pulse' : ''}`}
      style={{ 
        backgroundColor: online ? 'rgb(var(--color-success))' : 'rgb(var(--color-text-muted))',
      }}
    />
  );
}

// Session List Item
function SessionItem({ 
  session, 
  isSelected, 
  onClick 
}: { 
  session: ChatSession; 
  isSelected: boolean; 
  onClick: () => void;
}) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-3 p-3 text-left transition-all rounded-lg ${
        isSelected ? 'ring-2' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
      }`}
      style={{
        backgroundColor: isSelected ? 'rgb(var(--color-primary-500) / 0.05)' : 'transparent',
        ringColor: isSelected ? 'rgb(var(--color-primary-500))' : 'transparent',
      }}
    >
      <div className="relative flex-shrink-0">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
        >
          <User className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
        </div>
        <div className="absolute -bottom-0.5 -right-0.5">
          <OnlineStatus online={session.customerOnline} />
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm truncate" style={{ color: 'rgb(var(--color-text))' }}>
            {session.customerName || session.customerEmail.split('@')[0]}
          </span>
          <span className="text-xs flex-shrink-0" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {session.lastMessageAt ? new Date(session.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
          </span>
        </div>
        
        <div className="flex items-center gap-1 mt-0.5">
          {session.organizationName && (
            <span className="text-xs truncate" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {session.organizationName}
            </span>
          )}
        </div>
        
        {session.lastMessage && (
          <p className="text-xs mt-1 truncate" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {session.customerTyping ? (
              <span className="italic">{isEn ? 'Typing...' : 'Écrit...'}</span>
            ) : (
              session.lastMessage
            )}
          </p>
        )}
        
        {/* Status Badge */}
        <div className="flex items-center gap-2 mt-2">
          {session.status === 'waiting' && (
            <span 
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ 
                backgroundColor: 'rgb(var(--color-warning) / 0.1)',
                color: 'rgb(var(--color-warning))',
              }}
            >
              {isEn ? 'Waiting' : 'En attente'}
            </span>
          )}
          {!session.assignedAdminEmail && session.status !== 'closed' && (
            <span 
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ 
                backgroundColor: 'rgb(var(--color-error) / 0.1)',
                color: 'rgb(var(--color-error))',
              }}
            >
              {isEn ? 'Unassigned' : 'Non assigné'}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// Message Bubble
function MessageBubble({ message, isAdmin }: { message: ChatMessage; isAdmin: boolean }) {
  const isFromAdmin = message.senderType === 'admin';
  const isSystem = message.senderType === 'system';
  
  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <span 
          className="text-xs px-3 py-1 rounded-full"
          style={{ 
            backgroundColor: 'rgb(var(--color-bg-muted))',
            color: 'rgb(var(--color-text-muted))',
          }}
        >
          {message.content}
        </span>
      </div>
    );
  }
  
  return (
    <div className={`flex ${isFromAdmin ? 'justify-end' : 'justify-start'} mb-3`}>
      <div 
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
          isFromAdmin ? 'rounded-br-md' : 'rounded-bl-md'
        }`}
        style={{ 
          backgroundColor: isFromAdmin 
            ? 'rgb(var(--color-primary-500))' 
            : 'rgb(var(--color-bg-muted))',
          color: isFromAdmin ? 'white' : 'rgb(var(--color-text))',
        }}
      >
        {message.senderName && !isFromAdmin && (
          <p className="text-xs font-medium mb-1 opacity-70">{message.senderName}</p>
        )}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <div className={`flex items-center justify-end gap-1 mt-1 ${isFromAdmin ? 'text-white/70' : ''}`}>
          <span className="text-[10px]" style={{ color: isFromAdmin ? 'white' : 'rgb(var(--color-text-muted))' }}>
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isFromAdmin && (
            message.readByCustomer ? (
              <CheckCheck className="w-3 h-3" />
            ) : (
              <Check className="w-3 h-3" />
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminChat() {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SessionStatus | 'all'>('all');
  const [showMobileChat, setShowMobileChat] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch sessions
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        // TODO: Replace with actual API call
        // Mock data
        setSessions([
          {
            id: '1',
            customerUserId: 'user1',
            customerEmail: 'john.doe@example.com',
            customerName: 'John Doe',
            organizationName: 'Acme Corp',
            status: 'active',
            subject: 'Help with sync',
            messagesCount: 5,
            customerOnline: true,
            customerTyping: false,
            lastMessage: 'I need help with syncing my QuickBooks',
            lastMessageAt: new Date().toISOString(),
            assignedAdminEmail: 'admin@example.com',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: '2',
            customerUserId: 'user2',
            customerEmail: 'jane.smith@example.com',
            customerName: 'Jane Smith',
            organizationName: 'Tech Solutions',
            status: 'waiting',
            messagesCount: 2,
            customerOnline: true,
            customerTyping: true,
            lastMessage: 'How do I export reports?',
            lastMessageAt: new Date(Date.now() - 300000).toISOString(),
            createdAt: new Date(Date.now() - 1800000).toISOString(),
          },
          {
            id: '3',
            customerUserId: 'user3',
            customerEmail: 'bob@restaurant.com',
            customerName: 'Bob Wilson',
            organizationName: 'Bob\'s Diner',
            status: 'active',
            messagesCount: 12,
            customerOnline: false,
            customerTyping: false,
            lastMessage: 'Thanks for your help!',
            lastMessageAt: new Date(Date.now() - 7200000).toISOString(),
            assignedAdminEmail: 'admin@example.com',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
          },
        ]);
      } catch (error) {
        console.error('Failed to fetch sessions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, []);

  // Fetch messages when session is selected
  useEffect(() => {
    if (!selectedSession) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      try {
        // TODO: Replace with actual API call
        // Mock messages
        setMessages([
          {
            id: '1',
            senderType: 'system',
            content: isEn ? 'Chat started' : 'Discussion commencée',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            readByAdmin: true,
            readByCustomer: true,
          },
          {
            id: '2',
            senderType: 'customer',
            senderName: selectedSession.customerName,
            content: 'Hi, I need help with syncing my QuickBooks account.',
            createdAt: new Date(Date.now() - 3500000).toISOString(),
            readByAdmin: true,
            readByCustomer: true,
          },
          {
            id: '3',
            senderType: 'admin',
            senderName: 'Support',
            content: 'Hello! I\'d be happy to help you with that. Can you tell me what error you\'re seeing?',
            createdAt: new Date(Date.now() - 3400000).toISOString(),
            readByAdmin: true,
            readByCustomer: true,
          },
          {
            id: '4',
            senderType: 'customer',
            senderName: selectedSession.customerName,
            content: 'It says "Authentication failed" when I try to connect.',
            createdAt: new Date(Date.now() - 3300000).toISOString(),
            readByAdmin: true,
            readByCustomer: true,
          },
          {
            id: '5',
            senderType: 'admin',
            senderName: 'Support',
            content: 'I see. This usually happens when the connection token has expired. Let me guide you through reconnecting:\n\n1. Go to Connections\n2. Click "Disconnect" on QuickBooks\n3. Click "Connect" again\n4. Follow the authorization steps',
            createdAt: new Date(Date.now() - 3200000).toISOString(),
            readByAdmin: true,
            readByCustomer: false,
          },
        ]);
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    };

    fetchMessages();
  }, [selectedSession, isEn]);

  // Handle send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedSession) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      senderType: 'admin',
      senderName: 'Support',
      content: newMessage.trim(),
      createdAt: new Date().toISOString(),
      readByAdmin: true,
      readByCustomer: false,
    };

    setMessages([...messages, message]);
    setNewMessage('');
    
    // TODO: Send to API
    // await fetch(`/api/admin/chat/sessions/${selectedSession.id}/messages`, {
    //   method: 'POST',
    //   body: JSON.stringify({ content: newMessage }),
    // });
  };

  // Handle assign session
  const handleAssignSession = async () => {
    if (!selectedSession) return;
    
    // TODO: API call
    setSelectedSession({ ...selectedSession, assignedAdminEmail: 'admin@example.com', status: 'active' });
    setSessions(sessions.map(s => 
      s.id === selectedSession.id 
        ? { ...s, assignedAdminEmail: 'admin@example.com', status: 'active' as SessionStatus }
        : s
    ));
  };

  // Handle close session
  const handleCloseSession = async () => {
    if (!selectedSession) return;
    
    // TODO: API call
    setSelectedSession({ ...selectedSession, status: 'closed' });
    setSessions(sessions.map(s => 
      s.id === selectedSession.id ? { ...s, status: 'closed' as SessionStatus } : s
    ));
  };

  // Filter sessions
  const filteredSessions = sessions.filter((s) => {
    const matchesSearch = 
      s.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.organizationName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const onlineCount = sessions.filter(s => s.customerOnline).length;
  const waitingCount = sessions.filter(s => s.status === 'waiting').length;

  return (
    <div className="h-[calc(100vh-12rem)] flex gap-0 lg:gap-4">
      {/* Sessions List */}
      <div 
        className={`${
          showMobileChat ? 'hidden' : 'flex'
        } lg:flex flex-col w-full lg:w-80 xl:w-96 rounded-xl border overflow-hidden flex-shrink-0`}
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          borderColor: 'rgb(var(--color-border))',
        }}
      >
        {/* Header */}
        <div className="p-4 border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Conversations' : 'Conversations'}
            </h2>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'rgb(var(--color-success))' }}>
                <Circle className="w-2 h-2 fill-current" />
                {onlineCount} {isEn ? 'online' : 'en ligne'}
              </span>
              {waitingCount > 0 && (
                <span 
                  className="px-2 py-0.5 text-xs font-medium rounded-full"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-warning) / 0.1)',
                    color: 'rgb(var(--color-warning))',
                  }}
                >
                  {waitingCount} {isEn ? 'waiting' : 'en attente'}
                </span>
              )}
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search 
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
              style={{ color: 'rgb(var(--color-text-muted))' }} 
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isEn ? 'Search conversations...' : 'Rechercher...'}
              className="w-full pl-9 pr-4 py-2 rounded-lg text-sm"
              style={{ 
                backgroundColor: 'rgb(var(--color-bg-muted))',
                color: 'rgb(var(--color-text))',
              }}
            />
          </div>
          
          {/* Filter */}
          <div className="flex gap-1 mt-3">
            {['all', 'waiting', 'active', 'closed'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status as SessionStatus | 'all')}
                className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                  statusFilter === status ? 'text-white' : ''
                }`}
                style={{
                  backgroundColor: statusFilter === status 
                    ? 'rgb(var(--color-primary-500))' 
                    : 'rgb(var(--color-bg-muted))',
                  color: statusFilter === status 
                    ? 'white' 
                    : 'rgb(var(--color-text-secondary))',
                }}
              >
                {status === 'all' && (isEn ? 'All' : 'Tous')}
                {status === 'waiting' && (isEn ? 'Waiting' : 'Attente')}
                {status === 'active' && (isEn ? 'Active' : 'Actif')}
                {status === 'closed' && (isEn ? 'Closed' : 'Fermé')}
              </button>
            ))}
          </div>
        </div>
        
        {/* Sessions */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <MessageSquare className="w-10 h-10 mb-2" style={{ color: 'rgb(var(--color-text-muted))' }} />
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'No conversations' : 'Aucune conversation'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredSessions.map((session) => (
                <SessionItem
                  key={session.id}
                  session={session}
                  isSelected={selectedSession?.id === session.id}
                  onClick={() => {
                    setSelectedSession(session);
                    setShowMobileChat(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div 
        className={`${
          showMobileChat ? 'flex' : 'hidden'
        } lg:flex flex-col flex-1 rounded-xl border overflow-hidden`}
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          borderColor: 'rgb(var(--color-border))',
        }}
      >
        {selectedSession ? (
          <>
            {/* Chat Header */}
            <div 
              className="flex items-center justify-between p-4 border-b"
              style={{ borderColor: 'rgb(var(--color-border))' }}
            >
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowMobileChat(false)}
                  className="lg:hidden p-1 -ml-1"
                >
                  <ArrowLeft className="w-5 h-5" style={{ color: 'rgb(var(--color-text-secondary))' }} />
                </button>
                <div className="relative">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
                  >
                    <User className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5">
                    <OnlineStatus online={selectedSession.customerOnline} />
                  </div>
                </div>
                <div>
                  <h3 className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                    {selectedSession.customerName || selectedSession.customerEmail}
                  </h3>
                  <p className="text-xs" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    {selectedSession.organizationName}
                    {selectedSession.customerTyping && (
                      <span className="ml-2 italic" style={{ color: 'rgb(var(--color-success))' }}>
                        {isEn ? 'typing...' : 'écrit...'}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {!selectedSession.assignedAdminEmail && selectedSession.status !== 'closed' && (
                  <button
                    onClick={handleAssignSession}
                    className="px-3 py-1.5 text-sm font-medium rounded-lg text-white"
                    style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
                  >
                    {isEn ? 'Take Chat' : 'Prendre le chat'}
                  </button>
                )}
                {selectedSession.status !== 'closed' && (
                  <button
                    onClick={handleCloseSession}
                    className="px-3 py-1.5 text-sm font-medium rounded-lg"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-error) / 0.1)',
                      color: 'rgb(var(--color-error))',
                    }}
                  >
                    {isEn ? 'Close' : 'Fermer'}
                  </button>
                )}
              </div>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isAdmin={message.senderType === 'admin'}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input */}
            {selectedSession.status !== 'closed' && (
              <div 
                className="p-4 border-t"
                style={{ borderColor: 'rgb(var(--color-border))' }}
              >
                <div className="flex items-end gap-2">
                  <div 
                    className="flex-1 rounded-xl border p-3"
                    style={{ 
                      borderColor: 'rgb(var(--color-border))',
                      backgroundColor: 'rgb(var(--color-bg-muted))',
                    }}
                  >
                    <textarea
                      ref={inputRef}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={isEn ? 'Type a message...' : 'Écrivez un message...'}
                      rows={1}
                      className="w-full bg-transparent resize-none text-sm outline-none"
                      style={{ color: 'rgb(var(--color-text))' }}
                    />
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="p-3 rounded-xl text-white transition-colors disabled:opacity-50"
                    style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center">
            <MessageSquare className="w-16 h-16 mb-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
            <p className="text-lg font-medium" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Select a conversation' : 'Sélectionnez une conversation'}
            </p>
            <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {isEn ? 'Choose a chat from the list to start messaging' : 'Choisissez un chat dans la liste'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
