// rebuild

import React, { useState, useEffect, useRef } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import {
  MessageSquare, Hash, AtSign, Bookmark, Settings,
  Plus, ChevronDown, LogOut, Search, Bell,
  X, Menu, Check, UserPlus, Loader2,
} from 'lucide-react'
import { useChannelStore } from '../store/channelStore'
import { useAuthStore } from '../store/authStore'
import { useDmStore } from '../store/dmStore'
import { DmChat } from '../pages/DmChat'
import { dmService } from '../services/dmService'
import { supabase } from '../lib/supabase'
import { Logo } from '../components/Logo'

const CHANNEL_DESCS: Record<string, string> = {
  general: 'Company updates and general discussion',
  random: 'Off-topic conversations and fun',
  announcements: 'Important announcements for the team',
  'dev-updates': 'Development progress and updates',
  'off-topic': 'Anything goes here',
  designs: 'Design reviews and feedback',
  feedback: 'Product feedback and suggestions',
}



function initials(name?: string) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

type NavTab = 'chats' | 'threads' | 'mentions' | 'bookmarks' | 'settings'
type View   = 'channel' | 'dm'

const CSS = `
  @keyframes slideIn{from{transform:translateX(-100%);}to{transform:translateX(0);}}
  @keyframes fadeIn {from{opacity:0;}to{opacity:1;}}
  @keyframes popIn  {from{opacity:0;transform:scale(0.92)translateY(8px);}to{opacity:1;transform:scale(1)translateY(0);}}
  @keyframes clSpin {to{transform:rotate(360deg);}}

  *,*::before,*::after{box-sizing:border-box;}
  .cl-shell{display:flex;height:100vh;width:100vw;overflow:hidden;background:#0F0F0F;font-family:'Inter',system-ui,sans-serif;color:#F8F8F8;position:relative;}

  /* RAIL */
  .cl-rail{width:60px;min-width:60px;background:#0a0a0a;border-right:1px solid rgba(248,248,248,0.06);display:flex;flex-direction:column;align-items:center;padding:14px 0 16px;z-index:30;flex-shrink:0;}
  .cl-rail-logo{width:38px;height:38px;margin-bottom:18px;flex-shrink:0;cursor:pointer;}
  .cl-rail-nav{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;width:100%;}
  .cl-rail-btn{position:relative;width:100%;height:54px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border:none;background:none;cursor:pointer;color:rgba(248,248,248,0.35);transition:color 0.15s,background 0.15s;font-size:9px;font-family:inherit;letter-spacing:0.02em;font-weight:500;}
  .cl-rail-btn:hover{color:#F8F8F8;background:rgba(248,248,248,0.05);}
  .cl-rail-btn.active{color:#5DD62C;background:rgba(93,214,44,0.08);}
  .cl-rail-btn.active::before{content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);width:3px;height:28px;background:#5DD62C;border-radius:0 3px 3px 0;}
  .cl-rail-bottom{display:flex;flex-direction:column;align-items:center;gap:6px;width:100%;padding-top:8px;}
  .cl-rail-av-wrap{position:relative;cursor:pointer;}
  .cl-rail-av{width:36px;height:36px;border-radius:50%;background:#337418;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#0F0F0F;overflow:hidden;border:2px solid transparent;transition:border-color 0.15s;}
  .cl-rail-av:hover{border-color:#5DD62C;}
  .cl-rail-av img{width:100%;height:100%;object-fit:cover;}
  .cl-rail-online{position:absolute;bottom:1px;right:1px;width:11px;height:11px;border-radius:50%;background:#5DD62C;border:2px solid #0a0a0a;}

  /* SIDEBAR */
  .cl-sidebar{width:230px;min-width:230px;background:#111;border-right:1px solid rgba(248,248,248,0.06);display:flex;flex-direction:column;overflow:hidden;transition:transform 0.25s cubic-bezier(0.4,0,0.2,1);z-index:20;flex-shrink:0;}
  .cl-sidebar-head{padding:14px 12px 10px;border-bottom:1px solid rgba(248,248,248,0.06);flex-shrink:0;}
  .cl-ws-row{display:flex;align-items:center;gap:8px;cursor:pointer;padding:4px 6px;border-radius:8px;transition:background 0.15s;}
  .cl-ws-row:hover{background:rgba(248,248,248,0.05);}
  .cl-ws-icon{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,#5DD62C,#337418);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#0F0F0F;flex-shrink:0;}
  .cl-ws-name{font-size:13px;font-weight:700;color:#F8F8F8;flex:1;}
  .cl-sidebar-search{margin:10px 0 0;display:flex;align-items:center;gap:6px;background:rgba(248,248,248,0.06);border:1px solid rgba(248,248,248,0.08);border-radius:8px;padding:7px 10px;transition:border-color 0.15s;}
  .cl-sidebar-search:focus-within{border-color:rgba(93,214,44,0.4);}
  .cl-sidebar-search input{background:none;border:none;outline:none;color:#F8F8F8;font-size:12px;font-family:inherit;width:100%;}
  .cl-sidebar-search input::placeholder{color:rgba(248,248,248,0.3);}
  .cl-sidebar-scroll{flex:1;overflow-y:auto;padding:8px 0 4px;min-height:0;}
  .cl-sidebar-scroll::-webkit-scrollbar{width:3px;}
  .cl-sidebar-scroll::-webkit-scrollbar-thumb{background:rgba(248,248,248,0.1);border-radius:2px;}
  .cl-sec-head{display:flex;align-items:center;justify-content:space-between;padding:10px 14px 4px;}
  .cl-sec-title{font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:rgba(248,248,248,0.3);}
  .cl-sec-add{width:20px;height:20px;border-radius:5px;border:none;background:none;cursor:pointer;color:rgba(248,248,248,0.3);display:flex;align-items:center;justify-content:center;transition:color 0.15s,background 0.15s;padding:0;}
  .cl-sec-add:hover{color:#5DD62C;background:rgba(93,214,44,0.1);}
  .cl-ch-btn{width:100%;display:flex;align-items:center;gap:7px;padding:6px 14px;border:none;background:none;cursor:pointer;color:rgba(248,248,248,0.45);font-size:13px;font-family:inherit;text-align:left;transition:color 0.15s,background 0.15s;}
  .cl-ch-btn:hover{color:#F8F8F8;background:rgba(248,248,248,0.05);}
  .cl-ch-btn.active{color:#5DD62C;background:rgba(93,214,44,0.1);font-weight:600;}
  .cl-ch-name{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .cl-ch-dot{width:7px;height:7px;border-radius:50%;background:#5DD62C;flex-shrink:0;box-shadow:0 0 6px rgba(93,214,44,0.7);}

  /* DM items */
  .cl-dm-btn{width:100%;display:flex;align-items:center;gap:8px;padding:6px 14px;border:none;background:none;cursor:pointer;color:rgba(248,248,248,0.45);font-size:13px;font-family:inherit;text-align:left;transition:color 0.15s,background 0.15s;}
  .cl-dm-btn:hover{color:#F8F8F8;background:rgba(248,248,248,0.05);}
  .cl-dm-btn.active{color:#F8F8F8;background:rgba(93,214,44,0.1);}
  .cl-dm-av{width:28px;height:28px;border-radius:50%;background:#202020;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#5DD62C;flex-shrink:0;overflow:hidden;position:relative;}
  .cl-dm-av img{width:100%;height:100%;object-fit:cover;}
  .cl-dm-dot{position:absolute;bottom:0;right:0;width:8px;height:8px;border-radius:50%;background:#5DD62C;border:1.5px solid #111;}
  .cl-dm-dot.offline{background:#6b7280;}
  .cl-dm-name{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .cl-dm-unread{min-width:18px;height:18px;border-radius:9px;padding:0 5px;background:#5DD62C;color:#0F0F0F;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;}
  .cl-dm-preview{font-size:11px;color:rgba(248,248,248,0.3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100px;}

  /* Search results dropdown */
  .cl-search-results{background:#1a1a1a;border:1px solid rgba(248,248,248,0.1);border-radius:10px;margin:6px 0 0;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.5);}
  .cl-search-result-item{display:flex;align-items:center;gap:10px;padding:9px 14px;cursor:pointer;transition:background 0.15s;border:none;background:none;width:100%;text-align:left;font-family:inherit;}
  .cl-search-result-item:hover{background:rgba(93,214,44,0.08);}
  .cl-search-result-av{width:30px;height:30px;border-radius:50%;background:#202020;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#5DD62C;flex-shrink:0;overflow:hidden;position:relative;}
  .cl-search-result-av img{width:100%;height:100%;object-fit:cover;}
  .cl-search-result-online{position:absolute;bottom:0;right:0;width:8px;height:8px;border-radius:50%;background:#5DD62C;border:1.5px solid #1a1a1a;}
  .cl-search-result-name{font-size:13px;font-weight:600;color:#F8F8F8;}
  .cl-search-result-status{font-size:11px;color:rgba(248,248,248,0.4);}
  .cl-search-empty{padding:12px 14px;font-size:12px;color:rgba(248,248,248,0.3);text-align:center;}
  .cl-search-spinner{animation:clSpin 0.8s linear infinite;color:#5DD62C;}

  /* Sidebar footer — hidden on desktop, shown on mobile only */
  .cl-sidebar-foot{display:none;padding:10px 12px;border-top:1px solid rgba(248,248,248,0.06);align-items:center;gap:8px;flex-shrink:0;}
  .cl-foot-av{width:34px;height:34px;border-radius:50%;background:#337418;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#0F0F0F;flex-shrink:0;overflow:hidden;position:relative;}
  .cl-foot-av img{width:100%;height:100%;object-fit:cover;}
  .cl-foot-online{position:absolute;bottom:0;right:0;width:10px;height:10px;border-radius:50%;background:#5DD62C;border:2px solid #111;}
  .cl-foot-info{flex:1;min-width:0;}
  .cl-foot-name{font-size:13px;font-weight:600;color:#F8F8F8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .cl-foot-status{font-size:11px;color:#5DD62C;}
  .cl-foot-btn{width:28px;height:28px;border-radius:6px;border:none;background:none;cursor:pointer;color:rgba(248,248,248,0.35);display:flex;align-items:center;justify-content:center;transition:color 0.15s,background 0.15s;}
  .cl-foot-btn:hover{color:#F8F8F8;background:rgba(248,248,248,0.08);}
  .cl-foot-btn.danger:hover{color:#f87171;background:rgba(239,68,68,0.1);}
  /* Topbar avatar button — hidden on desktop, shown on mobile */
  .cl-topbar-av-btn{display:none;}

  /* MAIN */
  .cl-main{flex:1;display:flex;flex-direction:column;overflow:hidden;background:#0F0F0F;min-width:0;}
  .cl-topbar{height:54px;min-height:54px;background:#0F0F0F;border-bottom:1px solid rgba(248,248,248,0.07);display:flex;align-items:center;padding:0 16px;gap:10px;flex-shrink:0;}
  .cl-topbar-left{display:flex;align-items:center;gap:8px;flex:1;min-width:0;}
  .cl-topbar-channel{font-size:15px;font-weight:700;color:#F8F8F8;white-space:nowrap;}
  .cl-topbar-sep{color:rgba(248,248,248,0.15);margin:0 4px;}
  .cl-topbar-desc{font-size:12px;color:rgba(248,248,248,0.35);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .cl-topbar-right{display:flex;align-items:center;gap:2px;flex-shrink:0;}
  .cl-topbar-btn{width:34px;height:34px;border-radius:8px;border:none;background:none;cursor:pointer;color:rgba(248,248,248,0.4);display:flex;align-items:center;justify-content:center;transition:color 0.15s,background 0.15s;position:relative;}
  .cl-topbar-btn:hover{color:#F8F8F8;background:rgba(248,248,248,0.07);}
  .cl-notif-badge{position:absolute;top:5px;right:5px;width:15px;height:15px;border-radius:50%;background:#5DD62C;color:#0F0F0F;font-size:8px;font-weight:800;display:flex;align-items:center;justify-content:center;border:1.5px solid #0F0F0F;}
  .cl-mobile-menu{display:none;width:34px;height:34px;border-radius:8px;border:none;background:rgba(248,248,248,0.06);cursor:pointer;color:#F8F8F8;align-items:center;justify-content:center;flex-shrink:0;}
  .cl-outlet{flex:1;overflow:hidden;display:flex;flex-direction:column;}

  /* OVERLAY */
  .cl-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:40;backdrop-filter:blur(2px);animation:fadeIn 0.2s ease;}
  .cl-overlay.show{display:block;}

  /* MODAL */
  .cl-modal-bg{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:100;align-items:center;justify-content:center;animation:fadeIn 0.15s ease;}
  .cl-modal-bg.show{display:flex;}
  .cl-modal{background:#1a1a1a;border:1px solid rgba(93,214,44,0.2);border-radius:16px;padding:24px;width:100%;max-width:380px;margin:16px;box-shadow:0 24px 64px rgba(0,0,0,0.8);animation:popIn 0.2s ease;}
  .cl-modal h3{font-size:16px;font-weight:700;color:#F8F8F8;margin:0 0 4px;}
  .cl-modal p{font-size:13px;color:rgba(248,248,248,0.45);margin:0 0 18px;}
  .cl-modal-input{width:100%;padding:11px 14px;background:#0F0F0F;border:1.5px solid rgba(93,214,44,0.25);border-radius:10px;color:#F8F8F8;font-size:14px;font-family:inherit;outline:none;transition:border-color 0.2s;margin-bottom:16px;}
  .cl-modal-input:focus{border-color:#5DD62C;}
  .cl-modal-input::placeholder{color:rgba(248,248,248,0.25);}
  .cl-modal-actions{display:flex;gap:8px;justify-content:flex-end;}
  .cl-modal-cancel{padding:9px 18px;border-radius:8px;border:1px solid rgba(248,248,248,0.12);background:none;color:rgba(248,248,248,0.6);font-size:13px;font-family:inherit;cursor:pointer;transition:background 0.15s;}
  .cl-modal-cancel:hover{background:rgba(248,248,248,0.06);}
  .cl-modal-create{padding:9px 18px;border-radius:8px;border:none;background:linear-gradient(135deg,#5DD62C,#337418);color:#0F0F0F;font-size:13px;font-weight:700;font-family:inherit;cursor:pointer;transition:opacity 0.15s;}
  .cl-modal-create:hover{opacity:0.9;}
  .cl-modal-create:disabled{opacity:0.5;cursor:not-allowed;}

  /* NOTIF PANEL */
  .cl-notif-panel{display:none;position:fixed;top:54px;right:16px;width:300px;background:#1a1a1a;border:1px solid rgba(248,248,248,0.1);border-radius:12px;z-index:60;box-shadow:0 16px 48px rgba(0,0,0,0.7);animation:popIn 0.15s ease;overflow:hidden;}
  .cl-notif-panel.show{display:block;}
  .cl-notif-head{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid rgba(248,248,248,0.07);}
  .cl-notif-head span{font-size:13px;font-weight:700;color:#F8F8F8;}
  .cl-notif-clear{font-size:11px;color:#5DD62C;background:none;border:none;cursor:pointer;}
  .cl-notif-item{display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border-bottom:1px solid rgba(248,248,248,0.05);cursor:pointer;transition:background 0.15s;}
  .cl-notif-item:hover{background:rgba(248,248,248,0.04);}
  .cl-notif-av{width:32px;height:32px;border-radius:50%;background:#202020;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#5DD62C;flex-shrink:0;}
  .cl-notif-body{flex:1;min-width:0;}
  .cl-notif-name{font-size:12px;font-weight:600;color:#F8F8F8;}
  .cl-notif-text{font-size:11px;color:rgba(248,248,248,0.45);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .cl-notif-time{font-size:10px;color:rgba(248,248,248,0.25);margin-top:2px;}
  .cl-notif-dot{width:7px;height:7px;border-radius:50%;background:#5DD62C;flex-shrink:0;margin-top:4px;}

  /* PROFILE MENU */
  .cl-profile-menu{display:none;position:fixed;bottom:70px;left:68px;width:210px;background:#1a1a1a;border:1px solid rgba(248,248,248,0.1);border-radius:12px;z-index:60;overflow:hidden;box-shadow:0 16px 48px rgba(0,0,0,0.7);animation:popIn 0.15s ease;}
  .cl-profile-menu.show{display:block;}
  .cl-profile-menu-head{padding:12px 14px;border-bottom:1px solid rgba(248,248,248,0.07);}
  .cl-profile-menu-name{font-size:13px;font-weight:700;color:#F8F8F8;}
  .cl-profile-menu-email{font-size:11px;color:rgba(248,248,248,0.4);margin-top:1px;}
  .cl-pmenu-item{display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;font-size:13px;color:rgba(248,248,248,0.7);transition:background 0.15s,color 0.15s;border:none;background:none;width:100%;text-align:left;font-family:inherit;}
  .cl-pmenu-item:hover{background:rgba(248,248,248,0.05);color:#F8F8F8;}
  .cl-pmenu-item.danger:hover{background:rgba(239,68,68,0.08);color:#f87171;}
  .cl-pmenu-sep{height:1px;background:rgba(248,248,248,0.07);margin:4px 0;}

  /* EMPTY */
  .cl-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:rgba(248,248,248,0.2);}
  .cl-empty h3{font-size:16px;font-weight:600;margin:0;}
  .cl-empty p{font-size:13px;margin:0;opacity:0.7;}

  /* ── MOBILE RESPONSIVE ── */
  @media(max-width:768px){
    /* Hide desktop rail, show hamburger */
    .cl-rail{display:none;}
    .cl-mobile-menu{display:flex;}
    /* Show topbar avatar on mobile */
    .cl-topbar-av-btn{display:flex;}

    /* Sidebar: full-height drawer from left */
    .cl-sidebar{
      position:fixed;top:0;left:0;bottom:0;
      transform:translateX(-100%);
      z-index:50;
      width:min(280px, 85vw);
      display:flex;
      flex-direction:column;
    }
    .cl-sidebar.open{transform:translateX(0);animation:slideIn 0.25s ease;}

    /* Sidebar footer — show on mobile */
    .cl-sidebar-foot{
      display:flex;
      padding:12px 14px;
      padding-bottom:max(14px, env(safe-area-inset-bottom, 14px));
      background:#111;
      flex-shrink:0;
    }

    /* Topbar */
    .cl-topbar{
      padding:0 12px;
      padding-left:max(12px, env(safe-area-inset-left));
      padding-right:max(12px, env(safe-area-inset-right));
    }
    .cl-topbar-desc{display:none;}
    .cl-topbar-channel{font-size:14px;}

    /* Notification panel — full width on mobile */
    .cl-notif-panel{
      right:8px;left:8px;width:auto;
      top:58px;
      max-height:70vh;
      overflow-y:auto;
    }

    /* Profile menu — bottom of screen */
    .cl-profile-menu{
      left:8px;right:8px;width:auto;
      bottom:calc(8px + env(safe-area-inset-bottom, 0px));
      border-radius:16px;
    }

    /* Modal — full width with safe area */
    .cl-modal{
      margin:12px;
      margin-bottom:max(12px, env(safe-area-inset-bottom));
    }

    /* Sidebar scroll — more room */
    .cl-sidebar-scroll{padding-bottom:8px;}

    /* Channel/DM buttons — bigger tap targets */
    .cl-ch-btn{padding:9px 14px;font-size:14px;}
    .cl-dm-btn{padding:9px 14px;font-size:14px;}

    /* Outlet — full height */
    .cl-outlet{height:100%;}
  }

  @media(max-width:480px){
    .cl-topbar{padding:0 10px;}
    .cl-modal{margin:8px;}
    .cl-sidebar{width:min(300px, 92vw);}
    .cl-ws-name{font-size:14px;}
  }

  /* Safe area for notched phones (iPhone X+) */
  @supports(padding:max(0px)){
    .cl-shell{
      padding-left:env(safe-area-inset-left);
      padding-right:env(safe-area-inset-right);
    }
  }
`

