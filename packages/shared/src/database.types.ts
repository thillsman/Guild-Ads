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
          icon_url: string | null
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
          icon_url?: string | null
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
          icon_url?: string | null
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
      billing_booking_intents: {
        Row: {
          booking_intent_id: string
          user_id: string
          campaign_id: string
          slot_id: string
          percentage_purchased: number
          quoted_price_cents: number
          credits_applied_cents: number
          cash_due_cents: number
          currency: string
          status: string
          failure_reason: string | null
          is_internal: boolean
          stripe_customer_id: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          stripe_charge_id: string | null
          stripe_refund_id: string | null
          confirmed_purchase_id: string | null
          created_at: string
          updated_at: string
          confirmed_at: string | null
        }
        Insert: {
          booking_intent_id?: string
          user_id: string
          campaign_id: string
          slot_id: string
          percentage_purchased: number
          quoted_price_cents: number
          credits_applied_cents?: number
          cash_due_cents: number
          currency?: string
          status?: string
          failure_reason?: string | null
          is_internal?: boolean
          stripe_customer_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_charge_id?: string | null
          stripe_refund_id?: string | null
          confirmed_purchase_id?: string | null
          created_at?: string
          updated_at?: string
          confirmed_at?: string | null
        }
        Update: {
          booking_intent_id?: string
          user_id?: string
          campaign_id?: string
          slot_id?: string
          percentage_purchased?: number
          quoted_price_cents?: number
          credits_applied_cents?: number
          cash_due_cents?: number
          currency?: string
          status?: string
          failure_reason?: string | null
          is_internal?: boolean
          stripe_customer_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_charge_id?: string | null
          stripe_refund_id?: string | null
          confirmed_purchase_id?: string | null
          created_at?: string
          updated_at?: string
          confirmed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_booking_intents_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "billing_booking_intents_confirmed_purchase_id_fkey"
            columns: ["confirmed_purchase_id"]
            isOneToOne: false
            referencedRelation: "slot_purchases"
            referencedColumns: ["purchase_id"]
          },
          {
            foreignKeyName: "billing_booking_intents_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "weekly_slots"
            referencedColumns: ["slot_id"]
          },
        ]
      }
      billing_customers: {
        Row: {
          user_id: string
          stripe_customer_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          stripe_customer_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          stripe_customer_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      billing_webhook_events: {
        Row: {
          webhook_event_id: string
          provider: string
          external_event_id: string
          event_type: string
          payload: Json
          processed: boolean
          processed_at: string | null
          processing_error: string | null
          created_at: string
        }
        Insert: {
          webhook_event_id?: string
          provider: string
          external_event_id: string
          event_type: string
          payload: Json
          processed?: boolean
          processed_at?: string | null
          processing_error?: string | null
          created_at?: string
        }
        Update: {
          webhook_event_id?: string
          provider?: string
          external_event_id?: string
          event_type?: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          processing_error?: string | null
          created_at?: string
        }
        Relationships: []
      }
      credit_holds: {
        Row: {
          hold_id: string
          user_id: string
          booking_intent_id: string
          amount_cents: number
          status: string
          released_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          hold_id?: string
          user_id: string
          booking_intent_id: string
          amount_cents: number
          status?: string
          released_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          hold_id?: string
          user_id?: string
          booking_intent_id?: string
          amount_cents?: number
          status?: string
          released_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_holds_booking_intent_id_fkey"
            columns: ["booking_intent_id"]
            isOneToOne: false
            referencedRelation: "billing_booking_intents"
            referencedColumns: ["booking_intent_id"]
          },
        ]
      }
      credit_ledger_entries: {
        Row: {
          entry_id: string
          user_id: string
          amount_cents: number
          entry_type: string
          source_table: string | null
          source_id: string | null
          expires_at: string | null
          metadata: Json
          created_by: string | null
          created_at: string
        }
        Insert: {
          entry_id?: string
          user_id: string
          amount_cents: number
          entry_type: string
          source_table?: string | null
          source_id?: string | null
          expires_at?: string | null
          metadata?: Json
          created_by?: string | null
          created_at?: string
        }
        Update: {
          entry_id?: string
          user_id?: string
          amount_cents?: number
          entry_type?: string
          source_table?: string | null
          source_id?: string | null
          expires_at?: string | null
          metadata?: Json
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      internal_account_policies: {
        Row: {
          user_id: string
          active: boolean
          can_bypass_checkout: boolean
          no_fill_exempt: boolean
          can_manage_internal: boolean
          notes: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          active?: boolean
          can_bypass_checkout?: boolean
          no_fill_exempt?: boolean
          can_manage_internal?: boolean
          notes?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          active?: boolean
          can_bypass_checkout?: boolean
          no_fill_exempt?: boolean
          can_manage_internal?: boolean
          notes?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      payout_batches: {
        Row: {
          batch_id: string
          batch_month: string
          status: string
          started_at: string
          completed_at: string | null
          total_items: number
          total_amount_cents: number
          error_message: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          batch_id?: string
          batch_month: string
          status?: string
          started_at?: string
          completed_at?: string | null
          total_items?: number
          total_amount_cents?: number
          error_message?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          batch_id?: string
          batch_month?: string
          status?: string
          started_at?: string
          completed_at?: string | null
          total_items?: number
          total_amount_cents?: number
          error_message?: string | null
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
      payout_items: {
        Row: {
          payout_item_id: string
          batch_id: string
          user_id: string
          stripe_account_id: string
          amount_cents: number
          status: string
          stripe_transfer_id: string | null
          failure_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          payout_item_id?: string
          batch_id: string
          user_id: string
          stripe_account_id: string
          amount_cents: number
          status?: string
          stripe_transfer_id?: string | null
          failure_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          payout_item_id?: string
          batch_id?: string
          user_id?: string
          stripe_account_id?: string
          amount_cents?: number
          status?: string
          stripe_transfer_id?: string | null
          failure_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "payout_batches"
            referencedColumns: ["batch_id"]
          },
        ]
      }
      publisher_connect_accounts: {
        Row: {
          user_id: string
          stripe_account_id: string
          details_submitted: boolean
          charges_enabled: boolean
          payouts_enabled: boolean
          onboarding_completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          stripe_account_id: string
          details_submitted?: boolean
          charges_enabled?: boolean
          payouts_enabled?: boolean
          onboarding_completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          stripe_account_id?: string
          details_submitted?: boolean
          charges_enabled?: boolean
          payouts_enabled?: boolean
          onboarding_completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      publisher_weekly_earnings: {
        Row: {
          earning_id: string
          week_start: string
          publisher_app_id: string
          user_id: string
          unique_users: number
          network_unique_users: number
          share_ratio: number
          pool_cents: number
          gross_earnings_cents: number
          converted_cents: number
          hold_until: string
          payout_status: string
          payout_item_id: string | null
          paid_at: string | null
          created_at: string
          updated_at: string
          cash_spend_cents: number
          platform_reserve_cents: number
          bonus_credit_cents: number
          bonus_credit_entry_id: string | null
          bonus_credited_at: string | null
        }
        Insert: {
          earning_id?: string
          week_start: string
          publisher_app_id: string
          user_id: string
          unique_users?: number
          network_unique_users?: number
          share_ratio?: number
          pool_cents?: number
          gross_earnings_cents?: number
          converted_cents?: number
          hold_until: string
          payout_status?: string
          payout_item_id?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
          cash_spend_cents?: number
          platform_reserve_cents?: number
          bonus_credit_cents?: number
          bonus_credit_entry_id?: string | null
          bonus_credited_at?: string | null
        }
        Update: {
          earning_id?: string
          week_start?: string
          publisher_app_id?: string
          user_id?: string
          unique_users?: number
          network_unique_users?: number
          share_ratio?: number
          pool_cents?: number
          gross_earnings_cents?: number
          converted_cents?: number
          hold_until?: string
          payout_status?: string
          payout_item_id?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
          cash_spend_cents?: number
          platform_reserve_cents?: number
          bonus_credit_cents?: number
          bonus_credit_entry_id?: string | null
          bonus_credited_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "publisher_weekly_earnings_bonus_credit_entry_id_fkey"
            columns: ["bonus_credit_entry_id"]
            isOneToOne: false
            referencedRelation: "credit_ledger_entries"
            referencedColumns: ["entry_id"]
          },
          {
            foreignKeyName: "publisher_weekly_earnings_payout_item_id_fkey"
            columns: ["payout_item_id"]
            isOneToOne: false
            referencedRelation: "payout_items"
            referencedColumns: ["payout_item_id"]
          },
          {
            foreignKeyName: "publisher_weekly_earnings_publisher_app_id_fkey"
            columns: ["publisher_app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["app_id"]
          },
        ]
      }
      serve_attempts: {
        Row: {
          app_id: string
          attempt_id: string
          campaign_id: string | null
          created_at: string
          decision_reason: string
          device_id_hash: string | null
          endpoint: string
          locale: string | null
          os_version: string | null
          placement_id: string
          response_type: string
          sdk_version: string | null
          slot_purchase_id: string | null
        }
        Insert: {
          app_id: string
          attempt_id?: string
          campaign_id?: string | null
          created_at?: string
          decision_reason: string
          device_id_hash?: string | null
          endpoint: string
          locale?: string | null
          os_version?: string | null
          placement_id?: string
          response_type: string
          sdk_version?: string | null
          slot_purchase_id?: string | null
        }
        Update: {
          app_id?: string
          attempt_id?: string
          campaign_id?: string | null
          created_at?: string
          decision_reason?: string
          device_id_hash?: string | null
          endpoint?: string
          locale?: string | null
          os_version?: string | null
          placement_id?: string
          response_type?: string
          sdk_version?: string | null
          slot_purchase_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "serve_attempts_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["app_id"]
          },
          {
            foreignKeyName: "serve_attempts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "serve_attempts_slot_purchase_id_fkey"
            columns: ["slot_purchase_id"]
            isOneToOne: false
            referencedRelation: "slot_purchases"
            referencedColumns: ["purchase_id"]
          },
        ]
      }
      slot_purchases: {
        Row: {
          booking_intent_id: string | null
          cash_paid_cents: number
          campaign_id: string | null
          credits_applied_cents: number
          created_at: string
          is_internal: boolean
          payment_provider: string | null
          payment_reference: string | null
          percentage_purchased: number
          price_cents: number
          purchase_id: string
          refund_reference: string | null
          refunded_at: string | null
          slot_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_intent_id?: string | null
          cash_paid_cents?: number
          campaign_id?: string | null
          credits_applied_cents?: number
          created_at?: string
          is_internal?: boolean
          payment_provider?: string | null
          payment_reference?: string | null
          percentage_purchased: number
          price_cents: number
          purchase_id?: string
          refund_reference?: string | null
          refunded_at?: string | null
          slot_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_intent_id?: string | null
          cash_paid_cents?: number
          campaign_id?: string | null
          credits_applied_cents?: number
          created_at?: string
          is_internal?: boolean
          payment_provider?: string | null
          payment_reference?: string | null
          percentage_purchased?: number
          price_cents?: number
          purchase_id?: string
          refund_reference?: string | null
          refunded_at?: string | null
          slot_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "slot_purchases_booking_intent_id_fkey"
            columns: ["booking_intent_id"]
            isOneToOne: false
            referencedRelation: "billing_booking_intents"
            referencedColumns: ["booking_intent_id"]
          },
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
      apply_weekly_price_adjustment: {
        Args: { p_base_price_cents: number; p_sold_percentage: number }
        Returns: number
      }
      confirm_booking_intent_atomic: {
        Args: { p_booking_intent_id: string }
        Returns: {
          purchase_id: string | null
          reason: string | null
          success: boolean | null
        }[]
      }
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
          error_serves: number
          filled_serves: number
          impressions: number
          no_fill_serves: number
          request_users: number
          serve_attempt_rows: number
          unique_click_users: number
          unique_users: number
        }[]
      }
      get_app_data_volume: {
        Args: { p_app_id: string; p_user_id: string }
        Returns: {
          ad_request_rows: number
          ad_request_rows_30d: number
          ad_request_rows_7d: number
          first_ad_request_at: string | null
          first_serve_attempt_at: string | null
          last_ad_request_at: string | null
          last_serve_attempt_at: string | null
          serve_attempt_rows: number
          serve_attempt_rows_30d: number
          serve_attempt_rows_7d: number
          unique_ad_view_rows: number
        }[]
      }
      get_admin_weekly_advertiser_breakdown: {
        Args: { p_week_start: string }
        Returns: {
          actual_share_ratio: number
          advertiser_app_id: string
          advertiser_app_name: string
          booked_spend_cents: number
          cash_spend_cents: number
          credits_spend_cents: number
          network_unique_users: number
          purchased_percentage: number
          user_reach: number
        }[]
      }
      get_admin_weekly_network_summaries: {
        Args: { p_limit?: number }
        Returns: {
          advertiser_app_count: number
          booked_spend_cents: number
          cash_spend_cents: number
          credits_spend_cents: number
          network_price_cents: number
          network_unique_users: number
          platform_reserve_cents: number
          purchased_percentage: number
          publisher_app_count: number
          publisher_pool_cents: number
          week_start: string
        }[]
      }
      get_admin_weekly_publisher_breakdown: {
        Args: { p_week_start: string }
        Returns: {
          bonus_credit_cents: number
          converted_cents: number
          due_payout_cents: number
          hold_until: string | null
          network_unique_users: number
          paid_at: string | null
          payout_status: string | null
          publisher_app_id: string
          publisher_app_name: string
          share_ratio: number
          unique_users: number
        }[]
      }
      get_live_network_stats: {
        Args: { p_days?: number }
        Returns: {
          advertiser_app_count: number
          current_week_start: string
          publisher_app_count: number
          publisher_unique_users: number
          window_end: string
          window_start: string
        }[]
      }
      get_user_credit_balance: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_weekly_sold_percentage: {
        Args: { p_week_start: string }
        Returns: number
      }
      grant_publisher_bonus_credits: {
        Args: { p_week_start: string }
        Returns: {
          rows_credited: number
          total_bonus_cents: number
          week_start: string | null
        }[]
      }
      get_publisher_weekly_placement_metrics: {
        Args: { p_app_id: string; p_user_id: string; p_weeks?: number }
        Returns: {
          clicks: number
          error_requests: number
          filled_requests: number
          impressions: number
          no_fill_requests: number
          placement_id: string
          request_users: number
          unique_click_users: number
          unique_filled_users: number
          unique_users: number
          week_start: string
        }[]
      }
      get_publisher_weekly_totals: {
        Args: { p_app_id: string; p_user_id: string; p_weeks?: number }
        Returns: {
          clicks: number
          error_requests: number
          filled_requests: number
          impressions: number
          no_fill_requests: number
          request_users: number
          unique_click_users: number
          unique_filled_users: number
          unique_users: number
          week_start: string
        }[]
      }
      run_weekly_earnings_accrual: {
        Args: { p_week_start: string }
        Returns: {
          network_unique_users: number
          pool_cents: number
          rows_upserted: number
          week_start: string | null
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
