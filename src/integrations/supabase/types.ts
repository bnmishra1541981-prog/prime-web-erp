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
      bank_reconciliation: {
        Row: {
          amount: number
          bank_ledger_id: string
          bank_statement_date: string | null
          cheque_number: string | null
          company_id: string
          created_at: string | null
          id: string
          is_reconciled: boolean | null
          narration: string | null
          reconciled_date: string | null
          transaction_date: string
          updated_at: string | null
          voucher_id: string | null
        }
        Insert: {
          amount: number
          bank_ledger_id: string
          bank_statement_date?: string | null
          cheque_number?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          is_reconciled?: boolean | null
          narration?: string | null
          reconciled_date?: string | null
          transaction_date: string
          updated_at?: string | null
          voucher_id?: string | null
        }
        Update: {
          amount?: number
          bank_ledger_id?: string
          bank_statement_date?: string | null
          cheque_number?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          is_reconciled?: boolean | null
          narration?: string | null
          reconciled_date?: string | null
          transaction_date?: string
          updated_at?: string | null
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_reconciliation_bank_ledger_id_fkey"
            columns: ["bank_ledger_id"]
            isOneToOne: false
            referencedRelation: "ledgers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reconciliation_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reconciliation_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          budgeted_amount: number
          company_id: string
          created_at: string | null
          financial_year: string
          id: string
          ledger_id: string
          period: string
          updated_at: string | null
        }
        Insert: {
          budgeted_amount: number
          company_id: string
          created_at?: string | null
          financial_year: string
          id?: string
          ledger_id: string
          period: string
          updated_at?: string | null
        }
        Update: {
          budgeted_amount?: number
          company_id?: string
          created_at?: string | null
          financial_year?: string
          id?: string
          ledger_id?: string
          period?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledgers"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          bank_account_number: string | null
          bank_ifsc: string | null
          bank_name: string | null
          created_at: string
          currency: string | null
          email: string | null
          enable_gst: boolean | null
          financial_year_start: string | null
          gst_registration_type: string | null
          gstin: string | null
          gstin_state_code: string | null
          id: string
          name: string
          pan: string | null
          phone: string | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          created_at?: string
          currency?: string | null
          email?: string | null
          enable_gst?: boolean | null
          financial_year_start?: string | null
          gst_registration_type?: string | null
          gstin?: string | null
          gstin_state_code?: string | null
          id?: string
          name: string
          pan?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          created_at?: string
          currency?: string | null
          email?: string | null
          enable_gst?: boolean | null
          financial_year_start?: string | null
          gst_registration_type?: string | null
          gstin?: string | null
          gstin_state_code?: string | null
          id?: string
          name?: string
          pan?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_centers: {
        Row: {
          category: string | null
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      godowns: {
        Row: {
          address: string | null
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "godowns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gst_rates: {
        Row: {
          cess_rate: number | null
          cgst_rate: number | null
          company_id: string
          created_at: string | null
          id: string
          igst_rate: number | null
          is_active: boolean | null
          name: string
          sgst_rate: number | null
          updated_at: string | null
        }
        Insert: {
          cess_rate?: number | null
          cgst_rate?: number | null
          company_id: string
          created_at?: string | null
          id?: string
          igst_rate?: number | null
          is_active?: boolean | null
          name: string
          sgst_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          cess_rate?: number | null
          cgst_rate?: number | null
          company_id?: string
          created_at?: string | null
          id?: string
          igst_rate?: number | null
          is_active?: boolean | null
          name?: string
          sgst_rate?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gst_rates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ledgers: {
        Row: {
          address: string | null
          company_id: string
          contact_person: string | null
          created_at: string
          current_balance: number | null
          email: string | null
          enable_gst: boolean | null
          gstin: string | null
          gstin_state_code: string | null
          id: string
          ledger_type: Database["public"]["Enums"]["ledger_type"]
          name: string
          opening_balance: number | null
          pan: string | null
          phone: string | null
          state: string | null
          tax_type: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_id: string
          contact_person?: string | null
          created_at?: string
          current_balance?: number | null
          email?: string | null
          enable_gst?: boolean | null
          gstin?: string | null
          gstin_state_code?: string | null
          id?: string
          ledger_type: Database["public"]["Enums"]["ledger_type"]
          name: string
          opening_balance?: number | null
          pan?: string | null
          phone?: string | null
          state?: string | null
          tax_type?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_id?: string
          contact_person?: string | null
          created_at?: string
          current_balance?: number | null
          email?: string | null
          enable_gst?: boolean | null
          gstin?: string | null
          gstin_state_code?: string | null
          id?: string
          ledger_type?: Database["public"]["Enums"]["ledger_type"]
          name?: string
          opening_balance?: number | null
          pan?: string | null
          phone?: string | null
          state?: string | null
          tax_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledgers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          channel: string
          created_at: string | null
          error_message: string | null
          id: string
          notification_id: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          channel: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          notification_id?: string | null
          sent_at?: string | null
          status: string
        }
        Update: {
          channel?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          notification_id?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "voucher_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      stock_groups: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          name: string
          parent_group_id: string | null
          under_group: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          name: string
          parent_group_id?: string | null
          under_group?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          name?: string
          parent_group_id?: string | null
          under_group?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_groups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_groups_parent_group_id_fkey"
            columns: ["parent_group_id"]
            isOneToOne: false
            referencedRelation: "stock_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_items: {
        Row: {
          company_id: string
          created_at: string | null
          current_balance: number | null
          current_value: number | null
          description: string | null
          godown_id: string | null
          gst_rate_id: string | null
          hsn_code: string | null
          id: string
          is_active: boolean | null
          name: string
          opening_balance: number | null
          opening_rate: number | null
          opening_value: number | null
          reorder_level: number | null
          stock_group_id: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          current_balance?: number | null
          current_value?: number | null
          description?: string | null
          godown_id?: string | null
          gst_rate_id?: string | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          opening_balance?: number | null
          opening_rate?: number | null
          opening_value?: number | null
          reorder_level?: number | null
          stock_group_id?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          current_balance?: number | null
          current_value?: number | null
          description?: string | null
          godown_id?: string | null
          gst_rate_id?: string | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          opening_balance?: number | null
          opening_rate?: number | null
          opening_value?: number | null
          reorder_level?: number | null
          stock_group_id?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_items_godown_id_fkey"
            columns: ["godown_id"]
            isOneToOne: false
            referencedRelation: "godowns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_items_gst_rate_id_fkey"
            columns: ["gst_rate_id"]
            isOneToOne: false
            referencedRelation: "gst_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_items_stock_group_id_fkey"
            columns: ["stock_group_id"]
            isOneToOne: false
            referencedRelation: "stock_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      voucher_entries: {
        Row: {
          amount: number | null
          cess_amount: number | null
          cess_rate: number | null
          cgst_amount: number | null
          cgst_rate: number | null
          cost_center_id: string | null
          created_at: string
          credit_amount: number | null
          debit_amount: number | null
          discount_amount: number | null
          discount_percent: number | null
          godown_id: string | null
          id: string
          igst_amount: number | null
          igst_rate: number | null
          ledger_id: string
          narration: string | null
          quantity: number | null
          rate: number | null
          sgst_amount: number | null
          sgst_rate: number | null
          stock_item_id: string | null
          taxable_amount: number | null
          voucher_id: string
        }
        Insert: {
          amount?: number | null
          cess_amount?: number | null
          cess_rate?: number | null
          cgst_amount?: number | null
          cgst_rate?: number | null
          cost_center_id?: string | null
          created_at?: string
          credit_amount?: number | null
          debit_amount?: number | null
          discount_amount?: number | null
          discount_percent?: number | null
          godown_id?: string | null
          id?: string
          igst_amount?: number | null
          igst_rate?: number | null
          ledger_id: string
          narration?: string | null
          quantity?: number | null
          rate?: number | null
          sgst_amount?: number | null
          sgst_rate?: number | null
          stock_item_id?: string | null
          taxable_amount?: number | null
          voucher_id: string
        }
        Update: {
          amount?: number | null
          cess_amount?: number | null
          cess_rate?: number | null
          cgst_amount?: number | null
          cgst_rate?: number | null
          cost_center_id?: string | null
          created_at?: string
          credit_amount?: number | null
          debit_amount?: number | null
          discount_amount?: number | null
          discount_percent?: number | null
          godown_id?: string | null
          id?: string
          igst_amount?: number | null
          igst_rate?: number | null
          ledger_id?: string
          narration?: string | null
          quantity?: number | null
          rate?: number | null
          sgst_amount?: number | null
          sgst_rate?: number | null
          stock_item_id?: string | null
          taxable_amount?: number | null
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voucher_entries_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_entries_godown_id_fkey"
            columns: ["godown_id"]
            isOneToOne: false
            referencedRelation: "godowns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_entries_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledgers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_entries_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_entries_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      voucher_notifications: {
        Row: {
          action_details: Json | null
          approval_token: string | null
          created_at: string
          from_company_id: string
          id: string
          message: string | null
          responded_at: string | null
          reviewer_notes: string | null
          status: Database["public"]["Enums"]["notification_status"]
          to_user_email: string
          voucher_id: string
        }
        Insert: {
          action_details?: Json | null
          approval_token?: string | null
          created_at?: string
          from_company_id: string
          id?: string
          message?: string | null
          responded_at?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          to_user_email: string
          voucher_id: string
        }
        Update: {
          action_details?: Json | null
          approval_token?: string | null
          created_at?: string
          from_company_id?: string
          id?: string
          message?: string | null
          responded_at?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          to_user_email?: string
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voucher_notifications_from_company_id_fkey"
            columns: ["from_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_notifications_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          basic_amount: number | null
          billing_address: string | null
          company_id: string
          created_at: string
          created_by: string
          delivery_place: string | null
          due_date: string | null
          godown_id: string | null
          id: string
          lr_number: string | null
          narration: string | null
          other_charges: number | null
          party_ledger_id: string | null
          payment_mode: string | null
          payment_terms: number | null
          place_of_supply: string | null
          reference_date: string | null
          reference_number: string | null
          round_off: number | null
          shipping_address: string | null
          tcs_amount: number | null
          tcs_rate: number | null
          tds_amount: number | null
          tds_rate: number | null
          total_amount: number
          transport_gst: string | null
          transport_name: string | null
          truck_number: string | null
          updated_at: string
          voucher_date: string
          voucher_number: string
          voucher_type: Database["public"]["Enums"]["voucher_type"]
        }
        Insert: {
          basic_amount?: number | null
          billing_address?: string | null
          company_id: string
          created_at?: string
          created_by: string
          delivery_place?: string | null
          due_date?: string | null
          godown_id?: string | null
          id?: string
          lr_number?: string | null
          narration?: string | null
          other_charges?: number | null
          party_ledger_id?: string | null
          payment_mode?: string | null
          payment_terms?: number | null
          place_of_supply?: string | null
          reference_date?: string | null
          reference_number?: string | null
          round_off?: number | null
          shipping_address?: string | null
          tcs_amount?: number | null
          tcs_rate?: number | null
          tds_amount?: number | null
          tds_rate?: number | null
          total_amount?: number
          transport_gst?: string | null
          transport_name?: string | null
          truck_number?: string | null
          updated_at?: string
          voucher_date?: string
          voucher_number: string
          voucher_type: Database["public"]["Enums"]["voucher_type"]
        }
        Update: {
          basic_amount?: number | null
          billing_address?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          delivery_place?: string | null
          due_date?: string | null
          godown_id?: string | null
          id?: string
          lr_number?: string | null
          narration?: string | null
          other_charges?: number | null
          party_ledger_id?: string | null
          payment_mode?: string | null
          payment_terms?: number | null
          place_of_supply?: string | null
          reference_date?: string | null
          reference_number?: string | null
          round_off?: number | null
          shipping_address?: string | null
          tcs_amount?: number | null
          tcs_rate?: number | null
          tds_amount?: number | null
          tds_rate?: number | null
          total_amount?: number
          transport_gst?: string | null
          transport_name?: string | null
          truck_number?: string | null
          updated_at?: string
          voucher_date?: string
          voucher_number?: string
          voucher_type?: Database["public"]["Enums"]["voucher_type"]
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_godown_id_fkey"
            columns: ["godown_id"]
            isOneToOne: false
            referencedRelation: "godowns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_party_ledger_id_fkey"
            columns: ["party_ledger_id"]
            isOneToOne: false
            referencedRelation: "ledgers"
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
      ledger_type:
        | "capital_account"
        | "reserves_and_surplus"
        | "secured_loans"
        | "unsecured_loans"
        | "duties_and_taxes"
        | "sundry_creditors"
        | "suspense_account"
        | "current_liabilities"
        | "loans_liability"
        | "bank_od_account"
        | "provisions"
        | "fixed_assets"
        | "investments"
        | "current_assets"
        | "sundry_debtors"
        | "cash_in_hand"
        | "bank_accounts"
        | "stock_in_hand"
        | "deposits_assets"
        | "loans_and_advances_assets"
        | "sales_accounts"
        | "direct_incomes"
        | "indirect_incomes"
        | "purchase_accounts"
        | "direct_expenses"
        | "indirect_expenses"
        | "branch_divisions"
        | "misc_expenses_asset"
        | "profit_and_loss_account"
      notification_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "reviewed"
        | "hold"
        | "ignored"
      voucher_type:
        | "sales"
        | "purchase"
        | "payment"
        | "receipt"
        | "journal"
        | "contra"
        | "debit_note"
        | "credit_note"
        | "stock_journal"
        | "physical_stock"
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
      ledger_type: [
        "capital_account",
        "reserves_and_surplus",
        "secured_loans",
        "unsecured_loans",
        "duties_and_taxes",
        "sundry_creditors",
        "suspense_account",
        "current_liabilities",
        "loans_liability",
        "bank_od_account",
        "provisions",
        "fixed_assets",
        "investments",
        "current_assets",
        "sundry_debtors",
        "cash_in_hand",
        "bank_accounts",
        "stock_in_hand",
        "deposits_assets",
        "loans_and_advances_assets",
        "sales_accounts",
        "direct_incomes",
        "indirect_incomes",
        "purchase_accounts",
        "direct_expenses",
        "indirect_expenses",
        "branch_divisions",
        "misc_expenses_asset",
        "profit_and_loss_account",
      ],
      notification_status: [
        "pending",
        "accepted",
        "rejected",
        "reviewed",
        "hold",
        "ignored",
      ],
      voucher_type: [
        "sales",
        "purchase",
        "payment",
        "receipt",
        "journal",
        "contra",
        "debit_note",
        "credit_note",
        "stock_journal",
        "physical_stock",
      ],
    },
  },
} as const
