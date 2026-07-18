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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string
          email: string
          id: string
          role: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          role?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      borrower_references: {
        Row: {
          borrower_id: string
          created_at: string
          full_name: string
          id: string
          mobile_number: string
          relationship: string
        }
        Insert: {
          borrower_id: string
          created_at?: string
          full_name: string
          id?: string
          mobile_number: string
          relationship: string
        }
        Update: {
          borrower_id?: string
          created_at?: string
          full_name?: string
          id?: string
          mobile_number?: string
          relationship?: string
        }
        Relationships: [
          {
            foreignKeyName: "borrower_references_borrower_id_fkey"
            columns: ["borrower_id"]
            isOneToOne: false
            referencedRelation: "borrowers"
            referencedColumns: ["id"]
          },
        ]
      }
      borrowers: {
        Row: {
          address_line: string | null
          barangay: string | null
          birth_date: string
          city: string | null
          civil_status: string | null
          consent_given_at: string | null
          created_at: string
          credit_check_consent: boolean
          credit_limit: number
          data_privacy_consent: boolean
          disbursement_account_name: string | null
          disbursement_account_number: string | null
          disbursement_method: string | null
          email: string
          employer_name: string | null
          employment_type: string | null
          first_name: string
          gender: string | null
          guardian_mobile: string | null
          guardian_monthly_income: number | null
          guardian_name: string | null
          id: string
          id_front_image_url: string | null
          id_number: string | null
          id_selfie_url: string | null
          id_type: string | null
          kyc_status: string
          last_name: string
          middle_name: string | null
          mobile_number: string
          monthly_income: number | null
          postal_code: string | null
          province: string | null
          school_name: string | null
          suffix: string | null
          updated_at: string
        }
        Insert: {
          address_line?: string | null
          barangay?: string | null
          birth_date: string
          city?: string | null
          civil_status?: string | null
          consent_given_at?: string | null
          created_at?: string
          credit_check_consent?: boolean
          credit_limit?: number
          data_privacy_consent?: boolean
          disbursement_account_name?: string | null
          disbursement_account_number?: string | null
          disbursement_method?: string | null
          email: string
          employer_name?: string | null
          employment_type?: string | null
          first_name: string
          gender?: string | null
          guardian_mobile?: string | null
          guardian_monthly_income?: number | null
          guardian_name?: string | null
          id: string
          id_front_image_url?: string | null
          id_number?: string | null
          id_selfie_url?: string | null
          id_type?: string | null
          kyc_status?: string
          last_name: string
          middle_name?: string | null
          mobile_number: string
          monthly_income?: number | null
          postal_code?: string | null
          province?: string | null
          school_name?: string | null
          suffix?: string | null
          updated_at?: string
        }
        Update: {
          address_line?: string | null
          barangay?: string | null
          birth_date?: string
          city?: string | null
          civil_status?: string | null
          consent_given_at?: string | null
          created_at?: string
          credit_check_consent?: boolean
          credit_limit?: number
          data_privacy_consent?: boolean
          disbursement_account_name?: string | null
          disbursement_account_number?: string | null
          disbursement_method?: string | null
          email?: string
          employer_name?: string | null
          employment_type?: string | null
          first_name?: string
          gender?: string | null
          guardian_mobile?: string | null
          guardian_monthly_income?: number | null
          guardian_name?: string | null
          id?: string
          id_front_image_url?: string | null
          id_number?: string | null
          id_selfie_url?: string | null
          id_type?: string | null
          kyc_status?: string
          last_name?: string
          middle_name?: string | null
          mobile_number?: string
          monthly_income?: number | null
          postal_code?: string | null
          province?: string | null
          school_name?: string | null
          suffix?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      loan_installments: {
        Row: {
          amount_due: number
          amount_paid: number
          created_at: string
          due_date: string
          id: string
          installment_number: number
          loan_id: string
          status: string
        }
        Insert: {
          amount_due: number
          amount_paid?: number
          created_at?: string
          due_date: string
          id?: string
          installment_number: number
          loan_id: string
          status?: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          created_at?: string
          due_date?: string
          id?: string
          installment_number?: number
          loan_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_installments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          applied_at: string
          approved_at: string | null
          borrower_id: string
          created_at: string
          disbursed_at: string | null
          due_date: string | null
          id: string
          interest_rate: number
          principal_amount: number
          processing_fee: number
          rejection_reason: string | null
          service_fee_rate: number
          status: string
          term_days: number
          total_interest: number
          total_repayable: number
          updated_at: string
        }
        Insert: {
          applied_at?: string
          approved_at?: string | null
          borrower_id: string
          created_at?: string
          disbursed_at?: string | null
          due_date?: string | null
          id?: string
          interest_rate: number
          principal_amount: number
          processing_fee?: number
          rejection_reason?: string | null
          service_fee_rate?: number
          status?: string
          term_days: number
          total_interest?: number
          total_repayable?: number
          updated_at?: string
        }
        Update: {
          applied_at?: string
          approved_at?: string | null
          borrower_id?: string
          created_at?: string
          disbursed_at?: string | null
          due_date?: string | null
          id?: string
          interest_rate?: number
          principal_amount?: number
          processing_fee?: number
          rejection_reason?: string | null
          service_fee_rate?: number
          status?: string
          term_days?: number
          total_interest?: number
          total_repayable?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_borrower_id_fkey"
            columns: ["borrower_id"]
            isOneToOne: false
            referencedRelation: "borrowers"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          borrower_id: string
          channel: string | null
          created_at: string
          id: string
          installment_id: string | null
          loan_id: string
          paid_at: string
          reference_number: string | null
        }
        Insert: {
          amount: number
          borrower_id: string
          channel?: string | null
          created_at?: string
          id?: string
          installment_id?: string | null
          loan_id: string
          paid_at?: string
          reference_number?: string | null
        }
        Update: {
          amount?: number
          borrower_id?: string
          channel?: string | null
          created_at?: string
          id?: string
          installment_id?: string | null
          loan_id?: string
          paid_at?: string
          reference_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_borrower_id_fkey"
            columns: ["borrower_id"]
            isOneToOne: false
            referencedRelation: "borrowers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "loan_installments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_loan_with_schedule: {
        Args: {
          p_approved_at: string
          p_borrower_id: string
          p_due_date: string
          p_installments: Json
          p_interest_rate: number
          p_principal: number
          p_processing_fee: number
          p_rejection_reason: string
          p_service_fee_rate: number
          p_status: string
          p_term_days: number
          p_total_interest: number
          p_total_repayable: number
        }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
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
