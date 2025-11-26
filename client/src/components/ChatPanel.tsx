import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  IconButton,
  TextField,
  Typography,
  Tabs,
  Tab,
  List,
  ListItemText,
  ListItemButton,
  Badge,
  Divider,
  Avatar,
  Snackbar,
  Alert
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import GroupIcon from '@mui/icons-material/Group';
import PersonIcon from '@mui/icons-material/Person';
import { ChatMessage, MessageType } from '../../../shared/types/chat';
import { socketService } from '../services/socketService';
import { chatServiceClient } from '../services/chatServiceClient';

interface ChatPanelProps {
  gameId?: string;
  currentPlayerId?: string;
  currentPlayerName?: string;
  onlineUsers?: Array<{ id: string; username: string }>;
}

interface Conversation {
  userId: string;
  username: string;
  messages: ChatMessage[];
  unreadCount: number;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ gameId, currentPlayerId, currentPlayerName, onlineUsers = [] }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentTab, setCurrentTab] = useState(0); // 0: Group Chat, 1: Direct Messages
  const [messageInput, setMessageInput] = useState('');
  const [groupMessages, setGroupMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<Map<string, Conversation>>(new Map());
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [totalUnread, setTotalUnread] = useState(0);
  const [showGroupChatAlert, setShowGroupChatAlert] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentPlayerId || !currentPlayerName) return;

    console.log('ChatPanel: Registering user for chat:', currentPlayerId, currentPlayerName);
    // Register for chat when component mounts
    socketService.registerForChat(currentPlayerId, currentPlayerName);

    // Load existing conversations
    loadConversations();
  }, [currentPlayerId, currentPlayerName]);

  // Separate useEffect for message handling to avoid re-creating the handler
  useEffect(() => {
    if (!currentPlayerId) return;

    // Listen for new messages
    const handleChatMessage = (message: ChatMessage) => {
      console.log('ChatPanel: Received message:', message);
      if (message.type === MessageType.GROUP && message.gameId === gameId) {
        console.log('ChatPanel: Adding group message to state');
        setGroupMessages(prev => {
          // Prevent duplicates by checking if message already exists
          const exists = prev.some(m => m.id === message.id);
          if (exists) {
            console.log('ChatPanel: Duplicate message detected, skipping');
            return prev;
          }
          return [...prev, message];
        });
      } else if (message.type === MessageType.DIRECT) {
        const otherUserId = message.senderId === currentPlayerId ? message.recipientId! : message.senderId;
        
        setConversations(prev => {
          const newConversations = new Map(prev);
          const existing = newConversations.get(otherUserId);
          
          if (existing) {
            // Prevent duplicates in direct messages too
            const exists = existing.messages.some(m => m.id === message.id);
            if (!exists) {
              existing.messages.push(message);
              // Increment unread if not currently viewing this conversation
              if (selectedConversation !== otherUserId && message.senderId !== currentPlayerId) {
                existing.unreadCount++;
              }
            }
          } else {
            // Find username from online users or use userId as fallback
            const username = onlineUsers.find(u => u.id === otherUserId)?.username || otherUserId;
            newConversations.set(otherUserId, {
              userId: otherUserId,
              username,
              messages: [message],
              unreadCount: message.senderId !== currentPlayerId ? 1 : 0
            });
          }
          
          return newConversations;
        });
      }
    };

    socketService.onChatMessage(handleChatMessage);
  }, [currentPlayerId, gameId, selectedConversation, onlineUsers]);

  useEffect(() => {
    // Calculate total unread messages
    let total = 0;
    conversations.forEach(conv => {
      total += conv.unreadCount;
    });
    setTotalUnread(total);
  }, [conversations]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [groupMessages, conversations, selectedConversation]);

  const loadConversations = async () => {
    if (!currentPlayerId) return;
    
    try {
      const convos = await chatServiceClient.getUserConversations(currentPlayerId);
      const newConversations = new Map<string, Conversation>();
      
      for (const convo of convos) {
        const username = onlineUsers.find(u => u.id === convo.peerId)?.username || convo.peerId;
        newConversations.set(convo.peerId, {
          userId: convo.peerId,
          username,
          messages: convo.messages,
          unreadCount: 0
        });
      }
      
      setConversations(newConversations);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadConversationHistory = async (peerId: string) => {
    if (!currentPlayerId) return;
    
    try {
      const messages = await chatServiceClient.getDirectMessageHistory(currentPlayerId, peerId);
      
      setConversations(prev => {
        const newConversations = new Map(prev);
        const existing = newConversations.get(peerId);
        
        if (existing) {
          existing.messages = messages;
          existing.unreadCount = 0; // Mark as read when opening
        }
        
        return newConversations;
      });
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }
  };

  const handleSendMessage = () => {
    if (!messageInput.trim() || !currentPlayerId || !currentPlayerName) {
      console.log('Cannot send message - missing input or player info:', { messageInput: messageInput.trim(), currentPlayerId, currentPlayerName });
      return;
    }

    console.log('Sending message:', { currentTab, gameId, selectedConversation, currentPlayerId });

    if (currentTab === 0) {
      // Check if gameId is available for group chat
      if (!gameId) {
        console.log('Cannot send group message - not in a game');
        setShowGroupChatAlert(true);
        return;
      }
      // Send group message
      console.log('Sending group message to gameId:', gameId);
      socketService.sendChatMessage(currentPlayerId, currentPlayerName, {
        type: MessageType.GROUP,
        content: messageInput,
        gameId
      });
    } else if (currentTab === 1 && selectedConversation) {
      // Send direct message
      console.log('Sending direct message to:', selectedConversation);
      socketService.sendChatMessage(currentPlayerId, currentPlayerName, {
        type: MessageType.DIRECT,
        content: messageInput,
        recipientId: selectedConversation
      });
    } else {
      console.log('No valid target for message:', { currentTab, gameId, selectedConversation });
    }

    setMessageInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSelectConversation = async (userId: string) => {
    setSelectedConversation(userId);
    await loadConversationHistory(userId);
  };

  const renderGroupChat = () => {
    // Show message if not in a game
    if (!gameId) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', alignItems: 'center', p: 3 }}>
          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 1 }}>
            Match chat is only available during an active game.
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            Use Direct Messages to chat with other players in the lobby.
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
          {groupMessages.length === 0 ? (
            <Typography variant="body2" color="text.secondary" align="center">
              No messages yet. Start the conversation!
            </Typography>
          ) : (
            groupMessages.map((msg, idx) => {
              const isOwnMessage = msg.senderId === currentPlayerId;
              return (
                <Box
                  key={idx}
                  sx={{
                    mb: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isOwnMessage ? 'flex-end' : 'flex-start'
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, px: 0.5 }}>
                    {isOwnMessage ? 'You' : msg.senderName}
                  </Typography>
                  <Paper
                    sx={{
                      p: 1.5,
                      maxWidth: '70%',
                      bgcolor: isOwnMessage ? 'primary.main' : 'grey.200',
                      color: isOwnMessage ? 'white' : 'text.primary',
                      borderRadius: 2
                    }}
                  >
                    <Typography variant="body2">{msg.content}</Typography>
                  </Paper>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, px: 0.5 }}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </Typography>
                </Box>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </Box>
        <Divider />
        <Box sx={{ p: 1, display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder={gameId ? "Type a message..." : "Match chat disabled in lobby"}
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={!gameId}
          />
          <IconButton color="primary" onClick={handleSendMessage} disabled={!gameId}>
            <SendIcon />
          </IconButton>
        </Box>
      </Box>
    );
  };

  const renderDirectMessages = () => {
    if (!selectedConversation) {
      return (
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Select a user to start chatting
          </Typography>
          <List>
            {onlineUsers.filter(u => u.id !== currentPlayerId).map(u => (
              <ListItemButton key={u.id} onClick={() => handleSelectConversation(u.id)}>
                <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                  {u.username[0].toUpperCase()}
                </Avatar>
                <ListItemText 
                  primary={u.username}
                  secondary={conversations.get(u.id)?.messages.slice(-1)[0]?.content || 'Start a conversation'}
                />
                {conversations.get(u.id)?.unreadCount ? (
                  <Badge badgeContent={conversations.get(u.id)?.unreadCount} color="error" />
                ) : null}
              </ListItemButton>
            ))}
          </List>
        </Box>
      );
    }

    const conversation = conversations.get(selectedConversation);
    
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ p: 1, bgcolor: 'grey.100', display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" onClick={() => setSelectedConversation(null)}>
            <CloseIcon />
          </IconButton>
          <Avatar sx={{ width: 32, height: 32 }}>
            {conversation?.username[0].toUpperCase()}
          </Avatar>
          <Typography variant="subtitle2">{conversation?.username}</Typography>
        </Box>
        <Divider />
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
          {conversation?.messages.map((msg, idx) => {
            const isOwnMessage = msg.senderId === currentPlayerId;
            return (
              <Box
                key={idx}
                sx={{
                  mb: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isOwnMessage ? 'flex-end' : 'flex-start'
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, px: 0.5 }}>
                  {isOwnMessage ? 'You' : msg.senderName}
                </Typography>
                <Paper
                  sx={{
                    p: 1.5,
                    maxWidth: '70%',
                    bgcolor: isOwnMessage ? 'primary.main' : 'grey.200',
                    color: isOwnMessage ? 'white' : 'text.primary',
                    borderRadius: 2
                  }}
                >
                  <Typography variant="body2">{msg.content}</Typography>
                </Paper>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, px: 0.5 }}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </Typography>
              </Box>
            );
          })}
          <div ref={messagesEndRef} />
        </Box>
        <Divider />
        <Box sx={{ p: 1, display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Type a message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <IconButton color="primary" onClick={handleSendMessage}>
            <SendIcon />
          </IconButton>
        </Box>
      </Box>
    );
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        zIndex: 1300
      }}
    >
      {!isExpanded ? (
        <IconButton
          color="primary"
          onClick={() => setIsExpanded(true)}
          sx={{
            bgcolor: 'primary.main',
            color: 'white',
            '&:hover': { bgcolor: 'primary.dark' },
            width: 56,
            height: 56
          }}
        >
          <Badge badgeContent={totalUnread} color="error">
            <ChatIcon />
          </Badge>
        </IconButton>
      ) : (
        <Paper
          elevation={8}
          sx={{
            width: 400,
            height: 500,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Box sx={{ p: 1, bgcolor: 'primary.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Chat</Typography>
            <IconButton size="small" onClick={() => setIsExpanded(false)} sx={{ color: 'white' }}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab icon={<GroupIcon />} label="Match Chat" />
            <Tab 
              icon={
                <Badge badgeContent={totalUnread} color="error">
                  <PersonIcon />
                </Badge>
              } 
              label="Direct" 
            />
          </Tabs>
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            {currentTab === 0 ? renderGroupChat() : renderDirectMessages()}
          </Box>
        </Paper>
      )}
      
      {/* Alert for group chat restriction */}
      <Snackbar 
        open={showGroupChatAlert} 
        autoHideDuration={3000} 
        onClose={() => setShowGroupChatAlert(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        sx={{ bottom: 80 }} // Position above the chat icon
      >
        <Alert onClose={() => setShowGroupChatAlert(false)} severity="warning" sx={{ width: '100%' }}>
          Match chat is only available during an active game!
        </Alert>
      </Snackbar>
    </Box>
  );
};
