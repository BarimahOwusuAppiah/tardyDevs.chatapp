import React, { useEffect, useRef, useState, useCallback } from 'react'
import AgoraRTC, {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IRemoteVideoTrack,
  IRemoteAudioTrack,
} from 'agora-rtc-sdk-ng'
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react'
import { buildAgoraToken } from '../lib/agoraToken'

const APP_ID   = import.meta.env.VITE_AGORA_APP_ID as string
const APP_CERT = import.meta.env.VITE_AGORA_APP_CERTIFICATE as string

const CSS = `
  @keyframes coFadeIn { from{opacity:0;}to{opacity:1;} }
  @keyframes coSlideUp { from{opacity:0;transform:translateY(32px);}to{opacity:1;transform:translateY(0);} }
  @keyframes coPulse { 0%,100%{transform:scale(1);opacity:0.7;}50%{transform:scale(1.12);opacity:1;} }

  .co-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(10,10,10,0.96);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    animation: coFadeIn 0.25s ease;
    font-family: 'Inter', system-ui, sans-serif;
  }

  /* ── Video grid ── */
  .co-video-grid {
    position: absolute;
    inset: 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    padding: 4px;
  }
  .co-video-grid.solo {
    grid-template-columns: 1fr;
  }
  .co-video-slot {
    background: #141414;
    border-radius: 12px;
    overflow: hidden;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .co-video-slot video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .co-video-label {
    position: absolute;
    bottom: 10px;
    left: 12px;
    font-size: 12px;
    font-weight: 600;
    color: #F8F8F8;
    background: rgba(0,0,0,0.55);
    padding: 3px 8px;
    border-radius: 6px;
  }
  .co-video-off-avatar {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: #202020;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    font-weight: 800;
    color: #5DD62C;
    flex-shrink: 0;
  }

  /* ── Voice call UI (no video) ── */
  .co-voice-card {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    animation: coSlideUp 0.3s ease;
  }
  .co-voice-avatar {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: #202020;
    border: 3px solid #5DD62C;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 36px;
    font-weight: 800;
    color: #5DD62C;
    overflow: hidden;
    animation: coPulse 2s ease-in-out infinite;
  }
  .co-voice-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .co-voice-name {
    font-size: 22px;
    font-weight: 800;
    color: #F8F8F8;
  }
  .co-voice-status {
    font-size: 14px;
    color: rgba(248,248,248,0.45);
    margin-top: -10px;
  }

  /* ── Controls ── */
  .co-controls {
    position: absolute;
    bottom: 32px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 14px;
    background: rgba(20,20,20,0.85);
    border: 1px solid rgba(248,248,248,0.1);
    border-radius: 99px;
    padding: 10px 20px;
    backdrop-filter: blur(10px);
  }
  .co-ctrl-btn {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s, opacity 0.15s;
    flex-shrink: 0;
  }
  .co-ctrl-btn:hover { transform: scale(1.1); }
  .co-ctrl-btn:active { transform: scale(0.95); }
  .co-ctrl-btn.mute-off { background: rgba(248,248,248,0.1); color: #F8F8F8; }
  .co-ctrl-btn.mute-on  { background: rgba(239,68,68,0.25); color: #f87171; }
  .co-ctrl-btn.cam-off  { background: rgba(248,248,248,0.1); color: #F8F8F8; }
  .co-ctrl-btn.cam-on   { background: rgba(239,68,68,0.25); color: #f87171; }
  .co-ctrl-btn.hangup   { background: #ef4444; color: #fff; width: 56px; height: 56px; }
  .co-ctrl-btn.hangup:hover { background: #dc2626; }

  /* ── Status / error banner ── */
  .co-status {
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    font-size: 13px;
    font-weight: 600;
    color: rgba(248,248,248,0.7);
    background: rgba(20,20,20,0.8);
    padding: 6px 16px;
    border-radius: 99px;
    border: 1px solid rgba(248,248,248,0.1);
    white-space: nowrap;
    backdrop-filter: blur(8px);
  }
  .co-status.error { color: #f87171; border-color: rgba(239,68,68,0.3); }

  @media(max-width:600px) {
    .co-video-grid { grid-template-columns: 1fr; }
    .co-controls { padding: 8px 14px; gap: 10px; bottom: 24px; }
    .co-ctrl-btn { width: 42px; height: 42px; }
    .co-ctrl-btn.hangup { width: 50px; height: 50px; }
  }
`

