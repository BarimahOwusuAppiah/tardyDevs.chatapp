import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Loader2, Pin, X, Smile, Paperclip, Send, Plus, Reply, Trash2, MoreHorizontal, Hash, ImageIcon, FileText } from 'lucide-react'
import { useChannelStore } from '../store/channelStore'
import { useMessageStore } from '../store/messageStore'
import type { Message } from '../store/messageStore'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import { format, isToday, isYesterday } from 'date-fns'

const EMOJI_LIST = ['👍','❤️','😂','🔥','🎉','😮','😢','👏','✅','🚀']

const CSS = `
  @keyframes msgIn    { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes typingDot{ 0%,80%,100%{transform:scale(0.55);opacity:0.35;} 40%{transform:scale(1);opacity:1;} }
  @keyframes emojiPop { from{opacity:0;transform:scale(0.8) translateY(6px);} to{opacity:1;transform:scale(1) translateY(0);} }
  @keyframes spin     { to{transform:rotate(360deg);} }

  .cd-shell { display:flex; flex-direction:column; height:100%; background:#0F0F0F; font-family:'Inter',system-ui,sans-serif; color:#F8F8F8; overflow:hidden; }

  /* pinned */
  .cd-pinned {
    display:flex; align-items:flex-start; gap:10px;
    margin:10px 14px 0; padding:10px 14px;
    background:rgba(93,214,44,0.07); border:1px solid rgba(93,214,44,0.2); border-radius:10px;
    flex-shrink:0; animation:msgIn 0.3s ease;
  }
  .cd-pinned-label { font-size:11px; font-weight:700; color:#5DD62C; letter-spacing:0.04em; text-transform:uppercase; margin-bottom:2px; }
  .cd-pinned-text  { font-size:13px; color:rgba(248,248,248,0.7); line-height:1.4; }
  .cd-pinned-link  { color:#5DD62C; text-decoration:none; font-weight:600; }
  .cd-pinned-link:hover { color:#337418; }
  .cd-pinned-close { background:none; border:none; cursor:pointer; color:rgba(248,248,248,0.3); padding:0; display:flex; align-items:center; transition:color 0.15s; flex-shrink:0; margin-left:auto; }
  .cd-pinned-close:hover { color:#F8F8F8; }

  /* messages */
  .cd-messages { flex:1; overflow-y:auto; padding:10px 14px 6px; display:flex; flex-direction:column; gap:1px; }
  .cd-messages::-webkit-scrollbar { width:4px; }
  .cd-messages::-webkit-scrollbar-thumb { background:rgba(248,248,248,0.1); border-radius:2px; }

  /* date sep */
  .cd-date-sep { display:flex; align-items:center; gap:10px; margin:12px 0 8px; }
  .cd-date-line { flex:1; height:1px; background:rgba(248,248,248,0.08); }
  .cd-date-pill { font-size:11px; font-weight:600; color:rgba(248,248,248,0.3); padding:2px 12px; background:rgba(248,248,248,0.05); border-radius:99px; white-space:nowrap; }

  /* message row */
  .cd-row { display:flex; align-items:flex-start; gap:10px; padding:3px 6px; border-radius:8px; transition:background 0.12s; position:relative; animation:msgIn 0.22s ease; }
  .cd-row:hover { background:rgba(248,248,248,0.03); }
  .cd-row.own { flex-direction:row-reverse; }
  .cd-row:hover .cd-actions { opacity:1; pointer-events:all; }

  /* avatar */
  .cd-av { width:36px; height:36px; border-radius:50%; background:#202020; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; color:#5DD62C; flex-shrink:0; overflow:hidden; position:relative; margin-top:2px; }
  .cd-av img { width:100%; height:100%; object-fit:cover; }
  .cd-av-dot { position:absolute; bottom:0; right:0; width:10px; height:10px; border-radius:50%; background:#5DD62C; border:2px solid #0F0F0F; }

  /* body */
  .cd-body { flex:1; min-width:0; max-width:72%; }
  .cd-row.own .cd-body { display:flex; flex-direction:column; align-items:flex-end; }
  .cd-meta { display:flex; align-items:baseline; gap:7px; margin-bottom:3px; }
  .cd-row.own .cd-meta { flex-direction:row-reverse; }
  .cd-author { font-size:13px; font-weight:700; color:#F8F8F8; }
  .cd-time   { font-size:11px; color:rgba(248,248,248,0.28); }

  /* bubble */
  .cd-bubble { display:inline-block; padding:9px 13px; border-radius:16px; font-size:14px; line-height:1.55; color:rgba(248,248,248,0.9); background:#202020; max-width:100%; word-break:break-word; white-space:pre-wrap; }
  .cd-bubble.own { background:linear-gradient(135deg,#337418 0%,#5DD62C 100%); color:#0F0F0F; border-bottom-right-radius:4px; }
  .cd-bubble.other { border-bottom-left-radius:4px; }

  /* reply quote inside bubble area */
  .cd-reply-bar {
    display:flex; align-items:flex-start; gap:8px; padding:7px 11px;
    background:rgba(248,248,248,0.04); border:1px solid rgba(248,248,248,0.08);
    border-left:3px solid #5DD62C; border-radius:8px; margin-bottom:5px; cursor:pointer;
    transition:background 0.15s; max-width:100%;
  }
  .cd-reply-bar:hover { background:rgba(93,214,44,0.06); }
  .cd-reply-name { font-size:12px; font-weight:700; color:#5DD62C; margin-bottom:1px; }
  .cd-reply-text { font-size:12px; color:rgba(248,248,248,0.45); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

  /* reactions */
  .cd-reactions { display:flex; flex-wrap:wrap; gap:4px; margin-top:5px; }
  .cd-reaction {
    display:inline-flex; align-items:center; gap:4px; padding:2px 8px;
    border-radius:99px; background:rgba(248,248,248,0.07); border:1px solid rgba(248,248,248,0.1);
    font-size:13px; color:rgba(248,248,248,0.75); cursor:pointer;
    transition:background 0.15s,border-color 0.15s; user-select:none;
  }
  .cd-reaction:hover { background:rgba(93,214,44,0.12); border-color:rgba(93,214,44,0.3); }
  .cd-reaction.mine  { background:rgba(93,214,44,0.15); border-color:rgba(93,214,44,0.4); color:#5DD62C; }
  .cd-reaction-count { font-size:11px; font-weight:700; }

  /* hover action bar */
  .cd-actions {
    position:absolute; top:-14px; right:10px; opacity:0; pointer-events:none;
    display:flex; gap:2px; background:#1a1a1a; border:1px solid rgba(248,248,248,0.1);
    border-radius:8px; padding:3px; box-shadow:0 4px 16px rgba(0,0,0,0.5);
    transition:opacity 0.15s; z-index:10;
  }
  .cd-row.own .cd-actions { right:auto; left:10px; }
  .cd-action-btn {
    width:28px; height:28px; border-radius:6px; border:none; background:none;
    cursor:pointer; color:rgba(248,248,248,0.5); display:flex; align-items:center; justify-content:center;
    transition:color 0.15s,background 0.15s; font-size:13px;
  }
  .cd-action-btn:hover { color:#F8F8F8; background:rgba(248,248,248,0.08); }
  .cd-action-btn.danger:hover { color:#f87171; background:rgba(239,68,68,0.1); }

  /* emoji picker */
  .cd-emoji-picker {
    position:absolute; top:-52px; right:10px; z-index:20;
    display:flex; gap:4px; background:#1a1a1a; border:1px solid rgba(248,248,248,0.1);
    border-radius:10px; padding:6px 8px; box-shadow:0 8px 24px rgba(0,0,0,0.6);
    animation:emojiPop 0.15s ease;
  }
  .cd-row.own .cd-emoji-picker { right:auto; left:10px; }
  .cd-emoji-btn { background:none; border:none; cursor:pointer; font-size:18px; padding:2px 3px; border-radius:6px; transition:background 0.12s; line-height:1; }
  .cd-emoji-btn:hover { background:rgba(248,248,248,0.1); }

  /* typing */
  .cd-typing { display:flex; align-items:center; gap:8px; padding:5px 14px 2px; font-size:12px; color:rgba(248,248,248,0.38); flex-shrink:0; min-height:24px; }
  .cd-typing-dots { display:flex; gap:3px; align-items:center; }
  .cd-typing-dot { width:7px; height:7px; border-radius:50%; background:#5DD62C; animation:typingDot 1.2s ease-in-out infinite; }
  .cd-typing-dot:nth-child(2){animation-delay:0.2s;}
  .cd-typing-dot:nth-child(3){animation-delay:0.4s;}

  /* reply preview above input */
  .cd-reply-preview {
    display:flex; align-items:center; gap:10px; padding:8px 14px;
    background:rgba(93,214,44,0.06); border-top:1px solid rgba(93,214,44,0.15); flex-shrink:0;
  }
  .cd-reply-preview-bar { width:3px; height:32px; background:#5DD62C; border-radius:2px; flex-shrink:0; }
  .cd-reply-preview-body { flex:1; min-width:0; }
  .cd-reply-preview-name { font-size:11px; font-weight:700; color:#5DD62C; }
  .cd-reply-preview-text { font-size:12px; color:rgba(248,248,248,0.5); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .cd-reply-preview-close { background:none; border:none; cursor:pointer; color:rgba(248,248,248,0.35); display:flex; align-items:center; transition:color 0.15s; }
  .cd-reply-preview-close:hover { color:#F8F8F8; }

  /* input bar */
  .cd-input-bar { padding:8px 14px 14px; flex-shrink:0; background:#0F0F0F; }
  .cd-input-wrap {
    display:flex; align-items:flex-end; gap:8px; background:#1c1c1c;
    border:1.5px solid rgba(248,248,248,0.1); border-radius:14px; padding:7px 8px 7px 12px;
    transition:border-color 0.2s,box-shadow 0.2s;
  }
  .cd-input-wrap:focus-within { border-color:rgba(93,214,44,0.45); box-shadow:0 0 0 3px rgba(93,214,44,0.08); }
  .cd-input-add {
    width:30px; height:30px; border-radius:50%; border:1.5px solid rgba(248,248,248,0.18);
    background:none; cursor:pointer; color:rgba(248,248,248,0.4);
    display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-bottom:1px;
    transition:color 0.15s,border-color 0.15s,background 0.15s;
  }
  .cd-input-add:hover { color:#5DD62C; border-color:#5DD62C; background:rgba(93,214,44,0.08); }
  .cd-textarea {
    flex:1; background:none; border:none; outline:none; color:#F8F8F8;
    font-size:14px; font-family:inherit; resize:none; min-height:22px; max-height:140px;
    line-height:1.55; padding:2px 0; overflow-y:auto;
  }
  .cd-textarea::placeholder { color:rgba(248,248,248,0.25); }
  .cd-textarea::-webkit-scrollbar { width:3px; }
  .cd-textarea::-webkit-scrollbar-thumb { background:rgba(248,248,248,0.1); border-radius:2px; }
  .cd-input-right { display:flex; align-items:center; gap:2px; flex-shrink:0; }
  .cd-icon-btn {
    width:30px; height:30px; border-radius:8px; border:none; background:none;
    cursor:pointer; color:rgba(248,248,248,0.32); display:flex; align-items:center; justify-content:center;
    transition:color 0.15s,background 0.15s;
  }
  .cd-icon-btn:hover { color:#F8F8F8; background:rgba(248,248,248,0.07); }
  .cd-send-btn {
    width:34px; height:34px; border-radius:10px; border:none; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    background:linear-gradient(135deg,#5DD62C,#337418); color:#0F0F0F;
    box-shadow:0 2px 12px rgba(93,214,44,0.35);
    transition:transform 0.15s,box-shadow 0.15s,opacity 0.15s; flex-shrink:0;
  }
  .cd-send-btn:hover:not(:disabled) { transform:scale(1.08); box-shadow:0 4px 20px rgba(93,214,44,0.55); }
  .cd-send-btn:disabled { opacity:0.35; cursor:not-allowed; }

  /* input emoji picker */
  .cd-input-emoji-wrap { position:relative; display:inline-flex; }
  .cd-input-emoji-panel {
    position:absolute; bottom:calc(100% + 8px); right:0; z-index:50;
    display:flex; flex-wrap:wrap; gap:3px; width:220px;
    background:#1a1a1a; border:1px solid rgba(248,248,248,0.12); border-radius:12px;
    padding:8px; box-shadow:0 8px 32px rgba(0,0,0,0.7); animation:emojiPop 0.15s ease;
  }
  .cd-input-emoji-panel button {
    background:none; border:none; cursor:pointer; font-size:20px;
    padding:4px; border-radius:6px; transition:background 0.12s; line-height:1;
  }
  .cd-input-emoji-panel button:hover { background:rgba(248,248,248,0.1); }

  /* attachment preview */
  .cd-attach-preview {
    display:flex; align-items:center; gap:8px; padding:6px 14px;
    background:rgba(93,214,44,0.06); border-top:1px solid rgba(93,214,44,0.15); flex-shrink:0;
  }
  .cd-attach-icon { width:32px; height:32px; border-radius:8px; background:rgba(93,214,44,0.12); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .cd-attach-name { flex:1; font-size:12px; color:#F8F8F8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .cd-attach-size { font-size:11px; color:rgba(248,248,248,0.4); flex-shrink:0; }
  .cd-attach-remove { background:none; border:none; cursor:pointer; color:rgba(248,248,248,0.35); display:flex; align-items:center; transition:color 0.15s; }
  .cd-attach-remove:hover { color:#f87171; }

  /* image / file messages */
  .cd-img-msg { max-width:280px; border-radius:12px; overflow:hidden; cursor:pointer; display:block; }
  .cd-img-msg img { width:100%; height:auto; display:block; }
  .cd-file-msg { display:flex; align-items:center; gap:8px; padding:8px 12px; background:rgba(248,248,248,0.06); border:1px solid rgba(248,248,248,0.1); border-radius:10px; cursor:pointer; text-decoration:none; transition:background 0.15s; }
  .cd-file-msg:hover { background:rgba(248,248,248,0.1); }
  .cd-file-msg-name { font-size:13px; color:#F8F8F8; font-weight:500; }
  .cd-file-msg-size { font-size:11px; color:rgba(248,248,248,0.4); }

  /* empty / loading */
  .cd-empty { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; color:rgba(248,248,248,0.2); }
  .cd-empty p { font-size:15px; font-weight:600; margin:0; }
  .cd-empty span { font-size:13px; opacity:0.7; }
  .cd-loading { flex:1; display:flex; align-items:center; justify-content:center; }
  .cd-spinner { animation:spin 0.8s linear infinite; color:#5DD62C; }

  /* channel welcome */
  .cd-welcome { padding:20px 14px 10px; flex-shrink:0; }
  .cd-welcome-icon { width:52px; height:52px; border-radius:14px; background:rgba(93,214,44,0.1); border:1px solid rgba(93,214,44,0.2); display:flex; align-items:center; justify-content:center; margin-bottom:10px; }
  .cd-welcome h2 { font-size:20px; font-weight:800; color:#F8F8F8; margin:0 0 4px; }
  .cd-welcome p  { font-size:13px; color:rgba(248,248,248,0.45); margin:0; }

  /* ── MOBILE ── */
  @media(max-width:768px){
    .cd-body{max-width:82%;}
    .cd-action-btn{width:34px;height:34px;}
    .cd-input-bar{
      padding:8px 12px;
      padding-bottom:max(14px, env(safe-area-inset-bottom, 14px));
    }
    .cd-messages{padding:8px 10px 4px;}
    .cd-pinned{margin:8px 10px 0;}
    .cd-welcome{padding:16px 10px 8px;}
    .cd-welcome h2{font-size:18px;}
    .cd-input-emoji-panel{right:auto;left:50%;transform:translateX(-50%);width:min(220px,90vw);}
    .cd-emoji-picker{right:auto;left:0;}
    .cd-row.own .cd-emoji-picker{left:auto;right:0;}
    .cd-attach-preview{padding:6px 10px;}
    .cd-textarea{font-size:16px;}
    .cd-img-msg{max-width:100%;}
  }
  @media(max-width:380px){
    .cd-body{max-width:88%;}
    .cd-bubble{font-size:13px;padding:8px 11px;}
    .cd-author{font-size:12px;}
    .cd-time{font-size:10px;}
  }
`

