import { useEffect, useRef, useState } from 'react';
import { useCallStore } from '../store/useCallStore';
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  MonitorUp,
  User,
  Sparkles,
} from 'lucide-react';

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs.toString().padStart(2, '0')}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function CallModal() {
  const {
    session,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    isScreenSharing,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
  } = useCallStore();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const [elapsed, setElapsed] = useState(0);

  // Timer effect for connected call
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (session?.status === 'connected' && session.startedAt) {
      interval = setInterval(() => {
        setElapsed(Math.round((Date.now() - session.startedAt!) / 1000));
      }, 1000);
    } else {
      setElapsed(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [session?.status, session?.startedAt]);

  // Bind local stream to local video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, session?.status]);

  // Bind remote stream to remote video or audio element
  useEffect(() => {
    if (remoteStream) {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
    }
  }, [remoteStream, session?.status]);

  if (!session) return null;

  const isVideo = session.callType === 'video';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      {/* Hidden audio element for pure voice calls */}
      <audio ref={remoteAudioRef} autoPlay />

      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col min-h-[540px] max-h-[90vh]">
        {/* Top Status Header */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center space-x-3">
            <span className="flex h-3 w-3 relative">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  session.status === 'connected'
                    ? 'bg-emerald-400'
                    : session.status === 'ended'
                      ? 'bg-rose-400'
                      : 'bg-amber-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${
                  session.status === 'connected'
                    ? 'bg-emerald-500'
                    : session.status === 'ended'
                      ? 'bg-rose-500'
                      : 'bg-amber-500'
                }`}
              />
            </span>
            <div className="text-left">
              <h4 className="text-sm font-semibold text-white drop-shadow-sm">
                {session.isInitiator ? session.recipientName : session.callerName}
              </h4>
              <p className="text-xs text-slate-300 drop-shadow-sm">
                {session.status === 'connected'
                  ? `In Call • ${formatDuration(elapsed)}`
                  : session.status === 'outgoing'
                    ? 'Calling...'
                    : session.status === 'incoming'
                      ? `Incoming ${session.callType} call`
                      : `Call ended • ${formatDuration(session.duration)}`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-medium tracking-wide uppercase bg-slate-800/80 border border-slate-700/80 text-indigo-300">
              {session.callType} Call
            </span>
          </div>
        </div>

        {/* Central Content Canvas */}
        <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-slate-950">
          {/* STATE 1: Connected Video Call */}
          {session.status === 'connected' && isVideo ? (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              {/* Remote Video (Full Canvas) */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />

              {/* Local Video PiP (Floating Top Right) */}
              <div className="absolute top-20 right-6 w-48 h-32 md:w-56 md:h-36 rounded-2xl overflow-hidden shadow-2xl border-2 border-indigo-500/60 bg-slate-900 z-10 transition-all duration-300">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] text-white font-medium">
                  You {isMuted ? '• Muted' : ''}
                </div>
              </div>
            </div>
          ) : null}

          {/* STATE 2: Connected Audio Call OR Video without active remote */}
          {session.status === 'connected' && !isVideo ? (
            <div className="flex flex-col items-center justify-center p-8 space-y-6">
              <div className="relative">
                <div className="absolute -inset-4 rounded-full bg-indigo-500/20 animate-pulse blur-xl" />
                <div className="relative w-28 h-28 rounded-full border-4 border-indigo-500/50 overflow-hidden shadow-2xl flex items-center justify-center bg-indigo-600">
                  {(session.isInitiator ? session.recipientAvatar : session.callerAvatar) ? (
                    <img
                      src={(session.isInitiator ? session.recipientAvatar : session.callerAvatar)!}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-white" />
                  )}
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-1">
                  {session.isInitiator ? session.recipientName : session.callerName}
                </h3>
                <p className="text-sm font-mono text-emerald-400 font-semibold tracking-wider">
                  {formatDuration(elapsed)}
                </p>
              </div>
            </div>
          ) : null}

          {/* STATE 3: Outgoing Ringing */}
          {session.status === 'outgoing' ? (
            <div className="flex flex-col items-center justify-center p-8 space-y-6">
              <div className="relative">
                <div className="absolute -inset-6 rounded-full bg-indigo-500/20 animate-ping duration-1000" />
                <div className="relative w-28 h-28 rounded-full border-4 border-indigo-500/40 overflow-hidden shadow-2xl flex items-center justify-center bg-indigo-600">
                  {session.recipientAvatar ? (
                    <img
                      src={session.recipientAvatar}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-white" />
                  )}
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-1">{session.recipientName}</h3>
                <p className="text-sm text-slate-400">Ringing...</p>
              </div>
            </div>
          ) : null}

          {/* STATE 4: Incoming Call */}
          {session.status === 'incoming' ? (
            <div className="flex flex-col items-center justify-center p-8 space-y-6">
              <div className="relative">
                <div className="absolute -inset-6 rounded-full bg-emerald-500/25 animate-ping duration-1000" />
                <div className="relative w-28 h-28 rounded-full border-4 border-emerald-500/50 overflow-hidden shadow-2xl flex items-center justify-center bg-indigo-600">
                  {session.callerAvatar ? (
                    <img
                      src={session.callerAvatar}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-white" />
                  )}
                </div>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-700/60 text-indigo-300 text-xs font-semibold mb-3">
                  <Sparkles className="w-3 h-3" />
                  <span>Incoming {session.callType} Call</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">{session.callerName}</h3>
                <p className="text-xs text-slate-400">wants to connect with you</p>
              </div>
            </div>
          ) : null}

          {/* STATE 5: Call Ended */}
          {session.status === 'ended' ? (
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <PhoneOff className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">Call Ended</h3>
              <p className="text-xs text-slate-400">
                Duration: {formatDuration(session.duration)}
              </p>
            </div>
          ) : null}
        </div>

        {/* Bottom Floating Control Dock */}
        <div className="px-6 py-5 bg-slate-900/90 border-t border-slate-800/80 flex items-center justify-center space-x-4">
          {session.status === 'incoming' ? (
            <div className="flex items-center space-x-6">
              <button
                onClick={() => rejectCall('declined')}
                className="flex items-center justify-center w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30 transition transform hover:scale-105 active:scale-95"
                title="Decline Call"
              >
                <PhoneOff className="w-6 h-6" />
              </button>

              <button
                onClick={() => acceptCall('audio')}
                className="flex items-center justify-center w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 transition transform hover:scale-105 active:scale-95"
                title="Accept with Audio"
              >
                <Phone className="w-6 h-6" />
              </button>

              {session.callType === 'video' && (
                <button
                  onClick={() => acceptCall('video')}
                  className="flex items-center justify-center w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/30 transition transform hover:scale-105 active:scale-95"
                  title="Accept with Video"
                >
                  <Video className="w-6 h-6" />
                </button>
              )}
            </div>
          ) : session.status === 'connected' ? (
            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* Mic Mute/Unmute */}
              <button
                onClick={toggleMute}
                className={`flex items-center justify-center w-12 h-12 rounded-full border transition ${
                  isMuted
                    ? 'bg-rose-500/20 border-rose-500 text-rose-400 hover:bg-rose-500/30'
                    : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
                }`}
                title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Video Toggle */}
              {isVideo && (
                <button
                  onClick={toggleVideo}
                  className={`flex items-center justify-center w-12 h-12 rounded-full border transition ${
                    isVideoOff
                      ? 'bg-rose-500/20 border-rose-500 text-rose-400 hover:bg-rose-500/30'
                      : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
                  }`}
                  title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
                >
                  {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>
              )}

              {/* Screen Sharing Toggle */}
              {isVideo && (
                <button
                  onClick={() => void toggleScreenShare()}
                  className={`flex items-center justify-center w-12 h-12 rounded-full border transition ${
                    isScreenSharing
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
                  }`}
                  title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
                >
                  <MonitorUp className="w-5 h-5" />
                </button>
              )}

              {/* End Call Button */}
              <button
                onClick={endCall}
                className="flex items-center justify-center w-12 h-12 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30 transition transform hover:scale-105 active:scale-95 ml-2"
                title="End Call"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          ) : session.status === 'outgoing' ? (
            <div className="flex items-center justify-center">
              <button
                onClick={endCall}
                className="flex items-center justify-center w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30 transition transform hover:scale-105 active:scale-95"
                title="Cancel Call"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
