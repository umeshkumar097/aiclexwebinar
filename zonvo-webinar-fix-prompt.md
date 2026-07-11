# ZONVO WEBINAR PLATFORM — CRITICAL FIX PROMPT

## Project Context

**Platform:** Zonvo Webinar  
**Stack:** Next.js 14 (App Router) + NestJS + Socket.io + Mediasoup + PostgreSQL + Redis  
**Bugs:** P0 Critical — Two-way sync broken + No graceful webinar end

---

## Bug 1: Participant Actions Are Local-Only

**Current broken behavior:**  
When a participant sends a chat message, reaction, raises hand, or votes in a poll — only they see it on their own screen. The host and other participants never receive it. The action never leaves the browser.

**Root cause:**  
Participant actions only update React local state. There is no `socket.emit()` to the server, and the server does not broadcast to the room.

**Required fix:**  
Every participant action must:
1. Optimistically update local UI
2. Emit to server via authenticated Socket.io event
3. Server validates the user is in the room
4. Server broadcasts to ALL clients in the room (including host)
5. All clients update their state and render the action

---

## Bug 2: Host Ending Webinar Does Not Disconnect Participants

**Current broken behavior:**  
When the host clicks "End Webinar", only the host's session closes. Participants remain stuck on the webinar screen, still connected via WebRTC, unaware the webinar has ended. They have to manually refresh or click back.

**Root cause:**  
No `webinar:ended` event is broadcast from server to the room. WebRTC connections remain open. Redis room state is not cleaned up.

**Required fix:**
1. Host clicks "End Webinar" → API call to backend
2. Backend marks webinar as `ended` in PostgreSQL
3. Backend emits `webinar:ended` to every socket in the room
4. All clients (host + participants) show "Webinar Ended" screen
5. All WebRTC tracks are stopped, peer connections closed
6. Server disconnects all sockets after 5-second grace period
7. Redis room keys are deleted
8. Mediasoup router is closed
9. Auto-redirect participants to `/webinar/{id}/ended`

---

## Project Structure

```
zonvo/
├── apps/
│   ├── web/                          # Next.js 14 App Router
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (dashboard)/
│   │   │   │   │   └── webinars/
│   │   │   │   │       └── [id]/
│   │   │   │   │           └── live/
│   │   │   │   │               └── page.tsx
│   │   │   │   └── webinar/
│   │   │   │       └── [id]/
│   │   │   │           └── ended/
│   │   │   │               └── page.tsx          # CREATE THIS
│   │   │   ├── components/
│   │   │   │   ├── webinar/
│   │   │   │   │   ├── HostControls.tsx
│   │   │   │   │   ├── ParticipantView.tsx
│   │   │   │   │   ├── ChatPanel.tsx
│   │   │   │   │   ├── ReactionBar.tsx
│   │   │   │   │   ├── PollCreator.tsx
│   │   │   │   │   ├── PollViewer.tsx
│   │   │   │   │   ├── QAPanel.tsx
│   │   │   │   │   ├── RaiseHandButton.tsx
│   │   │   │   │   └── WebinarEndedScreen.tsx   # CREATE THIS
│   │   │   ├── hooks/
│   │   │   │   ├── useWebinarSocket.ts
│   │   │   │   ├── useMediaSoup.ts
│   │   │   │   └── useParticipantActions.ts     # CREATE THIS
│   │   │   └── lib/
│   │   │       └── socket.ts
│   │   └── package.json
│   │
│   └── api/                          # NestJS backend
│       ├── src/
│       │   ├── webinar/
│       │   │   ├── webinar.module.ts
│       │   │   ├── webinar.service.ts
│       │   │   ├── webinar.controller.ts
│       │   │   └── entities/
│       │   │       └── webinar.entity.ts
│       │   ├── media/
│       │   │   ├── media.module.ts
│       │   │   ├── media.gateway.ts       # CRITICAL FILE
│       │   │   ├── media.service.ts
│       │   │   └── room-manager.service.ts
│       │   ├── chat/
│       │   │   ├── chat.gateway.ts
│       │   │   └── chat.service.ts
│       │   ├── redis/
│       │   │   └── redis.service.ts
│       │   └── main.ts
│       └── package.json
```

---

## Tech Stack

- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS, Zustand
- **Backend:** NestJS 10, TypeScript, Socket.io 4
- **Media:** Mediasoup 3
- **Database:** PostgreSQL (TypeORM), Redis (ioredis)
- **Real-time:** Socket.io with Redis adapter

---

## FILE 1: `apps/api/src/media/media.gateway.ts`

This is the main Socket.io gateway. Implement ALL of the following methods with complete production code:

### Method: `handleJoinRoom`

