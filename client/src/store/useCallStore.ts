import { create } from 'zustand';
import { apiRequest } from '../lib/api';
import { getSocket } from '../lib/socket';
import {
  CallSession,
  CallType,
  CallHistoryItem,
  IncomingCallPayload,
} from '../types/call';
import {
  getUserMedia,
  getDisplayMedia,
  stopMediaStream,
  createPeerConnection,
  DEFAULT_ICE_SERVERS,
} from '../lib/webrtc';
import { useAuthStore } from './useAuthStore';

interface StartCallParams {
  recipientId: string;
  recipientName: string;
  recipientAvatar: string | null;
  chatId?: string | null;
  callType: CallType;
}

interface CallStoreState {
  session: CallSession | null;
  incomingOffer: RTCSessionDescriptionInit | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peerConnection: RTCPeerConnection | null;
  pendingCandidates: RTCIceCandidateInit[];
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  iceServers: RTCIceServer[];
  callHistory: CallHistoryItem[];
  isLoadingHistory: boolean;

  fetchIceServers: () => Promise<void>;
  startCall: (params: StartCallParams) => Promise<void>;
  handleIncomingCall: (payload: IncomingCallPayload) => void;
  acceptCall: (callTypeOverride?: CallType) => Promise<void>;
  rejectCall: (reason?: string) => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => Promise<void>;
  handleRemoteAnswer: (answer: RTCSessionDescriptionInit) => Promise<void>;
  handleRemoteCandidate: (candidate: RTCIceCandidateInit) => Promise<void>;
  handleRemoteReject: (reason?: string) => void;
  handleRemoteEnd: (duration?: number) => void;
  fetchCallHistory: () => Promise<void>;
  cleanup: () => void;
}