export const ChatLayout: React.FC = () => {
  const [activeTab, setActiveTab]           = useState<NavTab>('chats')
  const [view, setView]                     = useState<View>('channel')
  const [sidebarOpen, setSidebarOpen]       = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showNotifs, setShowNotifs]         = useState(false)
  const [showProfile, setShowProfile]       = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [channelSearch, setChannelSearch]   = useState('')
  const [dmSearch, setDmSearch]             = useState('')
  const [notifications, setNotifications]   = useState<Array<{id: string; name: string; text: string; time: string}>>([])
  const [notifCount, setNotifCount]         = useState(0)

  const notifRef   = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  const { channels, activeChannel, setActiveChannel, fetchChannels, createChannel, isCreating } = useChannelStore()
  const { user, logout } = useAuthStore()
  const {
    conversations, activeConversation, isLoadingConversations,
    fetchConversations, openDmWithUser, setActiveConversation,
    searchResults, isSearching, searchUsers, clearSearch,
  } = useDmStore()
  const navigate = useNavigate()

  useEffect(() => { fetchChannels() }, [fetchChannels])
  useEffect(() => {
    if (user) {
      fetchConversations(user.id)
      // Set user online
      dmService.setOnlineStatus(user.id, true)
      // Set offline on unload
      const handleUnload = () => dmService.setOnlineStatus(user.id, false)
      window.addEventListener('beforeunload', handleUnload)
      return () => window.removeEventListener('beforeunload', handleUnload)
    }
  }, [user?.id])

  // Close panels on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current   && !notifRef.current.contains(e.target as Node))   setShowNotifs(false)
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

   // DM search with debounce
   useEffect(() => {
     if (!dmSearch.trim()) { clearSearch(); return }
     const t = setTimeout(() => { if (user) searchUsers(dmSearch, user.id) }, 300)
     return () => clearTimeout(t)
   }, [dmSearch, user?.id])

   // Real-time notifications for new messages
   useEffect(() => {
     if (!user) return

     // Listen for new channel messages
     const channelMessagesSupbase = supabase
       .channel('public:messages')
       .on('postgres_changes', {
         event: 'INSERT',
         schema: 'public',
         table: 'messages',
       }, async (payload) => {
         const newMessage = payload.new as any
         // Only show notification if message is from another user and in a channel we're not currently viewing
         if (newMessage.user_id !== user.id) {
           // Get sender profile
           const { data: senderProfile } = await supabase
             .from('profiles')
             .select('username, avatar_url')
             .eq('id', newMessage.user_id)
             .single()

           // Get channel info
           const { data: channelInfo } = await supabase
             .from('channels')
             .select('name')
             .eq('id', newMessage.channel_id)
             .single()

           // Add notification
           setNotifications(prev => [{
             id: newMessage.id,
             name: senderProfile?.username || 'Unknown',
             text: `In #${channelInfo?.name}: ${newMessage.content}`,
             time: 'just now'
           }, ...prev.slice(0, 4)]) // Keep only 5 most recent

           setNotifCount(prev => Math.min(prev + 1, 99)) // Cap at 99
         }
       })
       .subscribe()

     // Listen for new DM messages
     const dmMessagesSupbase = supabase
       .channel('public:direct_messages')
       .on('postgres_changes', {
         event: 'INSERT',
         schema: 'public',
         table: 'direct_messages',
       }, async (payload) => {
         const newMessage = payload.new as any
         // Only show notification if message is from another user and we're not in that DM
         if (newMessage.sender_id !== user.id) {
           // Get sender profile
           const { data: senderProfile } = await supabase
             .from('profiles')
             .select('username, avatar_url')
             .eq('id', newMessage.sender_id)
             .single()

           // Get conversation info to see if we're in this DM
           const { data: conversation } = await supabase
             .from('direct_conversations')
             .select('participant_a_id, participant_b_id')
             .eq('id', newMessage.conversation_id)
             .single()

           // Check if we're a participant in this conversation
           const isParticipant = conversation
             ? conversation.participant_a_id === user.id || conversation.participant_b_id === user.id
             : false

           // Only notify if we're in the conversation but not currently viewing it
           if (isParticipant && view !== 'dm') {
             // Add notification
             setNotifications(prev => [{
               id: newMessage.id,
               name: senderProfile?.username || 'Unknown',
               text: newMessage.content,
               time: 'just now'
             }, ...prev.slice(0, 4)]) // Keep only 5 most recent

             setNotifCount(prev => Math.min(prev + 1, 99)) // Cap at 99
           }
         }
       })
       .subscribe()

     // Cleanup subscriptions
     return () => {
       channelMessagesSupbase.unsubscribe()
       dmMessagesSupbase.unsubscribe()
     }
   }, [user, view])

  const handleLogout = async () => {
    if (user) await dmService.setOnlineStatus(user.id, false)
    await logout()
    navigate('/login')
  }

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return
    try {
      await createChannel(newChannelName)
      setNewChannelName('')
      setShowCreateModal(false)
    } catch (err: any) {
      alert(err.message || 'Failed to create channel')
    }
  }

  const handleChannelClick = (ch: typeof channels[0]) => {
    setActiveChannel(ch)
    setView('channel')
    setActiveConversation(null)
    setSidebarOpen(false)
  }

  const handleOpenDm = async (otherUserId: string) => {
    if (!user) return
    setDmSearch('')
    clearSearch()
    setSidebarOpen(false)
    await openDmWithUser(user.id, otherUserId)
    setView('dm')
    setActiveChannel(null)
  }

  const handleConvClick = (conv: typeof conversations[0]) => {
    setActiveConversation(conv)
    setView('dm')
    setActiveChannel(null)
    setSidebarOpen(false)
  }

  const filteredChannels = channels.filter(ch =>
    ch.name.toLowerCase().includes(channelSearch.toLowerCase())
  )

  const navItems: { id: NavTab; icon: React.ReactNode; label: string }[] = [
    { id: 'chats',     icon: <MessageSquare size={20} />, label: 'Chats'     },
    { id: 'threads',   icon: <Hash size={20} />,          label: 'Threads'   },
    { id: 'mentions',  icon: <AtSign size={20} />,        label: 'Mentions'  },
    { id: 'bookmarks', icon: <Bookmark size={20} />,      label: 'Bookmarks' },
    { id: 'settings',  icon: <Settings size={20} />,      label: 'Settings'  },
  ]

  const topbarTitle = view === 'dm' && activeConversation
    ? activeConversation.other_user.username
    : view === 'channel' && activeChannel
      ? `# ${activeChannel.name}`
      : null

  const topbarDesc = view === 'channel' && activeChannel
    ? (CHANNEL_DESCS[activeChannel.name] || `Messages in #${activeChannel.name}`)
    : view === 'dm' && activeConversation
      ? (activeConversation.other_user.is_online ? '● Online' : '● Offline')
      : null

  return (
    <>
      <style>{CSS}</style>

      {/* Mobile overlay */}
      <div className={`cl-overlay${sidebarOpen ? ' show' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* Create channel modal */}
      <div className={`cl-modal-bg${showCreateModal ? ' show' : ''}`} onClick={e => { if (e.target === e.currentTarget) setShowCreateModal(false) }}>
        <div className="cl-modal">
          <h3>Create a Channel</h3>
          <p>Channels are where your team communicates.</p>
          <input className="cl-modal-input" placeholder="e.g. design-feedback" value={newChannelName}
            onChange={e => setNewChannelName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreateChannel()} autoFocus />
          <div className="cl-modal-actions">
            <button className="cl-modal-cancel" onClick={() => { setShowCreateModal(false); setNewChannelName('') }}>Cancel</button>
            <button className="cl-modal-create" onClick={handleCreateChannel} disabled={!newChannelName.trim() || isCreating}>
              {isCreating ? 'Creating…' : 'Create Channel'}
            </button>
          </div>
        </div>
      </div>

      {/* Notifications panel */}
      <div ref={notifRef} className={`cl-notif-panel${showNotifs ? ' show' : ''}`}>
        <div className="cl-notif-head">
          <span>Notifications</span>
          <button className="cl-notif-clear" onClick={() => {
            setNotifications([])
            setNotifCount(0)
          }}>Mark all read</button>
        </div>
        {notifications.length > 0 ? (
          notifications.map(n => (
            <div key={n.id} className="cl-notif-item">
              <div className="cl-notif-av">{initials(n.name)}</div>
              <div className="cl-notif-body">
                <div className="cl-notif-name">{n.name}</div>
                <div className="cl-notif-text">{n.text}</div>
                <div className="cl-notif-time">{n.time}</div>
              </div>
              <div className="cl-notif-dot" />
            </div>
          ))
        ) : (
          <div className="cl-search-empty" style={{ padding: '20px', textAlign: 'center' }}>
            No notifications
          </div>
        )}
      </div>

      {/* Profile menu */}
      <div ref={profileRef} className={`cl-profile-menu${showProfile ? ' show' : ''}`}>
        <div className="cl-profile-menu-head">
          <div className="cl-profile-menu-name">{user?.username || 'You'}</div>
          <div className="cl-profile-menu-email">{user?.email}</div>
        </div>
        <button className="cl-pmenu-item"><Check size={14} /> Set as Active</button>
        <button className="cl-pmenu-item"><Settings size={14} /> Preferences</button>
        <div className="cl-pmenu-sep" />
        <button className="cl-pmenu-item danger" onClick={handleLogout}><LogOut size={14} /> Sign Out</button>
      </div>

      <div className="cl-shell">
        {/* ICON RAIL */}
        <aside className="cl-rail">
          <div className="cl-rail-logo">
            <Logo size={38} />
          </div>
          <nav className="cl-rail-nav">
            {navItems.map(item => (
              <button key={item.id} className={`cl-rail-btn${activeTab === item.id ? ' active' : ''}`}
                onClick={() => setActiveTab(item.id)} title={item.label}>
                {item.icon}<span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="cl-rail-bottom">
            <div className="cl-rail-av-wrap" onClick={() => { setShowProfile(!showProfile); setShowNotifs(false) }}>
              <div className="cl-rail-av">
                {user?.avatar_url ? <img src={user.avatar_url} alt={user.username} /> : initials(user?.username)}
              </div>
              <div className="cl-rail-online" />
            </div>
          </div>
        </aside>

        {/* CHANNEL SIDEBAR */}
        <aside className={`cl-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="cl-sidebar-head">
            <div className="cl-ws-row">
              <div className="cl-ws-icon">T</div>
              <span className="cl-ws-name">tardyDevs</span>
              <ChevronDown size={13} style={{ color: 'rgba(248,248,248,0.3)', flexShrink: 0 }} />
            </div>
            {/* Channel filter search */}
            <div className="cl-sidebar-search">
              <Search size={12} style={{ color: 'rgba(248,248,248,0.3)', flexShrink: 0 }} />
              <input placeholder="Filter channels…" value={channelSearch} onChange={e => setChannelSearch(e.target.value)} />
              {channelSearch && <button onClick={() => setChannelSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(248,248,248,0.3)', padding: 0, display: 'flex' }}><X size={11} /></button>}
            </div>
          </div>

          <div className="cl-sidebar-scroll">
            {/* Channels */}
            <div className="cl-sec-head">
              <span className="cl-sec-title">Channels</span>
              <button className="cl-sec-add" title="Create channel" onClick={() => setShowCreateModal(true)}><Plus size={13} /></button>
            </div>
            {filteredChannels.map(ch => (
              <button key={ch.id} className={`cl-ch-btn${activeChannel?.id === ch.id && view === 'channel' ? ' active' : ''}`} onClick={() => handleChannelClick(ch)}>
                <Hash size={14} style={{ flexShrink: 0, opacity: 0.6 }} />
                <span className="cl-ch-name">{ch.name}</span>
                {activeChannel?.id === ch.id && view === 'channel' && <div className="cl-ch-dot" />}
              </button>
            ))}

            {/* Direct Messages */}
            <div className="cl-sec-head" style={{ marginTop: '10px' }}>
              <span className="cl-sec-title">Direct Messages</span>
              <button className="cl-sec-add" title="New DM"><UserPlus size={13} /></button>
            </div>

            {/* DM user search */}
            <div style={{ padding: '0 10px 6px' }}>
              <div className="cl-sidebar-search">
                <Search size={12} style={{ color: 'rgba(248,248,248,0.3)', flexShrink: 0 }} />
                <input
                  placeholder="Search users to message…"
                  value={dmSearch}
                  onChange={e => setDmSearch(e.target.value)}
                />
                {dmSearch && <button onClick={() => { setDmSearch(''); clearSearch() }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(248,248,248,0.3)', padding: 0, display: 'flex' }}><X size={11} /></button>}
              </div>

              {/* Search results */}
              {dmSearch.trim() && (
                <div className="cl-search-results">
                  {isSearching ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '12px' }}>
                      <Loader2 size={16} className="cl-search-spinner" />
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="cl-search-empty">No users found for "{dmSearch}"</div>
                  ) : (
                    searchResults.map(u => (
                      <button key={u.id} className="cl-search-result-item" onClick={() => handleOpenDm(u.id)}>
                        <div className="cl-search-result-av">
                          {u.avatar_url ? <img src={u.avatar_url} alt={u.username} /> : initials(u.username)}
                          {u.is_online && <div className="cl-search-result-online" />}
                        </div>
                        <div>
                          <div className="cl-search-result-name">{u.username}</div>
                          <div className="cl-search-result-status">{u.is_online ? '● Online' : '● Offline'}</div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Existing conversations */}
            {isLoadingConversations ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px' }}>
                <Loader2 size={16} className="cl-search-spinner" />
              </div>
            ) : conversations.map(conv => (
              <button key={conv.id} className={`cl-dm-btn${activeConversation?.id === conv.id && view === 'dm' ? ' active' : ''}`} onClick={() => handleConvClick(conv)}>
                <div className="cl-dm-av">
                  {conv.other_user.avatar_url ? <img src={conv.other_user.avatar_url} alt={conv.other_user.username} /> : initials(conv.other_user.username)}
                  <div className={`cl-dm-dot${conv.other_user.is_online ? '' : ' offline'}`} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="cl-dm-name">{conv.other_user.username}</div>
                  {conv.last_message && <div className="cl-dm-preview">{conv.last_message}</div>}
                </div>
                {(conv.unread_count ?? 0) > 0 && (
                  <div className="cl-dm-unread">{conv.unread_count}</div>
                )}
              </button>
            ))}
          </div>

          {/* ── Sidebar footer — user info + sign out (visible on mobile) ── */}
          <div className="cl-sidebar-foot">
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div className="cl-foot-av">
                {user?.avatar_url ? <img src={user.avatar_url} alt={user?.username} /> : initials(user?.username)}
                <div className="cl-foot-online" />
              </div>
            </div>
            <div className="cl-foot-info">
              <div className="cl-foot-name">{user?.username || 'You'}</div>
              <div className="cl-foot-status">● Online</div>
            </div>
            <button
              className="cl-foot-btn danger"
              title="Sign Out"
              onClick={handleLogout}
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>

        </aside>

        {/* MAIN */}
        <main className="cl-main">
          <header className="cl-topbar">
            <button className="cl-mobile-menu" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Menu">
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className="cl-topbar-left">
              {topbarTitle ? (
                <>
                  <span className="cl-topbar-channel">{topbarTitle}</span>
                  {topbarDesc && <><span className="cl-topbar-sep">|</span><span className="cl-topbar-desc">{topbarDesc}</span></>}
                </>
              ) : (
                <span style={{ fontSize: '15px', color: 'rgba(248,248,248,0.3)' }}>Select a channel or start a DM</span>
              )}
            </div>
            <div className="cl-topbar-right">
               <button className="cl-topbar-btn" title="Notifications" onClick={() => { setShowNotifs(!showNotifs); setShowProfile(false); if (!showNotifs) setNotifCount(0) }}>
                 <Bell size={17} />
                 {notifCount > 0 && <span className="cl-notif-badge">{notifCount}</span>}
               </button>
               {/* User avatar — mobile only, opens profile menu */}
               <button
                 className="cl-topbar-btn cl-topbar-av-btn"
                 title="Profile"
                 onClick={() => { setShowProfile(!showProfile); setShowNotifs(false) }}
                 aria-label="Profile menu"
               >
                 <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#337418', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#0F0F0F', overflow: 'hidden', flexShrink: 0 }}>
                   {user?.avatar_url ? <img src={user.avatar_url} alt={user?.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(user?.username)}
                 </div>
               </button>
             </div>
          </header>

          <div className="cl-outlet">
            {view === 'dm' && activeConversation
              ? <DmChat onBack={() => { setView('channel'); setActiveConversation(null) }} />
              : view === 'channel' && activeChannel
                ? <Outlet />
                : <NoChannelSelected onPickChannel={() => setSidebarOpen(true)} />
            }
          </div>
        </main>
      </div>
    </>
  )
}

const NoChannelSelected: React.FC<{ onPickChannel: () => void }> = ({ onPickChannel }) => (
  <div className="cl-empty">
    <MessageSquare size={56} style={{ opacity: 0.2 }} />
    <h3>Welcome to tardyDevs</h3>
    <p>Pick a channel or search for a user to start a DM</p>
    <button onClick={onPickChannel} style={{ marginTop: '8px', padding: '10px 20px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#5DD62C,#337418)', color: '#0F0F0F', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
      Browse Channels
    </button>
  </div>
)
