export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_accounts: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: Database["public"]["Enums"]["audit_actor_type"]
          created_at: string
          id: string
          metadata: Json
          risk_level: Database["public"]["Enums"]["audit_risk_level"]
          status: Database["public"]["Enums"]["audit_status"]
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type: Database["public"]["Enums"]["audit_actor_type"]
          created_at?: string
          id?: string
          metadata?: Json
          risk_level?: Database["public"]["Enums"]["audit_risk_level"]
          status?: Database["public"]["Enums"]["audit_status"]
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: Database["public"]["Enums"]["audit_actor_type"]
          created_at?: string
          id?: string
          metadata?: Json
          risk_level?: Database["public"]["Enums"]["audit_risk_level"]
          status?: Database["public"]["Enums"]["audit_status"]
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      ai_tool_executions: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          error: string | null
          executed_at: string | null
          id: string
          input: Json
          requested_by: string | null
          result: Json | null
          risk_level: Database["public"]["Enums"]["audit_risk_level"]
          status: Database["public"]["Enums"]["ai_execution_status"]
          tool_name: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          error?: string | null
          executed_at?: string | null
          id?: string
          input?: Json
          requested_by?: string | null
          result?: Json | null
          risk_level: Database["public"]["Enums"]["audit_risk_level"]
          status?: Database["public"]["Enums"]["ai_execution_status"]
          tool_name: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          error?: string | null
          executed_at?: string | null
          id?: string
          input?: Json
          requested_by?: string | null
          result?: Json | null
          risk_level?: Database["public"]["Enums"]["audit_risk_level"]
          status?: Database["public"]["Enums"]["ai_execution_status"]
          tool_name?: string
        }
        Relationships: []
      }
      class_announcements: {
        Row: {
          class_id: string
          created_at: string
          delivered_at: string | null
          id: string
          message: string
        }
        Insert: {
          class_id: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          message: string
        }
        Update: {
          class_id?: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_announcements_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          archived_at: string | null
          class_code: string
          created_at: string
          id: string
          join_mode: Database["public"]["Enums"]["class_join_mode"]
          join_open: boolean
          name: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          class_code: string
          created_at?: string
          id?: string
          join_mode?: Database["public"]["Enums"]["class_join_mode"]
          join_open?: boolean
          name: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          class_code?: string
          created_at?: string
          id?: string
          join_mode?: Database["public"]["Enums"]["class_join_mode"]
          join_open?: boolean
          name?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      join_tickets: {
        Row: {
          class_id: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          participant_id: string
        }
        Insert: {
          class_id: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          participant_id: string
        }
        Update: {
          class_id?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          participant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "join_tickets_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_tickets_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "student_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_windows: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          message: string
          reason: string | null
          starts_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          message: string
          reason?: string | null
          starts_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          message?: string
          reason?: string | null
          starts_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_windows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_config: {
        Row: {
          auto_announcement_enabled: boolean
          auto_rollback_enabled: boolean
          auto_update_enabled: boolean
          singleton: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          auto_announcement_enabled?: boolean
          auto_rollback_enabled?: boolean
          auto_update_enabled?: boolean
          singleton?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          auto_announcement_enabled?: boolean
          auto_rollback_enabled?: boolean
          auto_update_enabled?: boolean
          singleton?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      scheduler_runs: {
        Row: {
          finished_at: string | null
          job_name: string
          run_key: string
          started_at: string
          status: string
        }
        Insert: {
          finished_at?: string | null
          job_name: string
          run_key: string
          started_at?: string
          status?: string
        }
        Update: {
          finished_at?: string | null
          job_name?: string
          run_key?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      student_activity_events: {
        Row: {
          class_id: string
          event_type: Database["public"]["Enums"]["activity_event_type"]
          id: string
          occurred_at: string
          participant_id: string
          payload: Json
        }
        Insert: {
          class_id: string
          event_type: Database["public"]["Enums"]["activity_event_type"]
          id?: string
          occurred_at?: string
          participant_id: string
          payload?: Json
        }
        Update: {
          class_id?: string
          event_type?: Database["public"]["Enums"]["activity_event_type"]
          id?: string
          occurred_at?: string
          participant_id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "student_activity_events_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_activity_events_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "student_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      student_participants: {
        Row: {
          class_id: string
          created_at: string
          id: string
          last_seen_at: string | null
          nickname: string
          participant_code: string
          status: Database["public"]["Enums"]["participant_status"]
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          last_seen_at?: string | null
          nickname: string
          participant_code: string
          status?: Database["public"]["Enums"]["participant_status"]
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          last_seen_at?: string | null
          nickname?: string
          participant_code?: string
          status?: Database["public"]["Enums"]["participant_status"]
        }
        Relationships: [
          {
            foreignKeyName: "student_participants_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      student_progression: {
        Row: {
          level: number
          participant_id: string
          play_seconds: number
          updated_at: string
          xp: number
        }
        Insert: {
          level?: number
          participant_id: string
          play_seconds?: number
          updated_at?: string
          xp?: number
        }
        Update: {
          level?: number
          participant_id?: string
          play_seconds?: number
          updated_at?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_progression_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "student_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_announcements: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          published_at: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["announcement_status"]
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["announcement_status"]
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["announcement_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_accounts: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          role: string
          school_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
          role?: string
          school_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: string
          school_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      update_executions: {
        Row: {
          build_result: Json | null
          checkpoint_commit_sha: string | null
          checkpoint_deployment_id: string | null
          created_at: string
          finished_at: string | null
          health_check_result: Json | null
          id: string
          precheck_result: Json | null
          started_at: string
          state: Database["public"]["Enums"]["update_state"]
          test_result: Json | null
          update_plan_id: string
        }
        Insert: {
          build_result?: Json | null
          checkpoint_commit_sha?: string | null
          checkpoint_deployment_id?: string | null
          created_at?: string
          finished_at?: string | null
          health_check_result?: Json | null
          id?: string
          precheck_result?: Json | null
          started_at?: string
          state?: Database["public"]["Enums"]["update_state"]
          test_result?: Json | null
          update_plan_id: string
        }
        Update: {
          build_result?: Json | null
          checkpoint_commit_sha?: string | null
          checkpoint_deployment_id?: string | null
          created_at?: string
          finished_at?: string | null
          health_check_result?: Json | null
          id?: string
          precheck_result?: Json | null
          started_at?: string
          state?: Database["public"]["Enums"]["update_state"]
          test_result?: Json | null
          update_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "update_executions_update_plan_id_fkey"
            columns: ["update_plan_id"]
            isOneToOne: false
            referencedRelation: "update_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      update_plans: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          changes: Json
          created_at: string
          created_by_type: Database["public"]["Enums"]["audit_actor_type"]
          id: string
          risk_level: Database["public"]["Enums"]["audit_risk_level"]
          scheduled_for: string | null
          status: Database["public"]["Enums"]["update_state"]
          summary: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          changes?: Json
          created_at?: string
          created_by_type?: Database["public"]["Enums"]["audit_actor_type"]
          id?: string
          risk_level?: Database["public"]["Enums"]["audit_risk_level"]
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["update_state"]
          summary: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          changes?: Json
          created_at?: string
          created_by_type?: Database["public"]["Enums"]["audit_actor_type"]
          id?: string
          risk_level?: Database["public"]["Enums"]["audit_risk_level"]
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["update_state"]
          summary?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_join_ticket: {
        Args: { p_ticket_id: string }
        Returns: {
          class_id: string
          nickname: string
          participant_id: string
        }[]
      }
      create_class: {
        Args: { p_name: string }
        Returns: {
          archived_at: string | null
          class_code: string
          created_at: string
          id: string
          join_mode: Database["public"]["Enums"]["class_join_mode"]
          join_open: boolean
          name: string
          teacher_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "classes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_roster_participant: {
        Args: { p_class_id: string; p_nickname: string }
        Returns: {
          class_id: string
          created_at: string
          id: string
          last_seen_at: string | null
          nickname: string
          participant_code: string
          status: Database["public"]["Enums"]["participant_status"]
        }
        SetofOptions: {
          from: "*"
          to: "student_participants"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      generate_entry_code: { Args: never; Returns: string }
      get_active_maintenance_notice: {
        Args: never
        Returns: { message: string; starts_at: string }[]
      }
      get_latest_published_announcement: {
        Args: never
        Returns: { id: string; title: string; body: string }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_class_teacher: { Args: { p_class_id: string }; Returns: boolean }
      is_participant_teacher: {
        Args: { p_participant_id: string }
        Returns: boolean
      }
      join_class: {
        Args: {
          p_class_code: string
          p_nickname?: string
          p_participant_code?: string
        }
        Returns: {
          class_id: string
          nickname: string
          participant_code: string
          participant_id: string
          ticket_id: string
        }[]
      }
      record_audit_log: {
        Args: {
          p_action: string
          p_actor_type?: string
          p_metadata?: Json
          p_risk_level?: Database["public"]["Enums"]["audit_risk_level"]
          p_status?: Database["public"]["Enums"]["audit_status"]
          p_target_id?: string
          p_target_type?: string
        }
        Returns: {
          action: string
          actor_id: string | null
          actor_type: Database["public"]["Enums"]["audit_actor_type"]
          created_at: string
          id: string
          metadata: Json
          risk_level: Database["public"]["Enums"]["audit_risk_level"]
          status: Database["public"]["Enums"]["audit_status"]
          target_id: string | null
          target_type: string | null
        }
        SetofOptions: {
          from: "*"
          to: "admin_audit_logs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      regenerate_class_code: { Args: { p_class_id: string }; Returns: string }
    }
    Enums: {
      activity_event_type: "joined" | "left" | "activity_completed"
      ai_execution_status: "pending" | "approved" | "rejected" | "executed" | "failed"
      announcement_status: "draft" | "scheduled" | "published" | "expired"
      audit_actor_type: "admin" | "system" | "ai"
      audit_risk_level: "low" | "medium" | "high" | "critical"
      audit_status: "success" | "failed" | "pending"
      class_join_mode: "open" | "roster"
      participant_status: "active" | "removed" | "transferred"
      update_state:
        | "planned"
        | "approved"
        | "scheduled"
        | "prechecking"
        | "maintenance"
        | "testing"
        | "building"
        | "deploying"
        | "verifying"
        | "completed"
        | "failed"
        | "rolling_back"
        | "rolled_back"
        | "cancelled"
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
      activity_event_type: ["joined", "left", "activity_completed"],
      ai_execution_status: ["pending", "approved", "rejected", "executed", "failed"],
      announcement_status: ["draft", "scheduled", "published", "expired"],
      audit_actor_type: ["admin", "system", "ai"],
      audit_risk_level: ["low", "medium", "high", "critical"],
      audit_status: ["success", "failed", "pending"],
      class_join_mode: ["open", "roster"],
      participant_status: ["active", "removed", "transferred"],
      update_state: [
        "planned",
        "approved",
        "scheduled",
        "prechecking",
        "maintenance",
        "testing",
        "building",
        "deploying",
        "verifying",
        "completed",
        "failed",
        "rolling_back",
        "rolled_back",
        "cancelled",
      ],
    },
  },
} as const

