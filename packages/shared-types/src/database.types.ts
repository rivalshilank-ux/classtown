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
      regenerate_class_code: { Args: { p_class_id: string }; Returns: string }
    }
    Enums: {
      activity_event_type: "joined" | "left"
      class_join_mode: "open" | "roster"
      participant_status: "active" | "removed" | "transferred"
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
      activity_event_type: ["joined", "left"],
      class_join_mode: ["open", "roster"],
      participant_status: ["active", "removed", "transferred"],
    },
  },
} as const

