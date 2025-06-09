export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      "event-media": {
        Row: {
          event_id: number;
          linked_at: string;
          media_id: number;
        };
        Insert: {
          event_id: number;
          linked_at?: string;
          media_id: number;
        };
        Update: {
          event_id?: number;
          linked_at?: string;
          media_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "event-media_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event-media_media_id_fkey";
            columns: ["media_id"];
            isOneToOne: false;
            referencedRelation: "media";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          created_at: string;
          description: string;
          end_date: string;
          id: number;
          start_date: string;
          title: string;
        };
        Insert: {
          created_at?: string;
          description?: string;
          end_date: string;
          id?: number;
          start_date: string;
          title?: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          end_date?: string;
          id?: number;
          start_date?: string;
          title?: string;
        };
        Relationships: [];
      };
      "group-events": {
        Row: {
          event_id: number;
          group_id: number;
          linked_at: string;
        };
        Insert: {
          event_id: number;
          group_id: number;
          linked_at?: string;
        };
        Update: {
          event_id?: number;
          group_id?: number;
          linked_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group-events_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group-events_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      "group-users": {
        Row: {
          group_id: number;
          joined_at: string;
          user_id: string;
        };
        Insert: {
          group_id: number;
          joined_at?: string;
          user_id: string;
        };
        Update: {
          group_id?: number;
          joined_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group-users_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group-users_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      groups: {
        Row: {
          created_at: string;
          group_description: string | null;
          group_name: string;
          id: number;
        };
        Insert: {
          created_at?: string;
          group_description?: string | null;
          group_name: string;
          id?: number;
        };
        Update: {
          created_at?: string;
          group_description?: string | null;
          group_name?: string;
          id?: number;
        };
        Relationships: [];
      };
      media: {
        Row: {
          created_at: string;
          description: string | null;
          id: number;
          media_type: Database["public"]["Enums"]["media_type"];
          media_url: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: number;
          media_type: Database["public"]["Enums"]["media_type"];
          media_url: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: number;
          media_type?: Database["public"]["Enums"]["media_type"];
          media_url?: string;
        };
        Relationships: [];
      };
      "user-events": {
        Row: {
          event_id: number;
          user_id: string;
        };
        Insert: {
          event_id: number;
          user_id?: string;
        };
        Update: {
          event_id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "public_user-events_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "public_user-events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      install_available_extensions_and_test: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {
      media_type: "youtube_url" | "video_url" | "photo_url" | "bucket_video";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never;
