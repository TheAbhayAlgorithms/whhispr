import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCallStore } from '../store/useCallStore';
import * as apiModule from '../lib/api';

const mockSocket = {
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  connected: true,
};

vi.mock('../lib/api', () => ({
  apiRequest: vi.fn(),
}));

vi.mock('../lib/socket', () => ({
  getSocket: vi.fn(() => mockSocket),
  disconnectSocket: vi.fn(),
}));

vi.mock('../store/useAuthStore', () => ({
  useAuthStore: {
    getState: () => ({
      user: {
        id: 'u-caller-1',
        username: 'alice',
        displayName: 'Alice Cooper',
        avatarUrl: 'https://example.com/alice.png',
      },
    }),
  },
}));

describe('useCallStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCallStore.getState().cleanup();
  });

  it('initializes with default call state', () => {
    const state = useCallStore.getState();
    expect(state.session).toBeNull();
    expect(state.incomingOffer).toBeNull();
    expect(state.isMuted).toBe(false);
    expect(state.isVideoOff).toBe(false);
    expect(state.isScreenSharing).toBe(false);
    expect(state.callHistory).toHaveLength(0);
  });

  it('fetches ICE servers from backend API', async () => {
    const mockIceServers = [{ urls: 'stun:stun.custom.com:3478' }];
    vi.mocked(apiModule.apiRequest).mockResolvedValueOnce({
      success: true,
      data: { iceServers: mockIceServers },
    });

    await useCallStore.getState().fetchIceServers();

    expect(apiModule.apiRequest).toHaveBeenCalledWith('/api/v1/calls/ice-servers');
    expect(useCallStore.getState().iceServers).toEqual(mockIceServers);
  });

  it('handles incoming call payload and sets incoming session', () => {
    const payload = {
      callerId: 'u-bob-2',
      callerUsername: 'bob',
      callerDisplayName: 'Bob Marley',
      callerAvatar: 'https://example.com/bob.png',
      chatId: 'c-direct-1',
      callType: 'video' as const,
      offer: { type: 'offer' as const, sdp: 'dummy-sdp' },
    };

    useCallStore.getState().handleIncomingCall(payload);

    const session = useCallStore.getState().session;
    expect(session).not.toBeNull();
    expect(session?.callerId).toBe('u-bob-2');
    expect(session?.callerName).toBe('Bob Marley');
    expect(session?.callType).toBe('video');
    expect(session?.status).toBe('incoming');
    expect(session?.isInitiator).toBe(false);
    expect(useCallStore.getState().incomingOffer).toEqual(payload.offer);
  });

  it('rejects an incoming call and emits call:reject', () => {
    useCallStore.setState({
      session: {
        callerId: 'u-bob-2',
        callerName: 'Bob Marley',
        callerAvatar: null,
        recipientId: 'u-caller-1',
        recipientName: 'Alice',
        recipientAvatar: null,
        chatId: 'c-1',
        callType: 'audio',
        status: 'incoming',
        isInitiator: false,
        duration: 0,
      },
    });

    useCallStore.getState().rejectCall('declined');

    expect(mockSocket.emit).toHaveBeenCalledWith('call:reject', {
      callerId: 'u-bob-2',
      chatId: 'c-1',
      callType: 'audio',
      reason: 'declined',
    });
    expect(useCallStore.getState().session).toBeNull();
  });

  it('terminates an active call and emits call:end with duration', () => {
    const startedAt = Date.now() - 30000; // 30s ago
    useCallStore.setState({
      session: {
        callerId: 'u-caller-1',
        callerName: 'Alice',
        callerAvatar: null,
        recipientId: 'u-bob-2',
        recipientName: 'Bob',
        recipientAvatar: null,
        chatId: 'c-1',
        callType: 'video',
        status: 'connected',
        isInitiator: true,
        startedAt,
        duration: 0,
      },
    });

    useCallStore.getState().endCall();

    expect(mockSocket.emit).toHaveBeenCalledWith(
      'call:end',
      expect.objectContaining({
        targetUserId: 'u-bob-2',
        callType: 'video',
      }),
    );
    expect(useCallStore.getState().session?.status).toBe('ended');
  });

  it('handles remote end event and transitions session to ended', () => {
    useCallStore.setState({
      session: {
        callerId: 'u-caller-1',
        callerName: 'Alice',
        callerAvatar: null,
        recipientId: 'u-bob-2',
        recipientName: 'Bob',
        recipientAvatar: null,
        callType: 'audio',
        status: 'connected',
        isInitiator: true,
        duration: 0,
      },
    });

    useCallStore.getState().handleRemoteEnd(45);

    expect(useCallStore.getState().session?.status).toBe('ended');
    expect(useCallStore.getState().session?.duration).toBe(45);
  });

  it('fetches call history from REST endpoint', async () => {
    const mockCalls = [
      {
        id: 'call-1',
        chat_id: 'c-1',
        caller_id: 'u-caller-1',
        recipient_id: 'u-bob-2',
        type: 'audio' as const,
        status: 'completed' as const,
        duration: 120,
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    ];

    vi.mocked(apiModule.apiRequest).mockResolvedValueOnce({
      success: true,
      data: { calls: mockCalls, total: 1 },
    });

    await useCallStore.getState().fetchCallHistory();

    expect(apiModule.apiRequest).toHaveBeenCalledWith('/api/v1/calls/history?limit=50');
    expect(useCallStore.getState().callHistory).toHaveLength(1);
    expect(useCallStore.getState().callHistory[0].duration).toBe(120);
    expect(useCallStore.getState().isLoadingHistory).toBe(false);
  });
});
