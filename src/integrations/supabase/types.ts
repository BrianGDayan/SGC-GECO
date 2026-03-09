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
      audit_processes: {
        Row: {
          audit_id: number
          process_id: number
        }
        Insert: {
          audit_id: number
          process_id: number
        }
        Update: {
          audit_id?: number
          process_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "audit_processes_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_processes_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "process_compliance"
            referencedColumns: ["process_id"]
          },
          {
            foreignKeyName: "audit_processes_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_processes_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes_view"
            referencedColumns: ["id"]
          },
        ]
      }
      audits: {
        Row: {
          auditor: string | null
          created_at: string
          created_by: number | null
          findings_nc: number | null
          findings_observations: number | null
          findings_om: number | null
          id: number
          progress: number | null
          scheduled_date: string
          scope: string[] | null
          status: string | null
          title: string
          type: string | null
        }
        Insert: {
          auditor?: string | null
          created_at?: string
          created_by?: number | null
          findings_nc?: number | null
          findings_observations?: number | null
          findings_om?: number | null
          id?: number
          progress?: number | null
          scheduled_date: string
          scope?: string[] | null
          status?: string | null
          title: string
          type?: string | null
        }
        Update: {
          auditor?: string | null
          created_at?: string
          created_by?: number | null
          findings_nc?: number | null
          findings_observations?: number | null
          findings_om?: number | null
          id?: number
          progress?: number | null
          scheduled_date?: string
          scope?: string[] | null
          status?: string | null
          title?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_audits_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      document_records: {
        Row: {
          description: string | null
          document_id: string | null
          file_name: string
          file_url: string
          id: number
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          description?: string | null
          document_id?: string | null
          file_name: string
          file_url: string
          id?: number
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          description?: string | null
          document_id?: string | null
          file_name?: string
          file_url?: string
          id?: number
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_records_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_records_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_view"
            referencedColumns: ["doc_id"]
          },
        ]
      }
      document_versions: {
        Row: {
          description: string | null
          document_id: string | null
          file_url: string
          id: string
          revision: number
          status: string | null
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          description?: string | null
          document_id?: string | null
          file_url: string
          id?: string
          revision?: number
          status?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          description?: string | null
          document_id?: string | null
          file_url?: string
          id?: string
          revision?: number
          status?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_view"
            referencedColumns: ["doc_id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string
          code: string
          created_by: string | null
          file_name: string
          id: string
          process: string | null
          process_id: number | null
          title: string
        }
        Insert: {
          category: string
          code: string
          created_by?: string | null
          file_name: string
          id?: string
          process?: string | null
          process_id?: number | null
          title: string
        }
        Update: {
          category?: string
          code?: string
          created_by?: string | null
          file_name?: string
          id?: string
          process?: string | null
          process_id?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_documents_process"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "process_compliance"
            referencedColumns: ["process_id"]
          },
          {
            foreignKeyName: "fk_documents_process"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_documents_process"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes_view"
            referencedColumns: ["id"]
          },
        ]
      }
      finding_actions: {
        Row: {
          action_type: string | null
          completion_date: string | null
          created_at: string | null
          description: string
          finding_id: number | null
          id: number
          responsibles: string | null
          status: string | null
          target_date: string | null
        }
        Insert: {
          action_type?: string | null
          completion_date?: string | null
          created_at?: string | null
          description: string
          finding_id?: number | null
          id?: number
          responsibles?: string | null
          status?: string | null
          target_date?: string | null
        }
        Update: {
          action_type?: string | null
          completion_date?: string | null
          created_at?: string | null
          description?: string
          finding_id?: number | null
          id?: number
          responsibles?: string | null
          status?: string | null
          target_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finding_actions_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "findings"
            referencedColumns: ["id"]
          },
        ]
      }
      finding_evaluations: {
        Row: {
          comments: string | null
          created_at: string
          created_by: string | null
          evaluation_date: string
          finding_id: number
          id: number
          is_effective: boolean
        }
        Insert: {
          comments?: string | null
          created_at?: string
          created_by?: string | null
          evaluation_date: string
          finding_id: number
          id?: number
          is_effective: boolean
        }
        Update: {
          comments?: string | null
          created_at?: string
          created_by?: string | null
          evaluation_date?: string
          finding_id?: number
          id?: number
          is_effective?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "finding_evaluations_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "findings"
            referencedColumns: ["id"]
          },
        ]
      }
      findings: {
        Row: {
          audit_id: number | null
          circumstance: string | null
          created_at: string | null
          description: string
          detected_by: string | null
          detection_date: string | null
          efficacy_eval_date: string | null
          id: number
          is_efficacious: boolean | null
          process_id: number | null
          root_cause_analysis: string | null
          status: string | null
          type: string
        }
        Insert: {
          audit_id?: number | null
          circumstance?: string | null
          created_at?: string | null
          description: string
          detected_by?: string | null
          detection_date?: string | null
          efficacy_eval_date?: string | null
          id?: number
          is_efficacious?: boolean | null
          process_id?: number | null
          root_cause_analysis?: string | null
          status?: string | null
          type: string
        }
        Update: {
          audit_id?: number | null
          circumstance?: string | null
          created_at?: string | null
          description?: string
          detected_by?: string | null
          detection_date?: string | null
          efficacy_eval_date?: string | null
          id?: number
          is_efficacious?: boolean | null
          process_id?: number | null
          root_cause_analysis?: string | null
          status?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_findings_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "findings_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "process_compliance"
            referencedColumns: ["process_id"]
          },
          {
            foreignKeyName: "findings_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "findings_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_findings_process"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "process_compliance"
            referencedColumns: ["process_id"]
          },
          {
            foreignKeyName: "fk_findings_process"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_findings_process"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes_view"
            referencedColumns: ["id"]
          },
        ]
      }
      indicator_history: {
        Row: {
          created_at: string | null
          id: number
          indicator_id: number | null
          observations: string | null
          period: string | null
          period_date: string | null
          result: number | null
          value_1: number | null
          value_2: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          indicator_id?: number | null
          observations?: string | null
          period?: string | null
          period_date?: string | null
          result?: number | null
          value_1?: number | null
          value_2?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number
          indicator_id?: number | null
          observations?: string | null
          period?: string | null
          period_date?: string | null
          result?: number | null
          value_1?: number | null
          value_2?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "indicator_history_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      indicator_measurements: {
        Row: {
          comments: string | null
          created_at: string | null
          created_by: string | null
          id: number
          indicator_id: number | null
          period: string
          value: number
        }
        Insert: {
          comments?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: number
          indicator_id?: number | null
          period: string
          value: number
        }
        Update: {
          comments?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: number
          indicator_id?: number | null
          period?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "indicator_measurements_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      indicators: {
        Row: {
          calculation_info: string | null
          created_at: string
          created_by: number | null
          current_value: number | null
          formula: string | null
          frequency: string | null
          id: number
          input_1: string | null
          input_2: string | null
          last_update: string | null
          name: string
          objective: string | null
          process: string | null
          process_id: number | null
          responsible: string | null
          target_value: number
          unit: string | null
        }
        Insert: {
          calculation_info?: string | null
          created_at?: string
          created_by?: number | null
          current_value?: number | null
          formula?: string | null
          frequency?: string | null
          id?: number
          input_1?: string | null
          input_2?: string | null
          last_update?: string | null
          name: string
          objective?: string | null
          process?: string | null
          process_id?: number | null
          responsible?: string | null
          target_value: number
          unit?: string | null
        }
        Update: {
          calculation_info?: string | null
          created_at?: string
          created_by?: number | null
          current_value?: number | null
          formula?: string | null
          frequency?: string | null
          id?: number
          input_1?: string | null
          input_2?: string | null
          last_update?: string | null
          name?: string
          objective?: string | null
          process?: string | null
          process_id?: number | null
          responsible?: string | null
          target_value?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_indicators_process"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "process_compliance"
            referencedColumns: ["process_id"]
          },
          {
            foreignKeyName: "fk_indicators_process"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_indicators_process"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicators_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicators_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "process_compliance"
            referencedColumns: ["process_id"]
          },
          {
            foreignKeyName: "indicators_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicators_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes_view"
            referencedColumns: ["id"]
          },
        ]
      }
      processes: {
        Row: {
          category: string | null
          code: string | null
          compliance_percentage: number | null
          created_at: string
          id: number
          manager_ids: string[] | null
          name: string
          owner_id: number | null
          responsibles: string | null
          subprocesses: string[] | null
          type: string | null
        }
        Insert: {
          category?: string | null
          code?: string | null
          compliance_percentage?: number | null
          created_at?: string
          id?: number
          manager_ids?: string[] | null
          name: string
          owner_id?: number | null
          responsibles?: string | null
          subprocesses?: string[] | null
          type?: string | null
        }
        Update: {
          category?: string | null
          code?: string | null
          compliance_percentage?: number | null
          created_at?: string
          id?: number
          manager_ids?: string[] | null
          name?: string
          owner_id?: number | null
          responsibles?: string | null
          subprocesses?: string[] | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_processes_owner"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_id: string
          created_at: string
          email: string
          full_name: string | null
          id: number
          last_access: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          auth_id: string
          created_at?: string
          email: string
          full_name?: string | null
          id?: number
          last_access?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          auth_id?: string
          created_at?: string
          email?: string
          full_name?: string | null
          id?: number
          last_access?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      documents_view: {
        Row: {
          category: string | null
          code: string | null
          description: string | null
          doc_id: string | null
          file_name: string | null
          file_url: string | null
          manager_ids: string[] | null
          process: string | null
          process_id: number | null
          revision: number | null
          status: string | null
          title: string | null
          uploaded_at: string | null
          user_name: string | null
          version_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_documents_process"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "process_compliance"
            referencedColumns: ["process_id"]
          },
          {
            foreignKeyName: "fk_documents_process"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_documents_process"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes_view"
            referencedColumns: ["id"]
          },
        ]
      }
      global_activity_view: {
        Row: {
          activity_type: string | null
          created_at: string | null
          description: string | null
          reference_id: string | null
          title: string | null
          unique_id: string | null
        }
        Relationships: []
      }
      process_compliance: {
        Row: {
          calculated_compliance: number | null
          process_id: number | null
        }
        Relationships: []
      }
      processes_view: {
        Row: {
          code: string | null
          compliance: number | null
          created_at: string | null
          doc_count: number | null
          id: number | null
          indicator_count: number | null
          name: string | null
          responsibles: string | null
          subprocesses: string[] | null
          type: string | null
        }
        Insert: {
          code?: string | null
          compliance?: never
          created_at?: string | null
          doc_count?: never
          id?: number | null
          indicator_count?: never
          name?: string | null
          responsibles?: string | null
          subprocesses?: string[] | null
          type?: string | null
        }
        Update: {
          code?: string | null
          compliance?: never
          created_at?: string | null
          doc_count?: never
          id?: number | null
          indicator_count?: never
          name?: string | null
          responsibles?: string | null
          subprocesses?: string[] | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      increment_audit_finding: {
        Args: { audit_id: number; field_name: string }
        Returns: undefined
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