- Decorator: `@SubscribeMessage('join:room')`
- On join, add user to `room:{roomId}:participants` Redis set
- If user is host, set `room:{roomId}:host`
- If user is co-host, add to `room:{roomId}:cohosts`
- Emit current room state to the joining socket (active poll, chat history, screen share status)
- Emit `user:joined` to other room members
- Return `{ success: true, roomState }` to joining socket

### Method: `handleParticipantAction`

- Decorator: `@SubscribeMessage('participant:action')`
- Validate the socket is in the room (`roomId`)
- Validate the user is in `room:{roomId}:participants` Redis set
- Validate rate limit: max 30 actions/minute per user (Redis counter with 60s TTL)
- Broadcast to room using `this.server.to(data.roomId).emit('room:action', payload)`
- Persist the action to Redis for late-joiners (chat to list, polls to hash)
- Return acknowledgment to sender: `{ success: true, actionId }`
- On error, return `WsException` with clear message

### Method: `handleHostAction`

- Decorator: `@SubscribeMessage('host:action')`
- Verify sender is the host or co-host (check `room:{roomId}:host` and `room:{roomId}:cohosts`)
- Validate action type is allowed for sender's role
- Broadcast to room using `this.server.to(data.roomId).emit('room:action', payload)`
- Update room state in Redis if needed (e.g., activePoll, screenSharing)
- Return acknowledgment

### Method: `handleEndWebinar`

- Decorator: `@SubscribeMessage('host:endWebinar')`
- Verify sender is the host or co-host
- Update webinar status to `ended` in PostgreSQL via `webinarService`
- Emit `webinar:ended` to entire room: `this.server.to(roomId).emit('webinar:ended', { webinarId, endedBy, endedAt, message })`
- Set 5-second timeout, then:
  - Get all sockets in room: `this.server.in(roomId).fetchSockets()`
  - Force disconnect each socket: `socket.disconnect(true)`
  - Make each socket leave the room: `socket.leave(roomId)`
- Cleanup all Redis keys matching `room:{roomId}:*`
- Call `mediasoup.closeRoom(roomId)` or equivalent
- Return `{ success: true, endedAt }` to host before disconnect

### Method: `handleDisconnect`

- On any disconnect, remove user from `room:{roomId}:participants`
- Emit `user:left` to remaining room members
- If disconnected user was host:
  - Start 10-second timer
  - After 10s, check if host reconnected (exists in `room:{roomId}:participants`)
  - If not reconnected, check for co-host in `room:{roomId}:cohosts`
  - If co-host exists, promote them: emit `host:changed` to room, update `room:{roomId}:host`
  - If no co-host, auto-call `handleEndWebinar` logic
- If room is empty (0 participants after SREM), call `cleanupRoom(roomId)` immediately
- Log disconnect reason for debugging

### Method: `handleReconnect`

- Decorator: `@SubscribeMessage('reconnect:room')`
- Validate user was previously in this room (check old session in Redis)
- If room still active, re-add to participants, emit current room state
- If room ended, emit `webinar:ended` immediately

### Code Requirements:

- Use `IoAdapter` with Redis adapter for multi-server support
- Use `@WebSocketGateway()` with namespace `/media`
- Use `WsException` for all error handling
- Use `Logger` for all significant events (join, leave, end, error)
- All async operations must have try/catch
- Use `UseGuards(WsJwtGuard)` on gateway level
- Inject `RoomManagerService` and `WebinarService`

---

## FILE 2: `apps/api/src/media/room-manager.service.ts`

Add these methods with complete implementation:

### Method: `broadcastToRoom(roomId: string, event: string, payload: any)`

- Get `this.server` instance from injected gateway
- Emit to room: `this.server.to(roomId).emit(event, payload)`
- Log broadcast with roomId, event, and participant count
- Return count of sockets that received the event

### Method: `getRoomState(roomId: string): Promise<RoomState>`

Return object with:
- `participants`: `SMEMBERS room:{roomId}:participants`
- `host`: `GET room:{roomId}:host`
- `cohosts`: `SMEMBERS room:{roomId}:cohosts`
- `activePoll`: `HGET room:{roomId}:state activePoll`
- `screenSharing`: `HGET room:{roomId}:state screenSharing`
- `recording`: `HGET room:{roomId}:state recording`
- `chatHistory`: `LRANGE room:{roomId}:chat 0 49` (last 50 messages, parsed JSON)
- `qaList`: `LRANGE room:{roomId}:qa 0 49`
- `status`: `HGET room:{roomId}:state status` or `'live'`

### Method: `endRoom(roomId: string, endedBy: string): Promise<void>`

