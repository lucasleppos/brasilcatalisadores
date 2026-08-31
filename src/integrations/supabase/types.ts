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
      bag_items: {
        Row: {
          allocated_at: string
          bag_id: string
          estimated_pd_ppm: number
          estimated_pt_ppm: number
          estimated_rh_ppm: number
          id: string
          paid_value: number
          purchase_id: string
          purchase_item_id: string
          supplier_name: string
          weight: number
        }
        Insert: {
          allocated_at?: string
          bag_id: string
          estimated_pd_ppm?: number
          estimated_pt_ppm?: number
          estimated_rh_ppm?: number
          id?: string
          paid_value?: number
          purchase_id: string
          purchase_item_id?: string
          supplier_name?: string
          weight?: number
        }
        Update: {
          allocated_at?: string
          bag_id?: string
          estimated_pd_ppm?: number
          estimated_pt_ppm?: number
          estimated_rh_ppm?: number
          id?: string
          paid_value?: number
          purchase_id?: string
          purchase_item_id?: string
          supplier_name?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "bag_items_bag_id_fkey"
            columns: ["bag_id"]
            isOneToOne: false
            referencedRelation: "bags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bag_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      bags: {
        Row: {
          bag_label: string
          bag_number: string
          buyer: string
          closed_at: string | null
          created_at: string
          id: string
          material_type: string
          max_weight: number
          notes: string
          provisional_pd_ppm: number | null
          provisional_pt_ppm: number | null
          provisional_rh_ppm: number | null
          refiner_pd_ppm: number | null
          refiner_pt_ppm: number | null
          refiner_rh_ppm: number | null
          refiner_total_value: number | null
          status: string
          total_paid_brl: number
          total_weight: number
        }
        Insert: {
          bag_label?: string
          bag_number: string
          buyer?: string
          closed_at?: string | null
          created_at?: string
          id?: string
          material_type?: string
          max_weight?: number
          notes?: string
          provisional_pd_ppm?: number | null
          provisional_pt_ppm?: number | null
          provisional_rh_ppm?: number | null
          refiner_pd_ppm?: number | null
          refiner_pt_ppm?: number | null
          refiner_rh_ppm?: number | null
          refiner_total_value?: number | null
          status?: string
          total_paid_brl?: number
          total_weight?: number
        }
        Update: {
          bag_label?: string
          bag_number?: string
          buyer?: string
          closed_at?: string | null
          created_at?: string
          id?: string
          material_type?: string
          max_weight?: number
          notes?: string
          provisional_pd_ppm?: number | null
          provisional_pt_ppm?: number | null
          provisional_rh_ppm?: number | null
          refiner_pd_ppm?: number | null
          refiner_pt_ppm?: number | null
          refiner_rh_ppm?: number | null
          refiner_total_value?: number | null
          status?: string
          total_paid_brl?: number
          total_weight?: number
        }
        Relationships: []
      }
      branch_ledger_entries: {
        Row: {
          amount_brl: number
          branch_id: string
          created_at: string
          created_by: string | null
          entry_type: string
          id: string
          purchase_id: string | null
          reason: string
          settlement_id: string | null
          value_declared: number | null
          value_real: number | null
          weight_declared: number | null
          weight_real: number | null
        }
        Insert: {
          amount_brl: number
          branch_id: string
          created_at?: string
          created_by?: string | null
          entry_type: string
          id?: string
          purchase_id?: string | null
          reason: string
          settlement_id?: string | null
          value_declared?: number | null
          value_real?: number | null
          weight_declared?: number | null
          weight_real?: number | null
        }
        Update: {
          amount_brl?: number
          branch_id?: string
          created_at?: string
          created_by?: string | null
          entry_type?: string
          id?: string
          purchase_id?: string | null
          reason?: string
          settlement_id?: string | null
          value_declared?: number | null
          value_real?: number | null
          weight_declared?: number | null
          weight_real?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "branch_ledger_entries_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_ledger_entries_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_ledger_entries_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "branch_settlements"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_settlements: {
        Row: {
          branch_id: string
          closed_at: string
          closed_by: string | null
          id: string
          notes: string | null
          period_end: string
          period_start: string
          total_brl: number
        }
        Insert: {
          branch_id: string
          closed_at?: string
          closed_by?: string | null
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          total_brl?: number
        }
        Update: {
          branch_id?: string
          closed_at?: string
          closed_by?: string | null
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          total_brl?: number
        }
        Relationships: [
          {
            foreignKeyName: "branch_settlements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_transfers: {
        Row: {
          branch_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          received_at: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          received_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          received_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_transfers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          active: boolean
          code: string
          contact_person: string | null
          created_at: string
          has_local_stock: boolean
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          active?: boolean
          code: string
          contact_person?: string | null
          created_at?: string
          has_local_stock?: boolean
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          active?: boolean
          code?: string
          contact_person?: string | null
          created_at?: string
          has_local_stock?: boolean
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      catalog_groups: {
        Row: {
          created_at: string
          id: string
          margin: number
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          margin?: number
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          margin?: number
          name?: string
        }
        Relationships: []
      }
      catalog_parts: {
        Row: {
          brand: string
          code: string
          created_at: string
          group_id: string | null
          id: string
          pd_ppm: number
          pt_ppm: number
          reference: string
          rh_ppm: number
          vehicle: string
          weight: number
        }
        Insert: {
          brand?: string
          code?: string
          created_at?: string
          group_id?: string | null
          id?: string
          pd_ppm?: number
          pt_ppm?: number
          reference?: string
          rh_ppm?: number
          vehicle?: string
          weight?: number
        }
        Update: {
          brand?: string
          code?: string
          created_at?: string
          group_id?: string | null
          id?: string
          pd_ppm?: number
          pt_ppm?: number
          reference?: string
          rh_ppm?: number
          vehicle?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "catalog_parts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "catalog_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      demonstrativos: {
        Row: {
          created_by: string | null
          enviado_em: string
          id: string
          motivo_contestacao: string | null
          purchase_id: string
          respondido_em: string | null
          status: string
          valor_total: number
          versao: number
        }
        Insert: {
          created_by?: string | null
          enviado_em?: string
          id?: string
          motivo_contestacao?: string | null
          purchase_id: string
          respondido_em?: string | null
          status?: string
          valor_total?: number
          versao?: number
        }
        Update: {
          created_by?: string | null
          enviado_em?: string
          id?: string
          motivo_contestacao?: string | null
          purchase_id?: string
          respondido_em?: string | null
          status?: string
          valor_total?: number
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "demonstrativos_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_analyses: {
        Row: {
          analysis_number: number
          created_at: string
          created_by: string | null
          id: string
          lab_result_id: string | null
          pd_ppm: number
          pt_ppm: number
          purchase_id: string
          rh_ppm: number
        }
        Insert: {
          analysis_number: number
          created_at?: string
          created_by?: string | null
          id?: string
          lab_result_id?: string | null
          pd_ppm?: number
          pt_ppm?: number
          purchase_id: string
          rh_ppm?: number
        }
        Update: {
          analysis_number?: number
          created_at?: string
          created_by?: string | null
          id?: string
          lab_result_id?: string | null
          pd_ppm?: number
          pt_ppm?: number
          purchase_id?: string
          rh_ppm?: number
        }
        Relationships: [
          {
            foreignKeyName: "lab_analyses_lab_result_id_fkey"
            columns: ["lab_result_id"]
            isOneToOne: false
            referencedRelation: "lab_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_analyses_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_result_history: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string
          id: string
          new_pd_ppm: number | null
          new_pt_ppm: number | null
          new_rh_ppm: number | null
          old_pd_ppm: number | null
          old_pt_ppm: number | null
          old_rh_ppm: number | null
          purchase_id: string
          purchase_item_id: string | null
          versao: number
        }
        Insert: {
          action?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_pd_ppm?: number | null
          new_pt_ppm?: number | null
          new_rh_ppm?: number | null
          old_pd_ppm?: number | null
          old_pt_ppm?: number | null
          old_rh_ppm?: number | null
          purchase_id: string
          purchase_item_id?: string | null
          versao?: number
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_pd_ppm?: number | null
          new_pt_ppm?: number | null
          new_rh_ppm?: number | null
          old_pd_ppm?: number | null
          old_pt_ppm?: number | null
          old_rh_ppm?: number | null
          purchase_id?: string
          purchase_item_id?: string | null
          versao?: number
        }
        Relationships: []
      }
      lab_results: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          pd_ppm: number
          pt_ppm: number
          purchase_id: string
          purchase_item_id: string | null
          rh_ppm: number
          versao: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          pd_ppm?: number
          pt_ppm?: number
          purchase_id: string
          purchase_item_id?: string | null
          rh_ppm?: number
          versao?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          pd_ppm?: number
          pt_ppm?: number
          purchase_id?: string
          purchase_item_id?: string | null
          rh_ppm?: number
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "lab_results_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          label: string
          permissions: Json
          role_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          label: string
          permissions?: Json
          role_name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          permissions?: Json
          role_name?: string
        }
        Relationships: []
      }
      price_override_log: {
        Row: {
          calculated_unit_value: number
          created_at: string
          created_by: string | null
          id: string
          item_label: string
          justification: string
          new_unit_value: number
          purchase_id: string
          purchase_item_id: string
          quantity: number
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          calculated_unit_value?: number
          created_at?: string
          created_by?: string | null
          id?: string
          item_label?: string
          justification: string
          new_unit_value?: number
          purchase_id: string
          purchase_item_id: string
          quantity?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          calculated_unit_value?: number
          created_at?: string
          created_by?: string | null
          id?: string
          item_label?: string
          justification?: string
          new_unit_value?: number
          purchase_id?: string
          purchase_item_id?: string
          quantity?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          branch: string | null
          created_at: string
          full_name: string
          id: string
          job_title: string | null
          phone: string | null
          remember_me: boolean
        }
        Insert: {
          avatar_url?: string | null
          branch?: string | null
          created_at?: string
          full_name?: string
          id: string
          job_title?: string | null
          phone?: string | null
          remember_me?: boolean
        }
        Update: {
          avatar_url?: string | null
          branch?: string | null
          created_at?: string
          full_name?: string
          id?: string
          job_title?: string | null
          phone?: string | null
          remember_me?: boolean
        }
        Relationships: []
      }
      purchase_items: {
        Row: {
          calc_input: Json | null
          calc_result: Json | null
          catalog_part_id: string | null
          category: string | null
          created_at: string | null
          id: string
          item_type: string
          part_code: string | null
          part_reference: string | null
          part_vehicle: string | null
          pedido_number: string | null
          pricing_source: string | null
          purchase_id: string
          quantity: number | null
          seq: number | null
          total_value: number | null
          weight: number | null
          weight_loss: number | null
          weight_real: number | null
        }
        Insert: {
          calc_input?: Json | null
          calc_result?: Json | null
          catalog_part_id?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          item_type: string
          part_code?: string | null
          part_reference?: string | null
          part_vehicle?: string | null
          pedido_number?: string | null
          pricing_source?: string | null
          purchase_id: string
          quantity?: number | null
          seq?: number | null
          total_value?: number | null
          weight?: number | null
          weight_loss?: number | null
          weight_real?: number | null
        }
        Update: {
          calc_input?: Json | null
          calc_result?: Json | null
          catalog_part_id?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          item_type?: string
          part_code?: string | null
          part_reference?: string | null
          part_vehicle?: string | null
          pedido_number?: string | null
          pricing_source?: string | null
          purchase_id?: string
          quantity?: number | null
          seq?: number | null
          total_value?: number | null
          weight?: number | null
          weight_loss?: number | null
          weight_real?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_catalog_part_id_fkey"
            columns: ["catalog_part_id"]
            isOneToOne: false
            referencedRelation: "catalog_parts"
            referencedColumns: ["id"]
          },
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
          branch_id: string | null
          bulk_weight: number | null
          buyer: string
          created_at: string | null
          date: string
          declared_value_brl: number | null
          erp_number: string | null
          fin_status: string | null
          id: string
          location: string
          material_flow: string | null
          notes: string | null
          op_status: string | null
          purchase_number: string
          source_pedido_number: string | null
          status: string
          status_history: Json | null
          supplier_id: string
          supplier_name: string
          total_brl: number | null
          transfer_batch_id: string | null
          transfer_status: string | null
          weight_declared: number | null
          weight_loss: number | null
          weight_real: number | null
        }
        Insert: {
          branch_id?: string | null
          bulk_weight?: number | null
          buyer?: string
          created_at?: string | null
          date?: string
          declared_value_brl?: number | null
          erp_number?: string | null
          fin_status?: string | null
          id?: string
          location?: string
          material_flow?: string | null
          notes?: string | null
          op_status?: string | null
          purchase_number: string
          source_pedido_number?: string | null
          status?: string
          status_history?: Json | null
          supplier_id: string
          supplier_name: string
          total_brl?: number | null
          transfer_batch_id?: string | null
          transfer_status?: string | null
          weight_declared?: number | null
          weight_loss?: number | null
          weight_real?: number | null
        }
        Update: {
          branch_id?: string | null
          bulk_weight?: number | null
          buyer?: string
          created_at?: string | null
          date?: string
          declared_value_brl?: number | null
          erp_number?: string | null
          fin_status?: string | null
          id?: string
          location?: string
          material_flow?: string | null
          notes?: string | null
          op_status?: string | null
          purchase_number?: string
          source_pedido_number?: string | null
          status?: string
          status_history?: Json | null
          supplier_id?: string
          supplier_name?: string
          total_brl?: number | null
          transfer_batch_id?: string | null
          transfer_status?: string | null
          weight_declared?: number | null
          weight_loss?: number | null
          weight_real?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_transfer_batch_id_fkey"
            columns: ["transfer_batch_id"]
            isOneToOne: false
            referencedRelation: "branch_transfers"
            referencedColumns: ["id"]
          },
        ]
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
      stage_evidence: {
        Row: {
          created_at: string
          created_by: string | null
          data_type: string
          file_url: string | null
          id: string
          purchase_id: string
          stage: string
          task_key: string
          value_numeric: number | null
          value_text: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_type: string
          file_url?: string | null
          id?: string
          purchase_id: string
          stage: string
          task_key: string
          value_numeric?: number | null
          value_text?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_type?: string
          file_url?: string | null
          id?: string
          purchase_id?: string
          stage?: string
          task_key?: string
          value_numeric?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stage_evidence_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
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
          margin_ceramico: number
          margin_pecas: number
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
          margin_ceramico?: number
          margin_pecas?: number
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
          margin_ceramico?: number
          margin_pecas?: number
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          role: string
          user_id: string
        }
        Update: {
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_permissions_fkey"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["role_name"]
          },
        ]
      }
    }
    Views: {
      branch_ledger_balance: {
        Row: {
          balance_brl: number | null
          branch_id: string | null
          open_entries: number | null
        }
        Relationships: [
          {
            foreignKeyName: "branch_ledger_entries_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      generate_bag_number: { Args: never; Returns: string }
      generate_purchase_number: { Args: never; Returns: string }
      get_user_role: { Args: { _user_id: string }; Returns: string }
      has_any_module_access: {
        Args: { _modules: string[]; _user_id: string }
        Returns: boolean
      }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      user_can_do: {
        Args: { _action?: string; _module: string; _user_id: string }
        Returns: boolean
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