function initials(name?: string) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatMsgTime(dateStr: string) {
  try { return format(new Date(dateStr), 'h:mm a') } catch { return '' }
}

function dateSeparatorLabel(dateStr: string) {
  const d = new Date(dateStr)
  if (isToday(d))     return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'MMMM d, yyyy')
}

function groupByDate(messages: Message[]) {
  const groups: { label: string; messages: Message[] }[] = []
  let currentLabel = ''
  for (const msg of messages) {
    const label = dateSeparatorLabel(msg.created_at)
    if (label !== currentLabel) {
      currentLabel = label
      groups.push({ label, messages: [msg] })
    } else {
      groups[groups.length - 1].messages.push(msg)
    }
  }
  return groups
}

export const ChatDashboard: React.FC = () => {
  const [text, setText]                     = useState('')
  const [pinnedVisible, setPinnedVisible]   = useState(true)
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null)
  const [showInputEmoji, setShowInputEmoji] = useState(false)
  const [attachFile, setAttachFile]         = useState<File | null>(null)
  const [isUploading, setIsUploading]       = useState(false)
  const [sending, setSending]               = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef    = useRef<HTMLTextAreaElement>(null)
  const emojiRef       = useRef<HTMLDivElement>(null)
  const inputEmojiRef  = useRef<HTMLDivElement>(null)
  const fileInputRef   = useRef<HTMLInputElement>(null)

  const { activeChannel }  = useChannelStore()
  const { messages, isLoading, sendMessage, fetchMessages, subscribeToMessages, unsubscribeFromMessages,
          replyingTo, setReplyingTo, toggleReaction, deleteMessage } = useMessageStore()
  const { user } = useAuthStore()

  useEffect(() => {
    if (activeChannel) {
      fetchMessages(activeChannel.id)
      subscribeToMessages(activeChannel.id)
      return () => { unsubscribeFromMessages() }
    }
  }, [activeChannel?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Close emoji picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setEmojiPickerFor(null)
      }
      if (inputEmojiRef.current && !inputEmojiRef.current.contains(e.target as Node)) {
        setShowInputEmoji(false)
      }
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
    if (!activeChannel || !user || sending || isUploading) return

    // File upload path
    if (attachFile) {
      setIsUploading(true)
      try {
        const ext  = attachFile.name.split('.').pop()
        const path = `channel/${activeChannel.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
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
        await sendMessage(content, activeChannel.id, user.id, replyingTo?.id)
        setText('')
        setReplyingTo(null)
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
    setSending(true)
    try {
      await sendMessage(content, activeChannel.id, user.id, replyingTo?.id)
      setText('')
      setReplyingTo(null)
      if (textareaRef.current) { textareaRef.current.style.height = 'auto' }
    } catch (err) {
      console.error('Send failed:', err)
    } finally {
      setSending(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      alert('File is too large. Maximum size is 10 MB.')
      return
    }
    setAttachFile(file)
    e.target.value = ''
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const renderContent = (content: string) => {
    const imageMatch = content.match(/^\[image:(.+?)\]\((.+?)\)/)
    const fileMatch  = content.match(/^\[file:(.+?)\]\((.+?)\)/)

    if (imageMatch) {
      const [, name, url] = imageMatch
      const rest = content.slice(imageMatch[0].length).trim()
      return (
        <>
          <a href={url} target="_blank" rel="noopener noreferrer" className="cd-img-msg">
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
          <a href={url} target="_blank" rel="noopener noreferrer" className="cd-file-msg">
            <FileText size={16} style={{ color: '#5DD62C', flexShrink: 0 }} />
            <div>
              <div className="cd-file-msg-name">{name}</div>
              <div className="cd-file-msg-size">Click to download</div>
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

  const handleReaction = (msgId: string, emoji: string) => {
    if (!user) return
    toggleReaction(msgId, emoji, user.id)
    setEmojiPickerFor(null)
  }

  const handleDelete = async (msgId: string) => {
    if (!user) return
    if (window.confirm('Delete this message?')) {
      await deleteMessage(msgId, user.id)
    }
  }

  if (!activeChannel) return null

  const groups = groupByDate(messages)

  return (
    <>
      <style>{CSS}</style>
      <div className="cd-shell">

        {/* Pinned */}
        {pinnedVisible && (
          <div className="cd-pinned">
            <Pin size={14} style={{ color: '#5DD62C', flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="cd-pinned-label">📌 Pinned Message</div>
              <div className="cd-pinned-text">
                Please read our new guidelines in{' '}
                <a href="#" className="cd-pinned-link">#announcements</a>
              </div>
            </div>
            <button className="cd-pinned-close" onClick={() => setPinnedVisible(false)} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Messages */}
        <div className="cd-messages" role="log" aria-live="polite">
          {isLoading ? (
            <div className="cd-loading">
              <Loader2 size={30} className="cd-spinner" />
            </div>
          ) : (
            <>
              {/* Channel welcome */}
              <div className="cd-welcome">
                <div className="cd-welcome-icon">
                  <Hash size={26} style={{ color: '#5DD62C' }} />
                </div>
                <h2># {activeChannel.name}</h2>
                <p>This is the beginning of the #{activeChannel.name} channel. Say hello!</p>
              </div>

              {messages.length === 0 ? (
                <div className="cd-empty" style={{ flex: 'none', padding: '20px 0' }}>
                  <p>No messages yet</p>
                  <span>Be the first to say something!</span>
                </div>
              ) : (
                groups.map((group) => (
                  <React.Fragment key={group.label}>
                    {/* Date separator */}
                    <div className="cd-date-sep">
                      <div className="cd-date-line" />
                      <span className="cd-date-pill">{group.label}</span>
                      <div className="cd-date-line" />
                    </div>

                    {group.messages.map((msg) => {
                      const isOwn      = msg.user_id === user?.id
                      const authorName = msg.profiles?.username || 'Unknown'
                      const avatarSrc  = msg.profiles?.avatar_url
                      const replyMsg   = msg.reply_to_id
                        ? messages.find(m => m.id === msg.reply_to_id)
                        : null

                      return (
                        <div key={msg.id} className={`cd-row${isOwn ? ' own' : ''}`}>
                          {/* Avatar */}
                          <div className="cd-av">
                            {avatarSrc ? <img src={avatarSrc} alt={authorName} /> : initials(authorName)}
                            <div className="cd-av-dot" />
                          </div>

                          {/* Body */}
                          <div className="cd-body">
                            <div className="cd-meta">
                              <span className="cd-author">{authorName}</span>
                              <span className="cd-time">{formatMsgTime(msg.created_at)}</span>
                            </div>

                            {/* Reply quote */}
                            {replyMsg && (
                              <div className="cd-reply-bar" onClick={() => {
                                document.getElementById(`msg-${replyMsg.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                              }}>
                                <div>
                                  <div className="cd-reply-name">{replyMsg.profiles?.username || 'Unknown'}</div>
                                  <div className="cd-reply-text">{replyMsg.content}</div>
                                </div>
                              </div>
                            )}

                            <div id={`msg-${msg.id}`} className={`cd-bubble${isOwn ? ' own' : ' other'}`}>
                              {renderContent(msg.content)}
                            </div>

                            {/* Reactions */}
                            {msg.reactions && msg.reactions.length > 0 && (
                              <div className="cd-reactions">
                                {msg.reactions.map(r => (
                                  <button
                                    key={r.emoji}
                                    className={`cd-reaction${r.userIds.includes(user?.id ?? '') ? ' mine' : ''}`}
                                    onClick={() => handleReaction(msg.id, r.emoji)}
                                    title={`${r.count} reaction${r.count !== 1 ? 's' : ''}`}
                                  >
                                    {r.emoji} <span className="cd-reaction-count">{r.count}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Hover actions */}
                          <div className="cd-actions">
                            {/* Emoji picker trigger */}
                            <div style={{ position: 'relative' }} ref={emojiPickerFor === msg.id ? emojiRef : undefined}>
                              <button
                                className="cd-action-btn"
                                title="React"
                                onClick={() => setEmojiPickerFor(emojiPickerFor === msg.id ? null : msg.id)}
                              >
                                <Smile size={14} />
                              </button>
                              {emojiPickerFor === msg.id && (
                                <div className="cd-emoji-picker">
                                  {EMOJI_LIST.map(em => (
                                    <button key={em} className="cd-emoji-btn" onClick={() => handleReaction(msg.id, em)}>{em}</button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <button className="cd-action-btn" title="Reply" onClick={() => { setReplyingTo(msg); textareaRef.current?.focus() }}>
                              <Reply size={14} />
                            </button>
                            <button className="cd-action-btn" title="More"><MoreHorizontal size={14} /></button>
                            {isOwn && (
                              <button className="cd-action-btn danger" title="Delete" onClick={() => handleDelete(msg.id)}>
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </React.Fragment>
                ))
              )}

              {/* Typing indicator */}
              <div className="cd-typing">
                <div className="cd-typing-dots">
                  <div className="cd-typing-dot" />
                  <div className="cd-typing-dot" />
                  <div className="cd-typing-dot" />
                </div>
                <span style={{ marginLeft: 2 }}>Someone is typing…</span>
              </div>

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Reply preview */}
        {replyingTo && (
          <div className="cd-reply-preview">
            <div className="cd-reply-preview-bar" />
            <div className="cd-reply-preview-body">
              <div className="cd-reply-preview-name">Replying to {replyingTo.profiles?.username || 'Unknown'}</div>
              <div className="cd-reply-preview-text">{replyingTo.content}</div>
            </div>
            <button className="cd-reply-preview-close" onClick={() => setReplyingTo(null)} aria-label="Cancel reply">
              <X size={15} />
            </button>
          </div>
        )}

        {/* Attachment preview */}
        {attachFile && (
          <div className="cd-attach-preview">
            <div className="cd-attach-icon">
              {attachFile.type.startsWith('image/')
                ? <ImageIcon size={16} style={{ color: '#5DD62C' }} />
                : <FileText size={16} style={{ color: '#5DD62C' }} />
              }
            </div>
            <span className="cd-attach-name">{attachFile.name}</span>
            <span className="cd-attach-size">{formatFileSize(attachFile.size)}</span>
            <button className="cd-attach-remove" onClick={() => setAttachFile(null)} aria-label="Remove attachment">
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
        <div className="cd-input-bar">
          <form onSubmit={handleSend}>
            <div className="cd-input-wrap">
              <button
                type="button"
                className="cd-input-add"
                aria-label="Attach file"
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus size={16} />
              </button>
              <textarea
                ref={textareaRef}
                className="cd-textarea"
                placeholder={attachFile ? `Add a caption… (optional)` : `Message #${activeChannel.name}`}
                value={text}
                rows={1}
                onChange={e => { setText(e.target.value); autoResize(e.target) }}
                onKeyDown={handleKeyDown}
                aria-label={`Message #${activeChannel.name}`}
              />
              <div className="cd-input-right">
                {/* Emoji picker */}
                <div className="cd-input-emoji-wrap" ref={inputEmojiRef}>
                  <button
                    type="button"
                    className="cd-icon-btn"
                    aria-label="Emoji"
                    onClick={() => setShowInputEmoji(v => !v)}
                  >
                    <Smile size={18} />
                  </button>
                  {showInputEmoji && (
                    <div className="cd-input-emoji-panel">
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

                {/* Paperclip also opens file picker */}
                <button
                  type="button"
                  className="cd-icon-btn"
                  aria-label="Attach file"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip size={18} />
                </button>

                <button
                  type="submit"
                  className="cd-send-btn"
                  disabled={(!text.trim() && !attachFile) || sending || isUploading}
                  aria-label="Send message"
                >
                  {sending || isUploading
                    ? <Loader2 size={15} className="cd-spinner" />
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
