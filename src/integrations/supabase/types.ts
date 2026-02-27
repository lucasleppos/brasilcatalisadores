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
      purchase_items: {
        Row: {
          calc_input: Json | null
          calc_result: Json | null
          created_at: string | null
          id: string
          item_type: string
          purchase_id: string
          quantity: number | null
          total_value: number | null
          weight: number | null
        }
        Insert: {
          calc_input?: Json | null
          calc_result?: Json | null
          created_at?: string | null
          id?: string
          item_type: string
          purchase_id: string
          quantity?: number | null
          total_value?: number | null
          weight?: number | null
        }
        Update: {
          calc_input?: Json | null
          calc_result?: Json | null
          created_at?: string | null
          id?: string
          item_type?: string
          purchase_id?: string
          quantity?: number | null
          total_value?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          created_at: string | null
          date: string
          erp_number: string | null
          id: string
          notes: string | null
          purchase_number: string
          status: string
          status_history: Json | null
          supplier_id: string
          supplier_name: string
          total_brl: number | null
        }
        Insert: {
          created_at?: string | null
          date?: string
          erp_number?: string | null
          id?: string
          notes?: string | null
          purchase_number: string
          status?: string
          status_history?: Json | null
          supplier_id: string
          supplier_name: string
          total_brl?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          erp_number?: string | null
          id?: string
          notes?: string | null
          purchase_number?: string
          status?: string
          status_history?: Json | null
          supplier_id?: string
          supplier_name?: string
          total_brl?: number | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: string
          lease_base: number
          lease_days: number
          lease_pd: number
          lease_pt: number
          lease_rh: number
          logistic_cost: number
          moisture_discount: number
          operational_cost: number
          pd_price: number
          pt_price: number
          recovery_pd: number
          recovery_pt: number
          recovery_rh: number
          refining_pd: number
          refining_pt: number
          refining_rh: number
          rh_price: number
          treatment_fee: number
          updated_at: string
          usd_to_brl: number
        }
        Insert: {
          id?: string
          lease_base?: number
          lease_days?: number
          lease_pd?: number
          lease_pt?: number
          lease_rh?: number
          logistic_cost?: number
          moisture_discount?: number
          operational_cost?: number
          pd_price?: number
          pt_price?: number
          recovery_pd?: number
          recovery_pt?: number
          recovery_rh?: number
          refining_pd?: number
          refining_pt?: number
          refining_rh?: number
          rh_price?: number
          treatment_fee?: number
          updated_at?: string
          usd_to_brl?: number
        }
        Update: {
          id?: string
          lease_base?: number
          lease_days?: number
          lease_pd?: number
          lease_pt?: number
          lease_rh?: number
          logistic_cost?: number
          moisture_discount?: number
          operational_cost?: number
          pd_price?: number
          pt_price?: number
          recovery_pd?: number
          recovery_pt?: number
          recovery_rh?: number
          refining_pd?: number
          refining_pt?: number
          refining_rh?: number
          rh_price?: number
          treatment_fee?: number
          updated_at?: string
          usd_to_brl?: number
        }
        Relationships: []
      }
      simulation_history: {
        Row: {
          calc_input: Json
          calc_result: Json
          created_at: string
          date: string
          id: string
        }
        Insert: {
          calc_input: Json
          calc_result: Json
          created_at?: string
          date?: string
          id?: string
        }
        Update: {
          calc_input?: Json
          calc_result?: Json
          created_at?: string
          date?: string
          id?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          branch: string
          buyer: string
          created_at: string
          document: string
          email: string
          id: string
          margin: number
          name: string
        }
        Insert: {
          branch?: string
          buyer?: string
          created_at?: string
          document?: string
          email?: string
          id?: string
          margin?: number
          name: string
        }
        Update: {
          branch?: string
          buyer?: string
          created_at?: string
          document?: string
          email?: string
          id?: string
          margin?: number
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_purchase_number: { Args: never; Returns: string }
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
