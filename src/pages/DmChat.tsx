import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Loader2, Send, Smile, Paperclip, X, Reply, Trash2, MoreHorizontal, ArrowLeft, ImageIcon, FileText } from 'lucide-react'
import { useDmStore } from '../store/dmStore'
import { useAuthStore } from '../store/authStore'
import type { DirectMessage } from '../services/dmService'
import { supabase } from '../lib/supabase'
import { format, isToday, isYesterday } from 'date-fns'

const EMOJI_LIST = ['👍','❤️','😂','🔥','🎉','😮','😢','👏','✅','🚀']

function initials(name?: string) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}
function fmtTime(d: string) {
  try { return format(new Date(d), 'h:mm a') } catch { return '' }
}
function dateLabel(d: string) {
  const dt = new Date(d)
  if (isToday(dt))     return 'Today'
  if (isYesterday(dt)) return 'Yesterday'
  return format(dt, 'MMMM d, yyyy')
}
function groupByDate(msgs: DirectMessage[]) {
  const groups: { label: string; messages: DirectMessage[] }[] = []
  let cur = ''
  for (const m of msgs) {
    const lbl = dateLabel(m.created_at)
    if (lbl !== cur) { cur = lbl; groups.push({ label: lbl, messages: [m] }) }
    else groups[groups.length - 1].messages.push(m)
  }
  return groups
}

