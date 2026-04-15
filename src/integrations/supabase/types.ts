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
      appointments: {
        Row: {
          center_id: string
          contact_id: string | null
          created_at: string
          end_time: string
          id: string
          notes: string | null
          patient_id: string
          professional_id: string | null
          service_id: string | null
          start_time: string
          status: Database["public"]["Enums"]["appointment_status"]
          treatment_pack_id: string | null
          updated_at: string
        }
        Insert: {
          center_id: string
          contact_id?: string | null
          created_at?: string
          end_time: string
          id?: string
          notes?: string | null
          patient_id: string
          professional_id?: string | null
          service_id?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["appointment_status"]
          treatment_pack_id?: string | null
          updated_at?: string
        }
        Update: {
          center_id?: string
          contact_id?: string | null
          created_at?: string
          end_time?: string
          id?: string
          notes?: string | null
          patient_id?: string
          professional_id?: string | null
          service_id?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          treatment_pack_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_appointments_pack"
            columns: ["treatment_pack_id"]
            isOneToOne: false
            referencedRelation: "treatment_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_slots: {
        Row: {
          appointment_id: string | null
          center_id: string
          created_at: string
          date: string
          duration_minutes: number
          end_time: string
          id: string
          is_recurring: boolean
          notes: string | null
          professional_id: string
          service_id: string | null
          start_time: string
          status: Database["public"]["Enums"]["slot_status"]
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          center_id: string
          created_at?: string
          date: string
          duration_minutes?: number
          end_time: string
          id?: string
          is_recurring?: boolean
          notes?: string | null
          professional_id: string
          service_id?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["slot_status"]
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          center_id?: string
          created_at?: string
          date?: string
          duration_minutes?: number
          end_time?: string
          id?: string
          is_recurring?: boolean
          notes?: string | null
          professional_id?: string
          service_id?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["slot_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_slots_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_slots_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_slots_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_slots_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      business_pipeline_stages: {
        Row: {
          business_type_id: string
          created_at: string
          id: string
          name: string
          position: number
        }
        Insert: {
          business_type_id: string
          created_at?: string
          id?: string
          name: string
          position?: number
        }
        Update: {
          business_type_id?: string
          created_at?: string
          id?: string
          name?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "business_pipeline_stages_business_type_id_fkey"
            columns: ["business_type_id"]
            isOneToOne: false
            referencedRelation: "business_types"
            referencedColumns: ["id"]
          },
        ]
      }
      business_stage_history: {
        Row: {
          business_id: string
          changed_by: string | null
          created_at: string
          from_stage_id: string | null
          id: string
          notes: string | null
          to_stage_id: string
        }
        Insert: {
          business_id: string
          changed_by?: string | null
          created_at?: string
          from_stage_id?: string | null
          id?: string
          notes?: string | null
          to_stage_id: string
        }
        Update: {
          business_id?: string
          changed_by?: string | null
          created_at?: string
          from_stage_id?: string | null
          id?: string
          notes?: string | null
          to_stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_stage_history_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_stage_history_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "business_pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_stage_history_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "business_pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      business_types: {
        Row: {
          active: boolean
          business_line: string
          created_at: string
          default_price: number
          id: string
          name: string
          position: number
        }
        Insert: {
          active?: boolean
          business_line: string
          created_at?: string
          default_price?: number
          id?: string
          name: string
          position?: number
        }
        Update: {
          active?: boolean
          business_line?: string
          created_at?: string
          default_price?: number
          id?: string
          name?: string
          position?: number
        }
        Relationships: []
      }
      businesses: {
        Row: {
          assigned_to: string | null
          business_type_id: string
          center_id: string | null
          closed_at: string | null
          contact_id: string
          created_at: string
          estimated_amount: number
          expected_close_date: string | null
          id: string
          name: string
          next_action: string | null
          next_action_date: string | null
          notes: string | null
          stage_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          business_type_id: string
          center_id?: string | null
          closed_at?: string | null
          contact_id: string
          created_at?: string
          estimated_amount?: number
          expected_close_date?: string | null
          id?: string
          name: string
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          stage_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          business_type_id?: string
          center_id?: string | null
          closed_at?: string | null
          contact_id?: string
          created_at?: string
          estimated_amount?: number
          expected_close_date?: string | null
          id?: string
          name?: string
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          stage_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "businesses_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_business_type_id_fkey"
            columns: ["business_type_id"]
            isOneToOne: false
            referencedRelation: "business_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "business_pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_contacts: {
        Row: {
          campaign_id: string
          contact_id: string
          contacted_at: string | null
          converted_at: string | null
          created_at: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["campaign_contact_status"]
          updated_at: string
        }
        Insert: {
          campaign_id: string
          contact_id: string
          contacted_at?: string | null
          converted_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["campaign_contact_status"]
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          contact_id?: string
          contacted_at?: string | null
          converted_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["campaign_contact_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_contacts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          business_line: Database["public"]["Enums"]["business_line"]
          center_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          target_count: number
          updated_at: string
        }
        Insert: {
          business_line: Database["public"]["Enums"]["business_line"]
          center_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          target_count?: number
          updated_at?: string
        }
        Update: {
          business_line?: Database["public"]["Enums"]["business_line"]
          center_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          target_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      centers: {
        Row: {
          active: boolean
          address: string | null
          city: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          postal_code: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contact_categories: {
        Row: {
          created_at: string
          id: string
          label: string
          name: string
          position: number
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          name: string
          position?: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          name?: string
          position?: number
        }
        Relationships: []
      }
      contacts: {
        Row: {
          address: string | null
          assigned_professional_id: string | null
          birth_date: string | null
          category_id: string
          center_id: string | null
          city: string | null
          company_name: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          first_name: string
          fiscal_address: string | null
          fiscal_email: string | null
          fiscal_name: string | null
          fiscal_nif: string | null
          fiscal_phone: string | null
          id: string
          last_name: string | null
          nif: string | null
          notes: string | null
          phone: string | null
          postal_code: string | null
          sex: string | null
          source: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          assigned_professional_id?: string | null
          birth_date?: string | null
          category_id: string
          center_id?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          first_name: string
          fiscal_address?: string | null
          fiscal_email?: string | null
          fiscal_name?: string | null
          fiscal_nif?: string | null
          fiscal_phone?: string | null
          id?: string
          last_name?: string | null
          nif?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          sex?: string | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          assigned_professional_id?: string | null
          birth_date?: string | null
          category_id?: string
          center_id?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          first_name?: string
          fiscal_address?: string | null
          fiscal_email?: string | null
          fiscal_name?: string | null
          fiscal_nif?: string | null
          fiscal_phone?: string | null
          id?: string
          last_name?: string | null
          nif?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          sex?: string | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_assigned_professional_id_fkey"
            columns: ["assigned_professional_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "contact_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      document_types: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          center_id: string | null
          contact_id: string | null
          created_at: string
          document_type_id: string | null
          file_name: string | null
          file_path: string | null
          id: string
          notes: string | null
          patient_id: string
          status: Database["public"]["Enums"]["document_status"]
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          center_id?: string | null
          contact_id?: string | null
          created_at?: string
          document_type_id?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          status?: Database["public"]["Enums"]["document_status"]
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          center_id?: string | null
          contact_id?: string | null
          created_at?: string
          document_type_id?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          status?: Database["public"]["Enums"]["document_status"]
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_document_type_id_fkey"
            columns: ["document_type_id"]
            isOneToOne: false
            referencedRelation: "document_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions: {
        Row: {
          business_id: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          id: string
          lead_id: string | null
          notes: string | null
          patient_id: string | null
          type: Database["public"]["Enums"]["interaction_type"]
        }
        Insert: {
          business_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          patient_id?: string | null
          type: Database["public"]["Enums"]["interaction_type"]
        }
        Update: {
          business_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          patient_id?: string | null
          type?: Database["public"]["Enums"]["interaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "interactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          appointment_id: string | null
          created_at: string
          description: string
          id: string
          invoice_id: string
          position: number
          quantity: number
          service_id: string | null
          subtotal: number
          tax_amount: number
          tax_rate: number
          total: number
          unit_price: number
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          position?: number
          quantity?: number
          service_id?: string | null
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          unit_price?: number
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          position?: number
          quantity?: number
          service_id?: string | null
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_series: {
        Row: {
          active: boolean
          center_id: string
          created_at: string
          current_number: number
          doc_type: string
          id: string
          prefix: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          center_id: string
          created_at?: string
          current_number?: number
          doc_type?: string
          id?: string
          prefix: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          center_id?: string
          created_at?: string
          current_number?: number
          doc_type?: string
          id?: string
          prefix?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_series_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          business_id: string | null
          center_id: string
          contact_id: string
          created_at: string
          due_date: string | null
          fiscal_address: string | null
          fiscal_email: string | null
          fiscal_name: string | null
          fiscal_nif: string | null
          fiscal_phone: string | null
          id: string
          invoice_number: string | null
          invoice_type: Database["public"]["Enums"]["invoice_type"]
          issue_date: string
          notes: string | null
          paid_amount: number
          quote_id: string | null
          series_id: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax_amount: number
          total: number
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          center_id: string
          contact_id: string
          created_at?: string
          due_date?: string | null
          fiscal_address?: string | null
          fiscal_email?: string | null
          fiscal_name?: string | null
          fiscal_nif?: string | null
          fiscal_phone?: string | null
          id?: string
          invoice_number?: string | null
          invoice_type?: Database["public"]["Enums"]["invoice_type"]
          issue_date?: string
          notes?: string | null
          paid_amount?: number
          quote_id?: string | null
          series_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_amount?: number
          total?: number
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          center_id?: string
          contact_id?: string
          created_at?: string
          due_date?: string | null
          fiscal_address?: string | null
          fiscal_email?: string | null
          fiscal_name?: string | null
          fiscal_nif?: string | null
          fiscal_phone?: string | null
          id?: string
          invoice_number?: string | null
          invoice_type?: Database["public"]["Enums"]["invoice_type"]
          issue_date?: string
          notes?: string | null
          paid_amount?: number
          quote_id?: string | null
          series_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_amount?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "invoice_series"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          business_line: Database["public"]["Enums"]["business_line"]
          center_id: string | null
          company_name: string | null
          converted: boolean
          converted_to_patient_id: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          estimated_value: number | null
          first_name: string
          id: string
          last_name: string | null
          next_action: string | null
          next_action_date: string | null
          notes: string | null
          phone: string | null
          pipeline_stage_id: string | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          business_line: Database["public"]["Enums"]["business_line"]
          center_id?: string | null
          company_name?: string | null
          converted?: boolean
          converted_to_patient_id?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          estimated_value?: number | null
          first_name: string
          id?: string
          last_name?: string | null
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          phone?: string | null
          pipeline_stage_id?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          business_line?: Database["public"]["Enums"]["business_line"]
          center_id?: string | null
          company_name?: string | null
          converted?: boolean
          converted_to_patient_id?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          estimated_value?: number | null
          first_name?: string
          id?: string
          last_name?: string | null
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          phone?: string | null
          pipeline_stage_id?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_leads_converted_patient"
            columns: ["converted_to_patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_pipeline_stage_id_fkey"
            columns: ["pipeline_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_note_audios: {
        Row: {
          contact_id: string | null
          created_at: string
          created_by: string | null
          duration_seconds: number | null
          file_name: string | null
          file_path: string
          id: string
          note_version_id: string | null
          patient_note_id: string
          transcription: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          file_name?: string | null
          file_path: string
          id?: string
          note_version_id?: string | null
          patient_note_id: string
          transcription?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          file_name?: string | null
          file_path?: string
          id?: string
          note_version_id?: string | null
          patient_note_id?: string
          transcription?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_note_audios_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_note_audios_note_version_id_fkey"
            columns: ["note_version_id"]
            isOneToOne: false
            referencedRelation: "patient_note_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_note_audios_patient_note_id_fkey"
            columns: ["patient_note_id"]
            isOneToOne: false
            referencedRelation: "patient_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_note_versions: {
        Row: {
          contact_id: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          patient_note_id: string
          version_number: number
        }
        Insert: {
          contact_id?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          patient_note_id: string
          version_number?: number
        }
        Update: {
          contact_id?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          patient_note_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "patient_note_versions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_note_versions_patient_note_id_fkey"
            columns: ["patient_note_id"]
            isOneToOne: false
            referencedRelation: "patient_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_notes: {
        Row: {
          contact_id: string | null
          content: string
          created_at: string
          id: string
          patient_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          contact_id?: string | null
          content?: string
          created_at?: string
          id?: string
          patient_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          contact_id?: string | null
          content?: string
          created_at?: string
          id?: string
          patient_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_notes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_session_notes: {
        Row: {
          audio_file_path: string | null
          contact_id: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          patient_id: string | null
          source: string
          transcription: string | null
        }
        Insert: {
          audio_file_path?: string | null
          contact_id?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          patient_id?: string | null
          source?: string
          transcription?: string | null
        }
        Update: {
          audio_file_path?: string | null
          contact_id?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          patient_id?: string | null
          source?: string
          transcription?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_session_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_session_notes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_synopsis: {
        Row: {
          contact_id: string | null
          content: string
          created_at: string
          id: string
          patient_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          contact_id?: string | null
          content?: string
          created_at?: string
          id?: string
          patient_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          contact_id?: string | null
          content?: string
          created_at?: string
          id?: string
          patient_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_synopsis_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_synopsis_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_voice_edits: {
        Row: {
          audio_file_path: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          fields_changed: Json
          id: string
          interpreted_instruction: string | null
          patient_id: string | null
          transcription: string | null
        }
        Insert: {
          audio_file_path?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          fields_changed?: Json
          id?: string
          interpreted_instruction?: string | null
          patient_id?: string | null
          transcription?: string | null
        }
        Update: {
          audio_file_path?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          fields_changed?: Json
          id?: string
          interpreted_instruction?: string | null
          patient_id?: string | null
          transcription?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_voice_edits_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_voice_edits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          assigned_professional_id: string | null
          birth_date: string | null
          center_id: string | null
          city: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          first_name: string
          fiscal_address: string | null
          fiscal_email: string | null
          fiscal_name: string | null
          fiscal_nif: string | null
          fiscal_phone: string | null
          id: string
          last_name: string
          nif: string | null
          notes: string | null
          phone: string | null
          postal_code: string | null
          sex: string | null
          source: string | null
          source_lead_id: string | null
          status: Database["public"]["Enums"]["patient_status"]
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          assigned_professional_id?: string | null
          birth_date?: string | null
          center_id?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          first_name: string
          fiscal_address?: string | null
          fiscal_email?: string | null
          fiscal_name?: string | null
          fiscal_nif?: string | null
          fiscal_phone?: string | null
          id?: string
          last_name: string
          nif?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          sex?: string | null
          source?: string | null
          source_lead_id?: string | null
          status?: Database["public"]["Enums"]["patient_status"]
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          assigned_professional_id?: string | null
          birth_date?: string | null
          center_id?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          first_name?: string
          fiscal_address?: string | null
          fiscal_email?: string | null
          fiscal_name?: string | null
          fiscal_nif?: string | null
          fiscal_phone?: string | null
          id?: string
          last_name?: string
          nif?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          sex?: string | null
          source?: string | null
          source_lead_id?: string | null
          status?: Database["public"]["Enums"]["patient_status"]
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_assigned_professional_id_fkey"
            columns: ["assigned_professional_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_source_lead_id_fkey"
            columns: ["source_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          position: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          position?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          position?: number
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string
          notes: string | null
          payment_date: string
          payment_method_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id: string
          notes?: string | null
          payment_date?: string
          payment_method_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string
          notes?: string | null
          payment_date?: string
          payment_method_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          business_line: Database["public"]["Enums"]["business_line"]
          created_at: string
          id: string
          name: string
          position: number
        }
        Insert: {
          business_line: Database["public"]["Enums"]["business_line"]
          created_at?: string
          id?: string
          name: string
          position?: number
        }
        Update: {
          business_line?: Database["public"]["Enums"]["business_line"]
          created_at?: string
          id?: string
          name?: string
          position?: number
        }
        Relationships: []
      }
      quote_items: {
        Row: {
          created_at: string
          description: string
          id: string
          position: number
          quantity: number
          quote_id: string
          service_id: string | null
          subtotal: number
          tax_amount: number
          tax_rate: number
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          position?: number
          quantity?: number
          quote_id: string
          service_id?: string | null
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          position?: number
          quantity?: number
          quote_id?: string
          service_id?: string | null
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          business_id: string | null
          center_id: string
          contact_id: string
          created_at: string
          fiscal_address: string | null
          fiscal_email: string | null
          fiscal_name: string | null
          fiscal_nif: string | null
          fiscal_phone: string | null
          id: string
          issue_date: string
          notes: string | null
          quote_number: string | null
          status: Database["public"]["Enums"]["quote_status"]
          subtotal: number
          tax_amount: number
          total: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          business_id?: string | null
          center_id: string
          contact_id: string
          created_at?: string
          fiscal_address?: string | null
          fiscal_email?: string | null
          fiscal_name?: string | null
          fiscal_nif?: string | null
          fiscal_phone?: string | null
          id?: string
          issue_date?: string
          notes?: string | null
          quote_number?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          tax_amount?: number
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          business_id?: string | null
          center_id?: string
          contact_id?: string
          created_at?: string
          fiscal_address?: string | null
          fiscal_email?: string | null
          fiscal_name?: string | null
          fiscal_nif?: string | null
          fiscal_phone?: string | null
          id?: string
          issue_date?: string
          notes?: string | null
          quote_number?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          tax_amount?: number
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          business_line: Database["public"]["Enums"]["business_line"]
          created_at: string
          duration_minutes: number
          id: string
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          business_line: Database["public"]["Enums"]["business_line"]
          created_at?: string
          duration_minutes?: number
          id?: string
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          business_line?: Database["public"]["Enums"]["business_line"]
          created_at?: string
          duration_minutes?: number
          id?: string
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      staff_center_services: {
        Row: {
          center_id: string
          created_at: string
          id: string
          service_id: string
          staff_profile_id: string
        }
        Insert: {
          center_id: string
          created_at?: string
          id?: string
          service_id: string
          staff_profile_id: string
        }
        Update: {
          center_id?: string
          created_at?: string
          id?: string
          service_id?: string
          staff_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_center_services_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_center_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_center_services_staff_profile_id_fkey"
            columns: ["staff_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_profiles: {
        Row: {
          active: boolean
          center_id: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          phone: string | null
          specialty: Database["public"]["Enums"]["business_line"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          center_id?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          phone?: string | null
          specialty?: Database["public"]["Enums"]["business_line"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          center_id?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          specialty?: Database["public"]["Enums"]["business_line"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_profiles_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_packs: {
        Row: {
          contact_id: string | null
          created_at: string
          expiry_date: string | null
          id: string
          name: string
          patient_id: string
          price: number
          service_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["pack_status"]
          total_sessions: number
          updated_at: string
          used_sessions: number
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          name: string
          patient_id: string
          price?: number
          service_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["pack_status"]
          total_sessions: number
          updated_at?: string
          used_sessions?: number
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          name?: string
          patient_id?: string
          price?: number
          service_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["pack_status"]
          total_sessions?: number
          updated_at?: string
          used_sessions?: number
        }
        Relationships: [
          {
            foreignKeyName: "treatment_packs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_packs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_packs_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "gerencia"
        | "administracion"
        | "recepcion"
        | "comercial"
        | "fisioterapeuta"
        | "nutricionista"
        | "psicotecnico"
      appointment_status:
        | "pendiente"
        | "confirmada"
        | "realizada"
        | "cancelada"
        | "no_presentado"
        | "reprogramada"
      business_line: "fisioterapia" | "nutricion" | "psicotecnicos"
      campaign_contact_status:
        | "pendiente"
        | "contactado"
        | "interesado"
        | "convertido"
        | "descartado"
      campaign_status: "planificada" | "activa" | "finalizada" | "cancelada"
      document_status: "pendiente" | "no_subido" | "subido" | "validado"
      interaction_type:
        | "llamada"
        | "email"
        | "whatsapp"
        | "nota"
        | "accion_comercial"
      invoice_status:
        | "borrador"
        | "emitida"
        | "parcialmente_cobrada"
        | "cobrada"
        | "anulada"
      invoice_type: "factura" | "simplificada"
      lead_status:
        | "nuevo"
        | "contactado"
        | "cualificado"
        | "propuesta"
        | "ganado"
        | "perdido"
      pack_status: "activo" | "completado" | "vencido" | "cancelado"
      patient_status: "activo" | "inactivo" | "alta_pendiente" | "baja"
      quote_status: "borrador" | "entregado" | "aceptado" | "rechazado"
      slot_status: "disponible" | "ocupado" | "bloqueado"
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
      app_role: [
        "gerencia",
        "administracion",
        "recepcion",
        "comercial",
        "fisioterapeuta",
        "nutricionista",
        "psicotecnico",
      ],
      appointment_status: [
        "pendiente",
        "confirmada",
        "realizada",
        "cancelada",
        "no_presentado",
        "reprogramada",
      ],
      business_line: ["fisioterapia", "nutricion", "psicotecnicos"],
      campaign_contact_status: [
        "pendiente",
        "contactado",
        "interesado",
        "convertido",
        "descartado",
      ],
      campaign_status: ["planificada", "activa", "finalizada", "cancelada"],
      document_status: ["pendiente", "no_subido", "subido", "validado"],
      interaction_type: [
        "llamada",
        "email",
        "whatsapp",
        "nota",
        "accion_comercial",
      ],
      invoice_status: [
        "borrador",
        "emitida",
        "parcialmente_cobrada",
        "cobrada",
        "anulada",
      ],
      invoice_type: ["factura", "simplificada"],
      lead_status: [
        "nuevo",
        "contactado",
        "cualificado",
        "propuesta",
        "ganado",
        "perdido",
      ],
      pack_status: ["activo", "completado", "vencido", "cancelado"],
      patient_status: ["activo", "inactivo", "alta_pendiente", "baja"],
      quote_status: ["borrador", "entregado", "aceptado", "rechazado"],
      slot_status: ["disponible", "ocupado", "bloqueado"],
    },
  },
} as const