function initials(name?: string) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

type CallStatus = 'connecting' | 'connected' | 'reconnecting' | 'error'

interface CallOverlayProps {
  /** 'voice' = audio only, 'video' = audio + video */
  mode: 'voice' | 'video'
  /** Unique channel name — use the DM conversation ID */
  channelName: string
  /** Agora UID for current user (any unique number) */
  uid: number
  /** Display name of the current user */
  myName: string
  /** Display name of the remote peer */
  peerName: string
  /** Optional avatar of the remote peer */
  peerAvatar?: string
  /** Called when the user hangs up */
  onEnd: () => void
}

export const CallOverlay: React.FC<CallOverlayProps> = ({
  mode,
  channelName,
  uid,
  myName,
  peerName,
  peerAvatar,
  onEnd,
}) => {
  const clientRef    = useRef<IAgoraRTCClient | null>(null)
  const localVideoEl = useRef<HTMLDivElement>(null)
  const remoteVideoEl= useRef<HTMLDivElement>(null)

  const [status, setStatus]           = useState<CallStatus>('connecting')
  const [errorMsg, setErrorMsg]       = useState('')
  const [muted, setMuted]             = useState(false)
  const [camOff, setCamOff]           = useState(false)
  const [remoteHasVideo, setRemoteHasVideo] = useState(false)
  const [elapsed, setElapsed]         = useState(0)

  const localAudioRef = useRef<IMicrophoneAudioTrack | null>(null)
  const localVideoRef = useRef<ICameraVideoTrack | null>(null)
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null)

  // Format elapsed seconds → "0:00"
  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = String(s % 60).padStart(2, '0')
    return `${m}:${sec}`
  }

  const cleanup = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current)
    localAudioRef.current?.close()
    localVideoRef.current?.close()
    localAudioRef.current = null
    localVideoRef.current = null
    if (clientRef.current) {
      await clientRef.current.leave().catch(() => {})
      clientRef.current = null
    }
  }, [])

  useEffect(() => {
    const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
    clientRef.current = client

    // ── Remote user events ──
    client.on('user-published', async (remoteUser, mediaType) => {
      await client.subscribe(remoteUser, mediaType)
      if (mediaType === 'video') {
        setRemoteHasVideo(true)
        const track = remoteUser.videoTrack as IRemoteVideoTrack
        if (remoteVideoEl.current) track.play(remoteVideoEl.current)
      }
      if (mediaType === 'audio') {
        const track = remoteUser.audioTrack as IRemoteAudioTrack
        track.play()
      }
    })

    client.on('user-unpublished', (_remoteUser, mediaType) => {
      if (mediaType === 'video') setRemoteHasVideo(false)
    })

    client.on('connection-state-change', (cur) => {
      if (cur === 'RECONNECTING') setStatus('reconnecting')
      if (cur === 'CONNECTED')    setStatus('connected')
      if (cur === 'DISCONNECTED') setStatus('error')
    })

    const join = async () => {
      try {
        if (!APP_ID || !APP_CERT) {
          throw new Error(
            !APP_ID
              ? 'VITE_AGORA_APP_ID is missing in .env'
              : 'VITE_AGORA_APP_CERTIFICATE is missing in .env'
          )
        }

        // Generate token locally using App ID + Certificate from .env
        const token = await buildAgoraToken(APP_ID, APP_CERT, channelName, uid)

        // Join the Agora channel
        await client.join(APP_ID, channelName, token, uid)

        // Create local tracks
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack()
        localAudioRef.current = audioTrack

        if (mode === 'video') {
          const videoTrack = await AgoraRTC.createCameraVideoTrack()
          localVideoRef.current = videoTrack
          if (localVideoEl.current) videoTrack.play(localVideoEl.current)
          await client.publish([audioTrack, videoTrack])
        } else {
          await client.publish([audioTrack])
        }

        setStatus('connected')

        // Start timer
        timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
      } catch (err: any) {
        console.error('Agora join error:', err)
        setStatus('error')
        setErrorMsg(err.message || 'Failed to join call')
      }
    }

    join()
    return () => { cleanup() }
  }, [channelName, uid, mode, cleanup])

  const toggleMute = () => {
    const track = localAudioRef.current
    if (!track) return
    if (muted) { track.setEnabled(true);  setMuted(false) }
    else        { track.setEnabled(false); setMuted(true)  }
  }

  const toggleCam = () => {
    const track = localVideoRef.current
    if (!track) return
    if (camOff) { track.setEnabled(true);  setCamOff(false) }
    else         { track.setEnabled(false); setCamOff(true)  }
  }

  const hangUp = async () => {
    await cleanup()
    onEnd()
  }

  const statusLabel =
    status === 'connecting'   ? 'Connecting…' :
    status === 'reconnecting' ? 'Reconnecting…' :
    status === 'error'        ? (errorMsg || 'Connection error') :
    formatElapsed(elapsed)

  return (
    <>
      <style>{CSS}</style>
      <div className="co-overlay" role="dialog" aria-label={`${mode === 'video' ? 'Video' : 'Voice'} call with ${peerName}`}>

        {/* Status pill */}
        <div className={`co-status${status === 'error' ? ' error' : ''}`}>
          {statusLabel}
        </div>

        {/* ── VIDEO LAYOUT ── */}
        {mode === 'video' && (
          <div className={`co-video-grid${remoteHasVideo ? '' : ' solo'}`}>
            {/* Remote */}
            <div className="co-video-slot">
              {remoteHasVideo
                ? <div ref={remoteVideoEl} style={{ width: '100%', height: '100%' }} />
                : (
                  <div className="co-video-off-avatar">
                    {peerAvatar
                      ? <img src={peerAvatar} alt={peerName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      : initials(peerName)
                    }
                  </div>
                )
              }
              <div className="co-video-label">{peerName}</div>
            </div>

            {/* Local (picture-in-picture when remote is present) */}
            {remoteHasVideo && (
              <div className="co-video-slot" style={{ position: 'absolute', bottom: 100, right: 16, width: 120, height: 160, zIndex: 5, borderRadius: 10, overflow: 'hidden', border: '2px solid rgba(93,214,44,0.4)' }}>
                {!camOff
                  ? <div ref={localVideoEl} style={{ width: '100%', height: '100%' }} />
                  : <div style={{ width: '100%', height: '100%', background: '#141414', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#5DD62C' }}>{initials(myName)}</div>
                }
                <div className="co-video-label">You</div>
              </div>
            )}

            {/* Local — solo before remote joins */}
            {!remoteHasVideo && (
              <div className="co-video-slot">
                {!camOff
                  ? <div ref={localVideoEl} style={{ width: '100%', height: '100%' }} />
                  : <div className="co-video-off-avatar">{initials(myName)}</div>
                }
                <div className="co-video-label">You</div>
              </div>
            )}
          </div>
        )}

        {/* ── VOICE LAYOUT ── */}
        {mode === 'voice' && (
          <div className="co-voice-card">
            <div className="co-voice-avatar">
              {peerAvatar
                ? <img src={peerAvatar} alt={peerName} />
                : initials(peerName)
              }
            </div>
            <div className="co-voice-name">{peerName}</div>
            <div className="co-voice-status">
              {status === 'connected' ? formatElapsed(elapsed) : statusLabel}
            </div>
          </div>
        )}

        {/* ── Controls ── */}
        <div className="co-controls">
          <button
            className={`co-ctrl-btn ${muted ? 'mute-on' : 'mute-off'}`}
            onClick={toggleMute}
            title={muted ? 'Unmute' : 'Mute'}
            aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {muted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {mode === 'video' && (
            <button
              className={`co-ctrl-btn ${camOff ? 'cam-on' : 'cam-off'}`}
              onClick={toggleCam}
              title={camOff ? 'Turn camera on' : 'Turn camera off'}
              aria-label={camOff ? 'Turn camera on' : 'Turn camera off'}
            >
              {camOff ? <VideoOff size={20} /> : <Video size={20} />}
            </button>
          )}

          <button
            className="co-ctrl-btn hangup"
            onClick={hangUp}
            title="End call"
            aria-label="End call"
          >
            {mode === 'voice' ? <PhoneOff size={22} /> : <PhoneOff size={22} />}
          </button>
        </div>
      </div>
    </>
  )
}