const CSS = `
  @keyframes dmMsgIn { from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);} }
  @keyframes dmSpin   { to{transform:rotate(360deg);} }
  @keyframes dmTyping { 0%,80%,100%{transform:scale(0.55);opacity:0.35;}40%{transform:scale(1);opacity:1;} }
  @keyframes dmEmojiPop{from{opacity:0;transform:scale(0.8)translateY(4px);}to{opacity:1;transform:scale(1)translateY(0);}}

  .dm-shell{display:flex;flex-direction:column;height:100%;background:#0F0F0F;font-family:'Inter',system-ui,sans-serif;color:#F8F8F8;overflow:hidden;}

  /* header */
  .dm-header{display:flex;align-items:center;gap:10px;padding:0 16px;height:54px;min-height:54px;border-bottom:1px solid rgba(248,248,248,0.07);flex-shrink:0;background:#0F0F0F;}
  .dm-header-back{display:none;width:32px;height:32px;border-radius:8px;border:none;background:none;cursor:pointer;color:rgba(248,248,248,0.5);align-items:center;justify-content:center;transition:color 0.15s,background 0.15s;}
  .dm-header-back:hover{color:#F8F8F8;background:rgba(248,248,248,0.07);}
  .dm-header-av{width:36px;height:36px;border-radius:50%;background:#202020;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#5DD62C;flex-shrink:0;overflow:hidden;position:relative;}
  .dm-header-av img{width:100%;height:100%;object-fit:cover;}
  .dm-header-online{position:absolute;bottom:0;right:0;width:10px;height:10px;border-radius:50%;background:#5DD62C;border:2px solid #0F0F0F;}
  .dm-header-info{flex:1;min-width:0;}
  .dm-header-name{font-size:14px;font-weight:700;color:#F8F8F8;}
  .dm-header-status{font-size:11px;color:#5DD62C;}
  .dm-header-status.offline{color:rgba(248,248,248,0.3);}

  /* messages */
  .dm-messages{flex:1;overflow-y:auto;padding:10px 14px 6px;display:flex;flex-direction:column;gap:1px;}
  .dm-messages::-webkit-scrollbar{width:4px;}
  .dm-messages::-webkit-scrollbar-thumb{background:rgba(248,248,248,0.1);border-radius:2px;}

  .dm-date-sep{display:flex;align-items:center;gap:10px;margin:12px 0 8px;}
  .dm-date-line{flex:1;height:1px;background:rgba(248,248,248,0.08);}
  .dm-date-pill{font-size:11px;font-weight:600;color:rgba(248,248,248,0.3);padding:2px 12px;background:rgba(248,248,248,0.05);border-radius:99px;white-space:nowrap;}

  .dm-row{display:flex;align-items:flex-end;gap:8px;padding:2px 4px;border-radius:8px;transition:background 0.12s;position:relative;animation:dmMsgIn 0.2s ease;}
  .dm-row:hover{background:rgba(248,248,248,0.03);}
  .dm-row.own{flex-direction:row-reverse;}
  .dm-row:hover .dm-actions{opacity:1;pointer-events:all;}

  .dm-av{width:32px;height:32px;border-radius:50%;background:#202020;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#5DD62C;flex-shrink:0;overflow:hidden;}
  .dm-av img{width:100%;height:100%;object-fit:cover;}
  .dm-av.spacer{visibility:hidden;}

  .dm-body{max-width:68%;display:flex;flex-direction:column;}
  .dm-row.own .dm-body{align-items:flex-end;}

  .dm-name-time{display:flex;align-items:baseline;gap:6px;margin-bottom:2px;padding:0 2px;}
  .dm-row.own .dm-name-time{flex-direction:row-reverse;}
  .dm-name{font-size:12px;font-weight:700;color:#F8F8F8;}
  .dm-time{font-size:10px;color:rgba(248,248,248,0.28);}

  .dm-reply-quote{display:flex;flex-direction:column;padding:5px 10px;background:rgba(248,248,248,0.04);border:1px solid rgba(248,248,248,0.08);border-left:3px solid #5DD62C;border-radius:8px 8px 0 0;cursor:pointer;transition:background 0.15s;max-width:100%;}
  .dm-reply-quote:hover{background:rgba(93,214,44,0.06);}
  .dm-reply-qname{font-size:11px;font-weight:700;color:#5DD62C;}
  .dm-reply-qtext{font-size:11px;color:rgba(248,248,248,0.45);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}

  .dm-bubble{display:inline-block;padding:8px 12px;border-radius:16px;font-size:14px;line-height:1.5;word-break:break-word;white-space:pre-wrap;max-width:100%;}
  .dm-bubble.own{background:linear-gradient(135deg,#337418 0%,#5DD62C 100%);color:#0F0F0F;border-bottom-right-radius:4px;}
  .dm-bubble.other{background:#202020;color:rgba(248,248,248,0.9);border-bottom-left-radius:4px;}
  .dm-bubble.has-reply{border-top-left-radius:4px;border-top-right-radius:4px;}

  .dm-read{font-size:10px;color:rgba(248,248,248,0.3);margin-top:2px;padding:0 2px;text-align:right;}
  .dm-read.seen{color:#5DD62C;}

  /* hover actions */
  .dm-actions{position:absolute;top:-12px;right:8px;opacity:0;pointer-events:none;display:flex;gap:2px;background:#1a1a1a;border:1px solid rgba(248,248,248,0.1);border-radius:8px;padding:3px;box-shadow:0 4px 16px rgba(0,0,0,0.5);transition:opacity 0.15s;z-index:10;}
  .dm-row.own .dm-actions{right:auto;left:8px;}
  .dm-act-btn{width:26px;height:26px;border-radius:6px;border:none;background:none;cursor:pointer;color:rgba(248,248,248,0.5);display:flex;align-items:center;justify-content:center;transition:color 0.15s,background 0.15s;}
  .dm-act-btn:hover{color:#F8F8F8;background:rgba(248,248,248,0.08);}
  .dm-act-btn.danger:hover{color:#f87171;background:rgba(239,68,68,0.1);}

  /* emoji picker */
  .dm-emoji-picker{position:absolute;top:-50px;right:8px;z-index:20;display:flex;gap:3px;background:#1a1a1a;border:1px solid rgba(248,248,248,0.1);border-radius:10px;padding:5px 7px;box-shadow:0 8px 24px rgba(0,0,0,0.6);animation:dmEmojiPop 0.15s ease;}
  .dm-row.own .dm-emoji-picker{right:auto;left:8px;}
  .dm-emoji-btn{background:none;border:none;cursor:pointer;font-size:17px;padding:2px;border-radius:5px;transition:background 0.12s;line-height:1;}
  .dm-emoji-btn:hover{background:rgba(248,248,248,0.1);}

  /* typing */
  .dm-typing{display:flex;align-items:center;gap:8px;padding:4px 14px 2px;font-size:12px;color:rgba(248,248,248,0.38);flex-shrink:0;min-height:22px;}
  .dm-typing-dots{display:flex;gap:3px;align-items:center;}
  .dm-typing-dot{width:6px;height:6px;border-radius:50%;background:#5DD62C;animation:dmTyping 1.2s ease-in-out infinite;}
  .dm-typing-dot:nth-child(2){animation-delay:0.2s;}
  .dm-typing-dot:nth-child(3){animation-delay:0.4s;}

  /* reply preview */
  .dm-reply-preview{display:flex;align-items:center;gap:10px;padding:7px 14px;background:rgba(93,214,44,0.06);border-top:1px solid rgba(93,214,44,0.15);flex-shrink:0;}
  .dm-reply-bar{width:3px;height:30px;background:#5DD62C;border-radius:2px;flex-shrink:0;}
  .dm-reply-body{flex:1;min-width:0;}
  .dm-reply-to-name{font-size:11px;font-weight:700;color:#5DD62C;}
  .dm-reply-to-text{font-size:12px;color:rgba(248,248,248,0.5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .dm-reply-close{background:none;border:none;cursor:pointer;color:rgba(248,248,248,0.35);display:flex;align-items:center;transition:color 0.15s;}
  .dm-reply-close:hover{color:#F8F8F8;}

  /* input */
  .dm-input-bar{padding:8px 14px 14px;flex-shrink:0;background:#0F0F0F;}
  .dm-input-wrap{display:flex;align-items:flex-end;gap:8px;background:#1c1c1c;border:1.5px solid rgba(248,248,248,0.1);border-radius:14px;padding:7px 8px 7px 12px;transition:border-color 0.2s,box-shadow 0.2s;}
  .dm-input-wrap:focus-within{border-color:rgba(93,214,44,0.45);box-shadow:0 0 0 3px rgba(93,214,44,0.08);}
  .dm-textarea{flex:1;background:none;border:none;outline:none;color:#F8F8F8;font-size:14px;font-family:inherit;resize:none;min-height:22px;max-height:140px;line-height:1.55;padding:2px 0;overflow-y:auto;}
  .dm-textarea::placeholder{color:rgba(248,248,248,0.25);}
  .dm-textarea::-webkit-scrollbar{width:3px;}
  .dm-textarea::-webkit-scrollbar-thumb{background:rgba(248,248,248,0.1);border-radius:2px;}
  .dm-input-right{display:flex;align-items:center;gap:2px;flex-shrink:0;}
  .dm-icon-btn{width:30px;height:30px;border-radius:8px;border:none;background:none;cursor:pointer;color:rgba(248,248,248,0.32);display:flex;align-items:center;justify-content:center;transition:color 0.15s,background 0.15s;}
  .dm-icon-btn:hover{color:#F8F8F8;background:rgba(248,248,248,0.07);}
  .dm-send-btn{width:34px;height:34px;border-radius:10px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#5DD62C,#337418);color:#0F0F0F;box-shadow:0 2px 12px rgba(93,214,44,0.35);transition:transform 0.15s,box-shadow 0.15s,opacity 0.15s;flex-shrink:0;}
  .dm-send-btn:hover:not(:disabled){transform:scale(1.08);box-shadow:0 4px 20px rgba(93,214,44,0.55);}
  .dm-send-btn:disabled{opacity:0.35;cursor:not-allowed;}
  .dm-spinner{animation:dmSpin 0.8s linear infinite;color:#5DD62C;}

  /* loading / empty */
  .dm-loading{flex:1;display:flex;align-items:center;justify-content:center;}
  .dm-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:rgba(248,248,248,0.2);}
  .dm-empty p{font-size:14px;font-weight:600;margin:0;}
  .dm-empty span{font-size:12px;opacity:0.7;}

  /* input emoji picker */
  .dm-input-emoji-wrap{position:relative;display:inline-flex;}
  .dm-input-emoji-panel{position:absolute;bottom:calc(100% + 8px);right:0;z-index:50;display:flex;flex-wrap:wrap;gap:3px;width:220px;background:#1a1a1a;border:1px solid rgba(248,248,248,0.12);border-radius:12px;padding:8px;box-shadow:0 8px 32px rgba(0,0,0,0.7);animation:dmEmojiPop 0.15s ease;}
  .dm-input-emoji-panel button{background:none;border:none;cursor:pointer;font-size:20px;padding:4px;border-radius:6px;transition:background 0.12s;line-height:1;}
  .dm-input-emoji-panel button:hover{background:rgba(248,248,248,0.1);}

  /* attachment preview */
  .dm-attach-preview{display:flex;align-items:center;gap:8px;padding:6px 14px;background:rgba(93,214,44,0.06);border-top:1px solid rgba(93,214,44,0.15);flex-shrink:0;}
  .dm-attach-icon{width:32px;height:32px;border-radius:8px;background:rgba(93,214,44,0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .dm-attach-name{flex:1;font-size:12px;color:#F8F8F8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .dm-attach-size{font-size:11px;color:rgba(248,248,248,0.4);flex-shrink:0;}
  .dm-attach-remove{background:none;border:none;cursor:pointer;color:rgba(248,248,248,0.35);display:flex;align-items:center;transition:color 0.15s;}
  .dm-attach-remove:hover{color:#f87171;}

  /* image message */
  .dm-img-msg{max-width:260px;border-radius:12px;overflow:hidden;cursor:pointer;display:block;}
  .dm-img-msg img{width:100%;height:auto;display:block;}
  .dm-file-msg{display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(248,248,248,0.06);border:1px solid rgba(248,248,248,0.1);border-radius:10px;cursor:pointer;text-decoration:none;transition:background 0.15s;}
  .dm-file-msg:hover{background:rgba(248,248,248,0.1);}
  .dm-file-msg-name{font-size:13px;color:#F8F8F8;font-weight:500;}
  .dm-file-msg-size{font-size:11px;color:rgba(248,248,248,0.4);}

  @media(max-width:768px){
    .dm-header-back{display:flex;}
  }
`

