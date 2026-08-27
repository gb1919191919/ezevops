export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          id: string
          new_data: Json | null
          old_data: Json | null
          performed_by: string | null
          performer_name: string | null
          record_id: string
          table_name: string
          timestamp: string
        }
        Insert: {
          action: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          performed_by?: string | null
          performer_name?: string | null
          record_id: string
          table_name: string
          timestamp?: string
        }
        Update: {
          action?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          performed_by?: string | null
          performer_name?: string | null
          record_id?: string
          table_name?: string
          timestamp?: string
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          date: string
          employee_name: string
          id: string
          phone: string
          reason: string
          recovery_amount: number
          recovery_status: Database["public"]["Enums"]["recovery_status"]
          user_email: string
          user_name: string
          vehicle_no: string
        }
        Insert: {
          date: string
          employee_name: string
          id?: string
          phone: string
          reason: string
          recovery_amount?: number
          recovery_status?: Database["public"]["Enums"]["recovery_status"]
          user_email: string
          user_name: string
          vehicle_no: string
        }
        Update: {
          date?: string
          employee_name?: string
          id?: string
          phone?: string
          reason?: string
          recovery_amount?: number
          recovery_status?: Database["public"]["Enums"]["recovery_status"]
          user_email?: string
          user_name?: string
          vehicle_no?: string
        }
        Relationships: []
      }
      channel_messages: {
        Row: {
          attachments: Json | null
          channel_id: string
          content: string
          created_at: string
          id: string
          sender_avatar: string | null
          sender_id: string | null
          sender_name: string
          sender_role: string
        }
        Insert: {
          attachments?: Json | null
          channel_id: string
          content: string
          created_at?: string
          id?: string
          sender_avatar?: string | null
          sender_id?: string | null
          sender_name: string
          sender_role: string
        }
        Update: {
          attachments?: Json | null
          channel_id?: string
          content?: string
          created_at?: string
          id?: string
          sender_avatar?: string | null
          sender_id?: string | null
          sender_name?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      charger_logs: {
        Row: {
          charger_name: string
          connector_number: string | null
          hub_id: string | null
          id: string
          remarks: string | null
          reported_at: string
          reported_by: string
          status: Database["public"]["Enums"]["charger_status"]
        }
        Insert: {
          charger_name: string
          connector_number?: string | null
          hub_id?: string | null
          id?: string
          remarks?: string | null
          reported_at?: string
          reported_by: string
          status?: Database["public"]["Enums"]["charger_status"]
        }
        Update: {
          charger_name?: string
          connector_number?: string | null
          hub_id?: string | null
          id?: string
          remarks?: string | null
          reported_at?: string
          reported_by?: string
          status?: Database["public"]["Enums"]["charger_status"]
        }
        Relationships: [
          {
            foreignKeyName: "charger_logs_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channels: {
        Row: {
          allowed_members: string[] | null
          allowed_roles: string[]
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_private: boolean
          is_system: boolean
          name: string
        }
        Insert: {
          allowed_members?: string[] | null
          allowed_roles?: string[]
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_private?: boolean
          is_system?: boolean
          name: string
        }
        Update: {
          allowed_members?: string[] | null
          allowed_roles?: string[]
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_private?: boolean
          is_system?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channels_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_shift_logs: {
        Row: {
          accomplishments: string
          author_id: string | null
          author_name: string
          author_role: string
          created_at: string
          customer_issues_resolved: number
          handover_notes: string | null
          hub_id: string
          hub_name: string | null
          id: string
          media_attachments: string[] | null
          milestones_completed: string | null
          roadblocks: string | null
          shift_date: string
          shift_type: Database["public"]["Enums"]["shift_type"]
          updated_at: string
          vehicles_serviced: number
        }
        Insert: {
          accomplishments: string
          author_id?: string | null
          author_name: string
          author_role: string
          created_at?: string
          customer_issues_resolved?: number
          handover_notes?: string | null
          hub_id: string
          hub_name?: string | null
          id?: string
          media_attachments?: string[] | null
          milestones_completed?: string | null
          roadblocks?: string | null
          shift_date?: string
          shift_type?: Database["public"]["Enums"]["shift_type"]
          updated_at?: string
          vehicles_serviced?: number
        }
        Update: {
          accomplishments?: string
          author_id?: string | null
          author_name?: string
          author_role?: string
          created_at?: string
          customer_issues_resolved?: number
          handover_notes?: string | null
          hub_id?: string
          hub_name?: string | null
          id?: string
          media_attachments?: string[] | null
          milestones_completed?: string | null
          roadblocks?: string | null
          shift_date?: string
          shift_type?: Database["public"]["Enums"]["shift_type"]
          updated_at?: string
          vehicles_serviced?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_shift_logs_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_shift_logs_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_part_stock: {
        Row: {
          hub_id: string | null
          id: string
          min_threshold: number
          part_id: string | null
          pending_allocated_stock: number
          physical_stock: number
          updated_at: string
        }
        Insert: {
          hub_id?: string | null
          id?: string
          min_threshold?: number
          part_id?: string | null
          pending_allocated_stock?: number
          physical_stock?: number
          updated_at?: string
        }
        Update: {
          hub_id?: string | null
          id?: string
          min_threshold?: number
          part_id?: string | null
          pending_allocated_stock?: number
          physical_stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_part_stock_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_part_stock_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      hubs: {
        Row: {
          address: string
          charging_points_active: number
          charging_points_total: number
          city: string
          code: string
          created_at: string
          day_guard_details: string | null
          day_guard_name: string | null
          day_guard_phone: string | null
          id: string
          is_active: boolean
          is_warehouse: boolean
          name: string
          night_guard_details: string | null
          night_guard_name: string | null
          night_guard_phone: string | null
          poc_name: string
          poc_phone: string
          type: Database["public"]["Enums"]["hub_type"]
          updated_at: string
        }
        Insert: {
          address: string
          charging_points_active?: number
          charging_points_total?: number
          city?: string
          code: string
          created_at?: string
          day_guard_details?: string | null
          day_guard_name?: string | null
          day_guard_phone?: string | null
          id?: string
          is_active?: boolean
          is_warehouse?: boolean
          name: string
          night_guard_details?: string | null
          night_guard_name?: string | null
          night_guard_phone?: string | null
          poc_name: string
          poc_phone: string
          type?: Database["public"]["Enums"]["hub_type"]
          updated_at?: string
        }
        Update: {
          address?: string
          charging_points_active?: number
          charging_points_total?: number
          city?: string
          code?: string
          created_at?: string
          day_guard_details?: string | null
          day_guard_name?: string | null
          day_guard_phone?: string | null
          id?: string
          is_active?: boolean
          is_warehouse?: boolean
          name?: string
          night_guard_details?: string | null
          night_guard_name?: string | null
          night_guard_phone?: string | null
          poc_name?: string
          poc_phone?: string
          type?: Database["public"]["Enums"]["hub_type"]
          updated_at?: string
        }
        Relationships: []
      }
      job_card_parts: {
        Row: {
          created_at: string
          id: string
          is_approved: boolean
          job_card_id: string | null
          part_id: string | null
          quantity: number
          unit_cost_snapshot: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_approved?: boolean
          job_card_id?: string | null
          part_id?: string | null
          quantity?: number
          unit_cost_snapshot?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_approved?: boolean
          job_card_id?: string | null
          part_id?: string | null
          quantity?: number
          unit_cost_snapshot?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_card_parts_job_card_id_fkey"
            columns: ["job_card_id"]
            isOneToOne: false
            referencedRelation: "job_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_card_parts_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      job_cards: {
        Row: {
          approval_notes: string | null
          approved_at: string | null
          approved_by: string | null
          assigned_mechanic_id: string | null
          created_at: string
          hub_id: string | null
          id: string
          issue_description: string
          odometer_km: number | null
          photos_url: string[] | null
          reported_by: string | null
          resolved_at: string | null
          solution_applied: string | null
          status: Database["public"]["Enums"]["approval_status"]
          ticket_number: number
          vehicle_id: string | null
        }
        Insert: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_mechanic_id?: string | null
          created_at?: string
          hub_id?: string | null
          id?: string
          issue_description: string
          odometer_km?: number | null
          photos_url?: string[] | null
          reported_by?: string | null
          resolved_at?: string | null
          solution_applied?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          ticket_number?: number
          vehicle_id?: string | null
        }
        Update: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_mechanic_id?: string | null
          created_at?: string
          hub_id?: string | null
          id?: string
          issue_description?: string
          odometer_km?: number | null
          photos_url?: string[] | null
          reported_by?: string | null
          resolved_at?: string | null
          solution_applied?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          ticket_number?: number
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_cards_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_cards_assigned_mechanic_id_fkey"
            columns: ["assigned_mechanic_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_cards_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_cards_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_cards_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_completed: boolean
          objective_id: string
          order_index: number | null
          target_date: string | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean
          objective_id: string
          order_index?: number | null
          target_date?: string | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean
          objective_id?: string
          order_index?: number | null
          target_date?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      objectives: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          hub_id: string | null
          id: string
          is_completed: boolean
          start_date: string | null
          target_date: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          hub_id?: string | null
          id?: string
          is_completed?: boolean
          start_date?: string | null
          target_date: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          hub_id?: string | null
          id?: string
          is_completed?: boolean
          start_date?: string | null
          target_date?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "objectives_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objectives_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
        ]
      }
      part_usage_logs: {
        Row: {
          created_at: string
          hub_id: string | null
          id: string
          part_id: string | null
          quantity: number
          reason: string
          recipient_name: string | null
          used_by_id: string | null
          used_by_name: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          hub_id?: string | null
          id?: string
          part_id?: string | null
          quantity?: number
          reason: string
          recipient_name?: string | null
          used_by_id?: string | null
          used_by_name: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          hub_id?: string | null
          id?: string
          part_id?: string | null
          quantity?: number
          reason?: string
          recipient_name?: string | null
          used_by_id?: string | null
          used_by_name?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "part_usage_logs_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_usage_logs_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_usage_logs_used_by_id_fkey"
            columns: ["used_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parts: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          min_threshold: number
          name: string
          sku: string
          supplier: string | null
          unit_cost: number
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          min_threshold?: number
          name: string
          sku: string
          supplier?: string | null
          unit_cost?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          min_threshold?: number
          name?: string
          sku?: string
          supplier?: string | null
          unit_cost?: number
        }
        Relationships: []
      }
      profile_roles: {
        Row: {
          profile_id: string
          role_id: string
        }
        Insert: {
          profile_id: string
          role_id: string
        }
        Update: {
          profile_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_roles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          assigned_hub_id: string | null
          auth_user_id: string | null
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          phone: string
          updated_at: string
        }
        Insert: {
          assigned_hub_id?: string | null
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          phone: string
          updated_at?: string
        }
        Update: {
          assigned_hub_id?: string | null
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_assigned_hub_id_fkey"
            columns: ["assigned_hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount: number
          approved_by: string | null
          created_at: string
          evidence_attachments: string[] | null
          frappe_reference: string | null
          id: string
          internal_remarks: string | null
          payout_type: Database["public"]["Enums"]["refund_payout_type"]
          reason: string
          rejection_reason: string | null
          requested_by: string | null
          requester_name: string
          requester_role: string
          ride_date: string
          ride_id: string
          settled_at: string | null
          settled_by_name: string | null
          status: Database["public"]["Enums"]["refund_status"]
          updated_at: string
          user_phone: string
        }
        Insert: {
          amount: number
          approved_by?: string | null
          created_at?: string
          evidence_attachments?: string[] | null
          frappe_reference?: string | null
          id?: string
          internal_remarks?: string | null
          payout_type?: Database["public"]["Enums"]["refund_payout_type"]
          reason: string
          rejection_reason?: string | null
          requested_by?: string | null
          requester_name: string
          requester_role: string
          ride_date: string
          ride_id: string
          settled_at?: string | null
          settled_by_name?: string | null
          status?: Database["public"]["Enums"]["refund_status"]
          updated_at?: string
          user_phone: string
        }
        Update: {
          amount?: number
          approved_by?: string | null
          created_at?: string
          evidence_attachments?: string[] | null
          frappe_reference?: string | null
          id?: string
          internal_remarks?: string | null
          payout_type?: Database["public"]["Enums"]["refund_payout_type"]
          reason?: string
          rejection_reason?: string | null
          requested_by?: string | null
          requester_name?: string
          requester_role?: string
          ride_date?: string
          ride_id?: string
          settled_at?: string | null
          settled_by_name?: string | null
          status?: Database["public"]["Enums"]["refund_status"]
          updated_at?: string
          user_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          code: Database["public"]["Enums"]["role_code"]
          description: string | null
          id: string
          is_system: boolean
          label: string
          permissions: string[]
        }
        Insert: {
          code: Database["public"]["Enums"]["role_code"]
          description?: string | null
          id?: string
          is_system?: boolean
          label: string
          permissions?: string[]
        }
        Update: {
          code?: Database["public"]["Enums"]["role_code"]
          description?: string | null
          id?: string
          is_system?: boolean
          label?: string
          permissions?: string[]
        }
        Relationships: []
      }
      sop_revisions: {
        Row: {
          change_summary: string
          content: string
          id: string
          sop_id: string | null
          updated_at: string
          updated_by_name: string
          version: string
        }
        Insert: {
          change_summary: string
          content: string
          id?: string
          sop_id?: string | null
          updated_at?: string
          updated_by_name: string
          version: string
        }
        Update: {
          change_summary?: string
          content?: string
          id?: string
          sop_id?: string | null
          updated_at?: string
          updated_by_name?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "sop_revisions_sop_id_fkey"
            columns: ["sop_id"]
            isOneToOne: false
            referencedRelation: "sops"
            referencedColumns: ["id"]
          },
        ]
      }
      sops: {
        Row: {
          access_roles: string[]
          acknowledged_by: string[]
          author_id: string | null
          author_name: string
          category: string
          code: string
          content: string
          created_at: string
          id: string
          status: Database["public"]["Enums"]["sop_status"]
          summary: string
          title: string
          updated_at: string
          version: string
          view_count: number
        }
        Insert: {
          access_roles?: string[]
          acknowledged_by?: string[]
          author_id?: string | null
          author_name: string
          category: string
          code: string
          content: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["sop_status"]
          summary: string
          title: string
          updated_at?: string
          version?: string
          view_count?: number
        }
        Update: {
          access_roles?: string[]
          acknowledged_by?: string[]
          author_id?: string | null
          author_name?: string
          category?: string
          code?: string
          content?: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["sop_status"]
          summary?: string
          title?: string
          updated_at?: string
          version?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "sops_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_attachments: {
        Row: {
          file_name: string
          file_size_kb: number | null
          file_type: string | null
          file_url: string
          id: string
          task_id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          file_name: string
          file_size_kb?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          task_id: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          file_name?: string
          file_size_kb?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          task_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_changelog: {
        Row: {
          changed_at: string
          changed_by: string | null
          field_changed: string
          id: string
          new_value: string | null
          old_value: string | null
          performer_name: string
          task_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          field_changed: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          performer_name: string
          task_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          field_changed?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          performer_name?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_changelog_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_changelog_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_remarks: {
        Row: {
          author_id: string | null
          author_name: string
          author_role: string | null
          comment: string
          created_at: string
          id: string
          task_id: string | null
        }
        Insert: {
          author_id?: string | null
          author_name: string
          author_role?: string | null
          comment: string
          created_at?: string
          id?: string
          task_id?: string | null
        }
        Update: {
          author_id?: string | null
          author_name?: string
          author_role?: string | null
          comment?: string
          created_at?: string
          id?: string
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_remarks_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_remarks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string[]
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          milestone_id: string | null
          objective_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          start_date: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          vehicle_id: string | null
          vehicle_ids: string[] | null
          vehicle_scope: string | null
        }
        Insert: {
          assigned_to?: string[]
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          milestone_id?: string | null
          objective_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          vehicle_id?: string | null
          vehicle_ids?: string[] | null
          vehicle_scope?: string | null
        }
        Update: {
          assigned_to?: string[]
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          milestone_id?: string | null
          objective_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          vehicle_id?: string | null
          vehicle_ids?: string[] | null
          vehicle_scope?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_tasks_milestone"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      team_notes: {
        Row: {
          author_id: string | null
          author_name: string
          author_role: string
          category: Database["public"]["Enums"]["note_category"]
          content: string
          created_at: string
          hub_id: string | null
          id: string
          is_pinned: boolean
          priority: string
          resolved_at: string | null
          resolved_by_name: string | null
          status: Database["public"]["Enums"]["note_status"]
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          author_name: string
          author_role: string
          category?: Database["public"]["Enums"]["note_category"]
          content: string
          created_at?: string
          hub_id?: string | null
          id?: string
          is_pinned?: boolean
          priority?: string
          resolved_at?: string | null
          resolved_by_name?: string | null
          status?: Database["public"]["Enums"]["note_status"]
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          author_name?: string
          author_role?: string
          category?: Database["public"]["Enums"]["note_category"]
          content?: string
          created_at?: string
          hub_id?: string | null
          id?: string
          is_pinned?: boolean
          priority?: string
          resolved_at?: string | null
          resolved_by_name?: string | null
          status?: Database["public"]["Enums"]["note_status"]
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_notes_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_inspections: {
        Row: {
          bms_health_passed: boolean
          brakes_passed: boolean
          defect_media_url: string | null
          hub_id: string | null
          id: string
          inspected_at: string
          inspector_id: string | null
          inspector_name: string
          lights_passed: boolean
          notes: string | null
          odometer_km: number
          recommended_status: Database["public"]["Enums"]["vehicle_status"]
          stand_sensor_passed: boolean
          throttle_passed: boolean
          tyres_passed: boolean
          vehicle_id: string | null
        }
        Insert: {
          bms_health_passed?: boolean
          brakes_passed?: boolean
          defect_media_url?: string | null
          hub_id?: string | null
          id?: string
          inspected_at?: string
          inspector_id?: string | null
          inspector_name: string
          lights_passed?: boolean
          notes?: string | null
          odometer_km: number
          recommended_status?: Database["public"]["Enums"]["vehicle_status"]
          stand_sensor_passed?: boolean
          throttle_passed?: boolean
          tyres_passed?: boolean
          vehicle_id?: string | null
        }
        Update: {
          bms_health_passed?: boolean
          brakes_passed?: boolean
          defect_media_url?: string | null
          hub_id?: string | null
          id?: string
          inspected_at?: string
          inspector_id?: string | null
          inspector_name?: string
          lights_passed?: boolean
          notes?: string | null
          odometer_km?: number
          recommended_status?: Database["public"]["Enums"]["vehicle_status"]
          stand_sensor_passed?: boolean
          throttle_passed?: boolean
          tyres_passed?: boolean
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_inspections_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_inspections_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_inspections_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          active_days_count: number
          created_at: string
          current_hub_id: string | null
          current_status: Database["public"]["Enums"]["vehicle_status"]
          custom_vehicle_id: string | null
          id: string
          is_active: boolean
          key_number: string
          last_inspected_at: string | null
          last_inspected_by: string | null
          last_odometer_updated_at: string | null
          last_odometer_updated_by: string | null
          model: Database["public"]["Enums"]["scooter_model"]
          odometer_km: number | null
          pending_status: Database["public"]["Enums"]["vehicle_status"] | null
          status_change_reason: string | null
          total_maintenance_spend: number
          updated_at: string
          uptime_percentage: number
          vehicle_id: string
          vin: string
        }
        Insert: {
          active_days_count?: number
          created_at?: string
          current_hub_id?: string | null
          current_status?: Database["public"]["Enums"]["vehicle_status"]
          custom_vehicle_id?: string | null
          id?: string
          is_active?: boolean
          key_number: string
          last_inspected_at?: string | null
          last_inspected_by?: string | null
          last_odometer_updated_at?: string | null
          last_odometer_updated_by?: string | null
          model?: Database["public"]["Enums"]["scooter_model"]
          odometer_km?: number | null
          pending_status?: Database["public"]["Enums"]["vehicle_status"] | null
          status_change_reason?: string | null
          total_maintenance_spend?: number
          updated_at?: string
          uptime_percentage?: number
          vehicle_id: string
          vin: string
        }
        Update: {
          active_days_count?: number
          created_at?: string
          current_hub_id?: string | null
          current_status?: Database["public"]["Enums"]["vehicle_status"]
          custom_vehicle_id?: string | null
          id?: string
          is_active?: boolean
          key_number?: string
          last_inspected_at?: string | null
          last_inspected_by?: string | null
          last_odometer_updated_at?: string | null
          last_odometer_updated_by?: string | null
          model?: Database["public"]["Enums"]["scooter_model"]
          odometer_km?: number | null
          pending_status?: Database["public"]["Enums"]["vehicle_status"] | null
          status_change_reason?: string | null
          total_maintenance_spend?: number
          updated_at?: string
          uptime_percentage?: number
          vehicle_id?: string
          vin?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_current_hub_id_fkey"
            columns: ["current_hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_last_odometer_updated_by_fkey"
            columns: ["last_odometer_updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      approval_status: "PENDING" | "APPROVED" | "REJECTED"
      charger_status:
        | "ACTIVE"
        | "CONNECTOR_NOT_WORKING"
        | "CONNECTOR_DAMAGED"
        | "CHARGER_DAMAGED"
        | "POWER_LINE_ISSUE"
        | "OFFLINE_TRIPPED"
      hub_type: "BIKE_HUB" | "STOCK_HUB"
      note_category:
        | "GENERAL"
        | "SHIFT_HANDOVER"
        | "URGENT"
        | "HUB_NOTICE"
        | "MECHANICAL"
        | "ROUGH"
      note_status: "ACTIVE" | "ARCHIVED" | "RESOLVED"
      recovery_status: "Pending" | "Recovered"
      refund_payout_type: "EzEv Wallet" | "Bank Payout"
      refund_status: "SUBMITTED" | "VERIFIED" | "SETTLED" | "REJECTED"
      role_code: "owner" | "manager" | "rsa" | "mechanic"
      scooter_model: "CS Model" | "Ola Model" | "Single Light Model"
      shift_type: "MORNING" | "EVENING" | "NIGHT" | "GENERAL"
      sop_status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
      task_priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
      task_status: "TODO" | "IN_PROGRESS" | "REVIEW" | "COMPLETED" | "ABANDONED"
      vehicle_status:
        | "Available"
        | "Needs Maintenance"
        | "Under Repair"
        | "Not Available"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      approval_status: ["PENDING", "APPROVED", "REJECTED"],
      charger_status: [
        "ACTIVE",
        "CONNECTOR_NOT_WORKING",
        "CONNECTOR_DAMAGED",
        "CHARGER_DAMAGED",
        "POWER_LINE_ISSUE",
        "OFFLINE_TRIPPED",
      ],
      hub_type: ["BIKE_HUB", "STOCK_HUB"],
      note_category: [
        "GENERAL",
        "SHIFT_HANDOVER",
        "URGENT",
        "HUB_NOTICE",
        "MECHANICAL",
        "ROUGH",
      ],
      note_status: ["ACTIVE", "ARCHIVED", "RESOLVED"],
      recovery_status: ["Pending", "Recovered"],
      refund_payout_type: ["EzEv Wallet", "Bank Payout"],
      refund_status: ["SUBMITTED", "VERIFIED", "SETTLED", "REJECTED"],
      role_code: ["owner", "manager", "rsa", "mechanic"],
      scooter_model: ["CS Model", "Ola Model", "Single Light Model"],
      shift_type: ["MORNING", "EVENING", "NIGHT", "GENERAL"],
      sop_status: ["DRAFT", "PUBLISHED", "ARCHIVED"],
      task_priority: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      task_status: ["TODO", "IN_PROGRESS", "REVIEW", "COMPLETED", "ABANDONED"],
      vehicle_status: [
        "Available",
        "Needs Maintenance",
        "Under Repair",
        "Not Available",
      ],
    },
  },
} as const