- Set `room:{roomId}:state` status to `ended`
- Get all sockets in room via `this.server.in(roomId).fetchSockets()`
- Emit `webinar:ended` to all sockets with payload:
  ```json
  {
    "webinarId": roomId,
    "endedBy": endedBy,
    "endedAt": "2024-01-01T00:00:00Z",
    "message": "This webinar has been ended by the host.",
    "redirectUrl": "/webinar/{roomId}/ended"
  }
  ```
- Set 5-second timeout, then disconnect all sockets
- Delete all Redis keys matching `room:{roomId}:*` using `redis.keys()` + `redis.del()`
- Close Mediasoup router for this room
- Log room closure

### Method: `persistAction(roomId: string, actionType: string, payload: any)`

- If `actionType === 'chat:message'`: `LPUSH room:{roomId}:chat JSON.stringify(payload)`, then `LTRIM room:{roomId}:chat 0 99`
- If `actionType === 'poll:create'`: `HSET room:{roomId}:polls payload.pollId JSON.stringify(payload)`
- If `actionType === 'poll:vote'`: `HINCRBY room:{roomId}:poll:votes:{pollId} optionIndex 1`
- If `actionType === 'qa:submit'`: `LPUSH room:{roomId}:qa JSON.stringify(payload)`, then `LTRIM 0 99`
- If `actionType === 'reaction:send'`: no persistence (ephemeral)
- Set TTL on new keys: 24 hours for active rooms

### Method: `cleanupRoom(roomId: string): Promise<void>`

- Delete all Redis keys matching `room:{roomId}:*`
- Close Mediasoup router if open
- Log cleanup completion
- Return void

### Method: `isHost(roomId: string, userId: string): Promise<boolean>`

- `GET room:{roomId}:host` and compare with userId
- Return boolean

### Method: `isCohost(roomId: string, userId: string): Promise<boolean>`

- `SISMEMBER room:{roomId}:cohosts userId`
- Return boolean

---

## FILE 3: `apps/api/src/webinar/webinar.controller.ts`

### Endpoint: `POST /api/webinars/:id/end`

```typescript
@Post(':id/end')
@UseGuards(JwtAuthGuard, WebinarHostGuard)
async endWebinar(
  @Param('id') id: string,
  @Req() req: AuthenticatedRequest,
) {
  const result = await this.webinarService.end(id, req.user.id);
  await this.roomManager.endRoom(id, req.user.id);
  return { success: true, endedAt: result.endedAt };
}
```

### Endpoint: `GET /api/webinars/:id/state`

```typescript
@Get(':id/state')
@UseGuards(JwtAuthGuard)
async getRoomState(@Param('id') id: string) {
  const state = await this.roomManager.getRoomState(id);
  return { success: true, state };
}
```

### Endpoint: `GET /api/webinars/:id`

```typescript
@Get(':id')
@UseGuards(JwtAuthGuard)
async getWebinar(@Param('id') id: string) {
  const webinar = await this.webinarService.findOne(id);
  return { success: true, webinar };
}
```

---

## FILE 4: `apps/web/src/hooks/useParticipantActions.ts` (NEW)

Create this hook with the exact following interface and behavior:

```typescript
interface ParticipantActionPayload {
  roomId: string;
  actionType: string;
  payload: Record<string, any>;
  timestamp: string;
}

interface UseParticipantActionsReturn {
  sendChatMessage: (text: string) => void;
  sendReaction: (emoji: string) => void;
  raiseHand: () => void;
  lowerHand: () => void;
  votePoll: (pollId: string, optionIndex: number) => void;
  submitQuestion: (question: string) => void;
  isSending: boolean;
  error: string | null;
}

export function useParticipantActions(roomId: string): UseParticipantActionsReturn;
```

**Implementation requirements:**

1. Get socket from `useWebinarSocket()`
2. Get current user from Zustand store (`useUserStore`)
3. Maintain `isSending` and `error` state
4. Every action must:
   - Set `isSending(true)`
   - Optimistically update Zustand store (for instant UI feedback)
   - Emit `participant:action` with callback acknowledgment
   - On server ack: set `isSending(false)`
   - On error: set `error`, rollback optimistic update, show toast
   - Rate limit: prevent double-clicks (disable for 500ms)

**Payload shapes:**

```typescript
// Chat
{
  roomId,
  actionType: 'chat:message',
  payload: {
    text,
    senderId: user.id,
    senderName: user.name,
    senderAvatar: user.avatar,
  },
  timestamp: new Date().toISOString()
}

// Reaction
{
  roomId,
  actionType: 'reaction:send',
  payload: {
    emoji,
    senderId: user.id,
    senderName: user.name,
  },
  timestamp: new Date().toISOString()
}

// Raise Hand
{
  roomId,
  actionType: 'hand:raise',
  payload: {
    userId: user.id,
    name: user.name,
  },
  timestamp: new Date().toISOString()
}

// Lower Hand
{
  roomId,
  actionType: 'hand:lower',
  payload: {
    userId: user.id,
  },
  timestamp: new Date().toISOString()
}

// Poll Vote
{
  roomId,
  actionType: 'poll:vote',
  payload: {
    pollId,
    optionIndex,
    userId: user.id,
  },
  timestamp: new Date().toISOString()
}

// Q&A Submit
{
  roomId,
  actionType: 'qa:submit',
  payload: {
    questionId: generateId(),
    text: question,
    userId: user.id,
    userName: user.name,
  },
  timestamp: new Date().toISOString()
}
```