interface DmChatProps {
  onBack?: () => void
}

export const DmChat: React.FC<DmChatProps> = ({ onBack }) => {
  const [text, setText]                       = useState('')
  const [emojiFor, setEmojiFor]               = useState<string | null>(null)
  const [showInputEmoji, setShowInputEmoji]   = useState(false)
  const [attachFile, setAttachFile]           = useState<File | null>(null)
  const [isUploading, setIsUploading]         = useState(false)
  const messagesEndRef  = useRef<HTMLDivElement>(null)
  const textareaRef     = useRef<HTMLTextAreaElement>(null)
  const emojiRef        = useRef<HTMLDivElement>(null)
  const inputEmojiRef   = useRef<HTMLDivElement>(null)
  const fileInputRef    = useRef<HTMLInputElement>(null)

  const { user } = useAuthStore()
  const {
    activeConversation, messages, isLoadingMessages, isSending,
    replyingTo, setReplyingTo, sendMessage, markAsRead,
    deleteMessage, subscribeToConversation, unsubscribeFromConversation,
    fetchMessages,
  } = useDmStore()

  const conv = activeConversation
  const other = conv?.other_user

  useEffect(() => {
    if (!conv) return
    fetchMessages(conv.id)
    subscribeToConversation(conv.id)
    if (user) markAsRead(conv.id, user.id)
    return () => unsubscribeFromConversation()
  }, [conv?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setEmojiFor(null)
      if (inputEmojiRef.current && !inputEmojiRef.current.contains(e.target as Node)) setShowInputEmoji(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const autoResize = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`
  }, [])

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!conv || !user || isSending || isUploading) return

    // If there's a file attachment, upload it first
    if (attachFile) {
      setIsUploading(true)
      try {
        const ext  = attachFile.name.split('.').pop()
        const path = `dm/${conv.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(path, attachFile, { upsert: false })

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(path)

        const isImage = attachFile.type.startsWith('image/')
        const fileMsg = isImage
          ? `[image:${attachFile.name}](${urlData.publicUrl})`
          : `[file:${attachFile.name}](${urlData.publicUrl})`

        const content = text.trim() ? `${fileMsg}\n${text.trim()}` : fileMsg
        await sendMessage(conv.id, user.id, content, replyingTo?.id)
        setText('')
        setAttachFile(null)
        if (textareaRef.current) textareaRef.current.style.height = 'auto'
      } catch (err: any) {
        console.error('Upload failed:', err)
        alert(`Upload failed: ${err.message || 'Unknown error'}. Make sure the "chat-attachments" storage bucket exists in Supabase.`)
      } finally {
        setIsUploading(false)
      }
      return
    }

    const content = text.trim()
    if (!content) return
    try {
      await sendMessage(conv.id, user.id, content, replyingTo?.id)
      setText('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    } catch (err) {
      console.error('DM send failed:', err)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // 10 MB limit
    if (file.size > 10 * 1024 * 1024) {
      alert('File is too large. Maximum size is 10 MB.')
      return
    }
    setAttachFile(file)
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Render a message bubble — handles image/file markdown links
  const renderContent = (content: string) => {
    const imageMatch = content.match(/^\[image:(.+?)\]\((.+?)\)/)
    const fileMatch  = content.match(/^\[file:(.+?)\]\((.+?)\)/)

    if (imageMatch) {
      const [, name, url] = imageMatch
      const rest = content.slice(imageMatch[0].length).trim()
      return (
        <>
          <a href={url} target="_blank" rel="noopener noreferrer" className="dm-img-msg">
            <img src={url} alt={name} />
          </a>
          {rest && <div style={{ marginTop: 4 }}>{rest}</div>}
        </>
      )
    }
    if (fileMatch) {
      const [, name, url] = fileMatch
      const rest = content.slice(fileMatch[0].length).trim()
      return (
        <>
          <a href={url} target="_blank" rel="noopener noreferrer" className="dm-file-msg">
            <FileText size={16} style={{ color: '#5DD62C', flexShrink: 0 }} />
            <div>
              <div className="dm-file-msg-name">{name}</div>
              <div className="dm-file-msg-size">Click to download</div>
            </div>
          </a>
          {rest && <div style={{ marginTop: 4 }}>{rest}</div>}
        </>
      )
    }
    return <>{content}</>
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    if (e.key === 'Escape') setReplyingTo(null)
  }

  const handleDelete = (msgId: string, senderId: string) => {
    if (window.confirm('Delete this message?')) deleteMessage(msgId, senderId)
  }

  if (!conv || !other) return null

  const groups = groupByDate(messages)

  return (
    <>
      <style>{CSS}</style>
      <div className="dm-shell">

        {/* Header */}
        <div className="dm-header">
          {onBack && (
            <button className="dm-header-back" onClick={onBack} aria-label="Back">
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="dm-header-av">
            {other.avatar_url ? <img src={other.avatar_url} alt={other.username} /> : initials(other.username)}
            {other.is_online && <div className="dm-header-online" />}
          </div>
          <div className="dm-header-info">
            <div className="dm-header-name">{other.username}</div>
            <div className={`dm-header-status${other.is_online ? '' : ' offline'}`}>
              {other.is_online ? '● Online' : '● Offline'}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="dm-messages" role="log" aria-live="polite">
          {isLoadingMessages ? (
            <div className="dm-loading">
              <Loader2 size={28} className="dm-spinner" />
            </div>
          ) : (
            <>
              {/* Conversation start */}
              <div style={{ padding: '16px 6px 8px', flexShrink: 0 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#202020', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: '#5DD62C', marginBottom: 10, overflow: 'hidden' }}>
                  {other.avatar_url ? <img src={other.avatar_url} alt={other.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(other.username)}
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#F8F8F8', marginBottom: 4 }}>{other.username}</div>
                <div style={{ fontSize: '13px', color: 'rgba(248,248,248,0.4)' }}>
                  This is the beginning of your conversation with <strong style={{ color: '#5DD62C' }}>{other.username}</strong>
                </div>
              </div>

              {messages.length === 0 ? (
                <div className="dm-empty" style={{ flex: 'none', padding: '16px 0' }}>
                  <p>No messages yet</p>
                  <span>Say hello to {other.username}!</span>
                </div>
              ) : (
                groups.map(group => (
                  <React.Fragment key={group.label}>
                    <div className="dm-date-sep">
                      <div className="dm-date-line" />
                      <span className="dm-date-pill">{group.label}</span>
                      <div className="dm-date-line" />
                    </div>

                    {group.messages.map((msg, idx) => {
                      const isOwn = msg.sender_id === user?.id
                      const senderName = msg.sender?.username || other.username
                      const avatarSrc  = msg.sender?.avatar_url
                      const prevMsg    = idx > 0 ? group.messages[idx - 1] : null
                      const sameAsPrev = prevMsg?.sender_id === msg.sender_id
                      const replyMsg   = msg.reply_to_id
                        ? messages.find(m => m.id === msg.reply_to_id)
                        : null
                      const isLastOwn  = isOwn && (idx === group.messages.length - 1 || group.messages[idx + 1]?.sender_id !== user?.id)

                      return (
                        <div key={msg.id} className={`dm-row${isOwn ? ' own' : ''}`}>
                          {/* Avatar — only show for first in a group */}
                          {!isOwn ? (
                            sameAsPrev
                              ? <div className="dm-av spacer" />
                              : <div className="dm-av">{avatarSrc ? <img src={avatarSrc} alt={senderName} /> : initials(senderName)}</div>
                          ) : null}

                          <div className="dm-body">
                            {/* Name + time — only for first in group */}
                            {!sameAsPrev && (
                              <div className="dm-name-time">
                                <span className="dm-name">{isOwn ? 'You' : senderName}</span>
                                <span className="dm-time">{fmtTime(msg.created_at)}</span>
                              </div>
                            )}

                            {/* Reply quote */}
                            {replyMsg && (
                              <div className="dm-reply-quote" onClick={() => document.getElementById(`dm-${replyMsg.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
                                <span className="dm-reply-qname">{replyMsg.sender?.username || other.username}</span>
                                <span className="dm-reply-qtext">{replyMsg.content}</span>
                              </div>
                            )}

                            <div id={`dm-${msg.id}`} className={`dm-bubble${isOwn ? ' own' : ' other'}${replyMsg ? ' has-reply' : ''}`}>
                              {renderContent(msg.content)}
                            </div>

                            {/* Read receipt on last own message */}
                            {isLastOwn && (
                              <div className={`dm-read${msg.is_read ? ' seen' : ''}`}>
                                {msg.is_read ? '✓✓ Seen' : '✓ Sent'}
                              </div>
                            )}
                          </div>

                          {/* Hover actions */}
                          <div className="dm-actions">
                            <div style={{ position: 'relative' }} ref={emojiFor === msg.id ? emojiRef : undefined}>
                              <button className="dm-act-btn" title="React" onClick={() => setEmojiFor(emojiFor === msg.id ? null : msg.id)}>
                                <Smile size={13} />
                              </button>
                              {emojiFor === msg.id && (
                                <div className="dm-emoji-picker">
                                  {EMOJI_LIST.map(em => (
                                    <button key={em} className="dm-emoji-btn" onClick={() => setEmojiFor(null)}>{em}</button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <button className="dm-act-btn" title="Reply" onClick={() => { setReplyingTo(msg as any); textareaRef.current?.focus() }}>
                              <Reply size={13} />
                            </button>
                            <button className="dm-act-btn" title="More"><MoreHorizontal size={13} /></button>
                            {isOwn && (
                              <button className="dm-act-btn danger" title="Delete" onClick={() => handleDelete(msg.id, msg.sender_id)}>
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </React.Fragment>
                ))
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Reply preview */}
        {replyingTo && (
          <div className="dm-reply-preview">
            <div className="dm-reply-bar" />
            <div className="dm-reply-body">
              <div className="dm-reply-to-name">Replying to {(replyingTo as any).sender?.username || other.username}</div>
              <div className="dm-reply-to-text">{(replyingTo as any).content}</div>
            </div>
            <button className="dm-reply-close" onClick={() => setReplyingTo(null)}><X size={14} /></button>
          </div>
        )}

        {/* File attachment preview */}
        {attachFile && (
          <div className="dm-attach-preview">
            <div className="dm-attach-icon">
              {attachFile.type.startsWith('image/')
                ? <ImageIcon size={16} style={{ color: '#5DD62C' }} />
                : <FileText size={16} style={{ color: '#5DD62C' }} />
              }
            </div>
            <span className="dm-attach-name">{attachFile.name}</span>
            <span className="dm-attach-size">{formatFileSize(attachFile.size)}</span>
            <button className="dm-attach-remove" onClick={() => setAttachFile(null)} aria-label="Remove attachment">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.txt,.zip,.csv,.mp4,.mov"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        {/* Input */}
        <div className="dm-input-bar">
          <form onSubmit={handleSend}>
            <div className="dm-input-wrap">
              <textarea
                ref={textareaRef}
                className="dm-textarea"
                placeholder={attachFile ? `Add a caption… (optional)` : `Message ${other.username}`}
                value={text}
                rows={1}
                onChange={e => { setText(e.target.value); autoResize(e.target) }}
                onKeyDown={handleKeyDown}
                aria-label={`Message ${other.username}`}
              />
              <div className="dm-input-right">
                {/* Emoji picker */}
                <div className="dm-input-emoji-wrap" ref={inputEmojiRef}>
                  <button
                    type="button"
                    className="dm-icon-btn"
                    aria-label="Emoji"
                    onClick={() => setShowInputEmoji(v => !v)}
                  >
                    <Smile size={18} />
                  </button>
                  {showInputEmoji && (
                    <div className="dm-input-emoji-panel">
                      {EMOJI_LIST.map(em => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => {
                            setText(t => t + em)
                            textareaRef.current?.focus()
                            setShowInputEmoji(false)
                          }}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* File attachment */}
                <button
                  type="button"
                  className="dm-icon-btn"
                  aria-label="Attach file"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip size={18} />
                </button>

                {/* Send */}
                <button
                  type="submit"
                  className="dm-send-btn"
                  disabled={(!text.trim() && !attachFile) || isSending || isUploading}
                  aria-label="Send"
                >
                  {isSending || isUploading
                    ? <Loader2 size={15} className="dm-spinner" />
                    : <Send size={15} />
                  }
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
