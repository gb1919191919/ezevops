'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { useRBAC } from '@/hooks/useRBAC';
import { ChatChannel, ChannelMessage } from '@/types';
import { formatDate, cn } from '@/lib/utils';
import {
  MessageSquare,
  Hash,
  Lock,
  Plus,
  Send,
  Users,
  Paperclip,
  Image as ImageIcon,
  X,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';

export function TeamChannels() {
  const chatChannels = useAppStore((s) => s.chatChannels || []);
  const channelMessages = useAppStore((s) => s.channelMessages || []);
  const sendChannelMessage = useAppStore((s) => s.sendChannelMessage);
  const createChatChannel = useAppStore((s) => s.createChatChannel);
  const currentUser = useAppStore((s) => s.currentUser);
  const staffProfiles = useAppStore((s) => s.staffProfiles);
  const { isOwner, isManager } = useRBAC();

  const [activeChannelId, setActiveChannelId] = useState<string>(
    chatChannels.length > 0 ? chatChannels[0].id : 'chan-ops'
  );
  const [messageInput, setMessageInput] = useState('');
  const [newChannelModalOpen, setNewChannelModalOpen] = useState(false);
  const [newChanName, setNewChanName] = useState('');
  const [newChanDesc, setNewChanDesc] = useState('');
  const [newChanIsPrivate, setNewChanIsPrivate] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Active channel
  const activeChannel = chatChannels.find((c) => c.id === activeChannelId) || chatChannels[0];

  // Messages in active channel
  const currentMessages = useMemo(() => {
    return channelMessages.filter((m) => m.channel_id === activeChannelId);
  }, [channelMessages, activeChannelId]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    sendChannelMessage({
      channel_id: activeChannelId,
      sender_id: currentUser?.id || 'admin',
      sender_name: currentUser?.full_name || 'Staff Member',
      sender_role: currentUser?.roles?.[0]?.label || 'OPERATOR',
      message: messageInput.trim(),
    });

    setMessageInput('');
  };

  const handleCreateChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChanName.trim()) {
      toast.error('Channel name is required.');
      return;
    }

    const cleanName = newChanName.trim().toLowerCase().replace(/\s+/g, '-');
    createChatChannel({
      name: cleanName,
      description: newChanDesc.trim() || undefined,
      is_private: newChanIsPrivate,
      allowed_roles: newChanIsPrivate ? ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] : undefined,
    });

    toast.success(`Created channel #${cleanName}`);
    setNewChannelModalOpen(false);
    setNewChanName('');
    setNewChanDesc('');
    setNewChanIsPrivate(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-zinc-100">
              Role-Based Team Channels & Group Communications
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time inter-department communication between Operations, Mechanics, Hub Managers, and Accounts
          </p>
        </div>

        {(isOwner || isManager) && (
          <button
            onClick={() => setNewChannelModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Channel</span>
          </button>
        )}
      </div>

      {/* Main Chat Interface */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[650px] border border-[#2a2a2f] rounded-2xl overflow-hidden bg-[#18181b]">
        {/* Left Sidebar: Channels List (3 cols) */}
        <div className="md:col-span-4 lg:col-span-3 border-r border-[#27272a] bg-[#141416] p-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Team Channels ({chatChannels.length})
              </span>
            </div>

            <div className="space-y-1">
              {chatChannels.map((chan) => {
                const isActive = chan.id === activeChannelId;
                const count = channelMessages.filter((m) => m.channel_id === chan.id).length;

                return (
                  <button
                    key={chan.id}
                    onClick={() => setActiveChannelId(chan.id)}
                    className={cn(
                      'w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition text-left',
                      isActive
                        ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                        : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {chan.is_private ? (
                        <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <Hash className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      )}
                      <span className="truncate">{chan.name}</span>
                    </div>

                    <span className="text-[10px] font-mono text-zinc-500">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* User status footer */}
          <div className="pt-3 border-t border-zinc-800 flex items-center gap-2.5 text-xs">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center font-mono text-[11px] border border-emerald-500/30">
              {currentUser?.full_name?.slice(0, 2).toUpperCase() || 'OP'}
            </div>
            <div className="truncate">
              <div className="font-bold text-zinc-200 truncate">{currentUser?.full_name || 'Staff User'}</div>
              <div className="text-[10px] text-zinc-500">{currentUser?.roles?.[0]?.label || 'OPERATOR'}</div>
            </div>
          </div>
        </div>

        {/* Right Area: Messages Thread & Input (9 cols) */}
        <div className="md:col-span-8 lg:col-span-9 flex flex-col justify-between bg-[#18181b]">
          {/* Channel Header */}
          <div className="p-4 border-b border-[#27272a] bg-[#141416] flex items-center justify-between">
            <div className="flex items-center gap-2">
              {activeChannel?.is_private ? (
                <Lock className="w-4 h-4 text-amber-400" />
              ) : (
                <Hash className="w-4 h-4 text-blue-400" />
              )}
              <h3 className="font-bold text-zinc-100 text-sm">{activeChannel?.name}</h3>
              {activeChannel?.description && (
                <span className="text-xs text-zinc-500 hidden sm:inline">• {activeChannel.description}</span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
              <Users className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-[11px]">{staffProfiles.length} Members</span>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {currentMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 text-xs space-y-2">
                <Hash className="w-8 h-8 text-zinc-700" />
                <p>Welcome to #{activeChannel?.name}!</p>
                <p className="text-[11px] text-zinc-600">Be the first to post a message or coordination update.</p>
              </div>
            ) : (
              currentMessages.map((msg) => {
                const isMe = msg.sender_id === currentUser?.id;
                return (
                  <div key={msg.id} className="flex items-start gap-3 group text-xs">
                    <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold flex items-center justify-center font-mono text-[11px] shrink-0">
                      {msg.sender_name.slice(0, 2).toUpperCase()}
                    </div>

                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-200">{msg.sender_name}</span>
                        <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono text-[10px]">
                          {msg.sender_role}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {formatDate(msg.created_at)}
                        </span>
                      </div>

                      <div className="p-3 rounded-2xl bg-[#141416] border border-[#27272a] text-zinc-200 leading-relaxed max-w-2xl">
                        {msg.message}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Box */}
          <div className="p-3.5 border-t border-[#27272a] bg-[#141416]">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <input
                type="text"
                placeholder={`Message #${activeChannel?.name}...`}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#18181b] border border-[#2a2a2f] text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition"
              />
              <button
                type="submit"
                disabled={!messageInput.trim()}
                className="px-4 py-2.5 bg-blue-600 disabled:opacity-40 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Modal: Create Channel */}
      {newChannelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#1c1c1f] border border-[#2a2a2f] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Hash className="w-4 h-4 text-blue-400" />
                <span>Create Channel</span>
              </h3>
              <button
                onClick={() => setNewChannelModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateChannel} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Channel Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. firmware-updates or battery-swaps"
                  value={newChanName}
                  onChange={(e) => setNewChanName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Description</label>
                <input
                  type="text"
                  placeholder="What is this channel about?"
                  value={newChanDesc}
                  onChange={(e) => setNewChanDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-[#141416] border border-[#27272a]">
                <input
                  type="checkbox"
                  id="isPrivate"
                  checked={newChanIsPrivate}
                  onChange={(e) => setNewChanIsPrivate(e.target.checked)}
                  className="rounded text-blue-500 focus:ring-0"
                />
                <label htmlFor="isPrivate" className="text-xs text-zinc-300 font-semibold cursor-pointer">
                  Private Channel (Restricted to Managers & Admins)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#27272a]">
                <button
                  type="button"
                  onClick={() => setNewChannelModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-sm"
                >
                  Create Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