export const useCallStore = create<CallStoreState>((set, get) => ({
  session: null,
  incomingOffer: null,
  localStream: null,
  remoteStream: null,
  peerConnection: null,
  pendingCandidates: [],
  isMuted: false,
  isVideoOff: false,
  isScreenSharing: false,
  iceServers: DEFAULT_ICE_SERVERS,
  callHistory: [],
  isLoadingHistory: false,

  fetchIceServers: async () => {
    try {
      const res = await apiRequest<{ success: boolean; data: { iceServers: RTCIceServer[] } }>(
        '/api/v1/calls/ice-servers',
      );
      if (res.data?.iceServers?.length) {
        set({ iceServers: res.data.iceServers });
      }
    } catch {
      // Fallback to default STUN servers
      set({ iceServers: DEFAULT_ICE_SERVERS });
    }
  },

  startCall: async ({ recipientId, recipientName, recipientAvatar, chatId, callType }) => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return;

    try {
      const localStream = await getUserMedia(callType);
      const socket = getSocket();

      const pc = createPeerConnection(
        get().iceServers,
        (remoteStream) => {
          set({ remoteStream });
        },
        (candidate) => {
          socket.emit('call:ice_candidate', {
            targetUserId: recipientId,
            candidate,
          });
        },
      );

      // Add tracks to PeerConnection
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const session: CallSession = {
        callerId: currentUser.id,
        callerName: currentUser.displayName || currentUser.username,
        callerAvatar: currentUser.avatarUrl || null,
        recipientId,
        recipientName,
        recipientAvatar,
        chatId: chatId || null,
        callType,
        status: 'outgoing',
        isInitiator: true,
        duration: 0,
      };

      set({
        session,
        localStream,
        peerConnection: pc,
        isMuted: false,
        isVideoOff: false,
        isScreenSharing: false,
      });

      socket.emit('call:initiate', {
        recipientId,
        chatId,
        callType,
        offer,
        callerDisplayName: currentUser.displayName || currentUser.username,
        callerAvatar: currentUser.avatarUrl || null,
      });
    } catch (err) {
      console.error('Failed to initiate call:', err);
      get().cleanup();
    }
  },

  handleIncomingCall: (payload: IncomingCallPayload) => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return;

    // If already in a call, notify caller busy
    if (get().session && get().session?.status !== 'idle') {
      const socket = getSocket();
      socket.emit('call:reject', {
        callerId: payload.callerId,
        chatId: payload.chatId,
        callType: payload.callType,
        reason: 'busy',
      });
      return;
    }

    const session: CallSession = {
      callerId: payload.callerId,
      callerName: payload.callerDisplayName || payload.callerUsername,
      callerAvatar: payload.callerAvatar,
      recipientId: currentUser.id,
      recipientName: currentUser.displayName || currentUser.username,
      recipientAvatar: currentUser.avatarUrl || null,
      chatId: payload.chatId || null,
      callType: payload.callType,
      status: 'incoming',
      isInitiator: false,
      duration: 0,
    };

    set({
      session,
      incomingOffer: payload.offer,
      pendingCandidates: [],
    });
  },

  acceptCall: async (callTypeOverride?: CallType) => {
    const { session, incomingOffer, iceServers } = get();
    if (!session || !incomingOffer) return;

    const actualType = callTypeOverride || session.callType;

    try {
      const localStream = await getUserMedia(actualType);
      const socket = getSocket();

      const pc = createPeerConnection(
        iceServers,
        (remoteStream) => {
          set({ remoteStream });
        },
        (candidate) => {
          socket.emit('call:ice_candidate', {
            targetUserId: session.callerId,
            candidate,
          });
        },
      );

      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));

      // Flush queued candidates
      for (const candidate of get().pendingCandidates) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('call:answer', {
        callerId: session.callerId,
        answer,
      });

      set({
        session: {
          ...session,
          callType: actualType,
          status: 'connected',
          startedAt: Date.now(),
        },
        localStream,
        peerConnection: pc,
        incomingOffer: null,
        pendingCandidates: [],
      });
    } catch (err) {
      console.error('Failed to accept call:', err);
      get().rejectCall('error');
    }
  },

  rejectCall: (reason = 'declined') => {
    const { session } = get();
    if (!session) return;

    const socket = getSocket();
    const otherUserId = session.isInitiator ? session.recipientId : session.callerId;

    socket.emit('call:reject', {
      callerId: otherUserId,
      chatId: session.chatId,
      callType: session.callType,
      reason,
    });

    get().cleanup();
  },

  endCall: () => {
    const { session } = get();
    if (!session) return;

    const socket = getSocket();
    const otherUserId = session.isInitiator ? session.recipientId : session.callerId;

    let duration = 0;
    if (session.startedAt) {
      duration = Math.round((Date.now() - session.startedAt) / 1000);
    }

    socket.emit('call:end', {
      targetUserId: otherUserId,
      chatId: session.chatId,
      callType: session.callType,
      duration,
    });

    set({
      session: {
        ...session,
        status: 'ended',
        duration,
      },
    });

    setTimeout(() => {
      get().cleanup();
    }, 1500);
  },

  handleRemoteAnswer: async (answer: RTCSessionDescriptionInit) => {
    const { peerConnection, session, pendingCandidates } = get();
    if (!peerConnection || !session) return;

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));

      // Process any queued candidates
      for (const candidate of pendingCandidates) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }

      set({
        session: {
          ...session,
          status: 'connected',
          startedAt: Date.now(),
        },
        pendingCandidates: [],
      });
    } catch (err) {
      console.error('Failed to handle remote answer:', err);
    }
  },

  handleRemoteCandidate: async (candidate: RTCIceCandidateInit) => {
    const { peerConnection } = get();
    if (peerConnection && peerConnection.remoteDescription) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Error adding remote candidate:', err);
      }
    } else {
      set((state) => ({
        pendingCandidates: [...state.pendingCandidates, candidate],
      }));
    }
  },

  handleRemoteReject: () => {
    const { session } = get();
    if (!session) return;

    set({
      session: {
        ...session,
        status: 'ended',
      },
    });

    setTimeout(() => {
      get().cleanup();
    }, 1500);
  },

  handleRemoteEnd: (duration = 0) => {
    const { session } = get();
    if (!session) return;

    set({
      session: {
        ...session,
        status: 'ended',
        duration: duration || (session.startedAt ? Math.round((Date.now() - session.startedAt) / 1000) : 0),
      },
    });

    setTimeout(() => {
      get().cleanup();
    }, 1500);
  },

  toggleMute: () => {
    const { localStream, isMuted } = get();
    if (!localStream) return;

    const audioTracks = localStream.getAudioTracks();
    audioTracks.forEach((track) => {
      track.enabled = isMuted; // toggle
    });

    set({ isMuted: !isMuted });
  },

  toggleVideo: () => {
    const { localStream, isVideoOff } = get();
    if (!localStream) return;

    const videoTracks = localStream.getVideoTracks();
    videoTracks.forEach((track) => {
      track.enabled = isVideoOff; // toggle
    });

    set({ isVideoOff: !isVideoOff });
  },

  toggleScreenShare: async () => {
    const { peerConnection, isScreenSharing, session } = get();
    if (!peerConnection || !session) return;

    if (isScreenSharing) {
      // Revert to camera
      try {
        const camStream = await getUserMedia(session.callType);
        const camVideoTrack = camStream.getVideoTracks()[0];
        const senders = peerConnection.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === 'video');

        if (videoSender && camVideoTrack) {
          await videoSender.replaceTrack(camVideoTrack);
        }

        set({ localStream: camStream, isScreenSharing: false });
      } catch (err) {
        console.error('Failed to revert to camera:', err);
      }
    } else {
      // Start screen share
      try {
        const screenStream = await getDisplayMedia();
        const screenTrack = screenStream.getVideoTracks()[0];
        const senders = peerConnection.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === 'video');

        if (videoSender && screenTrack) {
          await videoSender.replaceTrack(screenTrack);
        }

        screenTrack.onended = () => {
          void get().toggleScreenShare();
        };

        set({ localStream: screenStream, isScreenSharing: true });
      } catch (err) {
        console.error('Failed to start screen share:', err);
      }
    }
  },

  fetchCallHistory: async () => {
    set({ isLoadingHistory: true });
    try {
      const res = await apiRequest<{
        success: boolean;
        data: { calls: CallHistoryItem[]; total: number };
      }>('/api/v1/calls/history?limit=50');
      set({ callHistory: res.data.calls, isLoadingHistory: false });
    } catch {
      set({ isLoadingHistory: false });
    }
  },

  cleanup: () => {
    const { localStream, peerConnection } = get();
    stopMediaStream(localStream);

    if (peerConnection) {
      peerConnection.close();
    }

    set({
      session: null,
      incomingOffer: null,
      localStream: null,
      remoteStream: null,
      peerConnection: null,
      pendingCandidates: [],
      isMuted: false,
      isVideoOff: false,
      isScreenSharing: false,
    });
  },
}));