---

## FILE 5: `apps/web/src/hooks/useWebinarSocket.ts` (MODIFY)

Add listeners for ALL room events. The hook must return socket instance and connection status.

**Required listeners:**

```typescript
useEffect(() => {
  if (!socket) return;

  // Handle any room action (chat, reaction, poll, etc.)
  const handleRoomAction = (data: {
    actionType: string;
    payload: any;
    senderRole: 'host' | 'cohost' | 'participant' | 'panelist';
    timestamp: string;
  }) => {
    const { actionType, payload, senderRole } = data;

    switch (actionType) {
      case 'chat:message':
        useChatStore.getState().addMessage(payload);
        break;
      case 'reaction:send':
        useReactionStore.getState().addReaction(payload);
        break;
      case 'hand:raise':
        useParticipantStore.getState().raiseHand(payload.userId);
        break;
      case 'hand:lower':
        useParticipantStore.getState().lowerHand(payload.userId);
        break;
      case 'poll:create':
        usePollStore.getState().setActivePoll(payload);
        break;
      case 'poll:vote':
        usePollStore.getState().addVote(payload.pollId, payload.optionIndex);
        break;
      case 'poll:results':
        usePollStore.getState().setResults(payload.pollId, payload.results);
        break;
      case 'screen:share:start':
        useLayoutStore.getState().setScreenShare(payload);
        break;
      case 'screen:share:stop':
        useLayoutStore.getState().stopScreenShare();
        break;
      case 'qa:answer':
        useQAStore.getState().addAnswer(payload);
        break;
      case 'cta:trigger':
        useCTAStore.getState().showCTA(payload);
        break;
      case 'host:controls':
        handleHostControl(payload);
        break;
      default:
        console.warn('Unknown action type:', actionType);
    }
  };

  // Handle webinar ended (CRITICAL)
  const handleWebinarEnded = (data: {
    webinarId: string;
    endedBy: string;
    endedAt: string;
    message: string;
    redirectUrl: string;
  }) => {
    // 1. Stop all media tracks immediately
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log(`Stopped ${track.kind} track`);
      });
      localStreamRef.current = null;
    }

    // 2. Close all peer connections
    producersRef.current.forEach(p => p.close?.());
    consumersRef.current.forEach(c => c.close?.());
    transportsRef.current.forEach(t => t.close?.());
    producersRef.current.clear();
    consumersRef.current.clear();
    transportsRef.current.clear();

    // 3. Disconnect socket
    socket.disconnect();

    // 4. Update global state
    useWebinarStore.getState().setStatus('ended');
    useWebinarStore.getState().setEndedData(data);

    // 5. Auto redirect after 5 seconds
    setTimeout(() => {
      window.location.href = data.redirectUrl;
    }, 5000);
  };

  // Handle user joined
  const handleUserJoined = (data: { userId: string; name: string; role: string }) => {
    useParticipantStore.getState().addParticipant(data);
  };

  // Handle user left
  const handleUserLeft = (data: { userId: string; role: string; reason: string }) => {
    useParticipantStore.getState().removeParticipant(data.userId);
  };

  // Handle host changed (co-host promoted)
  const handleHostChanged = (data: { newHostId: string; previousHostId: string }) => {
    useWebinarStore.getState().setHost(data.newHostId);
    toast.info('Host has changed. New host is now in control.');
  };

  // Handle initial room state on join
  const handleRoomState = (data: RoomState) => {
    useChatStore.getState().setMessages(data.chatHistory);
    usePollStore.getState().setActivePoll(data.activePoll ? JSON.parse(data.activePoll) : null);
    useLayoutStore.getState().setScreenSharing(data.screenSharing === 'true');
    useParticipantStore.getState().setParticipants(data.participants);
  };

  // Register all listeners
  socket.on('room:action', handleRoomAction);
  socket.on('webinar:ended', handleWebinarEnded);
  socket.on('user:joined', handleUserJoined);
  socket.on('user:left', handleUserLeft);
  socket.on('host:changed', handleHostChanged);
  socket.on('room:state', handleRoomState);

  return () => {
    socket.off('room:action', handleRoomAction);
    socket.off('webinar:ended', handleWebinarEnded);
    socket.off('user:joined', handleUserJoined);
    socket.off('user:left', handleUserLeft);
    socket.off('host:changed', handleHostChanged);
    socket.off('room:state', handleRoomState);
  };
}, [socket]);
```

