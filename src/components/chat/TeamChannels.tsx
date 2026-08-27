"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/store/appStore";
import { useRBAC } from "@/hooks/useRBAC";
import { ChatChannel, ChannelMessage, RoleCode } from "@/types";
import { formatDate, formatRelativeTime, cn } from "@/lib/utils";
import {
  MessageSquare,
  Hash,
  Lock,
  Plus,
  Send,
  Paperclip,
  Users,
  Settings,
  Shield,
  Trash2,
  X,
  Check,
  Search,
  CheckSquare,
  Square,
  UserPlus,
  Globe,
  AlertTriangle,
  Archive,
  RotateCcw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

export function TeamChannels() {
  const chatChannels = useAppStore((s) => s.chatChannels || []);
  const channelMessages = useAppStore((s) => s.channelMessages || []);
  const sendChannelMessage = useAppStore((s) => s.sendChannelMessage);
  const createChatChannel = useAppStore((s) => s.createChatChannel);
  const updateChatChannel = useAppStore((s) => s.updateChatChannel);
  const archiveChatChannel = useAppStore((s) => s.archiveChatChannel);
  const restoreChatChannel = useAppStore((s) => s.restoreChatChannel);
  const currentUser = useAppStore((s) => s.currentUser);
  const staffProfiles = useAppStore((s) => s.staffProfiles || []);
  const { isOwner, isManager } = useRBAC();

  const [activeChannelId, setActiveChannelId] = useState<string>(
    chatChannels.length > 0 ? chatChannels[0].id : "chan-ops"
  );
  const [messageInput, setMessageInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [showArchivedList, setShowArchivedList] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // New Channel Modal State
  const [newChannelModalOpen, setNewChannelModalOpen] = useState(false);
  const [newChanName, setNewChanName] = useState("");
  const [newChanDesc, setNewChanDesc] = useState("");
  const [newChanIsPrivate, setNewChanIsPrivate] = useState(false);
  const [newAccessMode, setNewAccessMode] = useState<"roles" | "members" | "both">("roles");
  const [newSelectedRoles, setNewSelectedRoles] = useState<string[]>(["MANAGER", "HUB_MANAGER"]);
  const [newSelectedMembers, setNewSelectedMembers] = useState<string[]>([]);
  const [newStaffSearch, setNewStaffSearch] = useState("");

  // Edit / Access Management Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<ChatChannel | null>(null);
  const [editChanName, setEditChanName] = useState("");
  const [editChanDesc, setEditChanDesc] = useState("");
  const [editChanIsPrivate, setEditChanIsPrivate] = useState(false);
  const [editAccessMode, setEditAccessMode] = useState<"roles" | "members" | "both">("roles");
  const [editSelectedRoles, setEditSelectedRoles] = useState<string[]>([]);
  const [editSelectedMembers, setEditSelectedMembers] = useState<string[]>([]);
  const [editStaffSearch, setEditStaffSearch] = useState("");
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  // Standard roles list
  const AVAILABLE_ROLES = [
    { key: "SUPER_ADMIN", label: "Super Admin (Owner)", desc: "Executive system governance" },
    { key: "MANAGER", label: "Operations Manager", desc: "Approvals & dispatch oversight" },
    { key: "HUB_MANAGER", label: "Hub Manager", desc: "Regional station management" },
    { key: "TECHNICIAN", label: "Field Mechanic / Technician", desc: "Maintenance & repairs" },
    { key: "RSA", label: "Roadside Assistance (RSA)", desc: "Field sweeps & roadside recovery" },
    { key: "DISPUTE_EXECUTIVE", label: "Customer Dispute Support", desc: "Disputes & refund claims" },
    { key: "OPERATOR", label: "General Operations", desc: "Fleet coordination & check-ins" },
  ];

  // User-Permitted Channels (all matching RBAC)
  const userPermittedChannels = useMemo(() => {
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

  const activeChannels = useMemo(() => {
    return userPermittedChannels.filter((c) => !c.is_archived);
  }, [userPermittedChannels]);

  const archivedChannels = useMemo(() => {
    return userPermittedChannels.filter((c) => c.is_archived);
  }, [userPermittedChannels]);

  // Active channel
  const activeChannel = userPermittedChannels.find((c) => c.id === activeChannelId) || activeChannels[0] || userPermittedChannels[0];

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
    if (activeChannel.is_archived) {
      toast.error("Cannot send messages to an archived channel. Restore the channel first.");
      return;
    }

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

    const cleanName = newChanName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "");

    const newChannel: Omit<ChatChannel, "id" | "created_at"> = {
      name: cleanName,
      description: newChanDesc.trim() || undefined,
      is_system: false,
      is_private: newChanIsPrivate,
      allowed_roles: newChanIsPrivate && (newAccessMode === "roles" || newAccessMode === "both")
        ? newSelectedRoles
        : [],
      allowed_members: newChanIsPrivate && (newAccessMode === "members" || newAccessMode === "both")
        ? newSelectedMembers
        : [],
      created_by: currentUser?.id || "admin",
    };

    createChatChannel(newChannel);
    toast.success(`Created channel #${cleanName}`);
    setNewChannelModalOpen(false);
    setNewChanName("");
    setNewChanDesc("");
    setNewChanIsPrivate(false);
    setNewSelectedRoles(["MANAGER", "HUB_MANAGER"]);
    setNewSelectedMembers([]);
    setNewStaffSearch("");
  };

  // Open Edit Modal
  const openEditModal = (channel: ChatChannel) => {
    setEditingChannel(channel);
    setEditChanName(channel.name);
    setEditChanDesc(channel.description || "");
    setEditChanIsPrivate(Boolean(channel.is_private));
    setEditSelectedRoles(channel.allowed_roles || []);
    setEditSelectedMembers(channel.allowed_members || []);
    const hasRoles = Boolean(channel.allowed_roles && channel.allowed_roles.length > 0);
    const hasMembers = Boolean(channel.allowed_members && channel.allowed_members.length > 0);
    if (hasRoles && hasMembers) setEditAccessMode("both");
    else if (hasMembers) setEditAccessMode("members");
    else setEditAccessMode("roles");

    setEditStaffSearch("");
    setShowArchiveConfirm(false);
    setEditModalOpen(true);
  };

  // Save Edit Channel
  const handleSaveEditChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChannel) return;
    if (!editChanName.trim()) {
      toast.error("Channel name cannot be empty.");
      return;
    }

    const cleanName = editChanName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "");

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

  // Archive Channel (Soft-Delete)
  const handleArchiveChannel = () => {
    if (!editingChannel) return;
    if (editingChannel.is_system) {
      toast.error("System communication channels cannot be archived.");
      return;
    }

    archiveChatChannel(editingChannel.id);
    toast.success(`Channel #${editingChannel.name} archived (soft-deleted). All messages retained in audit ledger.`);
    setEditModalOpen(false);
    setEditingChannel(null);
    setShowArchiveConfirm(false);

    // Switch to another available active channel
    const remaining = activeChannels.filter((c) => c.id !== editingChannel.id);
    if (remaining.length > 0) {
      setActiveChannelId(remaining[0].id);
    }
  };

  // Restore Channel
  const handleRestoreChannel = (channelId: string) => {
    restoreChatChannel(channelId);
    const chan = chatChannels.find((c) => c.id === channelId);
    toast.success(`Channel #${chan?.name || "channel"} restored to active navigation.`);
    setActiveChannelId(channelId);
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
            Real-time inter-department communication with granular role & member access controls and immutable audit logging
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
                Active Channels ({activeChannels.length})
              </span>
            </div>

            <div className="space-y-1 overflow-y-auto max-h-[380px]">
              {activeChannels.map((chan) => {
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

            {/* Archived Channels Section */}
            {archivedChannels.length > 0 && (
              <div className="pt-2 border-t border-zinc-800/60">
                <button
                  type="button"
                  onClick={() => setShowArchivedList(!showArchivedList)}
                  className="w-full flex items-center justify-between text-[11px] font-bold text-zinc-500 hover:text-zinc-300 py-1"
                >
                  <span className="flex items-center gap-1.5">
                    <Archive className="w-3 h-3 text-amber-400" />
                    <span>Archived Channels ({archivedChannels.length})</span>
                  </span>
                  {showArchivedList ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>

                {showArchivedList && (
                  <div className="space-y-1 mt-1.5 max-h-32 overflow-y-auto">
                    {archivedChannels.map((chan) => (
                      <div
                        key={chan.id}
                        className={cn(
                          "w-full flex items-center justify-between p-2 rounded-lg text-xs transition",
                          chan.id === activeChannel?.id ? "bg-amber-500/15 border border-amber-500/30 text-amber-300" : "bg-zinc-900/60 text-zinc-500 hover:text-zinc-300"
                        )}
                      >
                        <button
                          onClick={() => setActiveChannelId(chan.id)}
                          className="truncate flex-1 text-left flex items-center gap-1.5"
                        >
                          <Archive className="w-3 h-3 shrink-0" />
                          <span className="truncate">{chan.name}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRestoreChannel(chan.id)}
                          className="text-[10px] font-bold text-emerald-400 hover:underline shrink-0 ml-1"
                          title="Restore channel"
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
              {activeChannel?.is_archived ? (
                <Archive className="w-4 h-4 text-amber-400 shrink-0" />
              ) : activeChannel?.is_private ? (
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <Hash className="w-4 h-4 text-blue-400 shrink-0" />
              )}
              <h3 className="font-bold text-zinc-100 text-sm truncate">{activeChannel?.name}</h3>
              {activeChannel?.is_archived && (
                <span className="px-2 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
                  Archived (Read-Only)
                </span>
              )}
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

              {/* Action Buttons */}
              {activeChannel?.is_archived ? (
                <button
                  onClick={() => handleRestoreChannel(activeChannel.id)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs transition flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Channel</span>
                </button>
              ) : (
                canManageChannel(activeChannel) && (
                  <button
                    onClick={() => activeChannel && openEditModal(activeChannel)}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
                    title="Edit permissions, add/remove members or roles"
                  >
                    <Settings className="w-3.5 h-3.5 text-blue-400" />
                    <span className="hidden sm:inline">Manage Access</span>
                  </button>
                )
              )}
            </div>
          </div>

          {/* Archived Warning Banner */}
          {activeChannel?.is_archived && (
            <div className="p-3 bg-amber-500/10 border-b border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  This channel is archived. Historical messages are preserved in the permanent audit ledger.
                </span>
              </span>
              <button
                onClick={() => handleRestoreChannel(activeChannel.id)}
                className="text-xs font-bold underline hover:text-white shrink-0 ml-2"
              >
                Restore Channel
              </button>
            </div>
          )}

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
                  <div
                    key={msg.id}
                    className={cn(
                      "flex items-start gap-3 text-xs max-w-2xl",
                      isMe ? "ml-auto flex-row-reverse" : ""
                    )}
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#2a2a2f] border border-[#3a3a42] text-zinc-300 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                      {msg.sender_name.slice(0, 2).toUpperCase()}
                    </div>

                    <div className="space-y-1">
                      <div
                        className={cn(
                          "flex items-center gap-2 text-[11px]",
                          isMe ? "flex-row-reverse" : ""
                        )}
                      >
                        <span className="font-bold text-zinc-200">{msg.sender_name}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {formatRelativeTime(msg.created_at)}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                          {msg.sender_role}
                        </span>
                      </div>

                      <div
                        className={cn(
                          "p-3 rounded-2xl leading-relaxed text-zinc-100",
                          isMe
                            ? "bg-blue-600 text-white rounded-tr-none"
                            : "bg-[#202024] border border-[#2d2d34] rounded-tl-none"
                        )}
                      >
                        <p>{msg.message}</p>

                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2 space-y-1.5">
                            {msg.attachments.map((att, idx) => (
                              <div
                                key={idx}
                                className="p-2 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between gap-2"
                              >
                                <span className="text-[11px] truncate">{att.name}</span>
                                <a
                                  href={att.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-[10px] font-bold"
                                >
                                  View
                                </a>
                              </div>
                            ))}
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

          {/* Input Bar */}
          {!activeChannel?.is_archived ? (
            <div className="p-3 border-t border-[#27272a] bg-[#141416]">
              {attachedFiles.length > 0 && (
                <div className="flex items-center gap-2 mb-2 p-2 rounded-xl bg-zinc-900 border border-zinc-800 overflow-x-auto text-xs text-zinc-300">
                  <span className="font-bold text-[10px] uppercase text-zinc-500">
                    {attachedFiles.length} file(s) ready:
                  </span>
                  {attachedFiles.map((_, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[11px] font-mono">
                      File #{i + 1}
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAttachedFiles([])}
                    className="ml-auto text-[10px] text-rose-400 hover:underline"
                  >
                    Clear All
                  </button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition shrink-0"
                  title="Attach screenshot or diagnostic document"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  placeholder={`Message #${activeChannel?.name || "channel"}...`}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition"
                />

                <button
                  type="submit"
                  disabled={!messageInput.trim() && attachedFiles.length === 0}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs transition flex items-center gap-1 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="p-3 border-t border-[#27272a] bg-[#141416] text-center text-xs text-zinc-500">
              Channel is archived. Restoring the channel will re-enable messaging.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Channel */}
      {newChannelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-[#1c1c1f] border border-[#2a2a2f] rounded-2xl shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                <span>Create New Text Channel</span>
              </h3>
              <button
                onClick={() => setNewChannelModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateChannel} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Channel Handle / Name *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-zinc-500 font-mono">#</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. hub-bandra-alerts"
                    value={newChanName}
                    onChange={(e) => setNewChanName(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Purpose & Description</label>
                <textarea
                  rows={2}
                  placeholder="What is this channel dedicated to?"
                  value={newChanDesc}
                  onChange={(e) => setNewChanDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Privacy Setting */}
              <div className="space-y-2 pt-2 border-t border-[#27272a]">
                <label className="text-zinc-400 font-semibold">Channel Visibility & Access Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewChanIsPrivate(false)}
                    className={cn(
                      "p-3 rounded-xl border text-left transition flex flex-col justify-between space-y-1",
                      !newChanIsPrivate
                        ? "bg-blue-600/20 border-blue-500 text-blue-200"
                        : "bg-[#141416] border-[#2a2a2f] text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Globe className="w-3.5 h-3.5 text-blue-400" />
                        <span>Public Channel</span>
                      </div>
                      {!newChanIsPrivate && <Check className="w-3 h-3 text-blue-400" />}
                    </div>
                    <span className="text-[10px] text-zinc-400">Open to all authenticated operational staff.</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewChanIsPrivate(true)}
                    className={cn(
                      "p-3 rounded-xl border text-left transition flex flex-col justify-between space-y-1",
                      newChanIsPrivate
                        ? "bg-amber-500/20 border-amber-500 text-amber-200"
                        : "bg-[#141416] border-[#2a2a2f] text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Restricted / Private</span>
                      </div>
                      {newChanIsPrivate && <Check className="w-3 h-3 text-amber-400" />}
                    </div>
                    <span className="text-[10px] text-zinc-400">Restricted to specific roles or staff members.</span>
                  </button>
                </div>
              </div>

              {/* If Private, Access Rule Selection */}
              {newChanIsPrivate && (
                <div className="space-y-3 p-3 rounded-xl bg-[#141416] border border-[#2a2a2f] animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-[#27272a] pb-2">
                    <span className="font-bold text-zinc-300">Grant Access By:</span>
                    <div className="flex items-center gap-1 bg-[#1c1c1f] p-0.5 rounded-lg border border-[#2a2a2f] text-[10px]">
                      <button
                        type="button"
                        onClick={() => setNewAccessMode("roles")}
                        className={cn(
                          "px-2 py-0.5 rounded font-semibold",
                          newAccessMode === "roles" ? "bg-blue-600 text-white" : "text-zinc-400"
                        )}
                      >
                        Roles
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewAccessMode("members")}
                        className={cn(
                          "px-2 py-0.5 rounded font-semibold",
                          newAccessMode === "members" ? "bg-blue-600 text-white" : "text-zinc-400"
                        )}
                      >
                        Members
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewAccessMode("both")}
                        className={cn(
                          "px-2 py-0.5 rounded font-semibold",
                          newAccessMode === "both" ? "bg-blue-600 text-white" : "text-zinc-400"
                        )}
                      >
                        Both
                      </button>
                    </div>
                  </div>

                  {/* 1. Permitted Roles Checklist */}
                  {(newAccessMode === "roles" || newAccessMode === "both") && (
                    <div className="space-y-2">
                      <span className="text-zinc-400 font-semibold flex items-center gap-1">
                        <Shield className="w-3 h-3 text-blue-400" />
                        <span>Permitted Operational Roles:</span>
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {AVAILABLE_ROLES.map((r) => {
                          const isChecked = newSelectedRoles.includes(r.key);
                          return (
                            <label
                              key={r.key}
                              className={cn(
                                "flex items-center justify-between p-2 rounded-lg border text-[11px] cursor-pointer transition",
                                isChecked
                                  ? "bg-blue-600/20 border-blue-500/50 text-blue-200"
                                  : "bg-[#1c1c1f] border-[#2a2a2f] text-zinc-400 hover:text-zinc-200"
                              )}
                            >
                              <div className="truncate mr-2">
                                <div className="font-bold truncate">{r.label}</div>
                                <div className="text-[9px] text-zinc-500">{r.desc}</div>
                              </div>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewSelectedRoles((prev) => [...prev, r.key]);
                                  } else {
                                    setNewSelectedRoles((prev) => prev.filter((k) => k !== r.key));
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

                  {/* 2. Specific Members Whitelist */}
                  {(newAccessMode === "members" || newAccessMode === "both") && (
                    <div className="space-y-2 pt-2 border-t border-[#27272a]">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400 font-semibold flex items-center gap-1">
                          <Users className="w-3 h-3 text-emerald-400" />
                          <span>Specific Staff Members ({newSelectedMembers.length} selected):</span>
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setNewSelectedMembers(staffProfiles.map((s) => s.id))}
                            className="text-blue-400 hover:underline"
                          >
                            Select All
                          </button>
                          <span className="text-zinc-600">•</span>
                          <button
                            type="button"
                            onClick={() => setNewSelectedMembers([])}
                            className="text-zinc-400 hover:underline"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      {/* Search Bar */}
                      <div className="relative">
                        <Search className="w-3 h-3 text-zinc-500 absolute left-2.5 top-2" />
                        <input
                          type="text"
                          placeholder="Search staff by name, email, or phone..."
                          value={newStaffSearch}
                          onChange={(e) => setNewStaffSearch(e.target.value)}
                          className="w-full pl-7 pr-3 py-1 rounded-lg bg-[#1c1c1f] border border-[#2a2a2f] text-zinc-200 text-[11px] focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                        {filteredStaffNew.map((staff) => {
                          const isChecked = newSelectedMembers.includes(staff.id);
                          return (
                            <label
                              key={staff.id}
                              className={cn(
                                "flex items-center justify-between p-1.5 rounded-lg border text-[11px] cursor-pointer transition",
                                isChecked
                                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200"
                                  : "bg-[#1c1c1f] border-[#2a2a2f] text-zinc-400 hover:text-zinc-200"
                              )}
                            >
                              <div className="flex items-center gap-2 truncate mr-2">
                                <div className="w-5 h-5 rounded-full bg-zinc-800 text-[9px] font-bold flex items-center justify-center text-zinc-300 font-mono">
                                  {staff.full_name.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="truncate">
                                  <span className="font-semibold text-zinc-200 truncate">{staff.full_name}</span>
                                  <div className="text-[9px] text-zinc-500 truncate font-mono">
                                    {staff.phone} • {staff.roles?.[0]?.label || "Staff"}
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

      {/* Modal: Manage Access & Settings (Editable Channels) */}
      {editModalOpen && editingChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-[#1c1c1f] border border-[#2a2a2f] rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-400" />
                <span>Manage Access: #{editingChannel.name}</span>
              </h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditChannel} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Channel Handle</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-zinc-500 font-mono">#</span>
                  <input
                    type="text"
                    required
                    disabled={editingChannel.is_system}
                    value={editChanName}
                    onChange={(e) => setEditChanName(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-mono focus:outline-none focus:border-blue-500 disabled:opacity-60"
                  />
                </div>
                {editingChannel.is_system && (
                  <p className="text-[10px] text-zinc-500">System channel handles cannot be renamed.</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Channel Description</label>
                <textarea
                  rows={2}
                  value={editChanDesc}
                  onChange={(e) => setEditChanDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Privacy Setting */}
              <div className="space-y-2 pt-2 border-t border-[#27272a]">
                <label className="text-zinc-400 font-semibold">Channel Privacy Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditChanIsPrivate(false)}
                    className={cn(
                      "p-3 rounded-xl border text-left transition flex flex-col justify-between space-y-1",
                      !editChanIsPrivate
                        ? "bg-blue-600/20 border-blue-500 text-blue-200"
                        : "bg-[#141416] border-[#2a2a2f] text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Globe className="w-3.5 h-3.5 text-blue-400" />
                        <span>Public Channel</span>
                      </div>
                      {!editChanIsPrivate && <Check className="w-3 h-3 text-blue-400" />}
                    </div>
                    <span className="text-[10px] text-zinc-400">All staff can view & post.</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditChanIsPrivate(true)}
                    className={cn(
                      "p-3 rounded-xl border text-left transition flex flex-col justify-between space-y-1",
                      editChanIsPrivate
                        ? "bg-amber-500/20 border-amber-500 text-amber-200"
                        : "bg-[#141416] border-[#2a2a2f] text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Restricted / Private</span>
                      </div>
                      {editChanIsPrivate && <Check className="w-3 h-3 text-amber-400" />}
                    </div>
                    <span className="text-[10px] text-zinc-400">Access limited to selected roles/members.</span>
                  </button>
                </div>
              </div>

              {/* If Private, Access Rule Selection */}
              {editChanIsPrivate && (
                <div className="space-y-3 p-3 rounded-xl bg-[#141416] border border-[#2a2a2f] animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-[#27272a] pb-2">
                    <span className="font-bold text-zinc-300">Grant Access By:</span>
                    <div className="flex items-center gap-1 bg-[#1c1c1f] p-0.5 rounded-lg border border-[#2a2a2f] text-[10px]">
                      <button
                        type="button"
                        onClick={() => setEditAccessMode("roles")}
                        className={cn(
                          "px-2 py-0.5 rounded font-semibold",
                          editAccessMode === "roles" ? "bg-blue-600 text-white" : "text-zinc-400"
                        )}
                      >
                        Roles
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditAccessMode("members")}
                        className={cn(
                          "px-2 py-0.5 rounded font-semibold",
                          editAccessMode === "members" ? "bg-blue-600 text-white" : "text-zinc-400"
                        )}
                      >
                        Members
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditAccessMode("both")}
                        className={cn(
                          "px-2 py-0.5 rounded font-semibold",
                          editAccessMode === "both" ? "bg-blue-600 text-white" : "text-zinc-400"
                        )}
                      >
                        Both
                      </button>
                    </div>
                  </div>

                  {/* 1. Permitted Roles Checklist */}
                  {(editAccessMode === "roles" || editAccessMode === "both") && (
                    <div className="space-y-2">
                      <span className="text-zinc-400 font-semibold flex items-center gap-1">
                        <Shield className="w-3 h-3 text-blue-400" />
                        <span>Permitted Operational Roles ({editSelectedRoles.length} selected):</span>
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {AVAILABLE_ROLES.map((r) => {
                          const isChecked = editSelectedRoles.includes(r.key);
                          return (
                            <label
                              key={r.key}
                              className={cn(
                                "flex items-center justify-between p-2 rounded-lg border text-[11px] cursor-pointer transition",
                                isChecked
                                  ? "bg-blue-600/20 border-blue-500/50 text-blue-200"
                                  : "bg-[#1c1c1f] border-[#2a2a2f] text-zinc-400 hover:text-zinc-200"
                              )}
                            >
                              <div className="truncate mr-2">
                                <div className="font-bold truncate">{r.label}</div>
                                <div className="text-[9px] text-zinc-500">{r.desc}</div>
                              </div>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEditSelectedRoles((prev) => [...prev, r.key]);
                                  } else {
                                    setEditSelectedRoles((prev) => prev.filter((k) => k !== r.key));
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

                  {/* 2. Specific Members Whitelist */}
                  {(editAccessMode === "members" || editAccessMode === "both") && (
                    <div className="space-y-2 pt-2 border-t border-[#27272a]">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400 font-semibold flex items-center gap-1">
                          <Users className="w-3 h-3 text-emerald-400" />
                          <span>Specific Staff Whitelist ({editSelectedMembers.length} selected):</span>
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setEditSelectedMembers(staffProfiles.map((s) => s.id))}
                            className="text-blue-400 hover:underline"
                          >
                            Select All
                          </button>
                          <span className="text-zinc-600">•</span>
                          <button
                            type="button"
                            onClick={() => setEditSelectedMembers([])}
                            className="text-zinc-400 hover:underline"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      {/* Search Bar */}
                      <div className="relative">
                        <Search className="w-3 h-3 text-zinc-500 absolute left-2.5 top-2" />
                        <input
                          type="text"
                          placeholder="Filter staff by name, email, or phone..."
                          value={editStaffSearch}
                          onChange={(e) => setEditStaffSearch(e.target.value)}
                          className="w-full pl-7 pr-3 py-1 rounded-lg bg-[#1c1c1f] border border-[#2a2a2f] text-zinc-200 text-[11px] focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                        {filteredStaffEdit.map((staff) => {
                          const isChecked = editSelectedMembers.includes(staff.id);
                          return (
                            <label
                              key={staff.id}
                              className={cn(
                                "flex items-center justify-between p-1.5 rounded-lg border text-[11px] cursor-pointer transition",
                                isChecked
                                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200"
                                  : "bg-[#1c1c1f] border-[#2a2a2f] text-zinc-400 hover:text-zinc-200"
                              )}
                            >
                              <div className="flex items-center gap-2 truncate mr-2">
                                <div className="w-5 h-5 rounded-full bg-zinc-800 text-[9px] font-bold flex items-center justify-center text-zinc-300 font-mono">
                                  {staff.full_name.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="truncate">
                                  <span className="font-semibold text-zinc-200 truncate">{staff.full_name}</span>
                                  <div className="text-[9px] text-zinc-500 truncate font-mono">
                                    {staff.phone} • {staff.roles?.[0]?.label || "Staff"}
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

              {/* Soft-Delete / Archive Channel */}
              {!editingChannel.is_system && (
                <div className="pt-2 border-t border-[#27272a]">
                  {!showArchiveConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowArchiveConfirm(true)}
                      className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>Archive this channel</span>
                    </button>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                      <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                        <Archive className="w-4 h-4" />
                        <span>Archive Channel (Zero-Deletion Compliance)</span>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Archiving deactivates #{editingChannel.name} from active channel lists. In accordance with zero data deletion policies, all historic messages remain securely retained and this channel can be restored at any time.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleArchiveChannel}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded-lg text-xs transition"
                        >
                          Confirm Archival
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowArchiveConfirm(false)}
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
