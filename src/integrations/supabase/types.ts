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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      edit_history: {
        Row: {
          created_at: string
          description: string
          fields_changed: string[]
          id: string
          products_affected: number
          reverted: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          fields_changed?: string[]
          id?: string
          products_affected?: number
          reverted?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          fields_changed?: string[]
          id?: string
          products_affected?: number
          reverted?: boolean
          user_id?: string
        }
        Relationships: []
      }
      edit_history_changes: {
        Row: {
          created_at: string
          edit_history_id: string
          field: string
          id: string
          new_value: Json | null
          old_value: Json | null
          product_id: string
        }
        Insert: {
          created_at?: string
          edit_history_id: string
          field: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          product_id: string
        }
        Update: {
          created_at?: string
          edit_history_id?: string
          field?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "edit_history_changes_edit_history_id_fkey"
            columns: ["edit_history_id"]
            isOneToOne: false
            referencedRelation: "edit_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edit_history_changes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      product_category_assignments: {
        Row: {
          category_id: string
          created_at: string
          id: string
          product_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          product_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_category_assignments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_category_assignments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          collections: string[]
          compare_at_price: number | null
          created_at: string
          description: string
          id: string
          image_url: string
          inventory: number
          price: number
          product_type: string
          seo_description: string
          seo_title: string
          shopify_id: string | null
          sku: string
          status: string
          store_id: string | null
          tags: string[]
          title: string
          updated_at: string
          user_id: string
          variants: number
          vendor: string
        }
        Insert: {
          collections?: string[]
          compare_at_price?: number | null
          created_at?: string
          description?: string
          id?: string
          image_url?: string
          inventory?: number
          price?: number
          product_type?: string
          seo_description?: string
          seo_title?: string
          shopify_id?: string | null
          sku?: string
          status?: string
          store_id?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          user_id: string
          variants?: number
          vendor?: string
        }
        Update: {
          collections?: string[]
          compare_at_price?: number | null
          created_at?: string
          description?: string
          id?: string
          image_url?: string
          inventory?: number
          price?: number
          product_type?: string
          seo_description?: string
          seo_title?: string
          shopify_id?: string | null
          sku?: string
          status?: string
          store_id?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
          variants?: number
          vendor?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "shopify_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          shop_name: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          shop_name?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          shop_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      scheduled_jobs: {
        Row: {
          action_params: Json
          action_type: string
          created_at: string
          executed_at: string | null
          id: string
          name: string
          product_ids: string[]
          scheduled_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_params?: Json
          action_type?: string
          created_at?: string
          executed_at?: string | null
          id?: string
          name?: string
          product_ids?: string[]
          scheduled_at: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_params?: Json
          action_type?: string
          created_at?: string
          executed_at?: string | null
          id?: string
          name?: string
          product_ids?: string[]
          scheduled_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shopify_stores: {
        Row: {
          access_token: string
          created_at: string
          id: string
          scopes: string
          shop_domain: string
          store_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          id?: string
          scopes?: string
          shop_domain: string
          store_name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          scopes?: string
          shop_domain?: string
          store_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          plan: Database["public"]["Enums"]["plan_type"]
          started_at: string
          trial_ends_at: string | null
          trial_started_at: string | null
          trial_used: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["plan_type"]
          started_at?: string
          trial_ends_at?: string | null
          trial_started_at?: string | null
          trial_used?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["plan_type"]
          started_at?: string
          trial_ends_at?: string | null
          trial_started_at?: string | null
          trial_used?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      start_subscription_trial: {
        Args: { _target_plan: Database["public"]["Enums"]["plan_type"] }
        Returns: {
          created_at: string
          ends_at: string | null
          id: string
          plan: Database["public"]["Enums"]["plan_type"]
          started_at: string
          trial_ends_at: string | null
          trial_started_at: string | null
          trial_used: boolean
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "subscriptions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      plan_type: "free" | "starter" | "growth"
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
      plan_type: ["free", "starter", "growth"],
    },
  },
} as const
