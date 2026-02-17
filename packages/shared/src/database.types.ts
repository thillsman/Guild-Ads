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
      get_next_week_start: { Args: never; Returns: string }
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
