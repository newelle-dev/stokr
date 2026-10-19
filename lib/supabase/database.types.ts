export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

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
  public: {
    Tables: {
      shops: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      branches: {
        Row: {
          id: string;
          shop_id: string;
          name: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          name: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          name?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          shop_id: string;
          full_name: string;
          role: UserRole;
          branch_id: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          shop_id: string;
          full_name: string;
          role?: UserRole;
          branch_id?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          full_name?: string;
          role?: UserRole;
          branch_id?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          shop_id: string;
          name: string;
          category: ProductCategory;
          selling_price_centavos: number;
          cost_price_centavos: number;
          low_stock_threshold: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          name: string;
          category?: ProductCategory;
          selling_price_centavos: number;
          cost_price_centavos: number;
          low_stock_threshold?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          name?: string;
          category?: ProductCategory;
          selling_price_centavos?: number;
          cost_price_centavos?: number;
          low_stock_threshold?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      stock_movements: {
        Row: {
          id: string;
          shop_id: string;
          branch_id: string;
          product_id: string;
          quantity_change: number;
          reason: StockMovementReason;
          sale_id: string | null;
          note: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          branch_id: string;
          product_id: string;
          quantity_change: number;
          reason: StockMovementReason;
          sale_id?: string | null;
          note?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          branch_id?: string;
          product_id?: string;
          quantity_change?: number;
          reason?: StockMovementReason;
          sale_id?: string | null;
          note?: string | null;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      sales: {
        Row: {
          id: string;
          shop_id: string;
          branch_id: string;
          sold_by: string;
          recorded_by: string;
          payment_method: PaymentMethod;
          total_centavos: number;
          total_cost_centavos: number;
          status: SaleStatus;
          void_reason: string | null;
          voided_by: string | null;
          voided_at: string | null;
          corrects_sale_id: string | null;
          client_request_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          branch_id: string;
          sold_by: string;
          recorded_by: string;
          payment_method: PaymentMethod;
          total_centavos: number;
          total_cost_centavos: number;
          status?: SaleStatus;
          void_reason?: string | null;
          voided_by?: string | null;
          voided_at?: string | null;
          corrects_sale_id?: string | null;
          client_request_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          branch_id?: string;
          sold_by?: string;
          recorded_by?: string;
          payment_method?: PaymentMethod;
          total_centavos?: number;
          total_cost_centavos?: number;
          status?: SaleStatus;
          void_reason?: string | null;
          voided_by?: string | null;
          voided_at?: string | null;
          corrects_sale_id?: string | null;
          client_request_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      sale_items: {
        Row: {
          id: string;
          sale_id: string;
          shop_id: string;
          product_id: string;
          product_name: string;
          quantity: number;
          unit_price_centavos: number;
          unit_cost_centavos: number;
        };
        Insert: {
          id?: string;
          sale_id: string;
          shop_id: string;
          product_id: string;
          product_name: string;
          quantity: number;
          unit_price_centavos: number;
          unit_cost_centavos: number;
        };
        Update: {
          id?: string;
          sale_id?: string;
          shop_id?: string;
          product_id?: string;
          product_name?: string;
          quantity?: number;
          unit_price_centavos?: number;
          unit_cost_centavos?: number;
        };
        Relationships: [];
      };
      stock_counts: {
        Row: {
          id: string;
          shop_id: string;
          branch_id: string;
          counted_by: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          branch_id: string;
          counted_by: string;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          branch_id?: string;
          counted_by?: string;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      stock_count_items: {
        Row: {
          id: string;
          stock_count_id: string;
          shop_id: string;
          product_id: string;
          expected_qty: number;
          counted_qty: number;
          difference: number;
        };
        Insert: {
          id?: string;
          stock_count_id: string;
          shop_id: string;
          product_id: string;
          expected_qty: number;
          counted_qty: number;
          difference: number;
        };
        Update: {
          id?: string;
          stock_count_id?: string;
          shop_id?: string;
          product_id?: string;
          expected_qty?: number;
          counted_qty?: number;
          difference?: number;
        };
        Relationships: [];
      };
      activity_log: {
        Row: {
          id: string;
          shop_id: string;
          actor_id: string;
          action: string;
          entity_type: string;
          entity_id: string | null;
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          actor_id: string;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          details?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          actor_id?: string;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          details?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      stock_levels: {
        Row: {
          shop_id: string;
          branch_id: string;
          product_id: string;
          stock_on_hand: number;
        };
        Relationships: [];
      };
      staff_products: {
        Row: {
          id: string;
          shop_id: string;
          name: string;
          category: ProductCategory;
          selling_price_centavos: number;
          low_stock_threshold: number;
          is_active: boolean;
        };
        Relationships: [];
      };
      my_sales: {
        Row: {
          id: string;
          shop_id: string;
          branch_id: string;
          sold_by: string;
          payment_method: PaymentMethod;
          total_centavos: number;
          status: SaleStatus;
          created_at: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      current_user_shop_id: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
      current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: UserRole | null;
      };
      is_owner: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
      product_category: ProductCategory;
      payment_method: PaymentMethod;
      sale_status: SaleStatus;
      stock_movement_reason: StockMovementReason;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
