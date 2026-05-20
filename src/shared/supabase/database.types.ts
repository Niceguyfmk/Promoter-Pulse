export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["tenants"]["Insert"]>;
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          tenant_id: string;
          auth_provider: string;
          auth_provider_user_id: string;
          email: string;
          full_name: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          auth_provider: string;
          auth_provider_user_id: string;
          email: string;
          full_name?: string | null;
          is_active?: boolean;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [];
      };
      user_role_assignments: {
        Row: {
          user_id: string;
          role_id: string;
          tenant_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          role_id: string;
          tenant_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_role_assignments"]["Insert"]>;
        Relationships: [];
      };
      role_permissions: {
        Row: {
          role_id: Database["public"]["Enums"]["app_role"];
          permission_id: string;
        };
        Insert: {
          role_id: Database["public"]["Enums"]["app_role"];
          permission_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["role_permissions"]["Insert"]>;
        Relationships: [];
      };
      retail_stores: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          external_code: string | null;
          address: string | null;
          is_active: boolean;
          status: string | null;
          city: string | null;
          state: string | null;
          postal_code: string | null;
          country: string | null;
          country_code: string | null;
          contact_name: string | null;
          contact_title: string | null;
          contact_email: string | null;
          website: string | null;
          phone: string | null;
          cell_phone: string | null;
          note: string | null;
          latitude: number | null;
          longitude: number | null;
          allowed_radius_meters: number;
          geofence_radius_meters: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          external_code?: string | null;
          address?: string | null;
          is_active?: boolean;
          status?: string | null;
          city?: string | null;
          state?: string | null;
          postal_code?: string | null;
          country?: string | null;
          country_code?: string | null;
          contact_name?: string | null;
          contact_title?: string | null;
          contact_email?: string | null;
          website?: string | null;
          phone?: string | null;
          cell_phone?: string | null;
          note?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          allowed_radius_meters?: number;
          geofence_radius_meters?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["retail_stores"]["Insert"]>;
        Relationships: [];
      };
      place_company_assignments: {
        Row: { store_id: string; tenant_id: string; created_at: string };
        Insert: { store_id: string; tenant_id: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["place_company_assignments"]["Insert"]>;
        Relationships: [];
      };
      place_representative_assignments: {
        Row: { store_id: string; user_id: string; created_at: string };
        Insert: { store_id: string; user_id: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["place_representative_assignments"]["Insert"]>;
        Relationships: [];
      };
      place_promoter_assignments: {
        Row: { store_id: string; user_id: string; created_at: string };
        Insert: { store_id: string; user_id: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["place_promoter_assignments"]["Insert"]>;
        Relationships: [];
      };
      place_tags: {
        Row: { id: string; name: string; created_at: string };
        Insert: { id?: string; name: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["place_tags"]["Insert"]>;
        Relationships: [];
      };
      place_tag_assignments: {
        Row: { store_id: string; tag_id: string; created_at: string };
        Insert: { store_id: string; tag_id: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["place_tag_assignments"]["Insert"]>;
        Relationships: [];
      };
      survey_forms: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          description: string | null;
          schema_json: Json;
          is_active: boolean;
          created_by_user_id: string | null;
          updated_by_user_id: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          description?: string | null;
          schema_json?: Json;
          is_active?: boolean;
          created_by_user_id?: string | null;
          updated_by_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["survey_forms"]["Insert"]>;
        Relationships: [];
      };
      place_form_assignments: {
        Row: { store_id: string; form_id: string; created_at: string };
        Insert: { store_id: string; form_id: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["place_form_assignments"]["Insert"]>;
        Relationships: [];
      };
      shifts: {
        Row: {
          id: string;
          tenant_id: string;
          promoter_user_id: string;
          store_id: string;
          scheduled_start_at: string;
          scheduled_end_at: string;
          status: Database["public"]["Enums"]["shift_status"];
          checked_in_at: string | null;
          checked_out_at: string | null;
          check_in_latitude: number | null;
          check_in_longitude: number | null;
          check_out_latitude: number | null;
          check_out_longitude: number | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          promoter_user_id: string;
          store_id: string;
          scheduled_start_at: string;
          scheduled_end_at: string;
          status?: Database["public"]["Enums"]["shift_status"];
          checked_in_at?: string | null;
          checked_out_at?: string | null;
          check_in_latitude?: number | null;
          check_in_longitude?: number | null;
          check_out_latitude?: number | null;
          check_out_longitude?: number | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["shifts"]["Insert"]>;
        Relationships: [];
      };
      visit_reports: {
        Row: {
          id: string;
          tenant_id: string;
          store_id: string;
          promoter_user_id: string;
          check_in_type: "remote" | "gps";
          status: "draft" | "submitted" | "accepted" | "rejected";
          started_at: string;
          checkin_lat: number | null;
          checkin_lng: number | null;
          checkin_accuracy: number | null;
          checkin_at: string | null;
          checkin_distance_meters: number | null;
          checked_out_at: string | null;
          form_id: string | null;
          form_name: string | null;
          form_answers: Json;
          photo_items: Json;
          note: string | null;
          sales_numbers: Json;
          merchandising: Json;
          reviewed_by_user_id: string | null;
          reviewed_at: string | null;
          review_note: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          store_id: string;
          promoter_user_id: string;
          check_in_type?: "remote" | "gps";
          status?: "draft" | "submitted" | "accepted" | "rejected";
          started_at?: string;
          checkin_lat?: number | null;
          checkin_lng?: number | null;
          checkin_accuracy?: number | null;
          checkin_at?: string | null;
          checkin_distance_meters?: number | null;
          checked_out_at?: string | null;
          form_id?: string | null;
          form_name?: string | null;
          form_answers?: Json;
          photo_items?: Json;
          note?: string | null;
          sales_numbers?: Json;
          merchandising?: Json;
          reviewed_by_user_id?: string | null;
          reviewed_at?: string | null;
          review_note?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["visit_reports"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_app_user_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
    };
    Enums: {
      auth_provider: "supabase" | "okta" | "auth0" | "azure_ad";
      app_role: "admin" | "manager" | "promoter";
      shift_status: "scheduled" | "checked_in" | "checked_out" | "missed";
    };
    CompositeTypes: Record<string, never>;
  };
};