---

## FILE 6: `apps/web/src/components/webinar/ChatPanel.tsx` (MODIFY)

**Fix the send message function:**

```typescript
// BEFORE (BROKEN):
const sendMessage = (text: string) => {
  setMessages([...messages, { text, sender: 'me', timestamp: Date.now() }]);
  // Missing socket.emit!
};

// AFTER (FIXED):
const { sendChatMessage } = useParticipantActions(roomId);

const sendMessage = (text: string) => {
  if (!text.trim()) return;
  sendChatMessage(text);
};
```

**Add listener for incoming messages:**

```typescript
useEffect(() => {
  // Messages are already handled by useWebinarSocket listener
  // which updates Zustand store. Just subscribe to store here.
  const unsubscribe = useChatStore.subscribe((state) => {
    setMessages(state.messages);
  });

  // Scroll to bottom on new message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return () => unsubscribe();
}, []);
```

**UI Requirements:**
- Show sender name + avatar for each message
- Differentiate host messages (blue background) vs participant messages (gray background)
- System messages (centered, italic, gray)
- Timestamps
- Auto-scroll to bottom
- Input with Enter to send, Shift+Enter for new line
- Character limit: 500

---

## FILE 7: `apps/web/src/components/webinar/ReactionBar.tsx` (MODIFY)

**Fix the reaction send:**

```typescript
const { sendReaction } = useParticipantActions(roomId);

const handleReaction = (emoji: string) => {
  sendReaction(emoji);
  // Local animation is handled by Zustand store update from useWebinarSocket
};
```

**Add listener for incoming reactions:**

```typescript
useEffect(() => {
  const unsubscribe = useReactionStore.subscribe((state) => {
    setActiveReactions(state.activeReactions);
  });
  return () => unsubscribe();
}, []);
```

**Show floating emoji overlay:**

```typescript
// When a reaction is received, show floating emoji on the sender's video tile
// Animation: float up from bottom, fade out after 2 seconds
// Use framer-motion or CSS animation
```

**Available emojis:** 👍 ❤️ 😂 😮 👏 🎉 🔥

---

## FILE 8: `apps/web/src/components/webinar/HostControls.tsx` (MODIFY)

**End Webinar button:**

```typescript
const handleEndWebinar = async () => {
  const confirmed = window.confirm(
    'Are you sure you want to end this webinar for ALL participants? This action cannot be undone.'
  );
  if (!confirmed) return;

  setIsEnding(true);

  try {
    // 1. API call to persist end state
    await fetch(`/api/webinars/${webinarId}/end`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    // 2. Socket event to trigger real-time broadcast
    socket.emit('host:endWebinar', { roomId: webinarId });

    // 3. Local cleanup
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
    }
    closePeerConnections();

    // 4. Redirect
    router.push(`/webinar/${webinarId}/ended?role=host`);
  } catch (err) {
    console.error('Failed to end webinar:', err);
    toast.error('Failed to end webinar. Please try again.');
    setIsEnding(false);
  }
};
```

**Other host controls:**

```typescript
// Mute all participants
const handleMuteAll = () => {
  socket.emit('host:action', {
    roomId: webinarId,
    actionType: 'host:muteAll',
    payload: { muted: true }
  });
};

// Spotlight video
const handleSpotlight = (participantId: string) => {
  socket.emit('host:action', {
    roomId: webinarId,
    actionType: 'host:spotlight',
    payload: { participantId }
  });
};

// Remove participant
const handleRemoveParticipant = (participantId: string) => {
  if (!window.confirm('Remove this participant?')) return;
  socket.emit('host:action', {
    roomId: webinarId,
    actionType: 'host:remove',
    payload: { participantId }
  });
};

// Start poll
const handleStartPoll = (pollData: PollData) => {
  socket.emit('host:action', {
    roomId: webinarId,
    actionType: 'poll:create',
    payload: pollData
  });
};

// Trigger CTA
const handleTriggerCTA = (ctaData: CTAData) => {
  socket.emit('host:action', {
    roomId: webinarId,
    actionType: 'cta:trigger',
    payload: ctaData
  });
};
```

---

## FILE 9: `apps/web/src/components/webinar/WebinarEndedScreen.tsx` (NEW)

