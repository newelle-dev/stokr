export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'owner' | 'staff';
export type ProductCategory = 'liquid' | 'device' | 'cartridge' | 'other';
export type PaymentMethod = 'cash' | 'gcash';
export type SaleStatus = 'completed' | 'voided';
export type StockMovementReason =
  | 'opening'
  | 'restock'
  | 'sale'
  | 'void_return'
  | 'adjustment'
  | 'count_correction';

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string
          id: string
          shop_id: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
          shop_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_shop_actor_fkey"
            columns: ["shop_id", "actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "activity_log_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          shop_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          shop_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          cost_price_centavos: number
          created_at: string
          id: string
          is_active: boolean
          low_stock_threshold: number
          name: string
          selling_price_centavos: number
          shop_id: string
        }
        Insert: {
          category: string
          cost_price_centavos: number
          created_at?: string
          id?: string
          is_active?: boolean
          low_stock_threshold?: number
          name: string
          selling_price_centavos: number
          shop_id: string
        }
        Update: {
          category?: string
          cost_price_centavos?: number
          created_at?: string
          id?: string
          is_active?: boolean
          low_stock_threshold?: number
          name?: string
          selling_price_centavos?: number
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_security: {
        Row: {
          created_at: string
          profile_id: string
          shop_id: string
          temp_password_hash: string
        }
        Insert: {
          created_at?: string
          profile_id: string
          shop_id: string
          temp_password_hash: string
        }
        Update: {
          created_at?: string
          profile_id?: string
          shop_id?: string
          temp_password_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_profile_security_profile"
            columns: ["shop_id", "profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["shop_id", "id"]
          },
        ]
      }
      profiles: {
        Row: {
          branch_id: string | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          must_change_password: boolean
          role: string
          shop_id: string
          username: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          full_name: string
          id: string
          is_active?: boolean
          must_change_password?: boolean
          role: string
          shop_id: string
          username?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          must_change_password?: boolean
          role?: string
          shop_id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_shop_branch_fkey"
            columns: ["shop_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "profiles_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          id: string
          product_id: string
          product_name: string
          quantity: number
          sale_id: string
          shop_id: string
          unit_cost_centavos: number
          unit_price_centavos: number
        }
        Insert: {
          id?: string
          product_id: string
          product_name: string
          quantity: number
          sale_id: string
          shop_id: string
          unit_cost_centavos: number
          unit_price_centavos: number
        }
        Update: {
          id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          sale_id?: string
          shop_id?: string
          unit_cost_centavos?: number
          unit_price_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_shop_product_fkey"
            columns: ["shop_id", "product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "sale_items_shop_product_fkey"
            columns: ["shop_id", "product_id"]
            isOneToOne: false
            referencedRelation: "staff_products"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "sale_items_shop_sale_fkey"
            columns: ["shop_id", "sale_id"]
            isOneToOne: false
            referencedRelation: "my_sales"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "sale_items_shop_sale_fkey"
            columns: ["shop_id", "sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["shop_id", "id"]
          },
        ]
      }
      sales: {
        Row: {
          branch_id: string
          client_request_id: string
          corrects_sale_id: string | null
          created_at: string
          id: string
          payment_method: string
          recorded_by: string
          shop_id: string
          sold_by: string
          status: string
          total_centavos: number
          total_cost_centavos: number
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          branch_id: string
          client_request_id: string
          corrects_sale_id?: string | null
          created_at?: string
          id?: string
          payment_method: string
          recorded_by: string
          shop_id: string
          sold_by: string
          status?: string
          total_centavos: number
          total_cost_centavos: number
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          branch_id?: string
          client_request_id?: string
          corrects_sale_id?: string | null
          created_at?: string
          id?: string
          payment_method?: string
          recorded_by?: string
          shop_id?: string
          sold_by?: string
          status?: string
          total_centavos?: number
          total_cost_centavos?: number
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_shop_branch_fkey"
            columns: ["shop_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "sales_shop_corrects_sale_fkey"
            columns: ["shop_id", "corrects_sale_id"]
            isOneToOne: false
            referencedRelation: "my_sales"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "sales_shop_corrects_sale_fkey"
            columns: ["shop_id", "corrects_sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "sales_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_shop_recorded_by_fkey"
            columns: ["shop_id", "recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "sales_shop_sold_by_fkey"
            columns: ["shop_id", "sold_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "sales_shop_voided_by_fkey"
            columns: ["shop_id", "voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["shop_id", "id"]
          },
        ]
      }
      shops: {
        Row: {
          created_at: string
          id: string
          name: string
          store_code: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          store_code: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          store_code?: string
        }
        Relationships: []
      }
      stock_count_items: {
        Row: {
          counted_qty: number
          difference: number
          expected_qty: number
          id: string
          product_id: string
          shop_id: string
          stock_count_id: string
        }
        Insert: {
          counted_qty: number
          difference: number
          expected_qty: number
          id?: string
          product_id: string
          shop_id: string
          stock_count_id: string
        }
        Update: {
          counted_qty?: number
          difference?: number
          expected_qty?: number
          id?: string
          product_id?: string
          shop_id?: string
          stock_count_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_count_items_shop_count_fkey"
            columns: ["shop_id", "stock_count_id"]
            isOneToOne: false
            referencedRelation: "stock_counts"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "stock_count_items_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_count_items_shop_product_fkey"
            columns: ["shop_id", "product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "stock_count_items_shop_product_fkey"
            columns: ["shop_id", "product_id"]
            isOneToOne: false
            referencedRelation: "staff_products"
            referencedColumns: ["shop_id", "id"]
          },
        ]
      }
      stock_counts: {
        Row: {
          branch_id: string
          counted_by: string
          created_at: string
          id: string
          note: string | null
          shop_id: string
        }
        Insert: {
          branch_id: string
          counted_by: string
          created_at?: string
          id?: string
          note?: string | null
          shop_id: string
        }
        Update: {
          branch_id?: string
          counted_by?: string
          created_at?: string
          id?: string
          note?: string | null
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_counts_shop_branch_fkey"
            columns: ["shop_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "stock_counts_shop_counted_by_fkey"
            columns: ["shop_id", "counted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "stock_counts_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          branch_id: string
          created_at: string
          created_by: string
          id: string
          note: string | null
          product_id: string
          quantity_change: number
          reason: string
          sale_id: string | null
          shop_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          created_by: string
          id?: string
          note?: string | null
          product_id: string
          quantity_change: number
          reason: string
          sale_id?: string | null
          shop_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          created_by?: string
          id?: string
          note?: string | null
          product_id?: string
          quantity_change?: number
          reason?: string
          sale_id?: string | null
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_shop_branch_fkey"
            columns: ["shop_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "stock_movements_shop_created_by_fkey"
            columns: ["shop_id", "created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "stock_movements_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_shop_product_fkey"
            columns: ["shop_id", "product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "stock_movements_shop_product_fkey"
            columns: ["shop_id", "product_id"]
            isOneToOne: false
            referencedRelation: "staff_products"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "stock_movements_shop_sale_fkey"
            columns: ["shop_id", "sale_id"]
            isOneToOne: false
            referencedRelation: "my_sales"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "stock_movements_shop_sale_fkey"
            columns: ["shop_id", "sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["shop_id", "id"]
          },
        ]
      }
    }
    Views: {
      my_sales: {
        Row: {
          branch_id: string | null
          client_request_id: string | null
          created_at: string | null
          id: string | null
          payment_method: string | null
          shop_id: string | null
          sold_by: string | null
          status: string | null
          total_centavos: number | null
        }
        Insert: {
          branch_id?: string | null
          client_request_id?: string | null
          created_at?: string | null
          id?: string | null
          payment_method?: string | null
          shop_id?: string | null
          sold_by?: string | null
          status?: string | null
          total_centavos?: number | null
        }
        Update: {
          branch_id?: string | null
          client_request_id?: string | null
          created_at?: string | null
          id?: string | null
          payment_method?: string | null
          shop_id?: string | null
          sold_by?: string | null
          status?: string | null
          total_centavos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_shop_branch_fkey"
            columns: ["shop_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "sales_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_shop_sold_by_fkey"
            columns: ["shop_id", "sold_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["shop_id", "id"]
          },
        ]
      }
      staff_products: {
        Row: {
          category: string | null
          id: string | null
          is_active: boolean | null
          low_stock_threshold: number | null
          name: string | null
          selling_price_centavos: number | null
          shop_id: string | null
        }
        Insert: {
          category?: string | null
          id?: string | null
          is_active?: boolean | null
          low_stock_threshold?: number | null
          name?: string | null
          selling_price_centavos?: number | null
          shop_id?: string | null
        }
        Update: {
          category?: string | null
          id?: string | null
          is_active?: boolean | null
          low_stock_threshold?: number | null
          name?: string | null
          selling_price_centavos?: number | null
          shop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_levels: {
        Row: {
          branch_id: string | null
          product_id: string | null
          shop_id: string | null
          stock_on_hand: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_shop_branch_fkey"
            columns: ["shop_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "stock_movements_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_shop_product_fkey"
            columns: ["shop_id", "product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "stock_movements_shop_product_fkey"
            columns: ["shop_id", "product_id"]
            isOneToOne: false
            referencedRelation: "staff_products"
            referencedColumns: ["shop_id", "id"]
          },
        ]
      }
    }
    Functions: {
      complete_password_change: { Args: never; Returns: undefined }
      current_user_role: { Args: never; Returns: string }
      current_user_shop_id: { Args: never; Returns: string }
      is_owner: { Args: never; Returns: boolean }
      request_is_maintenance_mode: { Args: never; Returns: boolean }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
