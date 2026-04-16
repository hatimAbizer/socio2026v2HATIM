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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      approval_chain_log: {
        Row: {
          action: string
          actor_email: string
          actor_role: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          notes: string | null
          step: string
          version: number
        }
        Insert: {
          action: string
          actor_email: string
          actor_role: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          notes?: string | null
          step: string
          version?: number
        }
        Update: {
          action?: string
          actor_email?: string
          actor_role?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          notes?: string | null
          step?: string
          version?: number
        }
        Relationships: []
      }
      approval_decisions: {
        Row: {
          approval_request_id: string
          approval_step_id: string
          comment: string | null
          created_at: string
          decided_by_email: string | null
          decided_by_user_id: string | null
          decision: string
          id: string
          role_code: string
        }
        Insert: {
          approval_request_id: string
          approval_step_id: string
          comment?: string | null
          created_at?: string
          decided_by_email?: string | null
          decided_by_user_id?: string | null
          decision: string
          id?: string
          role_code: string
        }
        Update: {
          approval_request_id?: string
          approval_step_id?: string
          comment?: string | null
          created_at?: string
          decided_by_email?: string | null
          decided_by_user_id?: string | null
          decision?: string
          id?: string
          role_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_decisions_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_decisions_approval_step_id_fkey"
            columns: ["approval_step_id"]
            isOneToOne: false
            referencedRelation: "approval_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_decisions_decided_by_user_id_fkey"
            columns: ["decided_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          approval_level: string | null
          campus_hosted_at: string | null
          cfo_approved_at: string | null
          cfo_approved_by: string | null
          created_at: string
          decided_at: string | null
          entity_ref: string
          entity_type: string
          event_id: string | null
          id: string
          is_budget_related: boolean
          latest_comment: string | null
          organizing_dept: string | null
          organizing_school: string | null
          parent_fest_ref: string | null
          previous_approval_request_id: string | null
          request_id: string
          requested_by_email: string | null
          requested_by_user_id: string | null
          status: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          approval_level?: string | null
          campus_hosted_at?: string | null
          cfo_approved_at?: string | null
          cfo_approved_by?: string | null
          created_at?: string
          decided_at?: string | null
          entity_ref: string
          entity_type: string
          event_id?: string | null
          id?: string
          is_budget_related?: boolean
          latest_comment?: string | null
          organizing_dept?: string | null
          organizing_school?: string | null
          parent_fest_ref?: string | null
          previous_approval_request_id?: string | null
          request_id: string
          requested_by_email?: string | null
          requested_by_user_id?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          approval_level?: string | null
          campus_hosted_at?: string | null
          cfo_approved_at?: string | null
          cfo_approved_by?: string | null
          created_at?: string
          decided_at?: string | null
          entity_ref?: string
          entity_type?: string
          event_id?: string | null
          id?: string
          is_budget_related?: boolean
          latest_comment?: string | null
          organizing_dept?: string | null
          organizing_school?: string | null
          parent_fest_ref?: string | null
          previous_approval_request_id?: string | null
          request_id?: string
          requested_by_email?: string | null
          requested_by_user_id?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_previous_approval_request_id_fkey"
            columns: ["previous_approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_requested_by_user_id_fkey"
            columns: ["requested_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_steps: {
        Row: {
          approval_request_id: string
          created_at: string
          decided_at: string | null
          id: string
          required_count: number
          role_code: string
          sequence_order: number
          status: string
          step_code: string
          step_group: number
          updated_at: string
        }
        Insert: {
          approval_request_id: string
          created_at?: string
          decided_at?: string | null
          id?: string
          required_count?: number
          role_code: string
          sequence_order?: number
          status?: string
          step_code: string
          step_group?: number
          updated_at?: string
        }
        Update: {
          approval_request_id?: string
          created_at?: string
          decided_at?: string | null
          id?: string
          required_count?: number
          role_code?: string
          sequence_order?: number
          status?: string
          step_code?: string
          step_group?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_steps_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_status: {
        Row: {
          event_id: string | null
          id: string
          marked_at: string
          marked_by: string | null
          registration_id: string
          status: string | null
        }
        Insert: {
          event_id?: string | null
          id?: string
          marked_at?: string
          marked_by?: string | null
          registration_id: string
          status?: string | null
        }
        Update: {
          event_id?: string | null
          id?: string
          marked_at?: string
          marked_by?: string | null
          registration_id?: string
          status?: string | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          handled_at: string | null
          handled_by: string | null
          id: string
          message: string
          name: string
          source: string | null
          status: string | null
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          message: string
          name: string
          source?: string | null
          status?: string | null
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          message?: string
          name?: string
          source?: string | null
          status?: string | null
          subject?: string
        }
        Relationships: []
      }
      department_approval_routing: {
        Row: {
          approver_role_code: string
          created_at: string
          department_scope: string
          id: string
          is_active: boolean
          notes: string | null
          updated_at: string
        }
        Insert: {
          approver_role_code: string
          created_at?: string
          department_scope: string
          id?: string
          is_active?: boolean
          notes?: string | null
          updated_at?: string
        }
        Update: {
          approver_role_code?: string
          created_at?: string
          department_scope?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_approval_routing_approver_role_code_fkey"
            columns: ["approver_role_code"]
            isOneToOne: false
            referencedRelation: "role_catalog"
            referencedColumns: ["role_code"]
          },
        ]
      }
      department_school: {
        Row: {
          department_name: string
          school: string
        }
        Insert: {
          department_name: string
          school: string
        }
        Update: {
          department_name?: string
          school?: string
        }
        Relationships: []
      }
      departments_courses: {
        Row: {
          courses_json: Json
          created_at: string
          department_name: string
          id: string
          school: string | null
          updated_at: string
        }
        Insert: {
          courses_json?: Json
          created_at?: string
          department_name: string
          id?: string
          school?: string | null
          updated_at?: string
        }
        Update: {
          courses_json?: Json
          created_at?: string
          department_name?: string
          id?: string
          school?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      event_budgets: {
        Row: {
          advance_paid: number
          created_at: string
          event_id: string
          finance_status: string
          id: string
          settlement_closed_at: string | null
          settlement_closed_by: string | null
          settlement_status: string
          settlement_submitted_at: string | null
          total_actual_expense: number
          total_estimated_expense: number
          updated_at: string
        }
        Insert: {
          advance_paid?: number
          created_at?: string
          event_id: string
          finance_status?: string
          id?: string
          settlement_closed_at?: string | null
          settlement_closed_by?: string | null
          settlement_status?: string
          settlement_submitted_at?: string | null
          total_actual_expense?: number
          total_estimated_expense?: number
          updated_at?: string
        }
        Update: {
          advance_paid?: number
          created_at?: string
          event_id?: string
          finance_status?: string
          id?: string
          settlement_closed_at?: string | null
          settlement_closed_by?: string | null
          settlement_status?: string
          settlement_submitted_at?: string | null
          total_actual_expense?: number
          total_estimated_expense?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_budgets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["event_id"]
          },
        ]
      }
      events: {
        Row: {
          activation_state: string
          additional_requests: Json
          allow_outsiders: boolean
          allowed_campuses: Json
          approval_request_id: string | null
          approval_state: string
          approved_at: string | null
          approved_by: string | null
          archived_at: string | null
          archived_by: string | null
          auth_uuid: string | null
          banner_url: string | null
          campus_hosted_at: string | null
          category: string | null
          claims_applicable: boolean
          created_at: string
          created_by: string | null
          created_by_subhead: boolean
          custom_fields: Json
          department_access: Json
          description: string | null
          end_date: string | null
          event_context: string
          event_date: string | null
          event_id: string
          event_image_url: string | null
          event_time: string | null
          fest: string | null
          fest_id: string | null
          id: string
          is_archived: boolean
          is_budget_related: boolean
          is_draft: boolean
          max_participants: number | null
          min_participants: number | null
          needs_budget_approval: boolean
          needs_hod_dean_approval: boolean
          on_spot: boolean
          organizer_email: string | null
          organizer_phone: string | null
          organizing_dept: string | null
          organizing_school: string | null
          outsider_max_participants: number | null
          outsider_registration_fee: number | null
          parent_fest_id: string | null
          participants_per_team: number | null
          pdf_url: string | null
          prizes: Json
          registration_deadline: string | null
          registration_fee: number | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          rules: Json
          schedule: Json
          school: string | null
          service_approval_state: string
          status: string
          title: string
          total_participants: number
          updated_at: string
          venue: string | null
          whatsapp_invite_link: string | null
          workflow_phase: Database["public"]["Enums"]["workflow_phase_enum"]
          workflow_status: string
          workflow_version: number
        }
        Insert: {
          activation_state?: string
          additional_requests?: Json
          allow_outsiders?: boolean
          allowed_campuses?: Json
          approval_request_id?: string | null
          approval_state?: string
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          archived_by?: string | null
          auth_uuid?: string | null
          banner_url?: string | null
          campus_hosted_at?: string | null
          category?: string | null
          claims_applicable?: boolean
          created_at?: string
          created_by?: string | null
          created_by_subhead?: boolean
          custom_fields?: Json
          department_access?: Json
          description?: string | null
          end_date?: string | null
          event_context?: string
          event_date?: string | null
          event_id: string
          event_image_url?: string | null
          event_time?: string | null
          fest?: string | null
          fest_id?: string | null
          id?: string
          is_archived?: boolean
          is_budget_related?: boolean
          is_draft?: boolean
          max_participants?: number | null
          min_participants?: number | null
          needs_budget_approval?: boolean
          needs_hod_dean_approval?: boolean
          on_spot?: boolean
          organizer_email?: string | null
          organizer_phone?: string | null
          organizing_dept?: string | null
          organizing_school?: string | null
          outsider_max_participants?: number | null
          outsider_registration_fee?: number | null
          parent_fest_id?: string | null
          participants_per_team?: number | null
          pdf_url?: string | null
          prizes?: Json
          registration_deadline?: string | null
          registration_fee?: number | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          rules?: Json
          schedule?: Json
          school?: string | null
          service_approval_state?: string
          status?: string
          title: string
          total_participants?: number
          updated_at?: string
          venue?: string | null
          whatsapp_invite_link?: string | null
          workflow_phase?: Database["public"]["Enums"]["workflow_phase_enum"]
          workflow_status?: string
          workflow_version?: number
        }
        Update: {
          activation_state?: string
          additional_requests?: Json
          allow_outsiders?: boolean
          allowed_campuses?: Json
          approval_request_id?: string | null
          approval_state?: string
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          archived_by?: string | null
          auth_uuid?: string | null
          banner_url?: string | null
          campus_hosted_at?: string | null
          category?: string | null
          claims_applicable?: boolean
          created_at?: string
          created_by?: string | null
          created_by_subhead?: boolean
          custom_fields?: Json
          department_access?: Json
          description?: string | null
          end_date?: string | null
          event_context?: string
          event_date?: string | null
          event_id?: string
          event_image_url?: string | null
          event_time?: string | null
          fest?: string | null
          fest_id?: string | null
          id?: string
          is_archived?: boolean
          is_budget_related?: boolean
          is_draft?: boolean
          max_participants?: number | null
          min_participants?: number | null
          needs_budget_approval?: boolean
          needs_hod_dean_approval?: boolean
          on_spot?: boolean
          organizer_email?: string | null
          organizer_phone?: string | null
          organizing_dept?: string | null
          organizing_school?: string | null
          outsider_max_participants?: number | null
          outsider_registration_fee?: number | null
          parent_fest_id?: string | null
          participants_per_team?: number | null
          pdf_url?: string | null
          prizes?: Json
          registration_deadline?: string | null
          registration_fee?: number | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          rules?: Json
          schedule?: Json
          school?: string | null
          service_approval_state?: string
          status?: string
          title?: string
          total_participants?: number
          updated_at?: string
          venue?: string | null
          whatsapp_invite_link?: string | null
          workflow_phase?: Database["public"]["Enums"]["workflow_phase_enum"]
          workflow_status?: string
          workflow_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "events_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_parent_fest_id_fkey"
            columns: ["parent_fest_id"]
            isOneToOne: false
            referencedRelation: "fests"
            referencedColumns: ["fest_id"]
          },
          {
            foreignKeyName: "fk_events_fest_id"
            columns: ["fest_id"]
            isOneToOne: false
            referencedRelation: "fests"
            referencedColumns: ["fest_id"]
          },
        ]
      }
      expense_documents: {
        Row: {
          amount: number | null
          budget_id: string | null
          created_at: string
          document_type: string
          event_id: string
          file_name: string
          file_url: string
          finance_verified: boolean
          finance_verified_at: string | null
          finance_verified_by: string | null
          id: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          amount?: number | null
          budget_id?: string | null
          created_at?: string
          document_type?: string
          event_id: string
          file_name: string
          file_url: string
          finance_verified?: boolean
          finance_verified_at?: string | null
          finance_verified_by?: string | null
          id?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          amount?: number | null
          budget_id?: string | null
          created_at?: string
          document_type?: string
          event_id?: string
          file_name?: string
          file_url?: string
          finance_verified?: boolean
          finance_verified_at?: string | null
          finance_verified_by?: string | null
          id?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      fest_subheads: {
        Row: {
          added_at: string
          added_by: string
          fest_id: string
          id: string
          is_active: boolean
          user_email: string
        }
        Insert: {
          added_at?: string
          added_by: string
          fest_id: string
          id?: string
          is_active?: boolean
          user_email: string
        }
        Update: {
          added_at?: string
          added_by?: string
          fest_id?: string
          id?: string
          is_active?: boolean
          user_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "fest_subheads_fest_id_fkey"
            columns: ["fest_id"]
            isOneToOne: false
            referencedRelation: "fests"
            referencedColumns: ["fest_id"]
          },
        ]
      }
      fests: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          activation_state: string
          allow_outsiders: boolean
          allowed_campuses: Json
          approval_request_id: string | null
          approval_state: string
          approved_at: string | null
          approved_by: string | null
          archived_at: string | null
          archived_by: string | null
          auth_uuid: string | null
          budget_amount: number | null
          campus_hosted_at: string | null
          category: string | null
          closing_date: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          custom_fields: Json
          department_access: Json
          department_hosted_at: string | null
          description: string | null
          estimated_budget_amount: number | null
          event_heads: Json
          faqs: Json
          fest_id: string
          fest_image_url: string | null
          fest_title: string
          id: string
          is_archived: boolean
          is_budget_related: boolean
          is_draft: boolean
          opening_date: string | null
          organizing_dept: string | null
          organizing_school: string | null
          registration_deadline: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          school: string | null
          social_links: Json
          sponsors: Json
          status: string
          timeline: Json
          total_estimated_expense: number | null
          updated_at: string
          venue: string | null
          workflow_phase: Database["public"]["Enums"]["workflow_phase_enum"]
          workflow_status: string
          workflow_version: number
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          activation_state?: string
          allow_outsiders?: boolean
          allowed_campuses?: Json
          approval_request_id?: string | null
          approval_state?: string
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          archived_by?: string | null
          auth_uuid?: string | null
          budget_amount?: number | null
          campus_hosted_at?: string | null
          category?: string | null
          closing_date?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json
          department_access?: Json
          department_hosted_at?: string | null
          description?: string | null
          estimated_budget_amount?: number | null
          event_heads?: Json
          faqs?: Json
          fest_id: string
          fest_image_url?: string | null
          fest_title: string
          id?: string
          is_archived?: boolean
          is_budget_related?: boolean
          is_draft?: boolean
          opening_date?: string | null
          organizing_dept?: string | null
          organizing_school?: string | null
          registration_deadline?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          school?: string | null
          social_links?: Json
          sponsors?: Json
          status?: string
          timeline?: Json
          total_estimated_expense?: number | null
          updated_at?: string
          venue?: string | null
          workflow_phase?: Database["public"]["Enums"]["workflow_phase_enum"]
          workflow_status?: string
          workflow_version?: number
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          activation_state?: string
          allow_outsiders?: boolean
          allowed_campuses?: Json
          approval_request_id?: string | null
          approval_state?: string
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          archived_by?: string | null
          auth_uuid?: string | null
          budget_amount?: number | null
          campus_hosted_at?: string | null
          category?: string | null
          closing_date?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json
          department_access?: Json
          department_hosted_at?: string | null
          description?: string | null
          estimated_budget_amount?: number | null
          event_heads?: Json
          faqs?: Json
          fest_id?: string
          fest_image_url?: string | null
          fest_title?: string
          id?: string
          is_archived?: boolean
          is_budget_related?: boolean
          is_draft?: boolean
          opening_date?: string | null
          organizing_dept?: string | null
          organizing_school?: string | null
          registration_deadline?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          school?: string | null
          social_links?: Json
          sponsors?: Json
          status?: string
          timeline?: Json
          total_estimated_expense?: number | null
          updated_at?: string
          venue?: string | null
          workflow_phase?: Database["public"]["Enums"]["workflow_phase_enum"]
          workflow_status?: string
          workflow_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fests_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_audit_log: {
        Row: {
          acted_at: string
          acted_by_email: string | null
          action: string
          amount: number | null
          budget_id: string | null
          created_at: string
          event_id: string | null
          id: string
          metadata: Json
          notes: string | null
        }
        Insert: {
          acted_at?: string
          acted_by_email?: string | null
          action: string
          amount?: number | null
          budget_id?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
        }
        Update: {
          acted_at?: string
          acted_by_email?: string | null
          action?: string
          amount?: number | null
          budget_id?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
        }
        Relationships: []
      }
      notification_user_status: {
        Row: {
          created_at: string
          id: string
          is_dismissed: boolean
          is_read: boolean
          notification_id: string
          user_email: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          notification_id: string
          user_email: string
        }
        Update: {
          created_at?: string
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          notification_id?: string
          user_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_notification_user_status_notification_id"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          event_id: string | null
          event_title: string | null
          id: string
          is_broadcast: boolean | null
          is_read: boolean
          legacy_event_id: string | null
          message: string | null
          read: boolean
          target_role: string | null
          title: string
          type: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          event_id?: string | null
          event_title?: string | null
          id?: string
          is_broadcast?: boolean | null
          is_read?: boolean
          legacy_event_id?: string | null
          message?: string | null
          read?: boolean
          target_role?: string | null
          title: string
          type?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action_url?: string | null
          created_at?: string
          event_id?: string | null
          event_title?: string | null
          id?: string
          is_broadcast?: boolean | null
          is_read?: boolean
          legacy_event_id?: string | null
          message?: string | null
          read?: boolean
          target_role?: string | null
          title?: string
          type?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      qr_scan_logs: {
        Row: {
          event_id: string | null
          id: string
          registration_id: string | null
          scan_result: string | null
          scan_timestamp: string
          scanned_by: string | null
          scanner_info: Json | null
        }
        Insert: {
          event_id?: string | null
          id?: string
          registration_id?: string | null
          scan_result?: string | null
          scan_timestamp?: string
          scanned_by?: string | null
          scanner_info?: Json | null
        }
        Update: {
          event_id?: string | null
          id?: string
          registration_id?: string | null
          scan_result?: string | null
          scan_timestamp?: string
          scanned_by?: string | null
          scanner_info?: Json | null
        }
        Relationships: []
      }
      registrations: {
        Row: {
          created_at: string
          custom_field_responses: Json | null
          event_id: string | null
          id: string
          individual_email: string | null
          individual_name: string | null
          individual_register_number: string | null
          participant_organization: string
          qr_code_data: Json | null
          qr_code_generated_at: string | null
          registration_id: string
          registration_type: string | null
          team_leader_email: string | null
          team_leader_name: string | null
          team_leader_register_number: string | null
          team_name: string | null
          teammates: Json
          user_email: string | null
        }
        Insert: {
          created_at?: string
          custom_field_responses?: Json | null
          event_id?: string | null
          id?: string
          individual_email?: string | null
          individual_name?: string | null
          individual_register_number?: string | null
          participant_organization?: string
          qr_code_data?: Json | null
          qr_code_generated_at?: string | null
          registration_id: string
          registration_type?: string | null
          team_leader_email?: string | null
          team_leader_name?: string | null
          team_leader_register_number?: string | null
          team_name?: string | null
          teammates?: Json
          user_email?: string | null
        }
        Update: {
          created_at?: string
          custom_field_responses?: Json | null
          event_id?: string | null
          id?: string
          individual_email?: string | null
          individual_name?: string | null
          individual_register_number?: string | null
          participant_organization?: string
          qr_code_data?: Json | null
          qr_code_generated_at?: string | null
          registration_id?: string
          registration_type?: string | null
          team_leader_email?: string | null
          team_leader_name?: string | null
          team_leader_register_number?: string | null
          team_name?: string | null
          teammates?: Json
          user_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_registrations_event_id"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["event_id"]
          },
        ]
      }
      role_catalog: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_service_role: boolean
          role_code: string
          role_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_service_role?: boolean
          role_code: string
          role_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_service_role?: boolean
          role_code?: string
          role_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_decisions: {
        Row: {
          comment: string | null
          created_at: string
          decided_by_email: string | null
          decided_by_user_id: string | null
          decision: string
          id: string
          role_code: string
          service_request_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          decided_by_email?: string | null
          decided_by_user_id?: string | null
          decision: string
          id?: string
          role_code: string
          service_request_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          decided_by_email?: string | null
          decided_by_user_id?: string | null
          decision?: string
          id?: string
          role_code?: string
          service_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_decisions_decided_by_user_id_fkey"
            columns: ["decided_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_decisions_service_request_id_fkey"
            columns: ["service_request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      service_incharge_config: {
        Row: {
          campus: string
          id: string
          incharge_email: string
          is_active: boolean
          service_type: string
        }
        Insert: {
          campus: string
          id?: string
          incharge_email: string
          is_active?: boolean
          service_type: string
        }
        Update: {
          campus?: string
          id?: string
          incharge_email?: string
          is_active?: boolean
          service_type?: string
        }
        Relationships: []
      }
      service_requests: {
        Row: {
          approval_notes: string | null
          approval_request_id: string | null
          assigned_incharge_email: string | null
          created_at: string
          decided_at: string | null
          details: Json
          entity_id: string
          entity_type: string
          event_id: string
          id: string
          requested_by_email: string | null
          requested_by_user_id: string | null
          requester_email: string
          resubmission_count: number
          service_request_id: string
          service_role_code: string
          service_type: string
          status: string
          updated_at: string
        }
        Insert: {
          approval_notes?: string | null
          approval_request_id?: string | null
          assigned_incharge_email?: string | null
          created_at?: string
          decided_at?: string | null
          details?: Json
          entity_id: string
          entity_type: string
          event_id: string
          id?: string
          requested_by_email?: string | null
          requested_by_user_id?: string | null
          requester_email: string
          resubmission_count?: number
          service_request_id: string
          service_role_code: string
          service_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          approval_notes?: string | null
          approval_request_id?: string | null
          assigned_incharge_email?: string | null
          created_at?: string
          decided_at?: string | null
          details?: Json
          entity_id?: string
          entity_type?: string
          event_id?: string
          id?: string
          requested_by_email?: string | null
          requested_by_user_id?: string | null
          requester_email?: string
          resubmission_count?: number
          service_request_id?: string
          service_role_code?: string
          service_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "service_requests_requested_by_user_id_fkey"
            columns: ["requested_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_role_assignments: {
        Row: {
          assigned_by: string | null
          assigned_reason: string | null
          campus_scope: string | null
          created_at: string
          department_scope: string | null
          id: string
          is_active: boolean
          role_code: string
          school_scope: string | null
          updated_at: string
          user_id: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          assigned_by?: string | null
          assigned_reason?: string | null
          campus_scope?: string | null
          created_at?: string
          department_scope?: string | null
          id?: string
          is_active?: boolean
          role_code: string
          school_scope?: string | null
          updated_at?: string
          user_id: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          assigned_by?: string | null
          assigned_reason?: string | null
          campus_scope?: string | null
          created_at?: string
          department_scope?: string | null
          id?: string
          is_active?: boolean
          role_code?: string
          school_scope?: string | null
          updated_at?: string
          user_id?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_role_assignments_role_code_fkey"
            columns: ["role_code"]
            isOneToOne: false
            referencedRelation: "role_catalog"
            referencedColumns: ["role_code"]
          },
          {
            foreignKeyName: "user_role_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_uuid: string | null
          avatar_url: string | null
          campus: string | null
          course: string | null
          created_at: string
          department: string | null
          department_id: string | null
          email: string
          id: string
          is_cfo: boolean
          is_dean: boolean
          is_finance_office: boolean
          is_hod: boolean
          is_masteradmin: boolean
          is_organiser: boolean
          is_organiser_student: boolean
          is_service_catering: boolean
          is_service_it: boolean
          is_service_stalls: boolean
          is_service_venue: boolean
          is_support: boolean
          is_volunteer: boolean
          masteradmin_expires_at: string | null
          name: string | null
          organiser_expires_at: string | null
          organization_type: string
          outsider_name_edit_used: boolean
          register_number: string | null
          school: string | null
          school_id: string | null
          support_expires_at: string | null
          university_role:
            | Database["public"]["Enums"]["university_role_enum"]
            | null
          updated_at: string
          visitor_id: string | null
        }
        Insert: {
          auth_uuid?: string | null
          avatar_url?: string | null
          campus?: string | null
          course?: string | null
          created_at?: string
          department?: string | null
          department_id?: string | null
          email: string
          id?: string
          is_cfo?: boolean
          is_dean?: boolean
          is_finance_office?: boolean
          is_hod?: boolean
          is_masteradmin?: boolean
          is_organiser?: boolean
          is_organiser_student?: boolean
          is_service_catering?: boolean
          is_service_it?: boolean
          is_service_stalls?: boolean
          is_service_venue?: boolean
          is_support?: boolean
          is_volunteer?: boolean
          masteradmin_expires_at?: string | null
          name?: string | null
          organiser_expires_at?: string | null
          organization_type?: string
          outsider_name_edit_used?: boolean
          register_number?: string | null
          school?: string | null
          school_id?: string | null
          support_expires_at?: string | null
          university_role?:
            | Database["public"]["Enums"]["university_role_enum"]
            | null
          updated_at?: string
          visitor_id?: string | null
        }
        Update: {
          auth_uuid?: string | null
          avatar_url?: string | null
          campus?: string | null
          course?: string | null
          created_at?: string
          department?: string | null
          department_id?: string | null
          email?: string
          id?: string
          is_cfo?: boolean
          is_dean?: boolean
          is_finance_office?: boolean
          is_hod?: boolean
          is_masteradmin?: boolean
          is_organiser?: boolean
          is_organiser_student?: boolean
          is_service_catering?: boolean
          is_service_it?: boolean
          is_service_stalls?: boolean
          is_service_venue?: boolean
          is_support?: boolean
          is_volunteer?: boolean
          masteradmin_expires_at?: string | null
          name?: string | null
          organiser_expires_at?: string | null
          organization_type?: string
          outsider_name_edit_used?: boolean
          register_number?: string | null
          school?: string | null
          school_id?: string | null
          support_expires_at?: string | null
          university_role?:
            | Database["public"]["Enums"]["university_role_enum"]
            | null
          updated_at?: string
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_users_department"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments_courses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_auth_email: { Args: never; Returns: string }
      current_user_has_any_role: {
        Args: { role_codes: string[] }
        Returns: boolean
      }
      current_user_has_role: { Args: { role_code: string }; Returns: boolean }
      current_user_is_fest_manager: {
        Args: { target_fest_id: string }
        Returns: boolean
      }
      get_admin_analytics_dataset_v1: {
        Args: {
          p_max_attendance?: number
          p_max_events?: number
          p_max_fests?: number
          p_max_registrations?: number
          p_max_users?: number
        }
        Returns: Json
      }
      is_masteradmin_session: { Args: never; Returns: boolean }
      process_accounts_approval_route_logistics: {
        Args: {
          p_actor_email?: string
          p_l4_request_id: string
          p_note?: string
        }
        Returns: Json
      }
      process_cfo_approval_handoff: {
        Args: {
          p_actor_email?: string
          p_l3_request_id: string
          p_note?: string
        }
        Returns: Json
      }
    }
    Enums: {
      university_role_enum:
        | "cfo"
        | "dean"
        | "finance_officer"
        | "hod"
        | "organizer"
      workflow_phase_enum:
        | "draft"
        | "dept_approval"
        | "finance_approval_cfo"
        | "finance_approval_accounts"
        | "logistics_approval"
        | "approved"
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
      university_role_enum: [
        "cfo",
        "dean",
        "finance_officer",
        "hod",
        "organizer",
      ],
      workflow_phase_enum: [
        "draft",
        "dept_approval",
        "finance_approval_cfo",
        "finance_approval_accounts",
        "logistics_approval",
        "approved",
      ],
    },
  },
} as const