```typescript
interface WebinarEndedScreenProps {
  webinarId: string;
  endedBy?: string;
  endedAt?: string;
  redirectUrl?: string;
  isHost?: boolean;
}

export default function WebinarEndedScreen({
  webinarId,
  endedBy,
  endedAt,
  redirectUrl = '/dashboard',
  isHost = false,
}: WebinarEndedScreenProps) {
  const [countdown, setCountdown] = useState(5);
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push(redirectUrl);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router, redirectUrl]);

  return (
    <div 
      className="fixed inset-0 z-50 bg-gray-900 flex items-center justify-center"
      role="alert"
      aria-live="polite"
    >
      <div className="text-center text-white max-w-md px-6">
        {/* Red ended indicator */}
        <div className="mb-6">
          <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-2">Webinar Ended</h1>
        <p className="text-gray-400 mb-2">
          This webinar has been ended{endedBy ? ` by the host` : ''}.
        </p>
        {endedAt && (
          <p className="text-gray-500 text-sm mb-6">
            Ended at {new Date(endedAt).toLocaleTimeString()}
          </p>
        )}

        {/* Countdown */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-300 mb-2">
            Redirecting to {isHost ? 'dashboard' : 'home'} in{' '}
            <span className="text-white font-bold text-lg">{countdown}</span> seconds...
          </p>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${(countdown / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            onClick={() => router.push(redirectUrl)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Go to {isHost ? 'Dashboard' : 'Home'} Now
          </button>

          {isHost && (
            <>
              <button
                onClick={() => router.push(`/webinars/${webinarId}/analytics`)}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                View Analytics
              </button>
              <button
                onClick={() => router.push(`/webinars/${webinarId}/recording`)}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                View Recording
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## FILE 10: `apps/web/src/app/webinar/[id]/ended/page.tsx` (NEW)

```typescript
import { Suspense } from 'react';
import WebinarEndedScreen from '@/components/webinar/WebinarEndedScreen';
import { getWebinar } from '@/lib/api';
import { Metadata } from 'next';

interface PageProps {
  params: { id: string };
  searchParams: { role?: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: 'Webinar Ended — Zonvo',
    robots: { index: false, follow: false },
  };
}

export default async function WebinarEndedPage({ params, searchParams }: PageProps) {
  const webinar = await getWebinar(params.id);
  const isHost = searchParams.role === 'host';

  // Edge case: if webinar is still active, redirect to live page
  if (webinar.status === 'live') {
    redirect(`/webinars/${params.id}/live`);
  }

  return (
    <Suspense fallback={<EndedPageSkeleton />}>
      <WebinarEndedScreen
        webinarId={params.id}
        endedBy={webinar.endedBy}
        endedAt={webinar.endedAt}
        isHost={isHost}
        redirectUrl={isHost ? '/dashboard' : '/'}
      />
    </Suspense>
  );
}

function EndedPageSkeleton() {
  return (
    <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
      <div className="animate-pulse text-center">
        <div className="w-20 h-20 bg-gray-700 rounded-full mx-auto mb-6" />
        <div className="h-8 bg-gray-700 rounded w-48 mx-auto mb-4" />
        <div className="h-4 bg-gray-700 rounded w-64 mx-auto" />
      </div>
    </div>
  );
}
```

---

## FILE 11: `apps/web/src/components/webinar/ParticipantView.tsx` (MODIFY)

Add the `webinar:ended` listener and integrate `WebinarEndedScreen`:

```typescript
export default function ParticipantView({ roomId, webinarId }: ParticipantViewProps) {
  const socket = useWebinarSocket();
  const localStream = useMediaStore((s) => s.localStream);
  const webinarStatus = useWebinarStore((s) => s.status);
  const endedData = useWebinarStore((s) => s.endedData);
  const [showEndedScreen, setShowEndedScreen] = useState(false);

  // Handle webinar ended event
  useEffect(() => {
    if (!socket) return;

    const handleWebinarEnded = (data: {
      webinarId: string;
      endedBy: string;
      endedAt: string;
      message: string;
      redirectUrl: string;
    }) => {
      console.log('Webinar ended received:', data);

      // 1. Stop all MediaStream tracks immediately
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          track.stop();
          console.log(`Stopped ${track.kind} track`);
        });
        useMediaStore.getState().setLocalStream(null);
      }

      // 2. Close all peer connections and transports
      const producers = useMediaStore.getState().producers;
      const consumers = useMediaStore.getState().consumers;
      const transports = useMediaStore.getState().transports;

      producers.forEach((p) => {
        try { p.close(); } catch (e) { /* ignore */ }
      });
      consumers.forEach((c) => {
        try { c.close(); } catch (e) { /* ignore */ }
      });
      transports.forEach((t) => {
        try { t.close(); } catch (e) { /* ignore */ }
      });

      useMediaStore.getState().setProducers(new Map());
      useMediaStore.getState().setConsumers(new Map());
      useMediaStore.getState().setTransports(new Map());

      // 3. Disconnect socket
      socket.disconnect();

      // 4. Show ended screen
      setShowEndedScreen(true);
      useWebinarStore.getState().setStatus('ended');
      useWebinarStore.getState().setEndedData(data);

      // 5. Auto redirect after 5 seconds
      setTimeout(() => {
        window.location.href = data.redirectUrl;
      }, 5000);
    };

    socket.on('webinar:ended', handleWebinarEnded);

    return () => {
      socket.off('webinar:ended', handleWebinarEnded);
    };
  }, [socket, localStream]);

  // If webinar ended, show ended screen overlay
  if (showEndedScreen || webinarStatus === 'ended') {
    return (
      <WebinarEndedScreen
        webinarId={webinarId}
        endedBy={endedData?.endedBy}
        endedAt={endedData?.endedAt}
        redirectUrl={endedData?.redirectUrl || `/webinar/${webinarId}/ended`}
      />
    );
  }

  // Normal participant view...
  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Video grid */}
      {/* Chat sidebar */}
      {/* Reaction bar */}
      {/* Raise hand button */}
    </div>
  );
}
```

---

## Redis Key Schema

```bash
# Room participants (SET)
SADD room:{webinarId}:participants {userId}
SREM room:{webinarId}:participants {userId}
SCARD room:{webinarId}:participants  # Count

