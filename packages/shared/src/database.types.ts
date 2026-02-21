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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ad_requests: {
        Row: {
          app_id: string
          campaign_id: string | null
          clicked: boolean
          clicked_at: string | null
          created_at: string
          device_id_hash: string | null
          locale: string | null
          os_version: string | null
          placement_id: string
          request_id: string
          response_type: string
          sdk_version: string | null
        }
        Insert: {
          app_id: string
          campaign_id?: string | null
          clicked?: boolean
          clicked_at?: string | null
          created_at?: string
          device_id_hash?: string | null
          locale?: string | null
          os_version?: string | null
          placement_id?: string
          request_id?: string
          response_type: string
          sdk_version?: string | null
        }
        Update: {
          app_id?: string
          campaign_id?: string | null
          clicked?: boolean
          clicked_at?: string | null
          created_at?: string
          device_id_hash?: string | null
          locale?: string | null
          os_version?: string | null
          placement_id?: string
          request_id?: string
          response_type?: string
          sdk_version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_requests_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["app_id"]
          },
          {
            foreignKeyName: "ad_requests_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["campaign_id"]
          },
        ]
      }
      app_tokens: {
        Row: {
          app_id: string
          created_at: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          token_hash: string
          token_id: string
          user_id: string
        }
        Insert: {
          app_id: string
          created_at?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          token_hash: string
          token_id?: string
          user_id: string
        }
        Update: {
          app_id?: string
          created_at?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          token_hash?: string
          token_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_tokens_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["app_id"]
          },
        ]
      }
      apps: {
        Row: {
          app_id: string
          app_store_id: string | null
          app_store_url: string | null
          bundle_identifier: string
          created_at: string
          icon_url: string | null
          name: string
          platform: string
          status: string
          subtitle: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          app_id?: string
          app_store_id?: string | null
          app_store_url?: string | null
          bundle_identifier: string
          created_at?: string
          icon_url?: string | null
          name: string
          platform?: string
          status?: string
          subtitle?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          app_id?: string
          app_store_id?: string | null
          app_store_url?: string | null
          bundle_identifier?: string
          created_at?: string
          icon_url?: string | null
          name?: string
          platform?: string
          status?: string
          subtitle?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          app_id: string | null
          body: string | null
          campaign_id: string
          created_at: string
          cta_text: string | null
          destination_url: string | null
          headline: string | null
          name: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          app_id?: string | null
          body?: string | null
          campaign_id?: string
          created_at?: string
          cta_text?: string | null
          destination_url?: string | null
          headline?: string | null
          name: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          app_id?: string | null
          body?: string | null
          campaign_id?: string
          created_at?: string
          cta_text?: string | null
          destination_url?: string | null
          headline?: string | null
          name?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["app_id"]
          },
        ]
      }
      slot_purchases: {
        Row: {
          campaign_id: string | null
          created_at: string
          percentage_purchased: number
          price_cents: number
          purchase_id: string
          slot_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          percentage_purchased: number
          price_cents: number
          purchase_id?: string
          slot_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          percentage_purchased?: number
          price_cents?: number
          purchase_id?: string
          slot_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "slot_purchases_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "slot_purchases_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "weekly_slots"
            referencedColumns: ["slot_id"]
          },
        ]
      }
      unique_ad_views: {
        Row: {
          campaign_id: string
          clicked: boolean
          clicked_at: string | null
          device_id_hash: string
          first_seen_at: string
          last_seen_at: string
          placement_id: string
          publisher_app_id: string
          slot_purchase_id: string | null
          view_count: number
          view_id: string
          week_start: string
        }
        Insert: {
          campaign_id: string
          clicked?: boolean
          clicked_at?: string | null
          device_id_hash: string
          first_seen_at?: string
          last_seen_at?: string
          placement_id: string
          publisher_app_id: string
          slot_purchase_id?: string | null
          view_count?: number
          view_id?: string
          week_start: string
        }
        Update: {
          campaign_id?: string
          clicked?: boolean
          clicked_at?: string | null
          device_id_hash?: string
          first_seen_at?: string
          last_seen_at?: string
          placement_id?: string
          publisher_app_id?: string
          slot_purchase_id?: string | null
          view_count?: number
          view_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "unique_ad_views_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "unique_ad_views_publisher_app_id_fkey"
            columns: ["publisher_app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["app_id"]
          },
          {
            foreignKeyName: "unique_ad_views_slot_purchase_id_fkey"
            columns: ["slot_purchase_id"]
            isOneToOne: false
            referencedRelation: "slot_purchases"
            referencedColumns: ["purchase_id"]
          },
        ]
      }
      weekly_slots: {
        Row: {
          base_price_cents: number
          created_at: string
          slot_id: string
          total_impressions_estimate: number
          total_users_estimate: number
          updated_at: string
          week_start: string
        }
        Insert: {
          base_price_cents?: number
          created_at?: string
          slot_id?: string
          total_impressions_estimate?: number
          total_users_estimate?: number
          updated_at?: string
          week_start: string
        }
        Update: {
          base_price_cents?: number
          created_at?: string
          slot_id?: string
          total_impressions_estimate?: number
          total_users_estimate?: number
          updated_at?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_advertiser_weekly_metrics: {
        Args: { p_app_id?: string; p_user_id: string; p_weeks?: number }
        Returns: {
          campaign_id: string
          campaign_name: string
          clicks: number
          impressions: number
          unique_users: number
          week_start: string
        }[]
      }
      get_app_daily_storage_metrics: {
        Args: { p_app_id: string; p_days?: number; p_user_id: string }
        Returns: {
          ad_request_rows: number
          clicks: number
          day: string
          impressions: number
          unique_users: number
        }[]
      }
      get_app_data_volume: {
        Args: { p_app_id: string; p_user_id: string }
        Returns: {
          ad_request_rows: number
          ad_request_rows_30d: number
          ad_request_rows_7d: number
          first_ad_request_at: string
          last_ad_request_at: string
          unique_ad_view_rows: number
        }[]
      }
      get_next_week_start: { Args: never; Returns: string }
      get_publisher_weekly_placement_metrics: {
        Args: { p_app_id: string; p_user_id: string; p_weeks?: number }
        Returns: {
          clicks: number
          impressions: number
          placement_id: string
          unique_users: number
          week_start: string
        }[]
      }
      get_publisher_weekly_totals: {
        Args: { p_app_id: string; p_user_id: string; p_weeks?: number }
        Returns: {
          clicks: number
          impressions: number
          unique_users: number
          week_start: string
        }[]
      }
      get_week_availability: {
        Args: { week_date: string }
        Returns: {
          available_percentage: number
          base_price_cents: number
          purchased_percentage: number
          total_percentage: number
          total_users_estimate: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
