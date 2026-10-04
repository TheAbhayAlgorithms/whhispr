export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  {
    urls: [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
      'stun:stun2.l.google.com:19302',
    ],
  },
];

export async function getUserMedia(callType: 'audio' | 'video'): Promise<MediaStream> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('WebRTC getUserMedia is not supported in this environment');
  }

  const constraints: MediaStreamConstraints = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: callType === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
  };

  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    // If video fails (e.g. no camera attached), fallback to audio only
    if (callType === 'video') {
      return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    }
    throw err;
  }
}

export async function getDisplayMedia(): Promise<MediaStream> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
    throw new Error('Screen sharing is not supported in this environment');
  }

  return await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: false,
  });
}

export function stopMediaStream(stream: MediaStream | null): void {
  if (!stream) return;
  stream.getTracks().forEach((track) => {
    track.stop();
  });
}

export function createPeerConnection(
  iceServers: RTCIceServer[],
  onTrack: (stream: MediaStream) => void,
  onIceCandidate: (candidate: RTCIceCandidate) => void,
): RTCPeerConnection {
  const config: RTCConfiguration = {
    iceServers: iceServers.length > 0 ? iceServers : DEFAULT_ICE_SERVERS,
    iceCandidatePoolSize: 10,
  };

  const pc = new RTCPeerConnection(config);

  pc.ontrack = (event) => {
    if (event.streams && event.streams[0]) {
      onTrack(event.streams[0]);
    } else {
      const inboundStream = new MediaStream([event.track]);
      onTrack(inboundStream);
    }
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      onIceCandidate(event.candidate);
    }
  };

  return pc;
}