# Room host (STRING)
SET room:{webinarId}:host {userId}
GET room:{webinarId}:host

# Room co-hosts (SET)
SADD room:{webinarId}:cohosts {userId}
SREM room:{webinarId}:cohosts {userId}
SISMEMBER room:{webinarId}:cohosts {userId}

# Room state (HASH)
HSET room:{webinarId}:status status "live"
HSET room:{webinarId}:status screenSharing "false"
HSET room:{webinarId}:status activePoll ""
HSET room:{webinarId}:status recording "false"
HGETALL room:{webinarId}:status

# Chat history (LIST, last 100 messages)
LPUSH room:{webinarId}:chat "{json}"
LTRIM room:{webinarId}:chat 0 99
LRANGE room:{webinarId}:chat 0 49

# Polls (HASH)
HSET room:{webinarId}:polls {pollId} "{json}"
HGET room:{webinarId}:polls {pollId}

# Poll votes (HASH per poll)
HINCRBY room:{webinarId}:poll:votes:{pollId} {optionIndex} 1
HGETALL room:{webinarId}:poll:votes:{pollId}

# Q&A (LIST)
LPUSH room:{webinarId}:qa "{json}"
LTRIM room:{webinarId}:qa 0 99

# User presence (STRING with TTL)
SET room:{webinarId}:presence:{userId} "online" EX 60

