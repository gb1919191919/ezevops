"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/store/appStore";
import { useRBAC } from "@/hooks/useRBAC";
import { ChatChannel, ChannelMessage } from "@/types";
import { formatDate, cn } from "@/lib/utils";
import {
  MessageSquare,
  Hash,
  Lock,
  Plus,
  Send,
  Users,
  Paperclip,
  X,
  Shield,
  Trash2,
  FileText,
  Settings,
  Search,
  Check,
  UserCheck,
  UserPlus,
  Globe,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

export function TeamChannels() {
  const chatChannels = useAppStore((s) => s.chatChannels || []);
  const channelMessages = useAppStore((s) => s.channelMessages || []);
  const sendChannelMessage = useAppStore((s) => s.sendChannelMessage);
  const createChatChannel = useAppStore((s) => s.createChatChannel);
  const updateChatChannel = useAppStore((s) => s.updateChatChannel);
  const deleteChatChannel = useAppStore((s) => s.deleteChatChannel);
  const currentUser = useAppStore((s) => s.currentUser);
  const staffProfiles = useAppStore((s) => s.staffProfiles || []);
  const { isOwner, isManager } = useRBAC();

  const [activeChannelId, setActiveChannelId] = useState<string>(
    chatChannels.length > 0 ? chatChannels[0].id : "chan-ops"
  );
  const [messageInput, setMessageInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New Channel Modal State
  const [newChannelModalOpen, setNewChannelModalOpen] = useState(false);
  const [newChanName, setNewChanName] = useState("");
  const [newChanDesc, setNewChanDesc] = useState("");
  const [newChanIsPrivate, setNewChanIsPrivate] = useState(false);
  const [newAccessMode, setNewAccessMode] = useState<"ALL" | "ROLES" | "MEMBERS" | "BOTH">("ROLES");
  const [newSelectedRoles, setNewSelectedRoles] = useState<string[]>(["MANAGER", "SUPER_ADMIN"]);
  const [newSelectedMembers, setNewSelectedMembers] = useState<string[]>([]);
  const [newStaffSearch, setNewStaffSearch] = useState("");

  // Edit Channel Modal State (Editable Access After Creation)
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<ChatChannel | null>(null);
  const [editChanName, setEditChanName] = useState("");
  const [editChanDesc, setEditChanDesc] = useState("");
  const [editChanIsPrivate, setEditChanIsPrivate] = useState(false);
  const [editAccessMode, setEditAccessMode] = useState<"ALL" | "ROLES" | "MEMBERS" | "BOTH">("ROLES");
  const [editSelectedRoles, setEditSelectedRoles] = useState<string[]>([]);
  const [editSelectedMembers, setEditSelectedMembers] = useState<string[]>([]);
  const [editStaffSearch, setEditStaffSearch] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Granular System & Operational Roles for Channel Entitlements
  const availableRoles = [
    { key: "SUPER_ADMIN", label: "Super Admin (Owner)", desc: "Executive system governance" },
    { key: "MANAGER", label: "Operations Manager", desc: "Approvals & dispatch oversight" },
    { key: "HUB_MANAGER", label: "Hub Manager", desc: "Regional station management" },
    { key: "TECHNICIAN", label: "Field Mechanic / Technician", desc: "Maintenance & repairs" },
    { key: "RSA", label: "Roadside Assistance (RSA)", desc: "Field sweeps & roadside recovery" },
    { key: "DISPUTE_EXECUTIVE", label: "Customer Dispute Support", desc: "Disputes & refund claims" },
    { key: "OPERATOR", label: "General Operations", desc: "Fleet coordination & check-ins" },
  ];

  // User-Permitted Channels
  const visibleChannels = useMemo(() => {
    return chatChannels.filter((c) => {
      if (!c.is_private) return true;
      if (isOwner) return true;

      // Role check
      const userRoles = (currentUser?.roles || []).map((r) =>
        (r.code || (r as any).role || "").toUpperCase()
      );
      const hasRole = c.allowed_roles && c.allowed_roles.length > 0
        ? c.allowed_roles.some((r) => userRoles.includes(r.toUpperCase()))
        : false;

      // Specific member check
      const hasMember = c.allowed_members && c.allowed_members.length > 0
        ? c.allowed_members.includes(currentUser?.id)
        : false;

      // Channel creator check
      const isCreator = c.created_by === currentUser?.id;

      return hasRole || hasMember || isCreator;
    });
  }, [chatChannels, isOwner, currentUser]);

  // Active channel
  const activeChannel = visibleChannels.find((c) => c.id === activeChannelId) || visibleChannels[0] || chatChannels[0];

  // Messages in active channel
  const currentMessages = useMemo(() => {
    if (!activeChannel) return [];
    return channelMessages.filter((m) => m.channel_id === activeChannel.id);
  }, [channelMessages, activeChannel]);

  // Check if current user can manage/edit channel access
  const canManageChannel = (channel: ChatChannel | null | undefined) => {
    if (!channel) return false;
    if (isOwner || isManager) return true;
    if (channel.created_by === currentUser?.id) return true;
    return false;
  };

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          setAttachedFiles((prev) => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });
    toast.success(`Attached ${files.length} file(s)`);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() && attachedFiles.length === 0) return;
    if (!activeChannel) return;

    const formattedAttachments = attachedFiles.map((file, idx) => ({
      name: `Attachment_${idx + 1}`,
      url: file,
      type: file.startsWith("data:image") ? "image/png" : "application/pdf",
    }));

    sendChannelMessage({
      channel_id: activeChannel.id,
      sender_id: currentUser?.id || "admin",
      sender_name: currentUser?.full_name || "Staff Member",
      sender_role: currentUser?.roles?.[0]?.label || "OPERATOR",
      message: messageInput.trim() || (attachedFiles.length > 0 ? "Sent media attachments" : ""),
      attachments: formattedAttachments.length > 0 ? formattedAttachments : undefined,
    });

    setMessageInput("");
    setAttachedFiles([]);
  };

  // Create Channel
  const handleCreateChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChanName.trim()) {
      toast.error("Channel name is required.");
      return;
    }

    const cleanName = newChanName.trim().toLowerCase().replace(/\s+/g, "-");
    createChatChannel({
      name: cleanName,
      description: newChanDesc.trim() || undefined,
      is_private: newChanIsPrivate,
      allowed_roles: newChanIsPrivate ? newSelectedRoles : undefined,
      allowed_members: newChanIsPrivate ? newSelectedMembers : undefined,
      created_by: currentUser?.id,
    });

    toast.success(`Created channel #${cleanName}`);
    setNewChannelModalOpen(false);
    setNewChanName("");
    setNewChanDesc("");
    setNewChanIsPrivate(false);
    setNewAccessMode("ROLES");
    setNewSelectedRoles(["MANAGER", "SUPER_ADMIN"]);
    setNewSelectedMembers([]);
    setNewStaffSearch("");
  };

  // Open Edit Channel Modal
  const openEditModal = (channel: ChatChannel) => {
    setEditingChannel(channel);
    setEditChanName(channel.name);
    setEditChanDesc(channel.description || "");
    setEditChanIsPrivate(Boolean(channel.is_private));
    setEditSelectedRoles(channel.allowed_roles || []);
    setEditSelectedMembers(channel.allowed_members || []);
    setEditStaffSearch("");
    setShowDeleteConfirm(false);

    if (!channel.is_private) {
      setEditAccessMode("ALL");
    } else if (channel.allowed_roles?.length && channel.allowed_members?.length) {
      setEditAccessMode("BOTH");
    } else if (channel.allowed_members?.length) {
      setEditAccessMode("MEMBERS");
    } else {
      setEditAccessMode("ROLES");
    }

    setEditModalOpen(true);
  };

  // Save Channel Access Updates
  const handleUpdateChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChannel) return;
    if (!editChanName.trim()) {
      toast.error("Channel name cannot be empty.");
      return;
    }

    const cleanName = editChanName.trim().toLowerCase().replace(/\s+/g, "-");
    updateChatChannel(editingChannel.id, {
      name: cleanName,
      description: editChanDesc.trim() || undefined,
      is_private: editChanIsPrivate,
      allowed_roles: editChanIsPrivate ? editSelectedRoles : [],
      allowed_members: editChanIsPrivate ? editSelectedMembers : [],
    });

    toast.success(`Updated access settings for #${cleanName}`);
    setEditModalOpen(false);
    setEditingChannel(null);
  };

  // Delete Channel
  const handleDeleteChannel = () => {
    if (!editingChannel) return;
    if (editingChannel.is_system) {
      toast.error("System communication channels cannot be deleted.");
      return;
    }

    deleteChatChannel(editingChannel.id);
    toast.success(`Channel #${editingChannel.name} deleted.`);
    setEditModalOpen(false);
    setEditingChannel(null);
    setShowDeleteConfirm(false);

    // Switch to another available channel
    const remaining = visibleChannels.filter((c) => c.id !== editingChannel.id);
    if (remaining.length > 0) {
      setActiveChannelId(remaining[0].id);
    }
  };

  // Filtered staff for member search
  const filteredStaffNew = useMemo(() => {
    if (!newStaffSearch.trim()) return staffProfiles;
    const q = newStaffSearch.toLowerCase();
    return staffProfiles.filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        s.phone.includes(q) ||
        s.roles?.some((r) => r.label.toLowerCase().includes(q))
    );
  }, [staffProfiles, newStaffSearch]);

  const filteredStaffEdit = useMemo(() => {
    if (!editStaffSearch.trim()) return staffProfiles;
    const q = editStaffSearch.toLowerCase();
    return staffProfiles.filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        s.phone.includes(q) ||
        s.roles?.some((r) => r.label.toLowerCase().includes(q))
    );
  }, [staffProfiles, editStaffSearch]);

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
            Real-time inter-department communication with granular role & member access controls
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
        {/* Left Sidebar: Channels List */}
        <div className="md:col-span-4 lg:col-span-3 border-r border-[#27272a] bg-[#141416] p-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Team Channels ({visibleChannels.length})
              </span>
            </div>

            <div className="space-y-1 overflow-y-auto max-h-[480px]">
              {visibleChannels.map((chan) => {
                const isActive = chan.id === activeChannel?.id;
                const count = channelMessages.filter((m) => m.channel_id === chan.id).length;
                const canEdit = canManageChannel(chan);

                return (
                  <div
                    key={chan.id}
                    className={cn(
                      "group w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition text-left",
                      isActive
                        ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                        : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200"
                    )}
                  >
                    <button
                      onClick={() => setActiveChannelId(chan.id)}
                      className="flex items-center gap-2 truncate flex-1 text-left"
                    >
                      {chan.is_private ? (
                        <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <Hash className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      )}
                      <span className="truncate">{chan.name}</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {canEdit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(chan);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-700/60 text-zinc-400 hover:text-blue-300 transition"
                          title="Manage channel access & settings"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <span className="text-[10px] font-mono text-zinc-500">{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* User status footer */}
          <div className="pt-3 border-t border-zinc-800 flex items-center gap-2.5 text-xs">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center font-mono text-[11px] border border-emerald-500/30">
              {currentUser?.full_name?.slice(0, 2).toUpperCase() || "OP"}
            </div>
            <div className="truncate">
              <div className="font-bold text-zinc-200 truncate">{currentUser?.full_name || "Staff User"}</div>
              <div className="text-[10px] text-zinc-500">{currentUser?.roles?.[0]?.label || "OPERATOR"}</div>
            </div>
          </div>
        </div>

        {/* Right Area: Messages Thread & Input */}
        <div className="md:col-span-8 lg:col-span-9 flex flex-col justify-between bg-[#18181b]">
          {/* Channel Header */}
          <div className="p-4 border-b border-[#27272a] bg-[#141416] flex items-center justify-between">
            <div className="flex items-center gap-2 truncate mr-2">
              {activeChannel?.is_private ? (
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <Hash className="w-4 h-4 text-blue-400 shrink-0" />
              )}
              <h3 className="font-bold text-zinc-100 text-sm truncate">{activeChannel?.name}</h3>
              {activeChannel?.description && (
                <span className="text-xs text-zinc-500 hidden sm:inline truncate">
                  • {activeChannel.description}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Access Tag */}
              {activeChannel?.is_private ? (
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
                  <Shield className="w-3 h-3" />
                  <span>
                    {activeChannel.allowed_roles?.length || 0} Roles • {activeChannel.allowed_members?.length || 0} Members
                  </span>
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-bold">
                  <Globe className="w-3 h-3" />
                  <span>Public Channel</span>
                </div>
              )}

              {/* Manage Access Button */}
              {canManageChannel(activeChannel) && (
                <button
                  onClick={() => activeChannel && openEditModal(activeChannel)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
                  title="Edit permissions, add/remove members or roles"
                >
                  <Settings className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Manage Access</span>
                </button>
              )}
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
                const attachments = (msg as any).attachments || [];

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

                      <div className="p-3 rounded-2xl bg-[#141416] border border-[#27272a] text-zinc-200 leading-relaxed max-w-2xl space-y-2">
                        {msg.message && <p>{msg.message}</p>}

                        {/* Media Attachments in Message */}
                        {attachments.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                            {attachments.map((item: any, fIdx: number) => {
                              const fileUrl = typeof item === "string" ? item : item?.url || "";
                              const fileName = typeof item === "object" && item?.name ? item.name : `Document #${fIdx + 1}`;
                              return (
                                <a
                                  key={fIdx}
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 aspect-video flex items-center justify-center group/att"
                                >
                                  {fileUrl.startsWith("data:image") || fileUrl.startsWith("http") ? (
                                    <img src={fileUrl} alt="Attached media" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="p-2 text-center text-[10px] text-zinc-400">
                                      <FileText className="w-4 h-4 mx-auto text-blue-400 mb-1" />
                                      <span>{fileName}</span>
                                    </div>
                                  )}
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Box with Media Uploader */}
          <div className="p-3.5 border-t border-[#27272a] bg-[#141416] space-y-2">
            {attachedFiles.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {attachedFiles.map((file, idx) => (
                  <div key={idx} className="relative rounded-lg overflow-hidden border border-zinc-700 w-12 h-12 shrink-0 group">
                    <img src={file} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute inset-0 bg-black/60 text-rose-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-xl bg-[#18181b] hover:bg-zinc-800 border border-[#2a2a2f] text-zinc-400 hover:text-zinc-200 transition"
                title="Attach media or files"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                className="hidden"
              />

              <input
                type="text"
                placeholder={`Message #${activeChannel?.name || "channel"}...`}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#18181b] border border-[#2a2a2f] text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition"
              />

              <button
                type="submit"
                disabled={!messageInput.trim() && attachedFiles.length === 0}
                className="px-4 py-2.5 bg-blue-600 disabled:opacity-40 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Modal 1: Create Channel with Granular Access */}
      {newChannelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-[#1c1c1f] border border-[#2a2a2f] rounded-2xl shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Hash className="w-4 h-4 text-blue-400" />
                <span>Create Channel with Granular Access</span>
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
                  placeholder="e.g. battery-swaps or rapid-rsa"
                  value={newChanName}
                  onChange={(e) => setNewChanName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Description</label>
                <input
                  type="text"
                  placeholder="What is the purpose of this channel?"
                  value={newChanDesc}
                  onChange={(e) => setNewChanDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#141416] border border-[#2a2a2f] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isPrivateNew"
                      checked={newChanIsPrivate}
                      onChange={(e) => setNewChanIsPrivate(e.target.checked)}
                      className="rounded text-blue-500 focus:ring-0"
                    />
                    <label htmlFor="isPrivateNew" className="text-xs text-zinc-200 font-bold cursor-pointer flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Restricted / Private Channel Access</span>
                    </label>
                  </div>
                  <span className="text-[10px] text-zinc-500">
                    {newChanIsPrivate ? "Restricted" : "Open to All Staff"}
                  </span>
                </div>

                {newChanIsPrivate && (
                  <div className="pt-2 border-t border-zinc-800 space-y-3">
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="newAccessMode"
                          checked={newAccessMode === "ROLES"}
                          onChange={() => setNewAccessMode("ROLES")}
                        />
                        <span className="text-zinc-300 font-medium">By Roles</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="newAccessMode"
                          checked={newAccessMode === "MEMBERS"}
                          onChange={() => setNewAccessMode("MEMBERS")}
                        />
                        <span className="text-zinc-300 font-medium">Specific Members</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="newAccessMode"
                          checked={newAccessMode === "BOTH"}
                          onChange={() => setNewAccessMode("BOTH")}
                        />
                        <span className="text-zinc-300 font-medium">Roles + Members Combined</span>
                      </label>
                    </div>

                    {(newAccessMode === "ROLES" || newAccessMode === "BOTH") && (
                      <div className="space-y-1.5">
                        <span className="text-zinc-400 text-[11px] font-semibold">Allowed Department Roles:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {availableRoles.map((role) => {
                            const isChecked = newSelectedRoles.includes(role.key);
                            return (
                              <label
                                key={role.key}
                                className={cn(
                                  "flex items-center justify-between p-2 rounded-lg border text-[11px] cursor-pointer transition",
                                  isChecked
                                    ? "bg-blue-600/20 border-blue-500/40 text-blue-300"
                                    : "bg-[#18181b] border-zinc-800 text-zinc-400"
                                )}
                              >
                                <div>
                                  <div className="font-semibold">{role.label}</div>
                                  <div className="text-[9px] text-zinc-500">{role.desc}</div>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setNewSelectedRoles((prev) => [...prev, role.key]);
                                    } else {
                                      setNewSelectedRoles((prev) => prev.filter((r) => r !== role.key));
                                    }
                                  }}
                                  className="rounded text-blue-500"
                                />
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {(newAccessMode === "MEMBERS" || newAccessMode === "BOTH") && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400 text-[11px] font-semibold">Allowed Staff Members:</span>
                          <span className="text-[10px] text-blue-400">{newSelectedMembers.length} selected</span>
                        </div>

                        {/* Search Staff */}
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                          <input
                            type="text"
                            placeholder="Search staff by name, email, or role..."
                            value={newStaffSearch}
                            onChange={(e) => setNewStaffSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#18181b] border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                          {filteredStaffNew.map((staff) => {
                            const isChecked = newSelectedMembers.includes(staff.id);
                            return (
                              <label
                                key={staff.id}
                                className={cn(
                                  "flex items-center justify-between p-2 rounded-lg border text-[11px] cursor-pointer transition",
                                  isChecked
                                    ? "bg-blue-600/20 border-blue-500/40 text-blue-300"
                                    : "bg-[#18181b] border-zinc-800 text-zinc-400"
                                )}
                              >
                                <div className="flex items-center gap-2 truncate mr-2">
                                  <div className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-300 font-bold flex items-center justify-center text-[10px]">
                                    {staff.full_name.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div className="truncate">
                                    <div className="font-semibold text-zinc-200 truncate">{staff.full_name}</div>
                                    <div className="text-[10px] text-zinc-500 font-mono truncate">
                                      {staff.email || staff.phone} • {staff.roles?.[0]?.label || "Staff"}
                                    </div>
                                  </div>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setNewSelectedMembers((prev) => [...prev, staff.id]);
                                    } else {
                                      setNewSelectedMembers((prev) => prev.filter((id) => id !== staff.id));
                                    }
                                  }}
                                  className="rounded text-blue-500 shrink-0"
                                />
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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

      {/* Modal 2: Edit Channel Access & Settings (Editable After Channel is Created) */}
      {editModalOpen && editingChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-[#1c1c1f] border border-[#2a2a2f] rounded-2xl shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-400" />
                <h3 className="text-base font-bold text-zinc-100">
                  Manage Access & Settings: #{editingChannel.name}
                </h3>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateChannel} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Channel Handle / Name *</label>
                <input
                  type="text"
                  required
                  value={editChanName}
                  onChange={(e) => setEditChanName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Description</label>
                <input
                  type="text"
                  placeholder="Channel description..."
                  value={editChanDesc}
                  onChange={(e) => setEditChanDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Privacy & Granular Access Controls */}
              <div className="p-3.5 rounded-xl bg-[#141416] border border-[#2a2a2f] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isPrivateEdit"
                      checked={editChanIsPrivate}
                      onChange={(e) => setEditChanIsPrivate(e.target.checked)}
                      className="rounded text-blue-500 focus:ring-0"
                    />
                    <label htmlFor="isPrivateEdit" className="text-xs text-zinc-200 font-bold cursor-pointer flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Restricted / Private Access</span>
                    </label>
                  </div>
                  <span className="text-[10px] text-zinc-500">
                    {editChanIsPrivate ? "Restricted Access" : "Public Access (All Staff)"}
                  </span>
                </div>

                {editChanIsPrivate && (
                  <div className="pt-2 border-t border-zinc-800 space-y-3">
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="editAccessMode"
                          checked={editAccessMode === "ROLES"}
                          onChange={() => setEditAccessMode("ROLES")}
                        />
                        <span className="text-zinc-300 font-medium">By Roles</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="editAccessMode"
                          checked={editAccessMode === "MEMBERS"}
                          onChange={() => setEditAccessMode("MEMBERS")}
                        />
                        <span className="text-zinc-300 font-medium">Specific Members</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="editAccessMode"
                          checked={editAccessMode === "BOTH"}
                          onChange={() => setEditAccessMode("BOTH")}
                        />
                        <span className="text-zinc-300 font-medium">Roles + Members Combined</span>
                      </label>
                    </div>

                    {/* Roles Configuration */}
                    {(editAccessMode === "ROLES" || editAccessMode === "BOTH") && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400 text-[11px] font-semibold">Permitted Department Roles:</span>
                          <span className="text-[10px] text-blue-400">{editSelectedRoles.length} roles active</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {availableRoles.map((role) => {
                            const isChecked = editSelectedRoles.includes(role.key);
                            return (
                              <label
                                key={role.key}
                                className={cn(
                                  "flex items-center justify-between p-2 rounded-lg border text-[11px] cursor-pointer transition",
                                  isChecked
                                    ? "bg-blue-600/20 border-blue-500/40 text-blue-300"
                                    : "bg-[#18181b] border-zinc-800 text-zinc-400"
                                )}
                              >
                                <div>
                                  <div className="font-semibold">{role.label}</div>
                                  <div className="text-[9px] text-zinc-500">{role.desc}</div>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setEditSelectedRoles((prev) => [...prev, role.key]);
                                    } else {
                                      setEditSelectedRoles((prev) => prev.filter((r) => r !== role.key));
                                    }
                                  }}
                                  className="rounded text-blue-500"
                                />
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Specific Members Configuration */}
                    {(editAccessMode === "MEMBERS" || editAccessMode === "BOTH") && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400 text-[11px] font-semibold">Permitted Staff Members:</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setEditSelectedMembers(staffProfiles.map((s) => s.id))}
                              className="text-[10px] text-blue-400 hover:underline"
                            >
                              Select All
                            </button>
                            <span className="text-zinc-600">•</span>
                            <button
                              type="button"
                              onClick={() => setEditSelectedMembers([])}
                              className="text-[10px] text-zinc-500 hover:underline"
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        {/* Search Staff */}
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                          <input
                            type="text"
                            placeholder="Filter staff by name, email, or role..."
                            value={editStaffSearch}
                            onChange={(e) => setEditStaffSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#18181b] border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                          {filteredStaffEdit.map((staff) => {
                            const isChecked = editSelectedMembers.includes(staff.id);
                            return (
                              <label
                                key={staff.id}
                                className={cn(
                                  "flex items-center justify-between p-2 rounded-lg border text-[11px] cursor-pointer transition",
                                  isChecked
                                    ? "bg-blue-600/20 border-blue-500/40 text-blue-300"
                                    : "bg-[#18181b] border-zinc-800 text-zinc-400"
                                )}
                              >
                                <div className="flex items-center gap-2 truncate mr-2">
                                  <div className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-300 font-bold flex items-center justify-center text-[10px]">
                                    {staff.full_name.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div className="truncate">
                                    <div className="font-semibold text-zinc-200 truncate">{staff.full_name}</div>
                                    <div className="text-[10px] text-zinc-500 font-mono truncate">
                                      {staff.email || staff.phone} • {staff.roles?.[0]?.label || "Staff"}
                                    </div>
                                  </div>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setEditSelectedMembers((prev) => [...prev, staff.id]);
                                    } else {
                                      setEditSelectedMembers((prev) => prev.filter((id) => id !== staff.id));
                                    }
                                  }}
                                  className="rounded text-blue-500 shrink-0"
                                />
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Danger Zone: Delete Channel */}
              {!editingChannel.is_system && (
                <div className="pt-2 border-t border-[#27272a]">
                  {!showDeleteConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete this channel</span>
                    </button>
                  ) : (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
                      <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Confirm Channel Deletion</span>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        This action will permanently delete #{editingChannel.name} and all its messages.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleDeleteChannel}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition"
                        >
                          Yes, Delete Permanently
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(false)}
                          className="px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded-lg text-xs hover:bg-zinc-700 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#27272a]">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-sm"
                >
                  Save Access Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
