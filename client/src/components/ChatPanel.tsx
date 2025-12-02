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
  Alert,
  Button
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import GroupIcon from '@mui/icons-material/Group';
import PersonIcon from '@mui/icons-material/Person';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckIcon from '@mui/icons-material/Check';
import ClearIcon from '@mui/icons-material/Clear';
import { ChatMessage, MessageType } from '../../../shared/types/chat';
import { socketService } from '../services/socketService';
import { chatServiceClient, FriendRequest } from '../services/chatServiceClient';
import { userServiceClient } from '../services/userServiceClient';
import { User } from '../../../shared/types/user';
import { useAuth } from '../contexts/AuthContext';

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
  const { user: authUser } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentTab, setCurrentTab] = useState(0); // 0: Group Chat, 1: Direct Messages, 2: Friend Requests, 3: Add Friends
  const [messageInput, setMessageInput] = useState('');
  const [groupMessages, setGroupMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<Map<string, Conversation>>(new Map());
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [totalUnread, setTotalUnread] = useState(0);
  const [showGroupChatAlert, setShowGroupChatAlert] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [friendRequestStatus, setFriendRequestStatus] = useState<{[userId: string]: 'idle' | 'sending' | 'sent' | 'error'}>({});
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [requestsUnreadCount, setRequestsUnreadCount] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authUser?.id || !authUser?.username) return;

    console.log('ChatPanel: Registering user for chat:', authUser.id, authUser.username);
    
    // Ensure socket is connected
    socketService.connect();
    
    // Register for chat when component mounts - use authUser for DM routing
    socketService.registerForChat(authUser.id, authUser.username);

    // Load existing conversations and friend requests
    loadConversations();
    loadFriendRequests();

    // Listen for friend added events
    const handleFriendAdded = (friend: { id: string; username: string }) => {
      console.log('ChatPanel: Friend added:', friend);
      setConversations(prev => {
        const newConversations = new Map(prev);
        if (!newConversations.has(friend.id)) {
          newConversations.set(friend.id, {
            userId: friend.id,
            username: friend.username,
            messages: [],
            unreadCount: 0
          });
        }
        return newConversations;
      });
      // Reload friend requests to update the list
      loadFriendRequests();
    };

    // Listen for new friend requests
    const handleFriendRequest = (data: { userId: string; username: string }) => {
      console.log('ChatPanel: New friend request received from:', data);
      loadFriendRequests();
    };

    // Listen for friend request rejections
    const handleFriendRequestRejected = (data: { userId: string }) => {
      console.log('ChatPanel: Friend request rejected by:', data.userId);
      // Reset the friend request status so user can send again
      setFriendRequestStatus(prev => {
        const newStatus = { ...prev };
        delete newStatus[data.userId];
        return newStatus;
      });
      // Add user back to search results if they're in the current search
      if (searchQuery.trim()) {
        handleSearchUsers(searchQuery);
      }
    };

    socketService.on('friend:added', handleFriendAdded);
    socketService.on('friend:request', handleFriendRequest);
    socketService.on('friend:request-rejected', handleFriendRequestRejected);

    return () => {
      socketService.off('friend:added', handleFriendAdded);
      socketService.off('friend:request', handleFriendRequest);
      socketService.off('friend:request-rejected', handleFriendRequestRejected);
    };
  }, [authUser?.id, authUser?.username]);

  // Separate useEffect for message handling to avoid re-creating the handler
  useEffect(() => {
    if (!authUser?.id) return;

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
        // For DMs, compare with authUser.id (the authenticated user)
        const otherUserId = message.senderId === authUser?.id ? message.recipientId! : message.senderId;
        
        setConversations(prev => {
          const newConversations = new Map(prev);
          const existing = newConversations.get(otherUserId);
          
          if (existing) {
            // Prevent duplicates in direct messages too
            const exists = existing.messages.some(m => m.id === message.id);
            if (!exists) {
              existing.messages.push(message);
              // Increment unread if not currently viewing this conversation
              if (selectedConversation !== otherUserId && message.senderId !== authUser?.id) {
                existing.unreadCount++;
              }
            }
          } else {
            // Use sender's name from the message
            const username = message.senderName || otherUserId;
            newConversations.set(otherUserId, {
              userId: otherUserId,
              username,
              messages: [message],
              unreadCount: message.senderId !== authUser?.id ? 1 : 0
            });
          }
          
          return newConversations;
        });
      }
    };

    socketService.onChatMessage(handleChatMessage);
  }, [gameId, selectedConversation, onlineUsers, authUser]);

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
    if (!authUser?.id) return;
    
    try {
      // Load friends instead of conversations
      const friends = await chatServiceClient.getFriends(authUser.id);
      const newConversations = new Map<string, Conversation>();
      
      // Initialize conversation for each friend
      for (const friend of friends) {
        newConversations.set(friend.id, {
          userId: friend.id,
          username: friend.username,
          messages: [],
          unreadCount: 0
        });
      }
      
      setConversations(newConversations);
    } catch (error) {
      console.error('Failed to load friends:', error);
    }
  };

  const loadFriendRequests = async () => {
    if (!authUser?.id) return;
    
    try {
      const requests = await chatServiceClient.getPendingRequests(authUser.id);
      setFriendRequests(requests);
      setRequestsUnreadCount(requests.length);
    } catch (error) {
      console.error('Failed to load friend requests:', error);
    }
  };

  const loadConversationHistory = async (peerId: string) => {
    if (!authUser?.id) return;
    
    try {
      const messages = await chatServiceClient.getDirectMessageHistory(authUser.id, peerId);
      
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
    // Use authUser as fallback if currentPlayerId is not available
    const senderId = currentPlayerId || authUser?.id;
    const senderName = currentPlayerName || authUser?.username;
    
    if (!messageInput.trim() || !senderId || !senderName) {
      console.log('Cannot send message - missing input or user info:', { messageInput: messageInput.trim(), senderId, senderName });
      return;
    }

    console.log('Sending message:', { currentTab, gameId, selectedConversation, senderId, authUserId: authUser?.id });

    if (currentTab === 0) {
      // Check if gameId is available for group chat
      if (!gameId) {
        console.log('Cannot send group message - not in a game');
        setShowGroupChatAlert(true);
        return;
      }
      // Send group message
      console.log('Sending group message to gameId:', gameId);
      socketService.sendChatMessage(senderId, senderName, {
        type: MessageType.GROUP,
        content: messageInput,
        gameId
      });
    } else if (currentTab === 1 && selectedConversation) {
      // Send direct message (use authUser.id for friend verification)
      if (!authUser?.id) {
        console.error('Cannot send DM - not authenticated');
        return;
      }
      console.log('Sending direct message from', authUser.id, 'to:', selectedConversation);
      socketService.sendChatMessage(authUser.id, authUser.username, {
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

  const handleSearchUsers = async (query: string) => {
    if (!query.trim() || !authUser?.id) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await userServiceClient.searchUsers(query, 10);
      // Filter out current user and existing friends
      const friendIds = new Set(Array.from(conversations.keys()));
      const filteredResults = results.filter(
        user => user.id !== authUser.id && !friendIds.has(user.id)
      );
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendFriendRequest = async (friendId: string) => {
    if (!authUser?.id) return;

    setFriendRequestStatus(prev => ({ ...prev, [friendId]: 'sending' }));
    
    try {
      await chatServiceClient.addFriend(authUser.id, friendId);
      setFriendRequestStatus(prev => ({ ...prev, [friendId]: 'sent' }));
      
      // Don't reload friends list - they're not friends yet, just sent a request
      // Remove from search results
      setSearchResults(prev => prev.filter(user => user.id !== friendId));
    } catch (error) {
      console.error('Error sending friend request:', error);
      setFriendRequestStatus(prev => ({ ...prev, [friendId]: 'error' }));
    }
  };

  const handleAcceptFriendRequest = async (friendId: string) => {
    if (!authUser?.id) return;

    try {
      await chatServiceClient.acceptFriendRequest(authUser.id, friendId);
      // Reload both friends and requests
      await loadConversations();
      await loadFriendRequests();
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };

  const handleRejectFriendRequest = async (friendId: string) => {
    if (!authUser?.id) return;

    try {
      await chatServiceClient.rejectFriendRequest(authUser.id, friendId);
      await loadFriendRequests();
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    }
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
              const isOwnMessage = msg.senderId === (currentPlayerId || authUser?.id);
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
                      bgcolor: isOwnMessage ? 'primary.main' : 'grey.800',
                      color: isOwnMessage ? 'white' : 'grey.100',
                      borderRadius: 2,
                      border: isOwnMessage ? 'none' : '1px solid',
                      borderColor: isOwnMessage ? 'transparent' : 'grey.700'
                    }}
                  >
                    <Typography variant="body2" sx={{ color: 'inherit' }}>{msg.content}</Typography>
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
      const friendList = Array.from(conversations.values());
      
      return (
        <Box sx={{ p: 2 }}>
          {friendList.length === 0 ? (
            <Typography variant="body2" color="text.secondary" align="center">
              No friends yet. Add friends to start chatting!
            </Typography>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Select a friend to start chatting
              </Typography>
              <List>
                {friendList.map(friend => (
                  <ListItemButton key={friend.userId} onClick={() => handleSelectConversation(friend.userId)}>
                    <Avatar sx={{ mr: 2, width: 32, height: 32, bgcolor: 'primary.main' }}>
                      {friend.username[0].toUpperCase()}
                    </Avatar>
                    <ListItemText 
                      primary={friend.username}
                      secondary={friend.messages.slice(-1)[0]?.content || 'Start a conversation'}
                      primaryTypographyProps={{ sx: { color: 'grey.100' } }}
                      secondaryTypographyProps={{ sx: { color: 'grey.400' } }}
                    />
                    {friend.unreadCount > 0 && (
                      <Badge badgeContent={friend.unreadCount} color="error" />
                    )}
                  </ListItemButton>
                ))}
              </List>
            </>
          )}
        </Box>
      );
    }

    const conversation = conversations.get(selectedConversation);
    
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ p: 1, bgcolor: 'grey.900', display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" onClick={() => setSelectedConversation(null)}>
            <CloseIcon />
          </IconButton>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
            {conversation?.username[0].toUpperCase()}
          </Avatar>
          <Typography variant="subtitle2" sx={{ color: 'grey.100' }}>{conversation?.username}</Typography>
        </Box>
        <Divider />
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
          {conversation?.messages.map((msg, idx) => {
            const isOwnMessage = msg.senderId === authUser?.id;
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
                    bgcolor: isOwnMessage ? 'primary.main' : 'grey.800',
                    color: isOwnMessage ? 'white' : 'grey.100',
                    borderRadius: 2,
                    border: isOwnMessage ? 'none' : '1px solid',
                    borderColor: isOwnMessage ? 'transparent' : 'grey.700'
                  }}
                >
                  <Typography variant="body2" sx={{ color: 'inherit' }}>{msg.content}</Typography>
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

  const renderFriendRequests = () => {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
        {friendRequests.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center">
            No pending friend requests
          </Typography>
        ) : (
          <List>
            {friendRequests.map(request => (
              <Paper key={request.userId} sx={{ mb: 2, p: 2, bgcolor: 'grey.900' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Avatar sx={{ mr: 2, width: 40, height: 40, bgcolor: 'primary.main' }}>
                    {request.username[0].toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" sx={{ color: 'grey.100' }}>{request.username}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(request.createdAt).toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    startIcon={<CheckIcon />}
                    onClick={() => handleAcceptFriendRequest(request.userId)}
                    fullWidth
                  >
                    Accept
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={<ClearIcon />}
                    onClick={() => handleRejectFriendRequest(request.userId)}
                    fullWidth
                  >
                    Reject
                  </Button>
                </Box>
              </Paper>
            ))}
          </List>
        )}
      </Box>
    );
  };

  const renderAddFriends = () => {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search users by username..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleSearchUsers(e.target.value);
            }}
            disabled={isSearching}
          />
        </Box>
        <Divider />
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
          {isSearching ? (
            <Typography variant="body2" color="text.secondary" align="center">
              Searching...
            </Typography>
          ) : searchQuery.trim() === '' ? (
            <Typography variant="body2" color="text.secondary" align="center">
              Enter a username to search for friends
            </Typography>
          ) : searchResults.length === 0 ? (
            <Typography variant="body2" color="text.secondary" align="center">
              No users found
            </Typography>
          ) : (
            <List>
              {searchResults.map(user => {
                const status = friendRequestStatus[user.id] || 'idle';
                return (
                  <ListItemButton
                    key={user.id}
                    onClick={() => status === 'idle' && handleSendFriendRequest(user.id)}
                    disabled={status !== 'idle'}
                  >
                    <Avatar sx={{ mr: 2, width: 32, height: 32, bgcolor: 'secondary.main' }}>
                      {user.username[0].toUpperCase()}
                    </Avatar>
                    <ListItemText 
                      primary={user.username}
                      secondary={user.email}
                      primaryTypographyProps={{ sx: { color: 'grey.100' } }}
                      secondaryTypographyProps={{ sx: { color: 'grey.400' } }}
                    />
                    <IconButton 
                      size="small" 
                      disabled={status !== 'idle'}
                      sx={{ 
                        color: status === 'sent' ? 'success.main' : 'primary.main'
                      }}
                    >
                      <PersonAddIcon />
                    </IconButton>
                    {status === 'sending' && (
                      <Typography variant="caption" color="text.secondary">
                        Sending...
                      </Typography>
                    )}
                    {status === 'sent' && (
                      <Typography variant="caption" color="success.main">
                        Request sent!
                      </Typography>
                    )}
                    {status === 'error' && (
                      <Typography variant="caption" color="error">
                        Failed
                      </Typography>
                    )}
                  </ListItemButton>
                );
              })}
            </List>
          )}
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
            <Tab icon={<GroupIcon />} label="Match" />
            <Tab 
              icon={
                <Badge badgeContent={totalUnread} color="error">
                  <PersonIcon />
                </Badge>
              } 
              label="Direct" 
            />
            <Tab 
              icon={
                <Badge badgeContent={requestsUnreadCount} color="error">
                  <NotificationsIcon />
                </Badge>
              } 
              label="Requests" 
            />
            <Tab icon={<PersonAddIcon />} label="Add" />
          </Tabs>
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            {currentTab === 0 ? renderGroupChat() : currentTab === 1 ? renderDirectMessages() : currentTab === 2 ? renderFriendRequests() : renderAddFriends()}
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