# Rate limiting (STRING with TTL)
SET rate_limit:{userId} 1 EX 60 NX
INCR rate_limit:{userId}
```

---

## Event Protocol

### Client → Server

| Event | Payload | Who Sends |
|-------|---------|-----------|
| `join:room` | `{ roomId, userId, role }` | All on join |
| `participant:action` | `{ roomId, actionType, payload, timestamp }` | Participant |
| `host:action` | `{ roomId, actionType, payload }` | Host/Co-host |
| `host:endWebinar` | `{ roomId }` | Host |
| `reconnect:room` | `{ roomId, userId, oldSocketId }` | Any reconnecting |

### Server → Client

| Event | Payload | Who Receives |
|-------|---------|--------------|
| `room:action` | `{ actionType, payload, senderRole, timestamp }` | All in room |
| `webinar:ended` | `{ webinarId, endedBy, endedAt, message, redirectUrl }` | All in room (FORCE) |
| `user:joined` | `{ userId, name, role }` | Others in room |
| `user:left` | `{ userId, role, reason }` | Others in room |
| `host:changed` | `{ newHostId, previousHostId }` | All in room |
| `room:state` | `{ participants, host, cohosts, activePoll, screenSharing, chatHistory, status }` | Joining socket |
| `error` | `{ message, code }` | Sender only |

---

## Action Type Reference

### Participant Actions

| actionType | Payload | Persisted |
|------------|---------|-----------|
| `chat:message` | `{ text, senderId, senderName, senderAvatar }` | Yes (Redis list) |
| `reaction:send` | `{ emoji, senderId, senderName }` | No |
| `hand:raise` | `{ userId, name }` | No |
| `hand:lower` | `{ userId }` | No |
| `poll:vote` | `{ pollId, optionIndex, userId }` | Yes (Redis hash) |
| `qa:submit` | `{ questionId, text, userId, userName }` | Yes (Redis list) |

### Host Actions

| actionType | Payload | Effect |
|------------|---------|--------|
| `poll:create` | `{ pollId, question, options, duration }` | Creates poll, shows to all |
| `poll:end` | `{ pollId }` | Ends poll, shows results |
| `screen:share:start` | `{ streamId, producerId }` | Switches layout to screen share |
| `screen:share:stop` | `{}` | Returns to video grid |
| `cta:trigger` | `{ ctaId, text, url, buttonText, duration }` | Shows CTA modal/banner |
| `host:muteAll` | `{ muted: true }` | Mutes all participant mics |
| `host:spotlight` | `{ participantId }` | Pins participant video for all |
| `host:remove` | `{ participantId }` | Removes participant from room |
| `host:allowChat` | `{ allowed: boolean }` | Enables/disables chat |

---

## Testing Checklist

Verify each item before marking complete:

- [ ] **Participant chat:** Participant sends message → Host sees it within 200ms
- [ ] **Participant reaction:** Participant clicks 👍 → All see floating emoji
- [ ] **Participant raise hand:** Participant raises hand → Host sees hand icon with name
- [ ] **Participant poll vote:** Participant votes → Results update for all in real-time
- [ ] **Host end webinar:** Host clicks "End" → All participants see "Webinar Ended" screen within 1 second
- [ ] **Camera LED off:** Participant camera LED turns OFF after webinar ends
- [ ] **Auto redirect:** Participant auto-redirects to `/webinar/{id}/ended` after 5 seconds
- [ ] **Late joiner state:** New participant joining mid-webinar receives current room state (active poll + chat history)
- [ ] **Host disconnect:** Host closes browser → Co-host promoted after 10s, or webinar auto-ends
- [ ] **No co-host fallback:** Host disconnects, no co-host → Webinar auto-ends after 10s
- [ ] **Empty room cleanup:** Last participant leaves → Room cleaned from Redis
- [ ] **1000 concurrent:** 1000 participants can all receive broadcasts without delay
- [ ] **Reconnection:** Participant refreshes → Rejoins, receives missed events from Redis queue
- [ ] **Rate limiting:** Participant sends 31 actions in 60 seconds → 31st rejected with error
- [ ] **Security:** Non-participant cannot send actions (server rejects)
- [ ] **Host validation:** Non-host cannot emit `host:endWebinar` (server rejects with 403)

---

## Constraints & Rules

1. **NO PLACEHOLDER CODE.** Every function must have complete implementation.
2. **NO `any` TYPES.** Use strict TypeScript interfaces for all payloads.
3. **ERROR HANDLING.** Every async operation must have try/catch. Every socket event must handle errors gracefully without crashing.
4. **MEMORY LEAKS.** All useEffect must have cleanup functions. All socket listeners must be removed on unmount.
5. **SECURITY.** Server must validate:
   - JWT token on every socket connection (middleware)
   - User is in the room before accepting actions (`SISMEMBER`)
   - Only host/cohost can emit `host:*` events
   - Rate limit: 30 actions/minute per participant (Redis)
6. **PERFORMANCE.** Use Zustand for global state. Batch rapid socket updates if needed (e.g., reactions).
7. **ACCESSIBILITY.** All buttons have `aria-label`. Screen reader announces new chat messages (`aria-live="polite"`).
8. **MOBILE.** Touch targets minimum 44px. Works in landscape and portrait. Bottom sheet for chat on mobile.
9. **WEBRTC CLEANUP.** On `webinar:ended`, ALL tracks must be stopped, ALL peer connections closed, ALL transports closed. Camera and mic LEDs must turn off.
10. **GRACEFUL DEGRADATION.** If socket disconnects, show reconnection UI. If reconnection fails after 3 attempts, show error and redirect.

---

## Output Order

Generate files in this exact order:

1. `apps/api/src/media/room-manager.service.ts` — Backend room state management
2. `apps/api/src/media/media.gateway.ts` — Main Socket.io gateway
3. `apps/api/src/webinar/webinar.controller.ts` — REST endpoints
4. `apps/web/src/hooks/useParticipantActions.ts` — Participant action hook
5. `apps/web/src/hooks/useWebinarSocket.ts` — Socket listeners
6. `apps/web/src/components/webinar/WebinarEndedScreen.tsx` — Ended screen UI
7. `apps/web/src/app/webinar/[id]/ended/page.tsx` — Ended page route
8. `apps/web/src/components/webinar/ChatPanel.tsx` — Fixed chat panel
9. `apps/web/src/components/webinar/ReactionBar.tsx` — Fixed reaction bar
10. `apps/web/src/components/webinar/HostControls.tsx` — Fixed host controls
11. `apps/web/src/components/webinar/ParticipantView.tsx` — Fixed participant view

For each file, provide:
- Complete file content (no omissions, no "...")
- TypeScript interfaces/types used in that file
- Brief explanation of key changes

Start now with file 1.
