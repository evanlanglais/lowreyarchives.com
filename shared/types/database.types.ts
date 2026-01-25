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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      "event-media": {
        Row: {
          event_id: number
          linked_at: string
          media_id: number
        }
        Insert: {
          event_id: number
          linked_at?: string
          media_id: number
        }
        Update: {
          event_id?: number
          linked_at?: string
          media_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "event-media_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event-media_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          end_date: string
          id: number
          start_date: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string
          end_date: string
          id?: number
          start_date: string
          title?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          end_date?: string
          id?: number
          start_date?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      "group-events": {
        Row: {
          event_id: number
          group_id: number
          linked_at: string
        }
        Insert: {
          event_id: number
          group_id: number
          linked_at?: string
        }
        Update: {
          event_id?: number
          group_id?: number
          linked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group-events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group-events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      "group-users": {
        Row: {
          group_id: number
          joined_at: string
          user_id: string
        }
        Insert: {
          group_id: number
          joined_at?: string
          user_id: string
        }
        Update: {
          group_id?: number
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group-users_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group-users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          group_description: string | null
          group_name: string
          id: number
        }
        Insert: {
          created_at?: string
          group_description?: string | null
          group_name: string
          id?: number
        }
        Update: {
          created_at?: string
          group_description?: string | null
          group_name?: string
          id?: number
        }
        Relationships: []
      }
      media: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: number
          media_type: Database["public"]["Enums"]["media_type"]
          media_url: string
          status: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: number
          media_type: Database["public"]["Enums"]["media_type"]
          media_url: string
          status?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: number
          media_type?: Database["public"]["Enums"]["media_type"]
          media_url?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media_variants: {
        Row: {
          bucket: string
          created_at: string | null
          duration_seconds: number | null
          file_size: number | null
          height: number | null
          id: number
          media_id: number
          mime_type: string | null
          storage_path: string
          variant_type: string
          width: number | null
        }
        Insert: {
          bucket?: string
          created_at?: string | null
          duration_seconds?: number | null
          file_size?: number | null
          height?: number | null
          id?: number
          media_id: number
          mime_type?: string | null
          storage_path: string
          variant_type: string
          width?: number | null
        }
        Update: {
          bucket?: string
          created_at?: string | null
          duration_seconds?: number | null
          file_size?: number | null
          height?: number | null
          id?: number
          media_id?: number
          mime_type?: string | null
          storage_path?: string
          variant_type?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_variants_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      processing_jobs: {
        Row: {
          archive_path: string | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          event_id: number | null
          id: number
          ingest_path: string
          job_type: string
          media_id: number
          optimized_path: string | null
          processing_details: Json | null
          retry_count: number
          started_at: string | null
          status: string
          thumbnail_path: string | null
          updated_at: string
          worker_id: string | null
        }
        Insert: {
          archive_path?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          event_id?: number | null
          id?: number
          ingest_path: string
          job_type: string
          media_id: number
          optimized_path?: string | null
          processing_details?: Json | null
          retry_count?: number
          started_at?: string | null
          status?: string
          thumbnail_path?: string | null
          updated_at?: string
          worker_id?: string | null
        }
        Update: {
          archive_path?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          event_id?: number | null
          id?: number
          ingest_path?: string
          job_type?: string
          media_id?: number
          optimized_path?: string | null
          processing_details?: Json | null
          retry_count?: number
          started_at?: string | null
          status?: string
          thumbnail_path?: string | null
          updated_at?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_event"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_media"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      "user-events": {
        Row: {
          event_id: number
          relationship_type: string | null
          user_id: string
        }
        Insert: {
          event_id: number
          relationship_type?: string | null
          user_id?: string
        }
        Update: {
          event_id?: number
          relationship_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_user-events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user-events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      install_available_extensions_and_test: { Args: never; Returns: boolean }
    }
    Enums: {
      media_type:
        | "youtube_url"
        | "video_url"
        | "photo_url"
        | "bucket_video"
        | "cloudflare_video"
        | "bucket_photo"
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
      media_type: [
        "youtube_url",
        "video_url",
        "photo_url",
        "bucket_video",
        "cloudflare_video",
        "bucket_photo",
      ],
    },
  },
} as const
