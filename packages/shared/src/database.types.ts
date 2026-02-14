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
      advertisers: {
        Row: {
          advertiser_id: string
          billing_customer_id: string | null
          created_at: string
          name: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          advertiser_id?: string
          billing_customer_id?: string | null
          created_at?: string
          name: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          advertiser_id?: string
          billing_customer_id?: string | null
          created_at?: string
          name?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
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
          publisher_id: string | null
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
          publisher_id?: string | null
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
          publisher_id?: string | null
          status?: string
          subtitle?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apps_publisher_id_fkey"
            columns: ["publisher_id"]
            isOneToOne: false
            referencedRelation: "publishers"
            referencedColumns: ["publisher_id"]
          },
        ]
      }
      assets: {
        Row: {
          asset_id: string
          bytes: number | null
          created_at: string
          creative_id: string
          height: number | null
          mime_type: string | null
          sha256: string | null
          type: string
          url: string
          width: number | null
        }
        Insert: {
          asset_id?: string
          bytes?: number | null
          created_at?: string
          creative_id: string
          height?: number | null
          mime_type?: string | null
          sha256?: string | null
          type: string
          url: string
          width?: number | null
        }
        Update: {
          asset_id?: string
          bytes?: number | null
          created_at?: string
          creative_id?: string
          height?: number | null
          mime_type?: string | null
          sha256?: string | null
          type?: string
          url?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "creatives"
            referencedColumns: ["creative_id"]
          },
        ]
      }
      bundle_placements: {
        Row: {
          added_at: string
          bundle_id: string
          placement_id: string
          status: string
        }
        Insert: {
          added_at?: string
          bundle_id: string
          placement_id: string
          status?: string
        }
        Update: {
          added_at?: string
          bundle_id?: string
          placement_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundle_placements_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["bundle_id"]
          },
          {
            foreignKeyName: "bundle_placements_placement_id_fkey"
            columns: ["placement_id"]
            isOneToOne: false
            referencedRelation: "placements"
            referencedColumns: ["placement_id"]
          },
        ]
      }
      bundles: {
        Row: {
          base_weekly_price_cents: number
          bundle_id: string
          created_at: string
          description: string | null
          name: string
          price_ceiling_cents: number | null
          price_floor_cents: number | null
          status: string
          updated_at: string
        }
        Insert: {
          base_weekly_price_cents: number
          bundle_id?: string
          created_at?: string
          description?: string | null
          name: string
          price_ceiling_cents?: number | null
          price_floor_cents?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          base_weekly_price_cents?: number
          bundle_id?: string
          created_at?: string
          description?: string | null
          name?: string
          price_ceiling_cents?: number | null
          price_floor_cents?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          advertiser_id: string
          bundle_id: string
          campaign_id: string
          created_at: string
          creative_id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          advertiser_id: string
          bundle_id: string
          campaign_id?: string
          created_at?: string
          creative_id: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          advertiser_id?: string
          bundle_id?: string
          campaign_id?: string
          created_at?: string
          creative_id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "advertisers"
            referencedColumns: ["advertiser_id"]
          },
          {
            foreignKeyName: "campaigns_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["bundle_id"]
          },
          {
            foreignKeyName: "campaigns_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "creatives"
            referencedColumns: ["creative_id"]
          },
        ]
      }
      click_events: {
        Row: {
          campaign_id: string
          conversion_token_id: string | null
          creative_id: string
          dedupe_key: string
          event_id: string
          ingested_at: string
          placement_id: string
          serve_id: string | null
          ts: string
        }
        Insert: {
          campaign_id: string
          conversion_token_id?: string | null
          creative_id: string
          dedupe_key: string
          event_id?: string
          ingested_at?: string
          placement_id: string
          serve_id?: string | null
          ts: string
        }
        Update: {
          campaign_id?: string
          conversion_token_id?: string | null
          creative_id?: string
          dedupe_key?: string
          event_id?: string
          ingested_at?: string
          placement_id?: string
          serve_id?: string | null
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "click_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "click_events_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "creatives"
            referencedColumns: ["creative_id"]
          },
          {
            foreignKeyName: "click_events_placement_id_fkey"
            columns: ["placement_id"]
            isOneToOne: false
            referencedRelation: "placements"
            referencedColumns: ["placement_id"]
          },
          {
            foreignKeyName: "click_events_serve_id_fkey"
            columns: ["serve_id"]
            isOneToOne: false
            referencedRelation: "serve_decisions"
            referencedColumns: ["serve_id"]
          },
        ]
      }
      creatives: {
        Row: {
          advertiser_id: string
          approved_at: string | null
          body: string
          created_at: string
          creative_id: string
          cta: string
          destination_type: string
          destination_value: string
          headline: string
          rejected_reason: string | null
          sponsored_label: string
          status: string
          updated_at: string
        }
        Insert: {
          advertiser_id: string
          approved_at?: string | null
          body: string
          created_at?: string
          creative_id?: string
          cta: string
          destination_type: string
          destination_value: string
          headline: string
          rejected_reason?: string | null
          sponsored_label?: string
          status?: string
          updated_at?: string
        }
        Update: {
          advertiser_id?: string
          approved_at?: string | null
          body?: string
          created_at?: string
          creative_id?: string
          cta?: string
          destination_type?: string
          destination_value?: string
          headline?: string
          rejected_reason?: string | null
          sponsored_label?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creatives_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "advertisers"
            referencedColumns: ["advertiser_id"]
          },
        ]
      }
      credit_ledger_entries: {
        Row: {
          advertiser_id: string | null
          amount_cents: number
          created_at: string
          entry_id: string
          expires_at: string | null
          publisher_id: string | null
          related_campaign_id: string | null
          type: string
        }
        Insert: {
          advertiser_id?: string | null
          amount_cents: number
          created_at?: string
          entry_id?: string
          expires_at?: string | null
          publisher_id?: string | null
          related_campaign_id?: string | null
          type: string
        }
        Update: {
          advertiser_id?: string | null
          amount_cents?: number
          created_at?: string
          entry_id?: string
          expires_at?: string | null
          publisher_id?: string | null
          related_campaign_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_entries_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "advertisers"
            referencedColumns: ["advertiser_id"]
          },
          {
            foreignKeyName: "credit_ledger_entries_publisher_id_fkey"
            columns: ["publisher_id"]
            isOneToOne: false
            referencedRelation: "publishers"
            referencedColumns: ["publisher_id"]
          },
          {
            foreignKeyName: "credit_ledger_entries_related_campaign_id_fkey"
            columns: ["related_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["campaign_id"]
          },
        ]
      }
      impression_events: {
        Row: {
          campaign_id: string
          creative_id: string
          dedupe_key: string
          event_id: string
          ingested_at: string
          placement_id: string
          serve_id: string | null
          ts: string
        }
        Insert: {
          campaign_id: string
          creative_id: string
          dedupe_key: string
          event_id?: string
          ingested_at?: string
          placement_id: string
          serve_id?: string | null
          ts: string
        }
        Update: {
          campaign_id?: string
          creative_id?: string
          dedupe_key?: string
          event_id?: string
          ingested_at?: string
          placement_id?: string
          serve_id?: string | null
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "impression_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "impression_events_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "creatives"
            referencedColumns: ["creative_id"]
          },
          {
            foreignKeyName: "impression_events_placement_id_fkey"
            columns: ["placement_id"]
            isOneToOne: false
            referencedRelation: "placements"
            referencedColumns: ["placement_id"]
          },
          {
            foreignKeyName: "impression_events_serve_id_fkey"
            columns: ["serve_id"]
            isOneToOne: false
            referencedRelation: "serve_decisions"
            referencedColumns: ["serve_id"]
          },
        ]
      }
      placements: {
        Row: {
          app_id: string
          category_id: string | null
          created_at: string
          enabled: boolean
          frequency_cap_policy: Json | null
          key: string
          notes: string | null
          placement_id: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          app_id: string
          category_id?: string | null
          created_at?: string
          enabled?: boolean
          frequency_cap_policy?: Json | null
          key: string
          notes?: string | null
          placement_id?: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          app_id?: string
          category_id?: string | null
          created_at?: string
          enabled?: boolean
          frequency_cap_policy?: Json | null
          key?: string
          notes?: string | null
          placement_id?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "placements_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["app_id"]
          },
        ]
      }
      publishers: {
        Row: {
          created_at: string
          email: string
          name: string
          payout_method: Json | null
          publisher_id: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          name: string
          payout_method?: Json | null
          publisher_id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          name?: string
          payout_method?: Json | null
          publisher_id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      serve_decisions: {
        Row: {
          ad_id: string
          campaign_id: string
          creative_id: string
          expires_at: string
          issued_at: string
          locale: string | null
          nonce_hash: string | null
          os_major: number | null
          placement_id: string
          sdk_version: string | null
          serve_id: string
        }
        Insert: {
          ad_id: string
          campaign_id: string
          creative_id: string
          expires_at: string
          issued_at?: string
          locale?: string | null
          nonce_hash?: string | null
          os_major?: number | null
          placement_id: string
          sdk_version?: string | null
          serve_id?: string
        }
        Update: {
          ad_id?: string
          campaign_id?: string
          creative_id?: string
          expires_at?: string
          issued_at?: string
          locale?: string | null
          nonce_hash?: string | null
          os_major?: number | null
          placement_id?: string
          sdk_version?: string | null
          serve_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "serve_decisions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "serve_decisions_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "creatives"
            referencedColumns: ["creative_id"]
          },
          {
            foreignKeyName: "serve_decisions_placement_id_fkey"
            columns: ["placement_id"]
            isOneToOne: false
            referencedRelation: "placements"
            referencedColumns: ["placement_id"]
          },
        ]
      }
      slot_bookings: {
        Row: {
          bundle_id: string
          campaign_id: string
          created_at: string
          end_at: string
          payment_type: string
          price_cents: number
          slot_booking_id: string
          slot_type: string
          start_at: string
        }
        Insert: {
          bundle_id: string
          campaign_id: string
          created_at?: string
          end_at: string
          payment_type: string
          price_cents: number
          slot_booking_id?: string
          slot_type: string
          start_at: string
        }
        Update: {
          bundle_id?: string
          campaign_id?: string
          created_at?: string
          end_at?: string
          payment_type?: string
          price_cents?: number
          slot_booking_id?: string
          slot_type?: string
          start_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "slot_bookings_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["bundle_id"]
          },
          {
            foreignKeyName: "slot_bookings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["campaign_id"]
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
