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
      amenities: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          name?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          camp_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          new_value: Json | null
          old_value: Json | null
          reason: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          camp_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          camp_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
        ]
      }
      buildings: {
        Row: {
          camp_id: string
          code: string
          code_norm: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          floor_count: number | null
          id: string
          name: string
          name_norm: string | null
          status: Database["public"]["Enums"]["building_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          camp_id: string
          code: string
          code_norm?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          floor_count?: number | null
          id?: string
          name: string
          name_norm?: string | null
          status?: Database["public"]["Enums"]["building_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          camp_id?: string
          code?: string
          code_norm?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          floor_count?: number | null
          id?: string
          name?: string
          name_norm?: string | null
          status?: Database["public"]["Enums"]["building_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buildings_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buildings_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "buildings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buildings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buildings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buildings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      camps: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          location: string | null
          manager_id: string | null
          name: string
          status: Database["public"]["Enums"]["camp_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          manager_id?: string | null
          name: string
          status?: Database["public"]["Enums"]["camp_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          manager_id?: string | null
          name?: string
          status?: Database["public"]["Enums"]["camp_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "camps_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camps_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camps_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camps_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camps_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camps_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_import_batches: {
        Row: {
          archived_at: string | null
          camp_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          failed_at: string | null
          failed_rows: number
          id: string
          import_type: string
          invalid_rows: number | null
          mime_type: string | null
          original_filename: string | null
          processed_rows: number
          size_bytes: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["import_status"]
          storage_bucket: string | null
          storage_path: string | null
          total_rows: number
          updated_at: string | null
          uploaded_by: string | null
          valid_rows: number | null
        }
        Insert: {
          archived_at?: string | null
          camp_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          failed_at?: string | null
          failed_rows?: number
          id?: string
          import_type: string
          invalid_rows?: number | null
          mime_type?: string | null
          original_filename?: string | null
          processed_rows?: number
          size_bytes?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["import_status"]
          storage_bucket?: string | null
          storage_path?: string | null
          total_rows?: number
          updated_at?: string | null
          uploaded_by?: string | null
          valid_rows?: number | null
        }
        Update: {
          archived_at?: string | null
          camp_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          failed_at?: string | null
          failed_rows?: number
          id?: string
          import_type?: string
          invalid_rows?: number | null
          mime_type?: string | null
          original_filename?: string | null
          processed_rows?: number
          size_bytes?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["import_status"]
          storage_bucket?: string | null
          storage_path?: string | null
          total_rows?: number
          updated_at?: string | null
          uploaded_by?: string | null
          valid_rows?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "data_import_batches_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_import_batches_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "data_import_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_import_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_import_batches_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_import_batches_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_import_rows: {
        Row: {
          batch_id: string
          created_at: string | null
          created_entity_id: string | null
          created_entity_type: string | null
          error_message: string | null
          error_messages: string[] | null
          id: string
          normalized_data: Json | null
          normalized_payload: Json | null
          processed_at: string | null
          raw_data: Json
          raw_payload: Json | null
          row_number: number
          status: string
          validation_status: string | null
        }
        Insert: {
          batch_id: string
          created_at?: string | null
          created_entity_id?: string | null
          created_entity_type?: string | null
          error_message?: string | null
          error_messages?: string[] | null
          id?: string
          normalized_data?: Json | null
          normalized_payload?: Json | null
          processed_at?: string | null
          raw_data: Json
          raw_payload?: Json | null
          row_number: number
          status?: string
          validation_status?: string | null
        }
        Update: {
          batch_id?: string
          created_at?: string | null
          created_entity_id?: string | null
          created_entity_type?: string | null
          error_message?: string | null
          error_messages?: string[] | null
          id?: string
          normalized_data?: Json | null
          normalized_payload?: Json | null
          processed_at?: string | null
          raw_data?: Json
          raw_payload?: Json | null
          row_number?: number
          status?: string
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_import_rows_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "data_import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      expected_arrivals: {
        Row: {
          allocated_allocation_id: string | null
          allocated_at: string | null
          allocated_by: string | null
          allocated_room_id: string | null
          allocated_stay_id: string | null
          camp_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          expected_arrival_at: string
          expected_departure_at: string | null
          guest_id: string | null
          host_department: string | null
          host_name: string | null
          id: string
          no_show_at: string | null
          no_show_by: string | null
          no_show_reason: string | null
          notes: string | null
          purpose: string | null
          status: Database["public"]["Enums"]["expected_arrival_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allocated_allocation_id?: string | null
          allocated_at?: string | null
          allocated_by?: string | null
          allocated_room_id?: string | null
          allocated_stay_id?: string | null
          camp_id: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          expected_arrival_at: string
          expected_departure_at?: string | null
          guest_id?: string | null
          host_department?: string | null
          host_name?: string | null
          id?: string
          no_show_at?: string | null
          no_show_by?: string | null
          no_show_reason?: string | null
          notes?: string | null
          purpose?: string | null
          status?: Database["public"]["Enums"]["expected_arrival_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allocated_allocation_id?: string | null
          allocated_at?: string | null
          allocated_by?: string | null
          allocated_room_id?: string | null
          allocated_stay_id?: string | null
          camp_id?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          expected_arrival_at?: string
          expected_departure_at?: string | null
          guest_id?: string | null
          host_department?: string | null
          host_name?: string | null
          id?: string
          no_show_at?: string | null
          no_show_by?: string | null
          no_show_reason?: string | null
          notes?: string | null
          purpose?: string | null
          status?: Database["public"]["Enums"]["expected_arrival_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expected_arrivals_allocated_allocation_id_fkey"
            columns: ["allocated_allocation_id"]
            isOneToOne: false
            referencedRelation: "room_allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_allocated_by_fkey"
            columns: ["allocated_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_allocated_by_fkey"
            columns: ["allocated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_allocated_room_id_fkey"
            columns: ["allocated_room_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "expected_arrivals_allocated_room_id_fkey"
            columns: ["allocated_room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_allocated_room_id_fkey"
            columns: ["allocated_room_id"]
            isOneToOne: false
            referencedRelation: "safe_room_inventory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_allocated_room_id_fkey"
            columns: ["allocated_room_id"]
            isOneToOne: false
            referencedRelation: "sensitive_room_inventory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_allocated_stay_id_fkey"
            columns: ["allocated_stay_id"]
            isOneToOne: false
            referencedRelation: "departures_today_view"
            referencedColumns: ["stay_id"]
          },
          {
            foreignKeyName: "expected_arrivals_allocated_stay_id_fkey"
            columns: ["allocated_stay_id"]
            isOneToOne: false
            referencedRelation: "manager_current_guests_view"
            referencedColumns: ["stay_id"]
          },
          {
            foreignKeyName: "expected_arrivals_allocated_stay_id_fkey"
            columns: ["allocated_stay_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["current_stay_id"]
          },
          {
            foreignKeyName: "expected_arrivals_allocated_stay_id_fkey"
            columns: ["allocated_stay_id"]
            isOneToOne: false
            referencedRelation: "safe_current_stays_view"
            referencedColumns: ["stay_id"]
          },
          {
            foreignKeyName: "expected_arrivals_allocated_stay_id_fkey"
            columns: ["allocated_stay_id"]
            isOneToOne: false
            referencedRelation: "stays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "expected_arrivals_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["current_guest_id"]
          },
          {
            foreignKeyName: "expected_arrivals_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "safe_guest_directory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "sensitive_guest_operations_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_no_show_by_fkey"
            columns: ["no_show_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_no_show_by_fkey"
            columns: ["no_show_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      export_jobs: {
        Row: {
          archived_at: string | null
          camp_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          date_from: string | null
          date_to: string | null
          error_message: string | null
          expires_at: string | null
          export_format: string | null
          export_type: string
          failed_at: string | null
          filter_payload: Json
          format: string
          id: string
          report_type: string | null
          requested_by: string | null
          row_count: number | null
          status: Database["public"]["Enums"]["export_status"]
          storage_bucket: string | null
          storage_path: string | null
          updated_at: string | null
        }
        Insert: {
          archived_at?: string | null
          camp_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          date_from?: string | null
          date_to?: string | null
          error_message?: string | null
          expires_at?: string | null
          export_format?: string | null
          export_type: string
          failed_at?: string | null
          filter_payload?: Json
          format: string
          id?: string
          report_type?: string | null
          requested_by?: string | null
          row_count?: number | null
          status?: Database["public"]["Enums"]["export_status"]
          storage_bucket?: string | null
          storage_path?: string | null
          updated_at?: string | null
        }
        Update: {
          archived_at?: string | null
          camp_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          date_from?: string | null
          date_to?: string | null
          error_message?: string | null
          expires_at?: string | null
          export_format?: string | null
          export_type?: string
          failed_at?: string | null
          filter_payload?: Json
          format?: string
          id?: string
          report_type?: string | null
          requested_by?: string | null
          row_count?: number | null
          status?: Database["public"]["Enums"]["export_status"]
          storage_bucket?: string | null
          storage_path?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "export_jobs_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "export_jobs_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "export_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "export_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "export_jobs_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "export_jobs_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      field_absences: {
        Row: {
          actual_return_at: string | null
          camp_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          departure_at: string
          destination: string | null
          expected_return_at: string
          guest_id: string
          id: string
          notes: string | null
          reason: string | null
          return_notes: string | null
          returned_at: string | null
          returned_by: string | null
          room_id: string
          status: Database["public"]["Enums"]["field_absence_status"]
          stay_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          actual_return_at?: string | null
          camp_id: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          departure_at: string
          destination?: string | null
          expected_return_at: string
          guest_id: string
          id?: string
          notes?: string | null
          reason?: string | null
          return_notes?: string | null
          returned_at?: string | null
          returned_by?: string | null
          room_id: string
          status?: Database["public"]["Enums"]["field_absence_status"]
          stay_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          actual_return_at?: string | null
          camp_id?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          departure_at?: string
          destination?: string | null
          expected_return_at?: string
          guest_id?: string
          id?: string
          notes?: string | null
          reason?: string | null
          return_notes?: string | null
          returned_at?: string | null
          returned_by?: string | null
          room_id?: string
          status?: Database["public"]["Enums"]["field_absence_status"]
          stay_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "field_absences_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "field_absences_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["current_guest_id"]
          },
          {
            foreignKeyName: "field_absences_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "safe_guest_directory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "sensitive_guest_operations_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_returned_by_fkey"
            columns: ["returned_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_returned_by_fkey"
            columns: ["returned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "field_absences_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "safe_room_inventory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "sensitive_room_inventory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "departures_today_view"
            referencedColumns: ["stay_id"]
          },
          {
            foreignKeyName: "field_absences_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "manager_current_guests_view"
            referencedColumns: ["stay_id"]
          },
          {
            foreignKeyName: "field_absences_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["current_stay_id"]
          },
          {
            foreignKeyName: "field_absences_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "safe_current_stays_view"
            referencedColumns: ["stay_id"]
          },
          {
            foreignKeyName: "field_absences_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "stays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_camp_links: {
        Row: {
          camp_id: string
          created_at: string
          created_by: string | null
          guest_id: string
          id: string
          link_reason: string
        }
        Insert: {
          camp_id: string
          created_at?: string
          created_by?: string | null
          guest_id: string
          id?: string
          link_reason?: string
        }
        Update: {
          camp_id?: string
          created_at?: string
          created_by?: string | null
          guest_id?: string
          id?: string
          link_reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_camp_links_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_camp_links_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "guest_camp_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_camp_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_camp_links_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_camp_links_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["current_guest_id"]
          },
          {
            foreignKeyName: "guest_camp_links_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "safe_guest_directory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_camp_links_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "sensitive_guest_operations_view"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_documents: {
        Row: {
          archived_at: string | null
          camp_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          document_type: string
          file_size_bytes: number | null
          guest_id: string
          id: string
          mime_type: string | null
          notes: string | null
          original_filename: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          size_bytes: number | null
          status: Database["public"]["Enums"]["guest_document_status"]
          storage_bucket: string
          storage_path: string
          updated_at: string
          updated_by: string | null
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          archived_at?: string | null
          camp_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          document_type: string
          file_size_bytes?: number | null
          guest_id: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          original_filename?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_bytes?: number | null
          status?: Database["public"]["Enums"]["guest_document_status"]
          storage_bucket: string
          storage_path: string
          updated_at?: string
          updated_by?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          archived_at?: string | null
          camp_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          document_type?: string
          file_size_bytes?: number | null
          guest_id?: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          original_filename?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_bytes?: number | null
          status?: Database["public"]["Enums"]["guest_document_status"]
          storage_bucket?: string
          storage_path?: string
          updated_at?: string
          updated_by?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_documents_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_documents_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "guest_documents_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_documents_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_documents_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_documents_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["current_guest_id"]
          },
          {
            foreignKeyName: "guest_documents_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "safe_guest_directory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_documents_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "sensitive_guest_operations_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_group_members: {
        Row: {
          created_at: string
          created_by: string | null
          group_id: string
          guest_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          group_id: string
          guest_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          group_id?: string
          guest_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_group_members_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_group_members_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "guest_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_group_members_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_group_members_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["current_guest_id"]
          },
          {
            foreignKeyName: "guest_group_members_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "safe_guest_directory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_group_members_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "sensitive_guest_operations_view"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_groups: {
        Row: {
          archived_at: string | null
          arrival_at: string | null
          camp_id: string
          created_at: string
          created_by: string | null
          departure_at: string | null
          id: string
          name: string
          notes: string | null
          organization: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          arrival_at?: string | null
          camp_id: string
          created_at?: string
          created_by?: string | null
          departure_at?: string | null
          id?: string
          name: string
          notes?: string | null
          organization?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          arrival_at?: string | null
          camp_id?: string
          created_at?: string
          created_by?: string | null
          departure_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_groups_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_groups_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "guest_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_groups_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_groups_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          department_or_project: string | null
          email: string | null
          email_norm: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          full_name_norm: string | null
          gender: string | null
          guest_category: Database["public"]["Enums"]["guest_category"]
          id: string
          id_or_passport_number: string | null
          id_or_passport_number_norm: string | null
          is_vip: boolean
          last_security_event_id: string | null
          last_seen_at: string | null
          last_stay_id: string | null
          manager_notes: string | null
          nationality: string | null
          notes: string | null
          organization: string | null
          phone: string | null
          phone_norm: string | null
          primary_camp_id: string
          security_clearance_status: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          department_or_project?: string | null
          email?: string | null
          email_norm?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          full_name_norm?: string | null
          gender?: string | null
          guest_category: Database["public"]["Enums"]["guest_category"]
          id?: string
          id_or_passport_number?: string | null
          id_or_passport_number_norm?: string | null
          is_vip?: boolean
          last_security_event_id?: string | null
          last_seen_at?: string | null
          last_stay_id?: string | null
          manager_notes?: string | null
          nationality?: string | null
          notes?: string | null
          organization?: string | null
          phone?: string | null
          phone_norm?: string | null
          primary_camp_id: string
          security_clearance_status?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          department_or_project?: string | null
          email?: string | null
          email_norm?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          full_name_norm?: string | null
          gender?: string | null
          guest_category?: Database["public"]["Enums"]["guest_category"]
          id?: string
          id_or_passport_number?: string | null
          id_or_passport_number_norm?: string | null
          is_vip?: boolean
          last_security_event_id?: string | null
          last_seen_at?: string | null
          last_stay_id?: string | null
          manager_notes?: string | null
          nationality?: string | null
          notes?: string | null
          organization?: string | null
          phone?: string | null
          phone_norm?: string | null
          primary_camp_id?: string
          security_clearance_status?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guests_primary_camp_id_fkey"
            columns: ["primary_camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guests_primary_camp_id_fkey"
            columns: ["primary_camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "guests_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guests_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      housekeeping_task_files: {
        Row: {
          camp_id: string
          deleted_at: string | null
          file_size_bytes: number | null
          id: string
          mime_type: string | null
          original_filename: string | null
          storage_bucket: string
          storage_path: string
          task_id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          camp_id: string
          deleted_at?: string | null
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          original_filename?: string | null
          storage_bucket: string
          storage_path: string
          task_id: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          camp_id?: string
          deleted_at?: string | null
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          original_filename?: string | null
          storage_bucket?: string
          storage_path?: string
          task_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "housekeeping_task_files_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housekeeping_task_files_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "housekeeping_task_files_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "housekeeping_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housekeeping_task_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housekeeping_task_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      housekeeping_task_items: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          id: string
          is_completed: boolean
          is_required: boolean
          item_key: string
          label: string
          note: string | null
          task_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          id?: string
          is_completed?: boolean
          is_required?: boolean
          item_key: string
          label: string
          note?: string | null
          task_id: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          id?: string
          is_completed?: boolean
          is_required?: boolean
          item_key?: string
          label?: string
          note?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "housekeeping_task_items_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housekeeping_task_items_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housekeeping_task_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "housekeeping_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      housekeeping_tasks: {
        Row: {
          assigned_by: string | null
          assigned_to: string | null
          camp_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          failed_reason: string | null
          id: string
          notes: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          room_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["housekeeping_task_status"]
          stay_id: string | null
          task_type: string
          updated_at: string
          updated_by: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          assigned_by?: string | null
          assigned_to?: string | null
          camp_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          failed_reason?: string | null
          id?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          room_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["housekeeping_task_status"]
          stay_id?: string | null
          task_type: string
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string | null
          camp_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          failed_reason?: string | null
          id?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          room_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["housekeeping_task_status"]
          stay_id?: string | null
          task_type?: string
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "housekeeping_tasks_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housekeeping_tasks_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housekeeping_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housekeeping_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housekeeping_tasks_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housekeeping_tasks_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "housekeeping_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housekeeping_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housekeeping_tasks_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["room_id", "camp_id"]
          },
          {
            foreignKeyName: "housekeeping_tasks_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "housekeeping_tasks_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "safe_room_inventory_view"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "housekeeping_tasks_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "sensitive_room_inventory_view"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "housekeeping_tasks_stay_same_camp"
            columns: ["stay_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "departures_today_view"
            referencedColumns: ["stay_id", "camp_id"]
          },
          {
            foreignKeyName: "housekeeping_tasks_stay_same_camp"
            columns: ["stay_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "manager_current_guests_view"
            referencedColumns: ["stay_id", "camp_id"]
          },
          {
            foreignKeyName: "housekeeping_tasks_stay_same_camp"
            columns: ["stay_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "safe_current_stays_view"
            referencedColumns: ["stay_id", "camp_id"]
          },
          {
            foreignKeyName: "housekeeping_tasks_stay_same_camp"
            columns: ["stay_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "stays"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "housekeeping_tasks_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housekeeping_tasks_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housekeeping_tasks_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housekeeping_tasks_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_items: {
        Row: {
          id: string
          inspection_id: string
          item_key: string
          label: string
          note: string | null
          passed: boolean | null
        }
        Insert: {
          id?: string
          inspection_id: string
          item_key: string
          label: string
          note?: string | null
          passed?: boolean | null
        }
        Update: {
          id?: string
          inspection_id?: string
          item_key?: string
          label?: string
          note?: string | null
          passed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_items_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          camp_id: string
          created_at: string
          created_by: string | null
          failed_reason: string | null
          id: string
          inspected_at: string | null
          inspected_by: string | null
          inspection_type: string
          related_housekeeping_task_id: string | null
          related_maintenance_ticket_id: string | null
          room_id: string
          status: Database["public"]["Enums"]["inspection_status"]
        }
        Insert: {
          camp_id: string
          created_at?: string
          created_by?: string | null
          failed_reason?: string | null
          id?: string
          inspected_at?: string | null
          inspected_by?: string | null
          inspection_type: string
          related_housekeeping_task_id?: string | null
          related_maintenance_ticket_id?: string | null
          room_id: string
          status?: Database["public"]["Enums"]["inspection_status"]
        }
        Update: {
          camp_id?: string
          created_at?: string
          created_by?: string | null
          failed_reason?: string | null
          id?: string
          inspected_at?: string | null
          inspected_by?: string | null
          inspection_type?: string
          related_housekeeping_task_id?: string | null
          related_maintenance_ticket_id?: string | null
          room_id?: string
          status?: Database["public"]["Enums"]["inspection_status"]
        }
        Relationships: [
          {
            foreignKeyName: "inspections_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "inspections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_inspected_by_fkey"
            columns: ["inspected_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_inspected_by_fkey"
            columns: ["inspected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_related_housekeeping_task_id_fkey"
            columns: ["related_housekeeping_task_id"]
            isOneToOne: false
            referencedRelation: "housekeeping_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_related_maintenance_ticket_id_fkey"
            columns: ["related_maintenance_ticket_id"]
            isOneToOne: false
            referencedRelation: "maintenance_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["room_id", "camp_id"]
          },
          {
            foreignKeyName: "inspections_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "inspections_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "safe_room_inventory_view"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "inspections_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "sensitive_room_inventory_view"
            referencedColumns: ["id", "camp_id"]
          },
        ]
      }
      key_access_card_events: {
        Row: {
          camp_id: string
          created_at: string
          created_by: string | null
          event_type: string
          guest_id: string | null
          id: string
          key_card_id: string
          note: string | null
          stay_id: string | null
        }
        Insert: {
          camp_id: string
          created_at?: string
          created_by?: string | null
          event_type: string
          guest_id?: string | null
          id?: string
          key_card_id: string
          note?: string | null
          stay_id?: string | null
        }
        Update: {
          camp_id?: string
          created_at?: string
          created_by?: string | null
          event_type?: string
          guest_id?: string | null
          id?: string
          key_card_id?: string
          note?: string | null
          stay_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "key_access_card_events_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_access_card_events_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "key_access_card_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_access_card_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_access_card_events_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_access_card_events_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["current_guest_id"]
          },
          {
            foreignKeyName: "key_access_card_events_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "safe_guest_directory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_access_card_events_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "sensitive_guest_operations_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_access_card_events_key_card_id_fkey"
            columns: ["key_card_id"]
            isOneToOne: false
            referencedRelation: "keys_access_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_access_card_events_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "departures_today_view"
            referencedColumns: ["stay_id"]
          },
          {
            foreignKeyName: "key_access_card_events_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "manager_current_guests_view"
            referencedColumns: ["stay_id"]
          },
          {
            foreignKeyName: "key_access_card_events_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["current_stay_id"]
          },
          {
            foreignKeyName: "key_access_card_events_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "safe_current_stays_view"
            referencedColumns: ["stay_id"]
          },
          {
            foreignKeyName: "key_access_card_events_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "stays"
            referencedColumns: ["id"]
          },
        ]
      }
      keys_access_cards: {
        Row: {
          camp_id: string
          card_number: string | null
          created_at: string
          id: string
          issued_at: string | null
          issued_by: string | null
          issued_for_stay_id: string | null
          issued_to_guest_id: string | null
          key_code: string | null
          notes: string | null
          returned_at: string | null
          returned_by: string | null
          room_id: string | null
          status: Database["public"]["Enums"]["key_card_status"]
          updated_at: string
        }
        Insert: {
          camp_id: string
          card_number?: string | null
          created_at?: string
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          issued_for_stay_id?: string | null
          issued_to_guest_id?: string | null
          key_code?: string | null
          notes?: string | null
          returned_at?: string | null
          returned_by?: string | null
          room_id?: string | null
          status?: Database["public"]["Enums"]["key_card_status"]
          updated_at?: string
        }
        Update: {
          camp_id?: string
          card_number?: string | null
          created_at?: string
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          issued_for_stay_id?: string | null
          issued_to_guest_id?: string | null
          key_code?: string | null
          notes?: string | null
          returned_at?: string | null
          returned_by?: string | null
          room_id?: string | null
          status?: Database["public"]["Enums"]["key_card_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "keys_access_cards_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keys_access_cards_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "keys_access_cards_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keys_access_cards_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keys_access_cards_issued_to_guest_id_fkey"
            columns: ["issued_to_guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keys_access_cards_issued_to_guest_id_fkey"
            columns: ["issued_to_guest_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["current_guest_id"]
          },
          {
            foreignKeyName: "keys_access_cards_issued_to_guest_id_fkey"
            columns: ["issued_to_guest_id"]
            isOneToOne: false
            referencedRelation: "safe_guest_directory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keys_access_cards_issued_to_guest_id_fkey"
            columns: ["issued_to_guest_id"]
            isOneToOne: false
            referencedRelation: "sensitive_guest_operations_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keys_access_cards_returned_by_fkey"
            columns: ["returned_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keys_access_cards_returned_by_fkey"
            columns: ["returned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keys_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["room_id", "camp_id"]
          },
          {
            foreignKeyName: "keys_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "keys_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "safe_room_inventory_view"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "keys_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "sensitive_room_inventory_view"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "keys_stay_same_camp"
            columns: ["issued_for_stay_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "departures_today_view"
            referencedColumns: ["stay_id", "camp_id"]
          },
          {
            foreignKeyName: "keys_stay_same_camp"
            columns: ["issued_for_stay_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "manager_current_guests_view"
            referencedColumns: ["stay_id", "camp_id"]
          },
          {
            foreignKeyName: "keys_stay_same_camp"
            columns: ["issued_for_stay_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "safe_current_stays_view"
            referencedColumns: ["stay_id", "camp_id"]
          },
          {
            foreignKeyName: "keys_stay_same_camp"
            columns: ["issued_for_stay_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "stays"
            referencedColumns: ["id", "camp_id"]
          },
        ]
      }
      maintenance_ticket_files: {
        Row: {
          camp_id: string
          deleted_at: string | null
          file_size_bytes: number | null
          id: string
          mime_type: string | null
          original_filename: string | null
          storage_bucket: string
          storage_path: string
          ticket_id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          camp_id: string
          deleted_at?: string | null
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          original_filename?: string | null
          storage_bucket: string
          storage_path: string
          ticket_id: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          camp_id?: string
          deleted_at?: string | null
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          original_filename?: string | null
          storage_bucket?: string
          storage_path?: string
          ticket_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_ticket_files_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_ticket_files_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "maintenance_ticket_files_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "maintenance_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_ticket_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_ticket_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_ticket_updates: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          new_status:
            | Database["public"]["Enums"]["maintenance_ticket_status"]
            | null
          note: string | null
          previous_status:
            | Database["public"]["Enums"]["maintenance_ticket_status"]
            | null
          ticket_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          new_status?:
            | Database["public"]["Enums"]["maintenance_ticket_status"]
            | null
          note?: string | null
          previous_status?:
            | Database["public"]["Enums"]["maintenance_ticket_status"]
            | null
          ticket_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          new_status?:
            | Database["public"]["Enums"]["maintenance_ticket_status"]
            | null
          note?: string | null
          previous_status?:
            | Database["public"]["Enums"]["maintenance_ticket_status"]
            | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_ticket_updates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_ticket_updates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_ticket_updates_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "maintenance_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_tickets: {
        Row: {
          assigned_by: string | null
          assigned_to: string | null
          camp_id: string
          closed_at: string | null
          created_at: string
          description: string
          id: string
          is_room_blocking: boolean
          issue_type: string
          priority: Database["public"]["Enums"]["maintenance_priority"]
          reopened_at: string | null
          reported_by: string | null
          resolved_at: string | null
          room_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["maintenance_ticket_status"]
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          assigned_by?: string | null
          assigned_to?: string | null
          camp_id: string
          closed_at?: string | null
          created_at?: string
          description: string
          id?: string
          is_room_blocking?: boolean
          issue_type: string
          priority?: Database["public"]["Enums"]["maintenance_priority"]
          reopened_at?: string | null
          reported_by?: string | null
          resolved_at?: string | null
          room_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["maintenance_ticket_status"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string | null
          camp_id?: string
          closed_at?: string | null
          created_at?: string
          description?: string
          id?: string
          is_room_blocking?: boolean
          issue_type?: string
          priority?: Database["public"]["Enums"]["maintenance_priority"]
          reopened_at?: string | null
          reported_by?: string | null
          resolved_at?: string | null
          room_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["maintenance_ticket_status"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_tickets_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "maintenance_tickets_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["room_id", "camp_id"]
          },
          {
            foreignKeyName: "maintenance_tickets_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "maintenance_tickets_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "safe_room_inventory_view"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "maintenance_tickets_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "sensitive_room_inventory_view"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "maintenance_tickets_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_href: string | null
          archived_at: string | null
          body: string | null
          camp_id: string | null
          category: string | null
          created_at: string
          created_by: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string
          read_at: string | null
          recipient_id: string | null
          severity: string | null
          status: Database["public"]["Enums"]["notification_status"]
          title: string
          type: string
          updated_at: string | null
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          action_href?: string | null
          archived_at?: string | null
          body?: string | null
          camp_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message: string
          read_at?: string | null
          recipient_id?: string | null
          severity?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title: string
          type: string
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          action_href?: string | null
          archived_at?: string | null
          body?: string | null
          camp_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string
          read_at?: string | null
          recipient_id?: string | null
          severity?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title?: string
          type?: string
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          key: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          key: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          key?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          created_at: string
          department: string | null
          disabled_at: string | null
          disabled_by: string | null
          email: string | null
          failed_login_count: number
          force_password_change: boolean
          full_name: string
          id: string
          invite_accepted_at: string | null
          invited_at: string | null
          invited_by: string | null
          job_title: string | null
          last_login_at: string | null
          phone: string | null
          suspended_at: string | null
          suspended_by: string | null
          updated_at: string
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          created_at?: string
          department?: string | null
          disabled_at?: string | null
          disabled_by?: string | null
          email?: string | null
          failed_login_count?: number
          force_password_change?: boolean
          full_name: string
          id: string
          invite_accepted_at?: string | null
          invited_at?: string | null
          invited_by?: string | null
          job_title?: string | null
          last_login_at?: string | null
          phone?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          updated_at?: string
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          created_at?: string
          department?: string | null
          disabled_at?: string | null
          disabled_by?: string | null
          email?: string | null
          failed_login_count?: number
          force_password_change?: boolean
          full_name?: string
          id?: string
          invite_accepted_at?: string | null
          invited_at?: string | null
          invited_by?: string | null
          job_title?: string | null
          last_login_at?: string | null
          phone?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_disabled_by_fkey"
            columns: ["disabled_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_disabled_by_fkey"
            columns: ["disabled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_suspended_by_fkey"
            columns: ["suspended_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_suspended_by_fkey"
            columns: ["suspended_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          camp_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          expected_arrival_at: string
          expected_departure_at: string
          group_id: string | null
          guest_id: string | null
          id: string
          is_vip_hold: boolean
          notes: string | null
          room_id: string
          status: Database["public"]["Enums"]["reservation_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          camp_id: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          expected_arrival_at: string
          expected_departure_at: string
          group_id?: string | null
          guest_id?: string | null
          id?: string
          is_vip_hold?: boolean
          notes?: string | null
          room_id: string
          status?: Database["public"]["Enums"]["reservation_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          camp_id?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          expected_arrival_at?: string
          expected_departure_at?: string
          group_id?: string | null
          guest_id?: string | null
          id?: string
          is_vip_hold?: boolean
          notes?: string | null
          room_id?: string
          status?: Database["public"]["Enums"]["reservation_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "reservations_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_group_same_camp"
            columns: ["group_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "guest_groups"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "reservations_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["current_guest_id"]
          },
          {
            foreignKeyName: "reservations_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "safe_guest_directory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "sensitive_guest_operations_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["room_id", "camp_id"]
          },
          {
            foreignKeyName: "reservations_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "reservations_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "safe_room_inventory_view"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "reservations_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "sensitive_room_inventory_view"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "reservations_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          can_access_system: boolean
          created_at: string
          description: string | null
          id: string
          is_system_role: boolean
          key: string
          name: string
        }
        Insert: {
          can_access_system?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_system_role?: boolean
          key: string
          name: string
        }
        Update: {
          can_access_system?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_system_role?: boolean
          key?: string
          name?: string
        }
        Relationships: []
      }
      room_allocations: {
        Row: {
          allocated_at: string
          allocated_by: string | null
          allocation_notes: string | null
          camp_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          guest_id: string
          id: string
          reservation_id: string | null
          room_id: string
          status: Database["public"]["Enums"]["allocation_status"]
          stay_id: string | null
        }
        Insert: {
          allocated_at?: string
          allocated_by?: string | null
          allocation_notes?: string | null
          camp_id: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          guest_id: string
          id?: string
          reservation_id?: string | null
          room_id: string
          status?: Database["public"]["Enums"]["allocation_status"]
          stay_id?: string | null
        }
        Update: {
          allocated_at?: string
          allocated_by?: string | null
          allocation_notes?: string | null
          camp_id?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          guest_id?: string
          id?: string
          reservation_id?: string | null
          room_id?: string
          status?: Database["public"]["Enums"]["allocation_status"]
          stay_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_allocations_allocated_by_fkey"
            columns: ["allocated_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_allocations_allocated_by_fkey"
            columns: ["allocated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_allocations_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_allocations_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "room_allocations_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_allocations_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_allocations_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_allocations_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["current_guest_id"]
          },
          {
            foreignKeyName: "room_allocations_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "safe_guest_directory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_allocations_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "sensitive_guest_operations_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_allocations_reservation_same_camp"
            columns: ["reservation_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "arrivals_today_view"
            referencedColumns: ["reservation_id", "camp_id"]
          },
          {
            foreignKeyName: "room_allocations_reservation_same_camp"
            columns: ["reservation_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "room_allocations_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["room_id", "camp_id"]
          },
          {
            foreignKeyName: "room_allocations_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "room_allocations_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "safe_room_inventory_view"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "room_allocations_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "sensitive_room_inventory_view"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "room_allocations_stay_same_camp"
            columns: ["stay_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "departures_today_view"
            referencedColumns: ["stay_id", "camp_id"]
          },
          {
            foreignKeyName: "room_allocations_stay_same_camp"
            columns: ["stay_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "manager_current_guests_view"
            referencedColumns: ["stay_id", "camp_id"]
          },
          {
            foreignKeyName: "room_allocations_stay_same_camp"
            columns: ["stay_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "safe_current_stays_view"
            referencedColumns: ["stay_id", "camp_id"]
          },
          {
            foreignKeyName: "room_allocations_stay_same_camp"
            columns: ["stay_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "stays"
            referencedColumns: ["id", "camp_id"]
          },
        ]
      }
      room_amenity_assignments: {
        Row: {
          amenity_id: string
          assigned_at: string
          assigned_by: string | null
          room_id: string
        }
        Insert: {
          amenity_id: string
          assigned_at?: string
          assigned_by?: string | null
          room_id: string
        }
        Update: {
          amenity_id?: string
          assigned_at?: string
          assigned_by?: string | null
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_amenity_assignments_amenity_id_fkey"
            columns: ["amenity_id"]
            isOneToOne: false
            referencedRelation: "amenities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_amenity_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_amenity_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_amenity_assignments_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "room_amenity_assignments_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_amenity_assignments_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "safe_room_inventory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_amenity_assignments_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "sensitive_room_inventory_view"
            referencedColumns: ["id"]
          },
        ]
      }
      room_asset_assignments: {
        Row: {
          asset_id: string
          assigned_at: string
          assigned_by: string | null
          id: string
          notes: string | null
          removed_at: string | null
          removed_by: string | null
          room_id: string
          status: string
        }
        Insert: {
          asset_id: string
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          notes?: string | null
          removed_at?: string | null
          removed_by?: string | null
          room_id: string
          status?: string
        }
        Update: {
          asset_id?: string
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          notes?: string | null
          removed_at?: string | null
          removed_by?: string | null
          room_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_asset_assignments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "room_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_asset_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_asset_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_asset_assignments_removed_by_fkey"
            columns: ["removed_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_asset_assignments_removed_by_fkey"
            columns: ["removed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_asset_assignments_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "room_asset_assignments_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_asset_assignments_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "safe_room_inventory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_asset_assignments_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "sensitive_room_inventory_view"
            referencedColumns: ["id"]
          },
        ]
      }
      room_asset_events: {
        Row: {
          asset_id: string
          created_at: string
          created_by: string | null
          event_type: string
          id: string
          new_condition:
            | Database["public"]["Enums"]["asset_condition_status"]
            | null
          note: string | null
          previous_condition:
            | Database["public"]["Enums"]["asset_condition_status"]
            | null
          room_id: string | null
        }
        Insert: {
          asset_id: string
          created_at?: string
          created_by?: string | null
          event_type: string
          id?: string
          new_condition?:
            | Database["public"]["Enums"]["asset_condition_status"]
            | null
          note?: string | null
          previous_condition?:
            | Database["public"]["Enums"]["asset_condition_status"]
            | null
          room_id?: string | null
        }
        Update: {
          asset_id?: string
          created_at?: string
          created_by?: string | null
          event_type?: string
          id?: string
          new_condition?:
            | Database["public"]["Enums"]["asset_condition_status"]
            | null
          note?: string | null
          previous_condition?:
            | Database["public"]["Enums"]["asset_condition_status"]
            | null
          room_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_asset_events_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "room_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_asset_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_asset_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_asset_events_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "room_asset_events_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_asset_events_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "safe_room_inventory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_asset_events_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "sensitive_room_inventory_view"
            referencedColumns: ["id"]
          },
        ]
      }
      room_assets: {
        Row: {
          asset_code: string | null
          category: string | null
          condition_status: Database["public"]["Enums"]["asset_condition_status"]
          created_at: string
          created_by: string | null
          id: string
          name: string
          notes: string | null
          retired_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          asset_code?: string | null
          category?: string | null
          condition_status?: Database["public"]["Enums"]["asset_condition_status"]
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          retired_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          asset_code?: string | null
          category?: string | null
          condition_status?: Database["public"]["Enums"]["asset_condition_status"]
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          retired_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_assets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_assets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_assets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_assets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      room_qr_codes: {
        Row: {
          camp_id: string
          generated_at: string
          generated_by: string | null
          id: string
          is_active: boolean
          revoked_at: string | null
          revoked_by: string | null
          room_id: string
          token_hash: string
        }
        Insert: {
          camp_id: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          is_active?: boolean
          revoked_at?: string | null
          revoked_by?: string | null
          room_id: string
          token_hash: string
        }
        Update: {
          camp_id?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          is_active?: boolean
          revoked_at?: string | null
          revoked_by?: string | null
          room_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_qr_codes_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_qr_codes_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "room_qr_codes_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_qr_codes_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_qr_codes_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_qr_codes_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_qr_codes_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "room_qr_codes_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_qr_codes_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "safe_room_inventory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_qr_codes_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "sensitive_room_inventory_view"
            referencedColumns: ["id"]
          },
        ]
      }
      room_service_task_items: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          id: string
          is_completed: boolean
          item_key: string
          label: string
          note: string | null
          task_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          id?: string
          is_completed?: boolean
          item_key: string
          label: string
          note?: string | null
          task_id: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          id?: string
          is_completed?: boolean
          item_key?: string
          label?: string
          note?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_service_task_items_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_service_task_items_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_service_task_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "room_service_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      room_service_tasks: {
        Row: {
          assigned_by: string | null
          assigned_to: string | null
          camp_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          due_at: string | null
          id: string
          notes: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          room_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["room_service_task_status"]
          stay_id: string | null
          task_type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assigned_by?: string | null
          assigned_to?: string | null
          camp_id: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          room_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["room_service_task_status"]
          stay_id?: string | null
          task_type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string | null
          camp_id?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          room_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["room_service_task_status"]
          stay_id?: string | null
          task_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_service_tasks_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_service_tasks_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_service_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_service_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_service_tasks_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_service_tasks_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "room_service_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_service_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_service_tasks_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["room_id", "camp_id"]
          },
          {
            foreignKeyName: "room_service_tasks_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "room_service_tasks_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "safe_room_inventory_view"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "room_service_tasks_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "sensitive_room_inventory_view"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "room_service_tasks_stay_same_camp"
            columns: ["stay_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "departures_today_view"
            referencedColumns: ["stay_id", "camp_id"]
          },
          {
            foreignKeyName: "room_service_tasks_stay_same_camp"
            columns: ["stay_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "manager_current_guests_view"
            referencedColumns: ["stay_id", "camp_id"]
          },
          {
            foreignKeyName: "room_service_tasks_stay_same_camp"
            columns: ["stay_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "safe_current_stays_view"
            referencedColumns: ["stay_id", "camp_id"]
          },
          {
            foreignKeyName: "room_service_tasks_stay_same_camp"
            columns: ["stay_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "stays"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "room_service_tasks_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_service_tasks_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      room_status_history: {
        Row: {
          camp_id: string
          changed_at: string
          changed_by: string | null
          id: string
          new_status: Database["public"]["Enums"]["room_status"]
          previous_status: Database["public"]["Enums"]["room_status"] | null
          reason: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          room_id: string
        }
        Insert: {
          camp_id: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status: Database["public"]["Enums"]["room_status"]
          previous_status?: Database["public"]["Enums"]["room_status"] | null
          reason?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          room_id: string
        }
        Update: {
          camp_id?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["room_status"]
          previous_status?: Database["public"]["Enums"]["room_status"] | null
          reason?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_status_history_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_status_history_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "room_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_status_history_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["room_id", "camp_id"]
          },
          {
            foreignKeyName: "room_status_history_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "room_status_history_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "safe_room_inventory_view"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "room_status_history_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "sensitive_room_inventory_view"
            referencedColumns: ["id", "camp_id"]
          },
        ]
      }
      room_transfers: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          camp_id: string
          cancelled_at: string | null
          executed_at: string | null
          executed_by: string | null
          guest_id: string
          id: string
          new_room_id: string
          old_room_id: string
          reason: string
          requested_at: string
          requested_by: string | null
          status: Database["public"]["Enums"]["transfer_status"]
          stay_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          camp_id: string
          cancelled_at?: string | null
          executed_at?: string | null
          executed_by?: string | null
          guest_id: string
          id?: string
          new_room_id: string
          old_room_id: string
          reason: string
          requested_at?: string
          requested_by?: string | null
          status?: Database["public"]["Enums"]["transfer_status"]
          stay_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          camp_id?: string
          cancelled_at?: string | null
          executed_at?: string | null
          executed_by?: string | null
          guest_id?: string
          id?: string
          new_room_id?: string
          old_room_id?: string
          reason?: string
          requested_at?: string
          requested_by?: string | null
          status?: Database["public"]["Enums"]["transfer_status"]
          stay_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_transfers_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_transfers_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_transfers_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_transfers_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "room_transfers_executed_by_fkey"
            columns: ["executed_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_transfers_executed_by_fkey"
            columns: ["executed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_transfers_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_transfers_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["current_guest_id"]
          },
          {
            foreignKeyName: "room_transfers_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "safe_guest_directory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_transfers_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "sensitive_guest_operations_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_transfers_new_room_same_camp"
            columns: ["new_room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["room_id", "camp_id"]
          },
          {
            foreignKeyName: "room_transfers_new_room_same_camp"
            columns: ["new_room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "room_transfers_new_room_same_camp"
            columns: ["new_room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "safe_room_inventory_view"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "room_transfers_new_room_same_camp"
            columns: ["new_room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "sensitive_room_inventory_view"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "room_transfers_old_room_same_camp"
            columns: ["old_room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["room_id", "camp_id"]
          },
          {
            foreignKeyName: "room_transfers_old_room_same_camp"
            columns: ["old_room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "room_transfers_old_room_same_camp"
            columns: ["old_room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "safe_room_inventory_view"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "room_transfers_old_room_same_camp"
            columns: ["old_room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "sensitive_room_inventory_view"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "room_transfers_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_transfers_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_transfers_stay_same_camp"
            columns: ["stay_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "departures_today_view"
            referencedColumns: ["stay_id", "camp_id"]
          },
          {
            foreignKeyName: "room_transfers_stay_same_camp"
            columns: ["stay_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "manager_current_guests_view"
            referencedColumns: ["stay_id", "camp_id"]
          },
          {
            foreignKeyName: "room_transfers_stay_same_camp"
            columns: ["stay_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "safe_current_stays_view"
            referencedColumns: ["stay_id", "camp_id"]
          },
          {
            foreignKeyName: "room_transfers_stay_same_camp"
            columns: ["stay_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "stays"
            referencedColumns: ["id", "camp_id"]
          },
        ]
      }
      room_types: {
        Row: {
          created_at: string
          default_capacity: number | null
          description: string | null
          id: string
          is_active: boolean
          key: string
          name: string
        }
        Insert: {
          created_at?: string
          default_capacity?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          name: string
        }
        Update: {
          created_at?: string
          default_capacity?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          name?: string
        }
        Relationships: []
      }
      rooms: {
        Row: {
          bed_type: string | null
          building_id: string
          camp_id: string
          capacity: number
          condition_status: Database["public"]["Enums"]["room_condition_status"]
          created_at: string
          created_by: string | null
          current_status: Database["public"]["Enums"]["room_status"]
          decommissioned_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          floor_label: string | null
          gender_restriction: string | null
          id: string
          is_delegate_suitable: boolean
          is_vip: boolean
          last_cleaned_at: string | null
          last_inspected_at: string | null
          last_maintenance_at: string | null
          notes: string | null
          photo_paths: Json
          room_number: string
          room_number_norm: string | null
          room_type_id: string
          section_label: string | null
          sensitive_notes: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bed_type?: string | null
          building_id: string
          camp_id: string
          capacity: number
          condition_status?: Database["public"]["Enums"]["room_condition_status"]
          created_at?: string
          created_by?: string | null
          current_status?: Database["public"]["Enums"]["room_status"]
          decommissioned_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          floor_label?: string | null
          gender_restriction?: string | null
          id?: string
          is_delegate_suitable?: boolean
          is_vip?: boolean
          last_cleaned_at?: string | null
          last_inspected_at?: string | null
          last_maintenance_at?: string | null
          notes?: string | null
          photo_paths?: Json
          room_number: string
          room_number_norm?: string | null
          room_type_id: string
          section_label?: string | null
          sensitive_notes?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bed_type?: string | null
          building_id?: string
          camp_id?: string
          capacity?: number
          condition_status?: Database["public"]["Enums"]["room_condition_status"]
          created_at?: string
          created_by?: string | null
          current_status?: Database["public"]["Enums"]["room_status"]
          decommissioned_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          floor_label?: string | null
          gender_restriction?: string | null
          id?: string
          is_delegate_suitable?: boolean
          is_vip?: boolean
          last_cleaned_at?: string | null
          last_inspected_at?: string | null
          last_maintenance_at?: string | null
          notes?: string | null
          photo_paths?: Json
          room_number?: string
          room_number_norm?: string | null
          room_type_id?: string
          section_label?: string | null
          sensitive_notes?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_building_same_camp"
            columns: ["building_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "rooms_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "rooms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      security_clearance_events: {
        Row: {
          camp_id: string
          clearance_status: string
          created_at: string
          created_by: string | null
          entry_at: string | null
          event_type: string | null
          exit_at: string | null
          exit_notes: string | null
          exited_by: string | null
          expires_at: string | null
          guest_id: string
          host_department: string | null
          host_name: string | null
          id: string
          new_status: string | null
          note: string | null
          notes: string | null
          previous_status: string | null
          purpose: string | null
          reception_notes: string | null
          reception_received_at: string | null
          reception_received_by: string | null
          reception_status: string | null
          related_reservation_id: string | null
          related_stay_id: string | null
          risk_level: string | null
          sent_to_reception_at: string | null
          sent_to_reception_by: string | null
          updated_at: string
          updated_by: string | null
          visit_type: string | null
        }
        Insert: {
          camp_id: string
          clearance_status: string
          created_at?: string
          created_by?: string | null
          entry_at?: string | null
          event_type?: string | null
          exit_at?: string | null
          exit_notes?: string | null
          exited_by?: string | null
          expires_at?: string | null
          guest_id: string
          host_department?: string | null
          host_name?: string | null
          id?: string
          new_status?: string | null
          note?: string | null
          notes?: string | null
          previous_status?: string | null
          purpose?: string | null
          reception_notes?: string | null
          reception_received_at?: string | null
          reception_received_by?: string | null
          reception_status?: string | null
          related_reservation_id?: string | null
          related_stay_id?: string | null
          risk_level?: string | null
          sent_to_reception_at?: string | null
          sent_to_reception_by?: string | null
          updated_at?: string
          updated_by?: string | null
          visit_type?: string | null
        }
        Update: {
          camp_id?: string
          clearance_status?: string
          created_at?: string
          created_by?: string | null
          entry_at?: string | null
          event_type?: string | null
          exit_at?: string | null
          exit_notes?: string | null
          exited_by?: string | null
          expires_at?: string | null
          guest_id?: string
          host_department?: string | null
          host_name?: string | null
          id?: string
          new_status?: string | null
          note?: string | null
          notes?: string | null
          previous_status?: string | null
          purpose?: string | null
          reception_notes?: string | null
          reception_received_at?: string | null
          reception_received_by?: string | null
          reception_status?: string | null
          related_reservation_id?: string | null
          related_stay_id?: string | null
          risk_level?: string | null
          sent_to_reception_at?: string | null
          sent_to_reception_by?: string | null
          updated_at?: string
          updated_by?: string | null
          visit_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_clearance_events_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_clearance_events_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "security_clearance_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_clearance_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_clearance_events_exited_by_fkey"
            columns: ["exited_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_clearance_events_exited_by_fkey"
            columns: ["exited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_clearance_events_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_clearance_events_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["current_guest_id"]
          },
          {
            foreignKeyName: "security_clearance_events_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "safe_guest_directory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_clearance_events_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "sensitive_guest_operations_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_clearance_events_reception_received_by_fkey"
            columns: ["reception_received_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_clearance_events_reception_received_by_fkey"
            columns: ["reception_received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_clearance_events_sent_to_reception_by_fkey"
            columns: ["sent_to_reception_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_clearance_events_sent_to_reception_by_fkey"
            columns: ["sent_to_reception_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_clearance_events_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_clearance_events_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stays: {
        Row: {
          camp_id: string
          checked_in_at: string | null
          checked_out_at: string | null
          checkin_notes: string | null
          checkout_notes: string | null
          created_at: string
          created_by: string | null
          expected_arrival_at: string | null
          expected_departure_at: string | null
          guest_id: string
          id: string
          reservation_id: string | null
          room_id: string
          status: Database["public"]["Enums"]["stay_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          camp_id: string
          checked_in_at?: string | null
          checked_out_at?: string | null
          checkin_notes?: string | null
          checkout_notes?: string | null
          created_at?: string
          created_by?: string | null
          expected_arrival_at?: string | null
          expected_departure_at?: string | null
          guest_id: string
          id?: string
          reservation_id?: string | null
          room_id: string
          status?: Database["public"]["Enums"]["stay_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          camp_id?: string
          checked_in_at?: string | null
          checked_out_at?: string | null
          checkin_notes?: string | null
          checkout_notes?: string | null
          created_at?: string
          created_by?: string | null
          expected_arrival_at?: string | null
          expected_departure_at?: string | null
          guest_id?: string
          id?: string
          reservation_id?: string | null
          room_id?: string
          status?: Database["public"]["Enums"]["stay_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stays_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stays_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "stays_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stays_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stays_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stays_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["current_guest_id"]
          },
          {
            foreignKeyName: "stays_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "safe_guest_directory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stays_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "sensitive_guest_operations_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stays_reservation_same_camp"
            columns: ["reservation_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "arrivals_today_view"
            referencedColumns: ["reservation_id", "camp_id"]
          },
          {
            foreignKeyName: "stays_reservation_same_camp"
            columns: ["reservation_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "stays_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["room_id", "camp_id"]
          },
          {
            foreignKeyName: "stays_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "stays_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "safe_room_inventory_view"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "stays_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "sensitive_room_inventory_view"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "stays_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stays_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_camp_access: {
        Row: {
          access_level: Database["public"]["Enums"]["camp_access_level"]
          camp_id: string
          granted_at: string
          granted_by: string | null
          id: string
          revoked_at: string | null
          revoked_by: string | null
          user_id: string
        }
        Insert: {
          access_level: Database["public"]["Enums"]["camp_access_level"]
          camp_id: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          user_id: string
        }
        Update: {
          access_level?: Database["public"]["Enums"]["camp_access_level"]
          camp_id?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_camp_access_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_camp_access_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "user_camp_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_camp_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_camp_access_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_camp_access_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_camp_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_camp_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          revoked_at: string | null
          revoked_by: string | null
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vip_preparation_checklists: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          camp_id: string
          created_at: string
          created_by: string | null
          group_id: string | null
          guest_id: string | null
          id: string
          notes: string | null
          room_id: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          camp_id: string
          created_at?: string
          created_by?: string | null
          group_id?: string | null
          guest_id?: string | null
          id?: string
          notes?: string | null
          room_id?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          camp_id?: string
          created_at?: string
          created_by?: string | null
          group_id?: string | null
          guest_id?: string | null
          id?: string
          notes?: string | null
          room_id?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vip_preparation_checklists_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vip_preparation_checklists_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vip_preparation_checklists_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vip_preparation_checklists_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "vip_preparation_checklists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vip_preparation_checklists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vip_preparation_checklists_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "guest_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vip_preparation_checklists_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vip_preparation_checklists_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["current_guest_id"]
          },
          {
            foreignKeyName: "vip_preparation_checklists_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "safe_guest_directory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vip_preparation_checklists_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "sensitive_guest_operations_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vip_preparation_checklists_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vip_preparation_checklists_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vip_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["room_id", "camp_id"]
          },
          {
            foreignKeyName: "vip_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "vip_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "safe_room_inventory_view"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "vip_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "sensitive_room_inventory_view"
            referencedColumns: ["id", "camp_id"]
          },
        ]
      }
      vip_preparation_items: {
        Row: {
          checklist_id: string
          completed_at: string | null
          completed_by: string | null
          id: string
          is_completed: boolean
          item_key: string
          label: string
          note: string | null
        }
        Insert: {
          checklist_id: string
          completed_at?: string | null
          completed_by?: string | null
          id?: string
          is_completed?: boolean
          item_key: string
          label: string
          note?: string | null
        }
        Update: {
          checklist_id?: string
          completed_at?: string | null
          completed_by?: string | null
          id?: string
          is_completed?: boolean
          item_key?: string
          label?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vip_preparation_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "vip_preparation_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vip_preparation_items_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vip_preparation_items_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      active_field_absences_view: {
        Row: {
          actual_return_at: string | null
          camp_id: string | null
          camp_name: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string | null
          created_by: string | null
          days_away: number | null
          days_until_return: number | null
          departure_at: string | null
          destination: string | null
          expected_return_at: string | null
          field_absence_id: string | null
          guest_category: Database["public"]["Enums"]["guest_category"] | null
          guest_department_or_project: string | null
          guest_email: string | null
          guest_id: string | null
          guest_is_vip: boolean | null
          guest_name: string | null
          guest_nationality: string | null
          guest_organization: string | null
          guest_phone: string | null
          is_overdue: boolean | null
          notes: string | null
          reason: string | null
          return_notes: string | null
          returned_at: string | null
          returned_by: string | null
          room_id: string | null
          room_number: string | null
          status: Database["public"]["Enums"]["field_absence_status"] | null
          stay_checked_in_at: string | null
          stay_checked_out_at: string | null
          stay_expected_arrival_at: string | null
          stay_expected_departure_at: string | null
          stay_id: string | null
          stay_status: Database["public"]["Enums"]["stay_status"] | null
          updated_at: string | null
          updated_by: string | null
        }
        Relationships: [
          {
            foreignKeyName: "field_absences_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "field_absences_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["current_guest_id"]
          },
          {
            foreignKeyName: "field_absences_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "safe_guest_directory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "sensitive_guest_operations_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_returned_by_fkey"
            columns: ["returned_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_returned_by_fkey"
            columns: ["returned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "field_absences_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "safe_room_inventory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "sensitive_room_inventory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "departures_today_view"
            referencedColumns: ["stay_id"]
          },
          {
            foreignKeyName: "field_absences_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "manager_current_guests_view"
            referencedColumns: ["stay_id"]
          },
          {
            foreignKeyName: "field_absences_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["current_stay_id"]
          },
          {
            foreignKeyName: "field_absences_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "safe_current_stays_view"
            referencedColumns: ["stay_id"]
          },
          {
            foreignKeyName: "field_absences_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "stays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      active_security_presence: {
        Row: {
          camp_id: string | null
          camp_name: string | null
          clearance_status: string | null
          entry_at: string | null
          exit_at: string | null
          full_name: string | null
          guest_category: Database["public"]["Enums"]["guest_category"] | null
          guest_id: string | null
          host_department: string | null
          host_name: string | null
          last_seen_at: string | null
          nationality: string | null
          organization: string | null
          phone: string | null
          purpose: string | null
          security_event_id: string | null
          sent_to_reception_at: string | null
          visit_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_clearance_events_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_clearance_events_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "security_clearance_events_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_clearance_events_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["current_guest_id"]
          },
          {
            foreignKeyName: "security_clearance_events_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "safe_guest_directory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_clearance_events_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "sensitive_guest_operations_view"
            referencedColumns: ["id"]
          },
        ]
      }
      arrivals_today_view: {
        Row: {
          camp_id: string | null
          expected_arrival_at: string | null
          guest_category: Database["public"]["Enums"]["guest_category"] | null
          guest_id: string | null
          guest_name: string | null
          is_vip: boolean | null
          organization: string | null
          reservation_id: string | null
          room_id: string | null
          room_number: string | null
          status: Database["public"]["Enums"]["reservation_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "reservations_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["current_guest_id"]
          },
          {
            foreignKeyName: "reservations_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "safe_guest_directory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "sensitive_guest_operations_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["room_id", "camp_id"]
          },
          {
            foreignKeyName: "reservations_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "reservations_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "safe_room_inventory_view"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "reservations_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "sensitive_room_inventory_view"
            referencedColumns: ["id", "camp_id"]
          },
        ]
      }
      current_occupancy_view: {
        Row: {
          camp_id: string | null
          camp_name: string | null
          occupancy_rate: number | null
          occupied_rooms: number | null
          pending_checkout_rooms: number | null
          reserved_rooms: number | null
          total_rooms: number | null
          unavailable_rooms: number | null
          vacant_ready_rooms: number | null
        }
        Relationships: []
      }
      departures_today_view: {
        Row: {
          camp_id: string | null
          expected_departure_at: string | null
          guest_category: Database["public"]["Enums"]["guest_category"] | null
          guest_id: string | null
          guest_name: string | null
          is_vip: boolean | null
          organization: string | null
          room_id: string | null
          room_number: string | null
          status: Database["public"]["Enums"]["stay_status"] | null
          stay_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stays_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stays_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "stays_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stays_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["current_guest_id"]
          },
          {
            foreignKeyName: "stays_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "safe_guest_directory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stays_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "sensitive_guest_operations_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stays_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["room_id", "camp_id"]
          },
          {
            foreignKeyName: "stays_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "stays_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "safe_room_inventory_view"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "stays_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "sensitive_room_inventory_view"
            referencedColumns: ["id", "camp_id"]
          },
        ]
      }
      expected_arrivals_today_view: {
        Row: {
          allocated_allocation_id: string | null
          allocated_at: string | null
          allocated_by: string | null
          allocated_room_id: string | null
          allocated_room_number: string | null
          allocated_stay_id: string | null
          camp_id: string | null
          camp_name: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string | null
          created_by: string | null
          days_until_arrival: number | null
          expected_arrival_at: string | null
          expected_arrival_id: string | null
          expected_departure_at: string | null
          guest_category: Database["public"]["Enums"]["guest_category"] | null
          guest_department_or_project: string | null
          guest_email: string | null
          guest_id: string | null
          guest_is_vip: boolean | null
          guest_name: string | null
          guest_nationality: string | null
          guest_organization: string | null
          guest_phone: string | null
          host_department: string | null
          host_name: string | null
          is_overdue: boolean | null
          no_show_at: string | null
          no_show_by: string | null
          no_show_reason: string | null
          notes: string | null
          purpose: string | null
          status: Database["public"]["Enums"]["expected_arrival_status"] | null
          updated_at: string | null
          updated_by: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expected_arrivals_allocated_allocation_id_fkey"
            columns: ["allocated_allocation_id"]
            isOneToOne: false
            referencedRelation: "room_allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_allocated_by_fkey"
            columns: ["allocated_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_allocated_by_fkey"
            columns: ["allocated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_allocated_room_id_fkey"
            columns: ["allocated_room_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "expected_arrivals_allocated_room_id_fkey"
            columns: ["allocated_room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_allocated_room_id_fkey"
            columns: ["allocated_room_id"]
            isOneToOne: false
            referencedRelation: "safe_room_inventory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_allocated_room_id_fkey"
            columns: ["allocated_room_id"]
            isOneToOne: false
            referencedRelation: "sensitive_room_inventory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_allocated_stay_id_fkey"
            columns: ["allocated_stay_id"]
            isOneToOne: false
            referencedRelation: "departures_today_view"
            referencedColumns: ["stay_id"]
          },
          {
            foreignKeyName: "expected_arrivals_allocated_stay_id_fkey"
            columns: ["allocated_stay_id"]
            isOneToOne: false
            referencedRelation: "manager_current_guests_view"
            referencedColumns: ["stay_id"]
          },
          {
            foreignKeyName: "expected_arrivals_allocated_stay_id_fkey"
            columns: ["allocated_stay_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["current_stay_id"]
          },
          {
            foreignKeyName: "expected_arrivals_allocated_stay_id_fkey"
            columns: ["allocated_stay_id"]
            isOneToOne: false
            referencedRelation: "safe_current_stays_view"
            referencedColumns: ["stay_id"]
          },
          {
            foreignKeyName: "expected_arrivals_allocated_stay_id_fkey"
            columns: ["allocated_stay_id"]
            isOneToOne: false
            referencedRelation: "stays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "expected_arrivals_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["current_guest_id"]
          },
          {
            foreignKeyName: "expected_arrivals_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "safe_guest_directory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "sensitive_guest_operations_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_no_show_by_fkey"
            columns: ["no_show_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_no_show_by_fkey"
            columns: ["no_show_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expected_arrivals_view: {
        Row: {
          allocated_allocation_id: string | null
          allocated_at: string | null
          allocated_by: string | null
          allocated_room_id: string | null
          allocated_room_number: string | null
          allocated_stay_id: string | null
          camp_id: string | null
          camp_name: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string | null
          created_by: string | null
          days_until_arrival: number | null
          expected_arrival_at: string | null
          expected_arrival_id: string | null
          expected_departure_at: string | null
          guest_category: Database["public"]["Enums"]["guest_category"] | null
          guest_department_or_project: string | null
          guest_email: string | null
          guest_id: string | null
          guest_is_vip: boolean | null
          guest_name: string | null
          guest_nationality: string | null
          guest_organization: string | null
          guest_phone: string | null
          host_department: string | null
          host_name: string | null
          is_overdue: boolean | null
          no_show_at: string | null
          no_show_by: string | null
          no_show_reason: string | null
          notes: string | null
          purpose: string | null
          status: Database["public"]["Enums"]["expected_arrival_status"] | null
          updated_at: string | null
          updated_by: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expected_arrivals_allocated_allocation_id_fkey"
            columns: ["allocated_allocation_id"]
            isOneToOne: false
            referencedRelation: "room_allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_allocated_by_fkey"
            columns: ["allocated_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_allocated_by_fkey"
            columns: ["allocated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_allocated_room_id_fkey"
            columns: ["allocated_room_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "expected_arrivals_allocated_room_id_fkey"
            columns: ["allocated_room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_allocated_room_id_fkey"
            columns: ["allocated_room_id"]
            isOneToOne: false
            referencedRelation: "safe_room_inventory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_allocated_room_id_fkey"
            columns: ["allocated_room_id"]
            isOneToOne: false
            referencedRelation: "sensitive_room_inventory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_allocated_stay_id_fkey"
            columns: ["allocated_stay_id"]
            isOneToOne: false
            referencedRelation: "departures_today_view"
            referencedColumns: ["stay_id"]
          },
          {
            foreignKeyName: "expected_arrivals_allocated_stay_id_fkey"
            columns: ["allocated_stay_id"]
            isOneToOne: false
            referencedRelation: "manager_current_guests_view"
            referencedColumns: ["stay_id"]
          },
          {
            foreignKeyName: "expected_arrivals_allocated_stay_id_fkey"
            columns: ["allocated_stay_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["current_stay_id"]
          },
          {
            foreignKeyName: "expected_arrivals_allocated_stay_id_fkey"
            columns: ["allocated_stay_id"]
            isOneToOne: false
            referencedRelation: "safe_current_stays_view"
            referencedColumns: ["stay_id"]
          },
          {
            foreignKeyName: "expected_arrivals_allocated_stay_id_fkey"
            columns: ["allocated_stay_id"]
            isOneToOne: false
            referencedRelation: "stays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "expected_arrivals_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["current_guest_id"]
          },
          {
            foreignKeyName: "expected_arrivals_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "safe_guest_directory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "sensitive_guest_operations_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_no_show_by_fkey"
            columns: ["no_show_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_no_show_by_fkey"
            columns: ["no_show_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_arrivals_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      field_absences_view: {
        Row: {
          actual_return_at: string | null
          camp_id: string | null
          camp_name: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string | null
          created_by: string | null
          days_away: number | null
          days_until_return: number | null
          departure_at: string | null
          destination: string | null
          expected_return_at: string | null
          field_absence_id: string | null
          guest_category: Database["public"]["Enums"]["guest_category"] | null
          guest_department_or_project: string | null
          guest_email: string | null
          guest_id: string | null
          guest_is_vip: boolean | null
          guest_name: string | null
          guest_nationality: string | null
          guest_organization: string | null
          guest_phone: string | null
          is_overdue: boolean | null
          notes: string | null
          reason: string | null
          return_notes: string | null
          returned_at: string | null
          returned_by: string | null
          room_id: string | null
          room_number: string | null
          status: Database["public"]["Enums"]["field_absence_status"] | null
          stay_checked_in_at: string | null
          stay_checked_out_at: string | null
          stay_expected_arrival_at: string | null
          stay_expected_departure_at: string | null
          stay_id: string | null
          stay_status: Database["public"]["Enums"]["stay_status"] | null
          updated_at: string | null
          updated_by: string | null
        }
        Relationships: [
          {
            foreignKeyName: "field_absences_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "field_absences_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["current_guest_id"]
          },
          {
            foreignKeyName: "field_absences_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "safe_guest_directory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "sensitive_guest_operations_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_returned_by_fkey"
            columns: ["returned_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_returned_by_fkey"
            columns: ["returned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "field_absences_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "safe_room_inventory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "sensitive_room_inventory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "departures_today_view"
            referencedColumns: ["stay_id"]
          },
          {
            foreignKeyName: "field_absences_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "manager_current_guests_view"
            referencedColumns: ["stay_id"]
          },
          {
            foreignKeyName: "field_absences_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["current_stay_id"]
          },
          {
            foreignKeyName: "field_absences_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "safe_current_stays_view"
            referencedColumns: ["stay_id"]
          },
          {
            foreignKeyName: "field_absences_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "stays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_absences_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      latest_security_movement_view: {
        Row: {
          camp_id: string | null
          clearance_status: string | null
          entry_at: string | null
          exit_at: string | null
          guest_id: string | null
          host_department: string | null
          host_name: string | null
          last_security_movement_at: string | null
          last_seen_at: string | null
          purpose: string | null
          security_event_id: string | null
          sent_to_reception_at: string | null
          visit_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_clearance_events_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_clearance_events_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "security_clearance_events_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_clearance_events_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["current_guest_id"]
          },
          {
            foreignKeyName: "security_clearance_events_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "safe_guest_directory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_clearance_events_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "sensitive_guest_operations_view"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_current_guests_view: {
        Row: {
          arrival_time: string | null
          camp_id: string | null
          camp_name: string | null
          expected_departure_at: string | null
          guest_category: Database["public"]["Enums"]["guest_category"] | null
          guest_id: string | null
          guest_name: string | null
          is_vip: boolean | null
          organization: string | null
          room_id: string | null
          room_number: string | null
          security_entry_at: string | null
          security_event_id: string | null
          security_exit_at: string | null
          security_last_seen_at: string | null
          security_presence_status: string | null
          stay_id: string | null
          stay_status: Database["public"]["Enums"]["stay_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "stays_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stays_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "stays_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stays_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["current_guest_id"]
          },
          {
            foreignKeyName: "stays_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "safe_guest_directory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stays_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "sensitive_guest_operations_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stays_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["room_id", "camp_id"]
          },
          {
            foreignKeyName: "stays_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "stays_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "safe_room_inventory_view"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "stays_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "sensitive_room_inventory_view"
            referencedColumns: ["id", "camp_id"]
          },
        ]
      }
      manager_exited_guests_view: {
        Row: {
          camp_id: string | null
          checked_in_at: string | null
          checked_out_at: string | null
          departure_or_exit_time: string | null
          exit_source: string | null
          guest_category: Database["public"]["Enums"]["guest_category"] | null
          guest_id: string | null
          guest_name: string | null
          organization: string | null
          room_id: string | null
          room_number: string | null
          security_exit_at: string | null
          stay_id: string | null
          stay_status: Database["public"]["Enums"]["stay_status"] | null
        }
        Relationships: []
      }
      manager_room_summary_view: {
        Row: {
          available_rooms: number | null
          camp_id: string | null
          camp_name: string | null
          manager_hold_rooms: number | null
          occupied_rooms: number | null
          out_of_service_rooms: number | null
          pending_check_in_rooms: number | null
          pending_checkout_rooms: number | null
          reserved_rooms: number | null
          total_rooms: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
        ]
      }
      my_profile_view: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"] | null
          created_at: string | null
          department: string | null
          email: string | null
          force_password_change: boolean | null
          full_name: string | null
          id: string | null
          job_title: string | null
          last_login_at: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"] | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          force_password_change?: boolean | null
          full_name?: string | null
          id?: string | null
          job_title?: string | null
          last_login_at?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"] | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          force_password_change?: boolean | null
          full_name?: string | null
          id?: string | null
          job_title?: string | null
          last_login_at?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pending_reception_handoffs: {
        Row: {
          camp_id: string | null
          camp_name: string | null
          clearance_status: string | null
          created_at: string | null
          guest_document_number: string | null
          guest_full_name: string | null
          guest_id: string | null
          guest_nationality: string | null
          guest_phone: string | null
          host_department: string | null
          host_name: string | null
          note: string | null
          notes: string | null
          purpose: string | null
          reception_status: string | null
          risk_level: string | null
          security_event_id: string | null
          sent_to_reception_at: string | null
          sent_to_reception_by: string | null
          visit_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_clearance_events_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_clearance_events_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "security_clearance_events_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_clearance_events_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["current_guest_id"]
          },
          {
            foreignKeyName: "security_clearance_events_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "safe_guest_directory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_clearance_events_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "sensitive_guest_operations_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_clearance_events_sent_to_reception_by_fkey"
            columns: ["sent_to_reception_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_clearance_events_sent_to_reception_by_fkey"
            columns: ["sent_to_reception_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      room_board_view: {
        Row: {
          active_field_absence_id: string | null
          building_id: string | null
          building_name: string | null
          camp_id: string | null
          camp_name: string | null
          capacity: number | null
          condition_status:
            | Database["public"]["Enums"]["room_condition_status"]
            | null
          current_guest_id: string | null
          current_guest_name: string | null
          current_status: Database["public"]["Enums"]["room_status"] | null
          current_stay_id: string | null
          expected_departure_at: string | null
          field_absence_actual_return_at: string | null
          field_absence_days_away: number | null
          field_absence_days_until_return: number | null
          field_absence_departure_at: string | null
          field_absence_destination: string | null
          field_absence_expected_return_at: string | null
          field_absence_is_overdue: boolean | null
          field_absence_reason: string | null
          field_absence_status:
            | Database["public"]["Enums"]["field_absence_status"]
            | null
          is_delegate_suitable: boolean | null
          is_field_absent: boolean | null
          is_vip: boolean | null
          room_id: string | null
          room_number: string | null
          room_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_building_same_camp"
            columns: ["building_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "rooms_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
        ]
      }
      safe_current_stays_view: {
        Row: {
          camp_id: string | null
          camp_name: string | null
          checked_in_at: string | null
          checked_out_at: string | null
          created_at: string | null
          expected_arrival_at: string | null
          expected_departure_at: string | null
          guest_category: Database["public"]["Enums"]["guest_category"] | null
          guest_id: string | null
          guest_name: string | null
          is_vip: boolean | null
          organization: string | null
          reservation_id: string | null
          room_id: string | null
          room_number: string | null
          status: Database["public"]["Enums"]["stay_status"] | null
          stay_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stays_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stays_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "stays_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stays_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["current_guest_id"]
          },
          {
            foreignKeyName: "stays_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "safe_guest_directory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stays_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "sensitive_guest_operations_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stays_reservation_same_camp"
            columns: ["reservation_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "arrivals_today_view"
            referencedColumns: ["reservation_id", "camp_id"]
          },
          {
            foreignKeyName: "stays_reservation_same_camp"
            columns: ["reservation_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "stays_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["room_id", "camp_id"]
          },
          {
            foreignKeyName: "stays_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "stays_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "safe_room_inventory_view"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "stays_room_same_camp"
            columns: ["room_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "sensitive_room_inventory_view"
            referencedColumns: ["id", "camp_id"]
          },
        ]
      }
      safe_guest_directory_view: {
        Row: {
          archived_at: string | null
          created_at: string | null
          department_or_project: string | null
          full_name: string | null
          gender: string | null
          guest_category: Database["public"]["Enums"]["guest_category"] | null
          id: string | null
          is_vip: boolean | null
          nationality: string | null
          organization: string | null
          primary_camp_id: string | null
          security_clearance_status: string | null
          updated_at: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string | null
          department_or_project?: string | null
          full_name?: string | null
          gender?: string | null
          guest_category?: Database["public"]["Enums"]["guest_category"] | null
          id?: string | null
          is_vip?: boolean | null
          nationality?: string | null
          organization?: string | null
          primary_camp_id?: string | null
          security_clearance_status?: string | null
          updated_at?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string | null
          department_or_project?: string | null
          full_name?: string | null
          gender?: string | null
          guest_category?: Database["public"]["Enums"]["guest_category"] | null
          id?: string | null
          is_vip?: boolean | null
          nationality?: string | null
          organization?: string | null
          primary_camp_id?: string | null
          security_clearance_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guests_primary_camp_id_fkey"
            columns: ["primary_camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guests_primary_camp_id_fkey"
            columns: ["primary_camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
        ]
      }
      safe_room_inventory_view: {
        Row: {
          bed_type: string | null
          building_id: string | null
          building_name: string | null
          camp_id: string | null
          camp_name: string | null
          capacity: number | null
          condition_status:
            | Database["public"]["Enums"]["room_condition_status"]
            | null
          created_at: string | null
          current_status: Database["public"]["Enums"]["room_status"] | null
          decommissioned_at: string | null
          floor_label: string | null
          gender_restriction: string | null
          id: string | null
          is_delegate_suitable: boolean | null
          is_vip: boolean | null
          notes: string | null
          room_number: string | null
          room_type: string | null
          room_type_id: string | null
          section_label: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_building_same_camp"
            columns: ["building_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "rooms_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "rooms_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      security_reception_handoff_status_view: {
        Row: {
          camp_code: string | null
          camp_id: string | null
          camp_name: string | null
          clearance_status: string | null
          created_at: string | null
          guest_document_number: string | null
          guest_full_name: string | null
          guest_id: string | null
          guest_phone: string | null
          host_department: string | null
          host_name: string | null
          purpose: string | null
          reception_notes: string | null
          reception_received_at: string | null
          reception_received_by: string | null
          reception_status: string | null
          reception_status_label: string | null
          related_reservation_id: string | null
          related_stay_id: string | null
          risk_level: string | null
          security_event_id: string | null
          sent_to_reception_at: string | null
          sent_to_reception_by: string | null
          updated_at: string | null
          visit_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_clearance_events_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_clearance_events_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "security_clearance_events_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_clearance_events_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "room_board_view"
            referencedColumns: ["current_guest_id"]
          },
          {
            foreignKeyName: "security_clearance_events_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "safe_guest_directory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_clearance_events_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "sensitive_guest_operations_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_clearance_events_reception_received_by_fkey"
            columns: ["reception_received_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_clearance_events_reception_received_by_fkey"
            columns: ["reception_received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_clearance_events_sent_to_reception_by_fkey"
            columns: ["sent_to_reception_by"]
            isOneToOne: false
            referencedRelation: "my_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_clearance_events_sent_to_reception_by_fkey"
            columns: ["sent_to_reception_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sensitive_guest_operations_view: {
        Row: {
          archived_at: string | null
          created_at: string | null
          department_or_project: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string | null
          gender: string | null
          guest_category: Database["public"]["Enums"]["guest_category"] | null
          id: string | null
          id_or_passport_number: string | null
          is_vip: boolean | null
          manager_notes: string | null
          nationality: string | null
          notes: string | null
          organization: string | null
          phone: string | null
          primary_camp_id: string | null
          security_clearance_status: string | null
          updated_at: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string | null
          department_or_project?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string | null
          gender?: string | null
          guest_category?: Database["public"]["Enums"]["guest_category"] | null
          id?: string | null
          id_or_passport_number?: string | null
          is_vip?: boolean | null
          manager_notes?: string | null
          nationality?: string | null
          notes?: string | null
          organization?: string | null
          phone?: string | null
          primary_camp_id?: string | null
          security_clearance_status?: string | null
          updated_at?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string | null
          department_or_project?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string | null
          gender?: string | null
          guest_category?: Database["public"]["Enums"]["guest_category"] | null
          id?: string | null
          id_or_passport_number?: string | null
          is_vip?: boolean | null
          manager_notes?: string | null
          nationality?: string | null
          notes?: string | null
          organization?: string | null
          phone?: string | null
          primary_camp_id?: string | null
          security_clearance_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guests_primary_camp_id_fkey"
            columns: ["primary_camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guests_primary_camp_id_fkey"
            columns: ["primary_camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
        ]
      }
      sensitive_room_inventory_view: {
        Row: {
          bed_type: string | null
          building_id: string | null
          building_name: string | null
          camp_id: string | null
          camp_name: string | null
          capacity: number | null
          condition_status:
            | Database["public"]["Enums"]["room_condition_status"]
            | null
          created_at: string | null
          current_status: Database["public"]["Enums"]["room_status"] | null
          decommissioned_at: string | null
          floor_label: string | null
          gender_restriction: string | null
          id: string | null
          is_delegate_suitable: boolean | null
          is_vip: boolean | null
          notes: string | null
          photo_paths: Json | null
          room_number: string | null
          room_type: string | null
          room_type_id: string | null
          section_label: string | null
          sensitive_notes: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_building_same_camp"
            columns: ["building_id", "camp_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id", "camp_id"]
          },
          {
            foreignKeyName: "rooms_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "current_occupancy_view"
            referencedColumns: ["camp_id"]
          },
          {
            foreignKeyName: "rooms_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      allocate_expected_arrival: {
        Args: {
          p_expected_arrival_id: string
          p_expected_departure_at?: string
          p_notes?: string
          p_room_id: string
        }
        Returns: {
          allocated_allocation_id: string | null
          allocated_at: string | null
          allocated_by: string | null
          allocated_room_id: string | null
          allocated_stay_id: string | null
          camp_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          expected_arrival_at: string
          expected_departure_at: string | null
          guest_id: string | null
          host_department: string | null
          host_name: string | null
          id: string
          no_show_at: string | null
          no_show_by: string | null
          no_show_reason: string | null
          notes: string | null
          purpose: string | null
          status: Database["public"]["Enums"]["expected_arrival_status"]
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "expected_arrivals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      allocate_room: {
        Args: {
          p_expected_arrival_at: string
          p_expected_departure_at: string
          p_guest_id: string
          p_notes?: string
          p_room_id: string
        }
        Returns: {
          allocated_at: string
          allocated_by: string | null
          allocation_notes: string | null
          camp_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          guest_id: string
          id: string
          reservation_id: string | null
          room_id: string
          status: Database["public"]["Enums"]["allocation_status"]
          stay_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "room_allocations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      apply_data_import_batch: { Args: { p_batch_id: string }; Returns: Json }
      approve_room_transfer: {
        Args: { p_note?: string; p_transfer_id: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          camp_id: string
          cancelled_at: string | null
          executed_at: string | null
          executed_by: string | null
          guest_id: string
          id: string
          new_room_id: string
          old_room_id: string
          reason: string
          requested_at: string
          requested_by: string | null
          status: Database["public"]["Enums"]["transfer_status"]
          stay_id: string
        }
        SetofOptions: {
          from: "*"
          to: "room_transfers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      approve_vip_readiness: {
        Args: { p_checklist_id: string; p_note?: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          camp_id: string
          created_at: string
          created_by: string | null
          group_id: string | null
          guest_id: string | null
          id: string
          notes: string | null
          room_id: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "vip_preparation_checklists"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      archive_notification: {
        Args: { p_notification_id: string }
        Returns: string
      }
      assign_housekeeping_task: {
        Args: { p_assigned_to: string; p_note?: string; p_task_id: string }
        Returns: {
          assigned_by: string | null
          assigned_to: string | null
          camp_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          failed_reason: string | null
          id: string
          notes: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          room_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["housekeeping_task_status"]
          stay_id: string | null
          task_type: string
          updated_at: string
          updated_by: string | null
          verified_at: string | null
          verified_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "housekeeping_tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assign_maintenance_ticket: {
        Args: { p_assigned_to: string; p_note?: string; p_ticket_id: string }
        Returns: {
          assigned_by: string | null
          assigned_to: string | null
          camp_id: string
          closed_at: string | null
          created_at: string
          description: string
          id: string
          is_room_blocking: boolean
          issue_type: string
          priority: Database["public"]["Enums"]["maintenance_priority"]
          reopened_at: string | null
          reported_by: string | null
          resolved_at: string | null
          room_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["maintenance_ticket_status"]
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "maintenance_tickets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assign_room_service_task: {
        Args: { p_assigned_to: string; p_note?: string; p_task_id: string }
        Returns: string
      }
      cancel_expected_arrival: {
        Args: { p_expected_arrival_id: string; p_reason?: string }
        Returns: {
          allocated_allocation_id: string | null
          allocated_at: string | null
          allocated_by: string | null
          allocated_room_id: string | null
          allocated_stay_id: string | null
          camp_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          expected_arrival_at: string
          expected_departure_at: string | null
          guest_id: string | null
          host_department: string | null
          host_name: string | null
          id: string
          no_show_at: string | null
          no_show_by: string | null
          no_show_reason: string | null
          notes: string | null
          purpose: string | null
          status: Database["public"]["Enums"]["expected_arrival_status"]
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "expected_arrivals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_field_absence: {
        Args: { p_field_absence_id: string; p_reason?: string }
        Returns: {
          actual_return_at: string | null
          camp_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          departure_at: string
          destination: string | null
          expected_return_at: string
          guest_id: string
          id: string
          notes: string | null
          reason: string | null
          return_notes: string | null
          returned_at: string | null
          returned_by: string | null
          room_id: string
          status: Database["public"]["Enums"]["field_absence_status"]
          stay_id: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "field_absences"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_reservation: {
        Args: { p_reason: string; p_reservation_id: string }
        Returns: {
          camp_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          expected_arrival_at: string
          expected_departure_at: string
          group_id: string | null
          guest_id: string | null
          id: string
          is_vip_hold: boolean
          notes: string | null
          room_id: string
          status: Database["public"]["Enums"]["reservation_status"]
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "reservations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_room_service_task: {
        Args: { p_reason: string; p_task_id: string }
        Returns: string
      }
      change_room_status: {
        Args: {
          p_new_status: Database["public"]["Enums"]["room_status"]
          p_reason: string
          p_room_id: string
        }
        Returns: {
          bed_type: string | null
          building_id: string
          camp_id: string
          capacity: number
          condition_status: Database["public"]["Enums"]["room_condition_status"]
          created_at: string
          created_by: string | null
          current_status: Database["public"]["Enums"]["room_status"]
          decommissioned_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          floor_label: string | null
          gender_restriction: string | null
          id: string
          is_delegate_suitable: boolean
          is_vip: boolean
          last_cleaned_at: string | null
          last_inspected_at: string | null
          last_maintenance_at: string | null
          notes: string | null
          photo_paths: Json
          room_number: string
          room_number_norm: string | null
          room_type_id: string
          section_label: string | null
          sensitive_notes: string | null
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "rooms"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      check_in_reservation: {
        Args: {
          p_key_card_id?: string
          p_notes?: string
          p_reservation_id: string
        }
        Returns: {
          camp_id: string
          checked_in_at: string | null
          checked_out_at: string | null
          checkin_notes: string | null
          checkout_notes: string | null
          created_at: string
          created_by: string | null
          expected_arrival_at: string | null
          expected_departure_at: string | null
          guest_id: string
          id: string
          reservation_id: string | null
          room_id: string
          status: Database["public"]["Enums"]["stay_status"]
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "stays"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      check_in_stay: {
        Args: { p_key_card_id?: string; p_notes?: string; p_stay_id: string }
        Returns: {
          camp_id: string
          checked_in_at: string | null
          checked_out_at: string | null
          checkin_notes: string | null
          checkout_notes: string | null
          created_at: string
          created_by: string | null
          expected_arrival_at: string | null
          expected_departure_at: string | null
          guest_id: string
          id: string
          reservation_id: string | null
          room_id: string
          status: Database["public"]["Enums"]["stay_status"]
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "stays"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      check_out_stay: {
        Args: {
          p_damage_or_loss_notes?: string
          p_key_cards_returned?: boolean
          p_notes?: string
          p_stay_id: string
        }
        Returns: {
          camp_id: string
          checked_in_at: string | null
          checked_out_at: string | null
          checkin_notes: string | null
          checkout_notes: string | null
          created_at: string
          created_by: string | null
          expected_arrival_at: string | null
          expected_departure_at: string | null
          guest_id: string
          id: string
          reservation_id: string | null
          room_id: string
          status: Database["public"]["Enums"]["stay_status"]
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "stays"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_data_import_batch: {
        Args: { p_batch_id: string }
        Returns: string
      }
      complete_export_job: {
        Args: {
          p_export_job_id: string
          p_row_count: number
          p_storage_bucket: string
          p_storage_path: string
        }
        Returns: string
      }
      complete_housekeeping_task: {
        Args: { p_completed_items: Json; p_notes?: string; p_task_id: string }
        Returns: {
          assigned_by: string | null
          assigned_to: string | null
          camp_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          failed_reason: string | null
          id: string
          notes: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          room_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["housekeeping_task_status"]
          stay_id: string | null
          task_type: string
          updated_at: string
          updated_by: string | null
          verified_at: string | null
          verified_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "housekeeping_tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_inspection: {
        Args: {
          p_inspection_id: string
          p_items: Json
          p_note?: string
          p_passed: boolean
        }
        Returns: {
          camp_id: string
          created_at: string
          created_by: string | null
          failed_reason: string | null
          id: string
          inspected_at: string | null
          inspected_by: string | null
          inspection_type: string
          related_housekeeping_task_id: string | null
          related_maintenance_ticket_id: string | null
          room_id: string
          status: Database["public"]["Enums"]["inspection_status"]
        }
        SetofOptions: {
          from: "*"
          to: "inspections"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_room_service_task: {
        Args: { p_note?: string; p_task_id: string }
        Returns: {
          assigned_by: string | null
          assigned_to: string | null
          camp_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          due_at: string | null
          id: string
          notes: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          room_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["room_service_task_status"]
          stay_id: string | null
          task_type: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "room_service_tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_data_import_batch: {
        Args: {
          p_camp_id: string
          p_import_type: string
          p_mime_type: string
          p_original_filename: string
          p_size_bytes: number
          p_storage_bucket: string
          p_storage_path: string
        }
        Returns: string
      }
      create_expected_arrival: {
        Args: {
          p_camp_id: string
          p_expected_arrival_at: string
          p_expected_departure_at?: string
          p_guest_id: string
          p_host_department?: string
          p_host_name?: string
          p_notes?: string
          p_purpose?: string
        }
        Returns: {
          allocated_allocation_id: string | null
          allocated_at: string | null
          allocated_by: string | null
          allocated_room_id: string | null
          allocated_stay_id: string | null
          camp_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          expected_arrival_at: string
          expected_departure_at: string | null
          guest_id: string | null
          host_department: string | null
          host_name: string | null
          id: string
          no_show_at: string | null
          no_show_by: string | null
          no_show_reason: string | null
          notes: string | null
          purpose: string | null
          status: Database["public"]["Enums"]["expected_arrival_status"]
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "expected_arrivals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_expected_arrival_with_guest: {
        Args: {
          p_camp_id: string
          p_department_or_project?: string
          p_email?: string
          p_expected_arrival_at: string
          p_expected_departure_at?: string
          p_full_name: string
          p_gender?: string
          p_guest_category: Database["public"]["Enums"]["guest_category"]
          p_host_department?: string
          p_host_name?: string
          p_id_or_passport_number?: string
          p_nationality?: string
          p_notes?: string
          p_organization?: string
          p_phone?: string
          p_purpose?: string
        }
        Returns: {
          allocated_allocation_id: string | null
          allocated_at: string | null
          allocated_by: string | null
          allocated_room_id: string | null
          allocated_stay_id: string | null
          camp_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          expected_arrival_at: string
          expected_departure_at: string | null
          guest_id: string | null
          host_department: string | null
          host_name: string | null
          id: string
          no_show_at: string | null
          no_show_by: string | null
          no_show_reason: string | null
          notes: string | null
          purpose: string | null
          status: Database["public"]["Enums"]["expected_arrival_status"]
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "expected_arrivals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_export_job: {
        Args: {
          p_camp_id?: string
          p_date_from?: string
          p_date_to?: string
          p_export_format: string
          p_report_type: string
        }
        Returns: string
      }
      create_field_absence: {
        Args: {
          p_departure_at: string
          p_destination?: string
          p_expected_return_at: string
          p_notes?: string
          p_reason?: string
          p_stay_id: string
        }
        Returns: {
          actual_return_at: string | null
          camp_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          departure_at: string
          destination: string | null
          expected_return_at: string
          guest_id: string
          id: string
          notes: string | null
          reason: string | null
          return_notes: string | null
          returned_at: string | null
          returned_by: string | null
          room_id: string
          status: Database["public"]["Enums"]["field_absence_status"]
          stay_id: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "field_absences"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_housekeeping_task: {
        Args: {
          p_assigned_to?: string
          p_notes?: string
          p_priority?: Database["public"]["Enums"]["task_priority"]
          p_room_id: string
          p_task_type: string
        }
        Returns: {
          assigned_by: string | null
          assigned_to: string | null
          camp_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          failed_reason: string | null
          id: string
          notes: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          room_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["housekeeping_task_status"]
          stay_id: string | null
          task_type: string
          updated_at: string
          updated_by: string | null
          verified_at: string | null
          verified_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "housekeeping_tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_internal_notification: {
        Args: {
          p_action_href?: string
          p_body: string
          p_camp_id: string
          p_category?: string
          p_entity_id?: string
          p_entity_type?: string
          p_recipient_id: string
          p_severity?: string
          p_title: string
        }
        Returns: string
      }
      create_key_card: {
        Args: {
          p_camp_id: string
          p_card_number?: string
          p_key_code?: string
          p_notes?: string
          p_room_id?: string
        }
        Returns: {
          camp_id: string
          card_number: string | null
          created_at: string
          id: string
          issued_at: string | null
          issued_by: string | null
          issued_for_stay_id: string | null
          issued_to_guest_id: string | null
          key_code: string | null
          notes: string | null
          returned_at: string | null
          returned_by: string | null
          room_id: string | null
          status: Database["public"]["Enums"]["key_card_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "keys_access_cards"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_maintenance_ticket: {
        Args: {
          p_description: string
          p_is_room_blocking?: boolean
          p_issue_type: string
          p_priority: Database["public"]["Enums"]["maintenance_priority"]
          p_room_id: string
        }
        Returns: {
          assigned_by: string | null
          assigned_to: string | null
          camp_id: string
          closed_at: string | null
          created_at: string
          description: string
          id: string
          is_room_blocking: boolean
          issue_type: string
          priority: Database["public"]["Enums"]["maintenance_priority"]
          reopened_at: string | null
          reported_by: string | null
          resolved_at: string | null
          room_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["maintenance_ticket_status"]
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "maintenance_tickets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_reservation: {
        Args: {
          p_expected_arrival_at: string
          p_expected_departure_at: string
          p_group_id: string
          p_guest_id: string
          p_is_vip_hold?: boolean
          p_notes?: string
          p_room_id: string
        }
        Returns: {
          camp_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          expected_arrival_at: string
          expected_departure_at: string
          group_id: string | null
          guest_id: string | null
          id: string
          is_vip_hold: boolean
          notes: string | null
          room_id: string
          status: Database["public"]["Enums"]["reservation_status"]
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "reservations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_room_service_task: {
        Args: {
          p_assigned_to?: string
          p_due_at?: string
          p_notes?: string
          p_priority?: Database["public"]["Enums"]["task_priority"]
          p_room_id: string
          p_task_type: string
        }
        Returns: {
          assigned_by: string | null
          assigned_to: string | null
          camp_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          due_at: string | null
          id: string
          notes: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          room_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["room_service_task_status"]
          stay_id: string | null
          task_type: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "room_service_tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_security_clearance_event: {
        Args: {
          p_expires_at?: string
          p_guest_id: string
          p_new_status: string
          p_notes: string
          p_risk_level: string
        }
        Returns: string
      }
      create_vip_preparation_checklist: {
        Args: {
          p_group_id: string
          p_guest_id: string
          p_notes?: string
          p_room_id: string
        }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          camp_id: string
          created_at: string
          created_by: string | null
          group_id: string | null
          guest_id: string | null
          id: string
          notes: string | null
          room_id: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "vip_preparation_checklists"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      execute_room_transfer: {
        Args: { p_note?: string; p_transfer_id: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          camp_id: string
          cancelled_at: string | null
          executed_at: string | null
          executed_by: string | null
          guest_id: string
          id: string
          new_room_id: string
          old_room_id: string
          reason: string
          requested_at: string
          requested_by: string | null
          status: Database["public"]["Enums"]["transfer_status"]
          stay_id: string
        }
        SetofOptions: {
          from: "*"
          to: "room_transfers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      extend_field_absence: {
        Args: {
          p_expected_return_at: string
          p_field_absence_id: string
          p_notes?: string
          p_reason?: string
        }
        Returns: {
          actual_return_at: string | null
          camp_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          departure_at: string
          destination: string | null
          expected_return_at: string
          guest_id: string
          id: string
          notes: string | null
          reason: string | null
          return_notes: string | null
          returned_at: string | null
          returned_by: string | null
          room_id: string
          status: Database["public"]["Enums"]["field_absence_status"]
          stay_id: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "field_absences"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fail_data_import_batch: {
        Args: { p_batch_id: string; p_error_message: string }
        Returns: string
      }
      fail_export_job: {
        Args: { p_error_message: string; p_export_job_id: string }
        Returns: string
      }
      find_possible_guest_matches: {
        Args: {
          p_camp_id?: string
          p_email?: string
          p_full_name?: string
          p_id_or_passport_number?: string
          p_nationality?: string
          p_organization?: string
          p_phone?: string
        }
        Returns: {
          email: string
          full_name: string
          guest_category: Database["public"]["Enums"]["guest_category"]
          guest_id: string
          last_seen_at: string
          match_score: number
          match_type: string
          nationality: string
          organization: string
          phone: string
          primary_camp_id: string
        }[]
      }
      get_current_user_context_snapshot: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_gate_operations_snapshot: {
        Args: { p_camp_ids?: string[]; p_end_at?: string; p_start_at?: string }
        Returns: Json
      }
      get_manager_dashboard_snapshot: {
        Args: {
          p_camp_ids?: string[]
          p_current_guest_limit?: number
          p_exited_guest_limit?: number
          p_now_at?: string
        }
        Returns: Json
      }
      get_reception_dashboard_snapshot: {
        Args: {
          p_camp_ids?: string[]
          p_end_at?: string
          p_now_at?: string
          p_start_at?: string
        }
        Returns: Json
      }
      get_security_dashboard_snapshot: {
        Args: {
          p_camp_ids?: string[]
          p_end_at?: string
          p_now_at?: string
          p_start_at?: string
        }
        Returns: Json
      }
      get_security_review_snapshot: {
        Args: { p_camp_ids?: string[]; p_limit?: number }
        Returns: Json
      }
      hard_delete_invited_user: {
        Args: { p_reason?: string; p_target_user_id: string }
        Returns: undefined
      }
      issue_key_card: {
        Args: { p_key_card_id: string; p_note?: string; p_stay_id: string }
        Returns: {
          camp_id: string
          card_number: string | null
          created_at: string
          id: string
          issued_at: string | null
          issued_by: string | null
          issued_for_stay_id: string | null
          issued_to_guest_id: string | null
          key_code: string | null
          notes: string | null
          returned_at: string | null
          returned_by: string | null
          room_id: string | null
          status: Database["public"]["Enums"]["key_card_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "keys_access_cards"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_all_notifications_read: { Args: never; Returns: number }
      mark_expected_arrival_arrived: {
        Args: { p_expected_arrival_id: string; p_notes?: string }
        Returns: {
          allocated_allocation_id: string | null
          allocated_at: string | null
          allocated_by: string | null
          allocated_room_id: string | null
          allocated_stay_id: string | null
          camp_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          expected_arrival_at: string
          expected_departure_at: string | null
          guest_id: string | null
          host_department: string | null
          host_name: string | null
          id: string
          no_show_at: string | null
          no_show_by: string | null
          no_show_reason: string | null
          notes: string | null
          purpose: string | null
          status: Database["public"]["Enums"]["expected_arrival_status"]
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "expected_arrivals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_expected_arrival_no_show: {
        Args: { p_expected_arrival_id: string; p_reason?: string }
        Returns: {
          allocated_allocation_id: string | null
          allocated_at: string | null
          allocated_by: string | null
          allocated_room_id: string | null
          allocated_stay_id: string | null
          camp_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          expected_arrival_at: string
          expected_departure_at: string | null
          guest_id: string | null
          host_department: string | null
          host_name: string | null
          id: string
          no_show_at: string | null
          no_show_by: string | null
          no_show_reason: string | null
          notes: string | null
          purpose: string | null
          status: Database["public"]["Enums"]["expected_arrival_status"]
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "expected_arrivals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_field_absence_returned: {
        Args: {
          p_actual_return_at?: string
          p_field_absence_id: string
          p_return_notes?: string
        }
        Returns: {
          actual_return_at: string | null
          camp_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          departure_at: string
          destination: string | null
          expected_return_at: string
          guest_id: string
          id: string
          notes: string | null
          reason: string | null
          return_notes: string | null
          returned_at: string | null
          returned_by: string | null
          room_id: string
          status: Database["public"]["Enums"]["field_absence_status"]
          stay_id: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "field_absences"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_key_card_lost: {
        Args: { p_key_card_id: string; p_note: string }
        Returns: {
          camp_id: string
          card_number: string | null
          created_at: string
          id: string
          issued_at: string | null
          issued_by: string | null
          issued_for_stay_id: string | null
          issued_to_guest_id: string | null
          key_code: string | null
          notes: string | null
          returned_at: string | null
          returned_by: string | null
          room_id: string | null
          status: Database["public"]["Enums"]["key_card_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "keys_access_cards"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_maintenance_resolved: {
        Args: { p_note?: string; p_ticket_id: string }
        Returns: {
          assigned_by: string | null
          assigned_to: string | null
          camp_id: string
          closed_at: string | null
          created_at: string
          description: string
          id: string
          is_room_blocking: boolean
          issue_type: string
          priority: Database["public"]["Enums"]["maintenance_priority"]
          reopened_at: string | null
          reported_by: string | null
          resolved_at: string | null
          room_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["maintenance_ticket_status"]
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "maintenance_tickets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: string
      }
      mark_reservation_no_show: {
        Args: { p_reason?: string; p_reservation_id: string }
        Returns: {
          camp_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          expected_arrival_at: string
          expected_departure_at: string
          group_id: string | null
          guest_id: string | null
          id: string
          is_vip_hold: boolean
          notes: string | null
          room_id: string
          status: Database["public"]["Enums"]["reservation_status"]
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "reservations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_security_gate_exit: {
        Args: { p_exit_notes?: string; p_security_event_id: string }
        Returns: {
          camp_id: string
          clearance_status: string
          created_at: string
          created_by: string | null
          entry_at: string | null
          event_type: string | null
          exit_at: string | null
          exit_notes: string | null
          exited_by: string | null
          expires_at: string | null
          guest_id: string
          host_department: string | null
          host_name: string | null
          id: string
          new_status: string | null
          note: string | null
          notes: string | null
          previous_status: string | null
          purpose: string | null
          reception_notes: string | null
          reception_received_at: string | null
          reception_received_by: string | null
          reception_status: string | null
          related_reservation_id: string | null
          related_stay_id: string | null
          risk_level: string | null
          sent_to_reception_at: string | null
          sent_to_reception_by: string | null
          updated_at: string
          updated_by: string | null
          visit_type: string | null
        }
        SetofOptions: {
          from: "*"
          to: "security_clearance_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_data_import_row_result: {
        Args: {
          p_batch_id: string
          p_error_messages?: string[]
          p_normalized_payload: Json
          p_raw_payload: Json
          p_row_number: number
          p_validation_status: string
        }
        Returns: string
      }
      record_guest_document_access: {
        Args: {
          p_access_type: string
          p_document_id: string
          p_reason?: string
        }
        Returns: {
          archived_at: string | null
          camp_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          document_type: string
          file_size_bytes: number | null
          guest_id: string
          id: string
          mime_type: string | null
          notes: string | null
          original_filename: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          size_bytes: number | null
          status: Database["public"]["Enums"]["guest_document_status"]
          storage_bucket: string
          storage_path: string
          updated_at: string
          updated_by: string | null
          uploaded_at: string
          uploaded_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "guest_documents"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_security_gate_entry: {
        Args: {
          p_camp_id: string
          p_clearance_status?: string
          p_guest_id: string
          p_host_department?: string
          p_host_name?: string
          p_notes?: string
          p_purpose?: string
          p_risk_level?: string
          p_visit_type: string
        }
        Returns: {
          camp_id: string
          clearance_status: string
          created_at: string
          created_by: string | null
          entry_at: string | null
          event_type: string | null
          exit_at: string | null
          exit_notes: string | null
          exited_by: string | null
          expires_at: string | null
          guest_id: string
          host_department: string | null
          host_name: string | null
          id: string
          new_status: string | null
          note: string | null
          notes: string | null
          previous_status: string | null
          purpose: string | null
          reception_notes: string | null
          reception_received_at: string | null
          reception_received_by: string | null
          reception_status: string | null
          related_reservation_id: string | null
          related_stay_id: string | null
          risk_level: string | null
          sent_to_reception_at: string | null
          sent_to_reception_by: string | null
          updated_at: string
          updated_by: string | null
          visit_type: string | null
        }
        SetofOptions: {
          from: "*"
          to: "security_clearance_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      register_guest_document_upload: {
        Args: {
          p_document_type: string
          p_guest_id: string
          p_mime_type: string
          p_notes?: string
          p_original_filename: string
          p_size_bytes: number
          p_storage_bucket: string
          p_storage_path: string
        }
        Returns: string
      }
      request_room_transfer: {
        Args: { p_new_room_id: string; p_reason: string; p_stay_id: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          camp_id: string
          cancelled_at: string | null
          executed_at: string | null
          executed_by: string | null
          guest_id: string
          id: string
          new_room_id: string
          old_room_id: string
          reason: string
          requested_at: string
          requested_by: string | null
          status: Database["public"]["Enums"]["transfer_status"]
          stay_id: string
        }
        SetofOptions: {
          from: "*"
          to: "room_transfers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resolve_reception_security_handoff: {
        Args: {
          p_notes?: string
          p_reception_status: string
          p_security_event_id: string
        }
        Returns: {
          camp_id: string
          clearance_status: string
          created_at: string
          created_by: string | null
          entry_at: string | null
          event_type: string | null
          exit_at: string | null
          exit_notes: string | null
          exited_by: string | null
          expires_at: string | null
          guest_id: string
          host_department: string | null
          host_name: string | null
          id: string
          new_status: string | null
          note: string | null
          notes: string | null
          previous_status: string | null
          purpose: string | null
          reception_notes: string | null
          reception_received_at: string | null
          reception_received_by: string | null
          reception_status: string | null
          related_reservation_id: string | null
          related_stay_id: string | null
          risk_level: string | null
          sent_to_reception_at: string | null
          sent_to_reception_by: string | null
          updated_at: string
          updated_by: string | null
          visit_type: string | null
        }
        SetofOptions: {
          from: "*"
          to: "security_clearance_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      return_key_card: {
        Args: { p_key_card_id: string; p_note?: string }
        Returns: {
          camp_id: string
          card_number: string | null
          created_at: string
          id: string
          issued_at: string | null
          issued_by: string | null
          issued_for_stay_id: string | null
          issued_to_guest_id: string | null
          key_code: string | null
          notes: string | null
          returned_at: string | null
          returned_by: string | null
          room_id: string | null
          status: Database["public"]["Enums"]["key_card_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "keys_access_cards"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      review_guest_document: {
        Args: {
          p_document_id: string
          p_review_notes: string
          p_status: string
        }
        Returns: string
      }
      send_guest_to_reception: {
        Args: { p_notes?: string; p_security_event_id: string }
        Returns: {
          camp_id: string
          clearance_status: string
          created_at: string
          created_by: string | null
          entry_at: string | null
          event_type: string | null
          exit_at: string | null
          exit_notes: string | null
          exited_by: string | null
          expires_at: string | null
          guest_id: string
          host_department: string | null
          host_name: string | null
          id: string
          new_status: string | null
          note: string | null
          notes: string | null
          previous_status: string | null
          purpose: string | null
          reception_notes: string | null
          reception_received_at: string | null
          reception_received_by: string | null
          reception_status: string | null
          related_reservation_id: string | null
          related_stay_id: string | null
          risk_level: string | null
          sent_to_reception_at: string | null
          sent_to_reception_by: string | null
          updated_at: string
          updated_by: string | null
          visit_type: string | null
        }
        SetofOptions: {
          from: "*"
          to: "security_clearance_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      start_housekeeping_task: {
        Args: { p_task_id: string }
        Returns: {
          assigned_by: string | null
          assigned_to: string | null
          camp_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          failed_reason: string | null
          id: string
          notes: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          room_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["housekeeping_task_status"]
          stay_id: string | null
          task_type: string
          updated_at: string
          updated_by: string | null
          verified_at: string | null
          verified_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "housekeeping_tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      start_maintenance_work: {
        Args: { p_note?: string; p_ticket_id: string }
        Returns: {
          assigned_by: string | null
          assigned_to: string | null
          camp_id: string
          closed_at: string | null
          created_at: string
          description: string
          id: string
          is_room_blocking: boolean
          issue_type: string
          priority: Database["public"]["Enums"]["maintenance_priority"]
          reopened_at: string | null
          reported_by: string | null
          resolved_at: string | null
          room_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["maintenance_ticket_status"]
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "maintenance_tickets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      start_room_service_task: {
        Args: { p_task_id: string }
        Returns: {
          assigned_by: string | null
          assigned_to: string | null
          camp_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          due_at: string | null
          id: string
          notes: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          room_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["room_service_task_status"]
          stay_id: string | null
          task_type: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "room_service_tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_expected_arrival: {
        Args: {
          p_expected_arrival_at?: string
          p_expected_arrival_id: string
          p_expected_departure_at?: string
          p_guest_id?: string
          p_host_department?: string
          p_host_name?: string
          p_notes?: string
          p_purpose?: string
        }
        Returns: {
          allocated_allocation_id: string | null
          allocated_at: string | null
          allocated_by: string | null
          allocated_room_id: string | null
          allocated_stay_id: string | null
          camp_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          expected_arrival_at: string
          expected_departure_at: string | null
          guest_id: string | null
          host_department: string | null
          host_name: string | null
          id: string
          no_show_at: string | null
          no_show_by: string | null
          no_show_reason: string | null
          notes: string | null
          purpose: string | null
          status: Database["public"]["Enums"]["expected_arrival_status"]
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "expected_arrivals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      verify_maintenance_work: {
        Args: { p_note?: string; p_ticket_id: string }
        Returns: {
          assigned_by: string | null
          assigned_to: string | null
          camp_id: string
          closed_at: string | null
          created_at: string
          description: string
          id: string
          is_room_blocking: boolean
          issue_type: string
          priority: Database["public"]["Enums"]["maintenance_priority"]
          reopened_at: string | null
          reported_by: string | null
          resolved_at: string | null
          room_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["maintenance_ticket_status"]
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "maintenance_tickets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      account_status:
        | "invited"
        | "active"
        | "suspended"
        | "disabled"
        | "expired_invite"
        | "pending_password_reset"
      allocation_status: "active" | "cancelled" | "checked_in" | "expired"
      asset_condition_status:
        | "new"
        | "good"
        | "fair"
        | "damaged"
        | "missing"
        | "retired"
      building_status: "active" | "inactive" | "disabled"
      camp_access_level:
        | "viewer"
        | "operator"
        | "supervisor"
        | "manager"
        | "admin"
      camp_status: "active" | "inactive" | "disabled"
      expected_arrival_status:
        | "expected"
        | "arrived"
        | "allocated"
        | "cancelled"
        | "no_show"
      export_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "expired"
      field_absence_status: "away" | "returned" | "extended" | "cancelled"
      guest_category:
        | "eu_delegate"
        | "american_delegate"
        | "government_official"
        | "company_staff"
        | "contractor"
        | "consultant"
        | "visitor"
        | "transit_guest"
        | "vip_guest"
        | "long_stay_guest"
      guest_document_status:
        | "pending_review"
        | "approved"
        | "rejected"
        | "active"
        | "archived"
        | "deleted"
      housekeeping_task_status:
        | "pending"
        | "assigned"
        | "in_progress"
        | "completed"
        | "inspection_needed"
        | "verified"
        | "failed_inspection"
        | "cancelled"
      import_status:
        | "pending"
        | "processing"
        | "completed"
        | "completed_with_errors"
        | "failed"
        | "cancelled"
      inspection_status: "pending" | "passed" | "failed" | "cancelled"
      key_card_status:
        | "available"
        | "issued"
        | "returned"
        | "lost"
        | "damaged"
        | "deactivated"
      maintenance_priority: "low" | "medium" | "high" | "urgent"
      maintenance_ticket_status:
        | "reported"
        | "assigned"
        | "in_progress"
        | "waiting_for_parts"
        | "resolved"
        | "verified"
        | "closed"
        | "reopened"
        | "cancelled"
      notification_status: "unread" | "read" | "archived"
      reservation_status:
        | "pending"
        | "confirmed"
        | "cancelled"
        | "no_show"
        | "checked_in"
        | "expired"
      room_condition_status:
        | "excellent"
        | "good"
        | "fair"
        | "needs_attention"
        | "damaged"
      room_service_task_status:
        | "pending"
        | "assigned"
        | "in_progress"
        | "completed"
        | "cancelled"
      room_status:
        | "vacant_ready"
        | "reserved"
        | "pending_check_in"
        | "occupied"
        | "pending_checkout"
        | "needs_cleaning"
        | "cleaning_in_progress"
        | "inspection_needed"
        | "under_maintenance"
        | "out_of_service"
        | "manager_hold"
      stay_status:
        | "reserved"
        | "checked_in"
        | "occupied"
        | "completed"
        | "cancelled"
        | "no_show"
        | "transferred"
      task_priority: "low" | "normal" | "high" | "urgent"
      transfer_status:
        | "requested"
        | "approved"
        | "executed"
        | "cancelled"
        | "rejected"
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
      account_status: [
        "invited",
        "active",
        "suspended",
        "disabled",
        "expired_invite",
        "pending_password_reset",
      ],
      allocation_status: ["active", "cancelled", "checked_in", "expired"],
      asset_condition_status: [
        "new",
        "good",
        "fair",
        "damaged",
        "missing",
        "retired",
      ],
      building_status: ["active", "inactive", "disabled"],
      camp_access_level: [
        "viewer",
        "operator",
        "supervisor",
        "manager",
        "admin",
      ],
      camp_status: ["active", "inactive", "disabled"],
      expected_arrival_status: [
        "expected",
        "arrived",
        "allocated",
        "cancelled",
        "no_show",
      ],
      export_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "expired",
      ],
      field_absence_status: ["away", "returned", "extended", "cancelled"],
      guest_category: [
        "eu_delegate",
        "american_delegate",
        "government_official",
        "company_staff",
        "contractor",
        "consultant",
        "visitor",
        "transit_guest",
        "vip_guest",
        "long_stay_guest",
      ],
      guest_document_status: [
        "pending_review",
        "approved",
        "rejected",
        "active",
        "archived",
        "deleted",
      ],
      housekeeping_task_status: [
        "pending",
        "assigned",
        "in_progress",
        "completed",
        "inspection_needed",
        "verified",
        "failed_inspection",
        "cancelled",
      ],
      import_status: [
        "pending",
        "processing",
        "completed",
        "completed_with_errors",
        "failed",
        "cancelled",
      ],
      inspection_status: ["pending", "passed", "failed", "cancelled"],
      key_card_status: [
        "available",
        "issued",
        "returned",
        "lost",
        "damaged",
        "deactivated",
      ],
      maintenance_priority: ["low", "medium", "high", "urgent"],
      maintenance_ticket_status: [
        "reported",
        "assigned",
        "in_progress",
        "waiting_for_parts",
        "resolved",
        "verified",
        "closed",
        "reopened",
        "cancelled",
      ],
      notification_status: ["unread", "read", "archived"],
      reservation_status: [
        "pending",
        "confirmed",
        "cancelled",
        "no_show",
        "checked_in",
        "expired",
      ],
      room_condition_status: [
        "excellent",
        "good",
        "fair",
        "needs_attention",
        "damaged",
      ],
      room_service_task_status: [
        "pending",
        "assigned",
        "in_progress",
        "completed",
        "cancelled",
      ],
      room_status: [
        "vacant_ready",
        "reserved",
        "pending_check_in",
        "occupied",
        "pending_checkout",
        "needs_cleaning",
        "cleaning_in_progress",
        "inspection_needed",
        "under_maintenance",
        "out_of_service",
        "manager_hold",
      ],
      stay_status: [
        "reserved",
        "checked_in",
        "occupied",
        "completed",
        "cancelled",
        "no_show",
        "transferred",
      ],
      task_priority: ["low", "normal", "high", "urgent"],
      transfer_status: [
        "requested",
        "approved",
        "executed",
        "cancelled",
        "rejected",
      ],
    },
  },
} as const
