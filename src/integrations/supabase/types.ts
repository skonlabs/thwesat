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
      action_prices: {
        Row: {
          action_key: string
          description_en: string
          description_my: string
          duration_days: number | null
          is_active: boolean
          label_en: string
          label_my: string
          price_credits: number
          updated_at: string
        }
        Insert: {
          action_key: string
          description_en?: string
          description_my?: string
          duration_days?: number | null
          is_active?: boolean
          label_en: string
          label_my?: string
          price_credits: number
          updated_at?: string
        }
        Update: {
          action_key?: string
          description_en?: string
          description_my?: string
          duration_days?: number | null
          is_active?: boolean
          label_en?: string
          label_my?: string
          price_credits?: number
          updated_at?: string
        }
        Relationships: []
      }
      addon_products: {
        Row: {
          created_at: string
          duration_days: number | null
          id: string
          is_active: boolean
          is_per_unit: boolean
          is_recurring: boolean
          key: string
          kind: string
          label_en: string
          label_my: string | null
          mmk: number
          role_scope: string
          sort_order: number
          unlock_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_days?: number | null
          id?: string
          is_active?: boolean
          is_per_unit?: boolean
          is_recurring?: boolean
          key: string
          kind: string
          label_en: string
          label_my?: string | null
          mmk: number
          role_scope?: string
          sort_order?: number
          unlock_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_days?: number | null
          id?: string
          is_active?: boolean
          is_per_unit?: boolean
          is_recurring?: boolean
          key?: string
          kind?: string
          label_en?: string
          label_my?: string | null
          mmk?: number
          role_scope?: string
          sort_order?: number
          unlock_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          details: Json
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      admin_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          last_seen_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          last_seen_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          last_seen_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          clients: Json
          created_at: string
          display_name: string
          headline: string | null
          languages: string[] | null
          last_seen_at: string | null
          location: string | null
          referral_code: string | null
          updated_at: string
          user_id: string
          visibility: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          clients?: Json
          created_at?: string
          display_name?: string
          headline?: string | null
          languages?: string[] | null
          last_seen_at?: string | null
          location?: string | null
          referral_code?: string | null
          updated_at?: string
          user_id: string
          visibility?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          clients?: Json
          created_at?: string
          display_name?: string
          headline?: string | null
          languages?: string[] | null
          last_seen_at?: string | null
          location?: string | null
          referral_code?: string | null
          updated_at?: string
          user_id?: string
          visibility?: string | null
          website?: string | null
        }
        Relationships: []
      }
      app_config: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      application_status_history: {
        Row: {
          applicant_id: string
          application_id: string
          changed_by: string | null
          created_at: string
          employer_id: string | null
          id: string
          job_id: string
          new_status: string
          old_status: string | null
          reason: string | null
          reason_my: string | null
        }
        Insert: {
          applicant_id: string
          application_id: string
          changed_by?: string | null
          created_at?: string
          employer_id?: string | null
          id?: string
          job_id: string
          new_status: string
          old_status?: string | null
          reason?: string | null
          reason_my?: string | null
        }
        Update: {
          applicant_id?: string
          application_id?: string
          changed_by?: string | null
          created_at?: string
          employer_id?: string | null
          id?: string
          job_id?: string
          new_status?: string
          old_status?: string | null
          reason?: string | null
          reason_my?: string | null
        }
        Relationships: []
      }
      applications: {
        Row: {
          applicant_id: string
          cover_letter_id: string | null
          created_at: string | null
          forwarded_to_email: string | null
          id: string
          interview_date: string | null
          job_id: string
          placement_fee: number | null
          placement_salary: number | null
          rejection_reason: string | null
          rejection_reason_my: string | null
          resume_id: string | null
          status: string | null
          updated_at: string | null
          withdrawn_at: string | null
        }
        Insert: {
          applicant_id: string
          cover_letter_id?: string | null
          created_at?: string | null
          forwarded_to_email?: string | null
          id?: string
          interview_date?: string | null
          job_id: string
          placement_fee?: number | null
          placement_salary?: number | null
          rejection_reason?: string | null
          rejection_reason_my?: string | null
          resume_id?: string | null
          status?: string | null
          updated_at?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          applicant_id?: string
          cover_letter_id?: string | null
          created_at?: string | null
          forwarded_to_email?: string | null
          id?: string
          interview_date?: string | null
          job_id?: string
          placement_fee?: number | null
          placement_salary?: number | null
          rejection_reason?: string | null
          rejection_reason_my?: string | null
          resume_id?: string | null
          status?: string | null
          updated_at?: string | null
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_cover_letter_id_fkey"
            columns: ["cover_letter_id"]
            isOneToOne: false
            referencedRelation: "user_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "user_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          author_id: string
          category: string | null
          content_en: string | null
          content_my: string
          created_at: string | null
          id: string
          image_url: string | null
          is_approved: boolean | null
          likes_count: number | null
          moderated_by: string | null
          moderation_reason: string | null
          shares_count: number | null
          updated_at: string | null
        }
        Insert: {
          author_id: string
          category?: string | null
          content_en?: string | null
          content_my: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_approved?: boolean | null
          likes_count?: number | null
          moderated_by?: string | null
          moderation_reason?: string | null
          shares_count?: number | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          category?: string | null
          content_en?: string | null
          content_my?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_approved?: boolean | null
          likes_count?: number | null
          moderated_by?: string | null
          moderation_reason?: string | null
          shares_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          category: string
          created_at: string
          email: string
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string
          name: string
          status: string
          subject: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          email: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message: string
          name: string
          status?: string
          subject: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          email?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string
          name?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      credit_packages: {
        Row: {
          badge_en: string | null
          badge_my: string | null
          bonus_credits: number
          created_at: string
          credits: number
          id: string
          is_active: boolean
          name_en: string
          name_my: string
          price_mmk: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          badge_en?: string | null
          badge_my?: string | null
          bonus_credits?: number
          created_at?: string
          credits: number
          id?: string
          is_active?: boolean
          name_en: string
          name_my?: string
          price_mmk: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          badge_en?: string | null
          badge_my?: string | null
          bonus_credits?: number
          created_at?: string
          credits?: number
          id?: string
          is_active?: boolean
          name_en?: string
          name_my?: string
          price_mmk?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      employer_profiles: {
        Row: {
          avatar_url: string | null
          benefits: string[] | null
          bio: string | null
          company_description: string | null
          company_linkedin: string | null
          company_name: string | null
          company_size: string | null
          company_website: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          cover_url: string | null
          created_at: string | null
          display_name: string
          full_address: string | null
          headline: string | null
          hq_country: string | null
          id: string
          industry: string | null
          is_verified: boolean | null
          languages: string[] | null
          last_seen_at: string | null
          location: string | null
          logo_url: string | null
          mission: string | null
          payment_methods: string[] | null
          referral_code: string | null
          updated_at: string | null
          verification_status: string | null
          visibility: string | null
          vision: string | null
          what_we_do: string | null
        }
        Insert: {
          avatar_url?: string | null
          benefits?: string[] | null
          bio?: string | null
          company_description?: string | null
          company_linkedin?: string | null
          company_name?: string | null
          company_size?: string | null
          company_website?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          cover_url?: string | null
          created_at?: string | null
          display_name?: string
          full_address?: string | null
          headline?: string | null
          hq_country?: string | null
          id: string
          industry?: string | null
          is_verified?: boolean | null
          languages?: string[] | null
          last_seen_at?: string | null
          location?: string | null
          logo_url?: string | null
          mission?: string | null
          payment_methods?: string[] | null
          referral_code?: string | null
          updated_at?: string | null
          verification_status?: string | null
          visibility?: string | null
          vision?: string | null
          what_we_do?: string | null
        }
        Update: {
          avatar_url?: string | null
          benefits?: string[] | null
          bio?: string | null
          company_description?: string | null
          company_linkedin?: string | null
          company_name?: string | null
          company_size?: string | null
          company_website?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          cover_url?: string | null
          created_at?: string | null
          display_name?: string
          full_address?: string | null
          headline?: string | null
          hq_country?: string | null
          id?: string
          industry?: string | null
          is_verified?: boolean | null
          languages?: string[] | null
          last_seen_at?: string | null
          location?: string | null
          logo_url?: string | null
          mission?: string | null
          payment_methods?: string[] | null
          referral_code?: string | null
          updated_at?: string | null
          verification_status?: string | null
          visibility?: string | null
          vision?: string | null
          what_we_do?: string | null
        }
        Relationships: []
      }
      feature_unlocks: {
        Row: {
          created_at: string
          expires_at: string | null
          feature_key: string
          id: string
          is_active: boolean
          metadata: Json
          starts_at: string
          target_id: string | null
          target_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          feature_key: string
          id?: string
          is_active?: boolean
          metadata?: Json
          starts_at?: string
          target_id?: string | null
          target_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          feature_key?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          starts_at?: string
          target_id?: string | null
          target_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      generated_documents: {
        Row: {
          content: string
          created_at: string | null
          doc_type: string
          id: string
          metadata: Json | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string | null
          doc_type: string
          id?: string
          metadata?: Json | null
          title?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          doc_type?: string
          id?: string
          metadata?: Json | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      guide_feedback: {
        Row: {
          created_at: string | null
          guide_id: string
          id: string
          is_helpful: boolean
          user_id: string
        }
        Insert: {
          created_at?: string | null
          guide_id: string
          id?: string
          is_helpful: boolean
          user_id: string
        }
        Update: {
          created_at?: string | null
          guide_id?: string
          id?: string
          is_helpful?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_feedback_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
        ]
      }
      guides: {
        Row: {
          author_id: string | null
          category: string
          content: string
          content_my: string | null
          country: string | null
          country_flag: string | null
          created_at: string | null
          id: string
          is_new: boolean | null
          is_verified: boolean | null
          read_time_minutes: number | null
          title: string
          title_my: string | null
          updated_at: string | null
          verified_by: string | null
        }
        Insert: {
          author_id?: string | null
          category: string
          content?: string
          content_my?: string | null
          country?: string | null
          country_flag?: string | null
          created_at?: string | null
          id?: string
          is_new?: boolean | null
          is_verified?: boolean | null
          read_time_minutes?: number | null
          title: string
          title_my?: string | null
          updated_at?: string | null
          verified_by?: string | null
        }
        Update: {
          author_id?: string | null
          category?: string
          content?: string
          content_my?: string | null
          country?: string | null
          country_flag?: string | null
          created_at?: string | null
          id?: string
          is_new?: boolean | null
          is_verified?: boolean | null
          read_time_minutes?: number | null
          title?: string
          title_my?: string | null
          updated_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      job_candidate_matches: {
        Row: {
          job_id: string
          score: number
          seeker_user_id: string
        }
        Insert: {
          job_id: string
          score: number
          seeker_user_id: string
        }
        Update: {
          job_id?: string
          score?: number
          seeker_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_candidate_matches_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_candidate_rejections: {
        Row: {
          created_at: string
          employer_user_id: string
          id: string
          job_id: string
          seeker_user_id: string
        }
        Insert: {
          created_at?: string
          employer_user_id: string
          id?: string
          job_id: string
          seeker_user_id: string
        }
        Update: {
          created_at?: string
          employer_user_id?: string
          id?: string
          job_id?: string
          seeker_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_candidate_rejections_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          employer_id: string
          id: string
          job_id: string
          new_status: string
          old_status: string | null
          reason: string | null
          reason_my: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          employer_id: string
          id?: string
          job_id: string
          new_status: string
          old_status?: string | null
          reason?: string | null
          reason_my?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          employer_id?: string
          id?: string
          job_id?: string
          new_status?: string
          old_status?: string | null
          reason?: string | null
          reason_my?: string | null
        }
        Relationships: []
      }
      jobs: {
        Row: {
          agent_client_id: string | null
          applicant_count: number | null
          application_method: string | null
          categories: string[]
          category: string | null
          client_company_name: string | null
          client_logo_url: string | null
          company: string
          contract_duration_months: number | null
          contract_duration_note: string | null
          contract_duration_type: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          description_my: string | null
          embedding: string | null
          embedding_input_hash: string | null
          embedding_updated_at: string | null
          employer_id: string
          expires_at: string | null
          external_url: string | null
          id: string
          is_diaspora_safe: boolean | null
          is_featured: boolean
          is_verified: boolean | null
          job_type: string | null
          location: string | null
          payment_methods: string[] | null
          posted_by_label: string
          rejection_reason: string | null
          requirements: string | null
          requirements_my: string | null
          requires_embassy: boolean | null
          requires_work_permit: boolean | null
          role_type: string | null
          salary_max: number | null
          salary_min: number | null
          salary_negotiable: boolean
          skills: string[] | null
          status: string | null
          title: string
          title_my: string | null
          updated_at: string | null
          visa_sponsorship: boolean | null
        }
        Insert: {
          agent_client_id?: string | null
          applicant_count?: number | null
          application_method?: string | null
          categories?: string[]
          category?: string | null
          client_company_name?: string | null
          client_logo_url?: string | null
          company?: string
          contract_duration_months?: number | null
          contract_duration_note?: string | null
          contract_duration_type?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          description_my?: string | null
          embedding?: string | null
          embedding_input_hash?: string | null
          embedding_updated_at?: string | null
          employer_id: string
          expires_at?: string | null
          external_url?: string | null
          id?: string
          is_diaspora_safe?: boolean | null
          is_featured?: boolean
          is_verified?: boolean | null
          job_type?: string | null
          location?: string | null
          payment_methods?: string[] | null
          posted_by_label?: string
          rejection_reason?: string | null
          requirements?: string | null
          requirements_my?: string | null
          requires_embassy?: boolean | null
          requires_work_permit?: boolean | null
          role_type?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_negotiable?: boolean
          skills?: string[] | null
          status?: string | null
          title: string
          title_my?: string | null
          updated_at?: string | null
          visa_sponsorship?: boolean | null
        }
        Update: {
          agent_client_id?: string | null
          applicant_count?: number | null
          application_method?: string | null
          categories?: string[]
          category?: string | null
          client_company_name?: string | null
          client_logo_url?: string | null
          company?: string
          contract_duration_months?: number | null
          contract_duration_note?: string | null
          contract_duration_type?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          description_my?: string | null
          embedding?: string | null
          embedding_input_hash?: string | null
          embedding_updated_at?: string | null
          employer_id?: string
          expires_at?: string | null
          external_url?: string | null
          id?: string
          is_diaspora_safe?: boolean | null
          is_featured?: boolean
          is_verified?: boolean | null
          job_type?: string | null
          location?: string | null
          payment_methods?: string[] | null
          posted_by_label?: string
          rejection_reason?: string | null
          requirements?: string | null
          requirements_my?: string | null
          requires_embassy?: boolean | null
          requires_work_permit?: boolean | null
          role_type?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_negotiable?: boolean
          skills?: string[] | null
          status?: string | null
          title?: string
          title_my?: string | null
          updated_at?: string | null
          visa_sponsorship?: boolean | null
        }
        Relationships: []
      }
      jobseeker_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          embedding: string | null
          embedding_input_hash: string | null
          embedding_updated_at: string | null
          experience: string | null
          has_laptop: boolean | null
          has_payoneer: boolean | null
          has_upwork: boolean | null
          has_wise: boolean | null
          headline: string | null
          internet_stable: boolean | null
          job_search_status: string
          languages: string[] | null
          last_seen_at: string | null
          location: string | null
          preferred_work_types: string[] | null
          referral_code: string | null
          referred_by: string | null
          remote_ready: boolean | null
          role_title: string | null
          skills: string[] | null
          updated_at: string
          user_id: string
          visibility: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          embedding?: string | null
          embedding_input_hash?: string | null
          embedding_updated_at?: string | null
          experience?: string | null
          has_laptop?: boolean | null
          has_payoneer?: boolean | null
          has_upwork?: boolean | null
          has_wise?: boolean | null
          headline?: string | null
          internet_stable?: boolean | null
          job_search_status?: string
          languages?: string[] | null
          last_seen_at?: string | null
          location?: string | null
          preferred_work_types?: string[] | null
          referral_code?: string | null
          referred_by?: string | null
          remote_ready?: boolean | null
          role_title?: string | null
          skills?: string[] | null
          updated_at?: string
          user_id: string
          visibility?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          embedding?: string | null
          embedding_input_hash?: string | null
          embedding_updated_at?: string | null
          experience?: string | null
          has_laptop?: boolean | null
          has_payoneer?: boolean | null
          has_upwork?: boolean | null
          has_wise?: boolean | null
          headline?: string | null
          internet_stable?: boolean | null
          job_search_status?: string
          languages?: string[] | null
          last_seen_at?: string | null
          location?: string | null
          preferred_work_types?: string[] | null
          referral_code?: string | null
          referred_by?: string | null
          remote_ready?: boolean | null
          role_title?: string | null
          skills?: string[] | null
          updated_at?: string
          user_id?: string
          visibility?: string | null
          website?: string | null
        }
        Relationships: []
      }
      mentor_availability_slots: {
        Row: {
          created_at: string
          day_of_week: string
          end_time: string
          id: string
          is_booked: boolean
          mentor_id: string
          slot_date: string | null
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: string
          end_time: string
          id?: string
          is_booked?: boolean
          mentor_id: string
          slot_date?: string | null
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: string
          end_time?: string
          id?: string
          is_booked?: boolean
          mentor_id?: string
          slot_date?: string | null
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      mentor_bookings: {
        Row: {
          booked_by: string | null
          created_at: string | null
          credits_charged: number | null
          decline_reason: string | null
          duration_minutes: number
          goals: string | null
          id: string
          mentee_completed_at: string | null
          mentee_id: string
          mentor_completed_at: string | null
          mentor_id: string
          message: string | null
          payment_status: string
          proposed_date: string | null
          proposed_time: string | null
          scheduled_date: string
          scheduled_time: string
          status: string | null
          topic: string | null
          topic_my: string | null
          updated_at: string | null
        }
        Insert: {
          booked_by?: string | null
          created_at?: string | null
          credits_charged?: number | null
          decline_reason?: string | null
          duration_minutes?: number
          goals?: string | null
          id?: string
          mentee_completed_at?: string | null
          mentee_id: string
          mentor_completed_at?: string | null
          mentor_id: string
          message?: string | null
          payment_status?: string
          proposed_date?: string | null
          proposed_time?: string | null
          scheduled_date: string
          scheduled_time: string
          status?: string | null
          topic?: string | null
          topic_my?: string | null
          updated_at?: string | null
        }
        Update: {
          booked_by?: string | null
          created_at?: string | null
          credits_charged?: number | null
          decline_reason?: string | null
          duration_minutes?: number
          goals?: string | null
          id?: string
          mentee_completed_at?: string | null
          mentee_id?: string
          mentor_completed_at?: string | null
          mentor_id?: string
          message?: string | null
          payment_status?: string
          proposed_date?: string | null
          proposed_time?: string | null
          scheduled_date?: string
          scheduled_time?: string
          status?: string | null
          topic?: string | null
          topic_my?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      mentor_earnings: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string | null
          currency: string
          id: string
          mentor_id: string
          paid_at: string | null
          paid_out_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          amount?: number
          booking_id?: string | null
          created_at?: string | null
          currency?: string
          id?: string
          mentor_id: string
          paid_at?: string | null
          paid_out_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string | null
          currency?: string
          id?: string
          mentor_id?: string
          paid_at?: string | null
          paid_out_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      mentor_mentees: {
        Row: {
          created_at: string | null
          goals: string | null
          id: string
          mentee_id: string
          mentor_id: string
          notes: string | null
          sessions_completed: number | null
          started_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          goals?: string | null
          id?: string
          mentee_id: string
          mentor_id: string
          notes?: string | null
          sessions_completed?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          goals?: string | null
          id?: string
          mentee_id?: string
          mentor_id?: string
          notes?: string | null
          sessions_completed?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      mentor_profiles: {
        Row: {
          available_days: string[] | null
          avatar_url: string | null
          bio: string | null
          bio_my: string | null
          company: string | null
          created_at: string | null
          currency: string | null
          display_name: string
          expertise: string[] | null
          headline: string | null
          hourly_rate: number | null
          id: string
          is_available: boolean | null
          languages: string[] | null
          last_seen_at: string | null
          location: string | null
          rating_avg: number | null
          referral_code: string | null
          timezone: string
          title: string | null
          total_mentees: number | null
          total_sessions: number | null
          updated_at: string | null
          visibility: string | null
        }
        Insert: {
          available_days?: string[] | null
          avatar_url?: string | null
          bio?: string | null
          bio_my?: string | null
          company?: string | null
          created_at?: string | null
          currency?: string | null
          display_name?: string
          expertise?: string[] | null
          headline?: string | null
          hourly_rate?: number | null
          id: string
          is_available?: boolean | null
          languages?: string[] | null
          last_seen_at?: string | null
          location?: string | null
          rating_avg?: number | null
          referral_code?: string | null
          timezone?: string
          title?: string | null
          total_mentees?: number | null
          total_sessions?: number | null
          updated_at?: string | null
          visibility?: string | null
        }
        Update: {
          available_days?: string[] | null
          avatar_url?: string | null
          bio?: string | null
          bio_my?: string | null
          company?: string | null
          created_at?: string | null
          currency?: string | null
          display_name?: string
          expertise?: string[] | null
          headline?: string | null
          hourly_rate?: number | null
          id?: string
          is_available?: boolean | null
          languages?: string[] | null
          last_seen_at?: string | null
          location?: string | null
          rating_avg?: number | null
          referral_code?: string | null
          timezone?: string
          title?: string | null
          total_mentees?: number | null
          total_sessions?: number | null
          updated_at?: string | null
          visibility?: string | null
        }
        Relationships: []
      }
      mentor_reviews: {
        Row: {
          booking_id: string | null
          created_at: string | null
          id: string
          mentor_id: string
          rating: number
          review_text: string | null
          review_text_my: string | null
          reviewer_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          id?: string
          mentor_id: string
          rating: number
          review_text?: string | null
          review_text_my?: string | null
          reviewer_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          id?: string
          mentor_id?: string
          rating?: number
          review_text?: string | null
          review_text_my?: string | null
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "mentor_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          description: string | null
          description_my: string | null
          id: string
          is_read: boolean | null
          link_path: string | null
          notification_type: string
          title: string
          title_my: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          description_my?: string | null
          id?: string
          is_read?: boolean | null
          link_path?: string | null
          notification_type: string
          title: string
          title_my?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          description_my?: string | null
          id?: string
          is_read?: boolean | null
          link_path?: string | null
          notification_type?: string
          title?: string
          title_my?: string | null
          user_id?: string
        }
        Relationships: []
      }
      partner_attributions: {
        Row: {
          attributed_at: string
          channel: string
          created_at: string
          first_paid_at: string | null
          id: string
          partner_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attributed_at?: string
          channel?: string
          created_at?: string
          first_paid_at?: string | null
          id?: string
          partner_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attributed_at?: string
          channel?: string
          created_at?: string
          first_paid_at?: string | null
          id?: string
          partner_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      partner_monthly_statements: {
        Row: {
          csat_score: number | null
          currency: string
          id: string
          l1_sla_pct: number | null
          partner_id: string
          period_month: number
          period_year: number
        }
        Insert: {
          csat_score?: number | null
          currency?: string
          id?: string
          l1_sla_pct?: number | null
          partner_id: string
          period_month: number
          period_year: number
        }
        Update: {
          csat_score?: number | null
          currency?: string
          id?: string
          l1_sla_pct?: number | null
          partner_id?: string
          period_month?: number
          period_year?: number
        }
        Relationships: []
      }
      partner_profiles: {
        Row: {
          avatar_url: string | null
          code: string | null
          contact_email: string | null
          contract_end_date: string | null
          contract_start_date: string | null
          created_at: string
          display_name: string
          is_active: boolean | null
          last_seen_at: string | null
          maintenance_rate_y2: number | null
          maintenance_rate_y3plus: number | null
          notes: string | null
          payout_cap_pct: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          code?: string | null
          contact_email?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          display_name?: string
          is_active?: boolean | null
          last_seen_at?: string | null
          maintenance_rate_y2?: number | null
          maintenance_rate_y3plus?: number | null
          notes?: string | null
          payout_cap_pct?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          code?: string | null
          contact_email?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          display_name?: string
          is_active?: boolean | null
          last_seen_at?: string | null
          maintenance_rate_y2?: number | null
          maintenance_rate_y3plus?: number | null
          notes?: string | null
          payout_cap_pct?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      partner_referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          partner_id: string
          status: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          partner_id: string
          status?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          partner_id?: string
          status?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          id: string
          parent_id: string | null
          post_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          id?: string
          parent_id?: string | null
          post_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          id?: string
          parent_id?: string | null
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_saves: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_saves_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          owner_id: string
          status: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          owner_id: string
          status?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          owner_id?: string
          status?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string | null
          id: string
          referral_code: string
          referred_id: string | null
          referrer_id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          referral_code: string
          referred_id?: string | null
          referrer_id: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          referral_code?: string
          referred_id?: string | null
          referrer_id?: string
          status?: string | null
        }
        Relationships: []
      }
      saved_jobs: {
        Row: {
          created_at: string | null
          id: string
          job_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_payment_requests: {
        Row: {
          addon_id: string | null
          admin_note: string | null
          amount: number | null
          booking_id: string | null
          created_at: string
          currency: string
          id: string
          mmk_amount: number
          npr_amount: number | null
          payment_method: string | null
          payment_type: string
          plan_id: string | null
          proof_url: string | null
          quantity: number
          reference_id: string | null
          request_type: string
          revenue_classification: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sender_reference: string | null
          status: string
          third_party_payout: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          addon_id?: string | null
          admin_note?: string | null
          amount?: number | null
          booking_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          mmk_amount: number
          npr_amount?: number | null
          payment_method?: string | null
          payment_type?: string
          plan_id?: string | null
          proof_url?: string | null
          quantity?: number
          reference_id?: string | null
          request_type: string
          revenue_classification?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_reference?: string | null
          status?: string
          third_party_payout?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          addon_id?: string | null
          admin_note?: string | null
          amount?: number | null
          booking_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          mmk_amount?: number
          npr_amount?: number | null
          payment_method?: string | null
          payment_type?: string
          plan_id?: string | null
          proof_url?: string | null
          quantity?: number
          reference_id?: string | null
          request_type?: string
          revenue_classification?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_reference?: string | null
          status?: string
          third_party_payout?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payment_requests_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "addon_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payment_requests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "mentor_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payment_requests_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          featured_jobs_quota: number
          id: string
          is_active: boolean
          job_postings_quota: number
          price_mmk: number
          sort_order: number
          tier: string
          unlock_quota: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          featured_jobs_quota?: number
          id?: string
          is_active?: boolean
          job_postings_quota?: number
          price_mmk?: number
          sort_order?: number
          tier: string
          unlock_quota?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          featured_jobs_quota?: number
          id?: string
          is_active?: boolean
          job_postings_quota?: number
          price_mmk?: number
          sort_order?: number
          tier?: string
          unlock_quota?: number
          updated_at?: string
        }
        Relationships: []
      }
      subscription_quotas: {
        Row: {
          active_jobs_used: number
          featured_jobs_total: number
          featured_jobs_used: number
          job_postings_quota: number
          unlocks_total: number
          unlocks_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          active_jobs_used?: number
          featured_jobs_total?: number
          featured_jobs_used?: number
          job_postings_quota?: number
          unlocks_total?: number
          unlocks_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          active_jobs_used?: number
          featured_jobs_total?: number
          featured_jobs_used?: number
          job_postings_quota?: number
          unlocks_total?: number
          unlocks_used?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          id: string
          mmk_paid: number
          plan_id: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mmk_paid?: number
          plan_id: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mmk_paid?: number
          plan_id?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      topup_requests: {
        Row: {
          admin_note: string | null
          created_at: string
          created_by: string | null
          credits_to_grant: number
          id: string
          mmk_amount: number
          package_id: string | null
          payment_method: string
          proof_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sender_reference: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          created_by?: string | null
          credits_to_grant: number
          id?: string
          mmk_amount: number
          package_id?: string | null
          payment_method: string
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_reference?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          created_by?: string | null
          credits_to_grant?: number
          id?: string
          mmk_amount?: number
          package_id?: string | null
          payment_method?: string
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_reference?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topup_requests_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "credit_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      user_account_state: {
        Row: {
          created_at: string
          deletion_requested_at: string | null
          deletion_scheduled_at: string | null
          is_suspended: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deletion_requested_at?: string | null
          deletion_scheduled_at?: string | null
          is_suspended?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deletion_requested_at?: string | null
          deletion_scheduled_at?: string | null
          is_suspended?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_documents: {
        Row: {
          created_at: string | null
          file_name: string
          file_size_bytes: number | null
          file_type: string
          file_url: string
          id: string
          is_primary: boolean | null
          parsed_at: string | null
          parsed_data: Json | null
          parsed_text: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_name?: string
          file_size_bytes?: number | null
          file_type?: string
          file_url?: string
          id?: string
          is_primary?: boolean | null
          parsed_at?: string | null
          parsed_data?: Json | null
          parsed_text?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size_bytes?: number | null
          file_type?: string
          file_url?: string
          id?: string
          is_primary?: boolean | null
          parsed_at?: string | null
          parsed_data?: Json | null
          parsed_text?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      user_settings: {
        Row: {
          created_at: string | null
          email_notifications: boolean
          font_encoding: string
          id: string
          language: string
          profile_visibility: string
          push_notifications: boolean
          remember_device: boolean
          session_expiry: string
          telegram_chat_id: string | null
          telegram_linked: boolean
          telegram_username: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_notifications?: boolean
          font_encoding?: string
          id?: string
          language?: string
          profile_visibility?: string
          push_notifications?: boolean
          remember_device?: boolean
          session_expiry?: string
          telegram_chat_id?: string | null
          telegram_linked?: boolean
          telegram_username?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_notifications?: boolean
          font_encoding?: string
          id?: string
          language?: string
          profile_visibility?: string
          push_notifications?: boolean
          remember_device?: boolean
          session_expiry?: string
          telegram_chat_id?: string | null
          telegram_linked?: boolean
          telegram_username?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          addon_id: string | null
          admin_note: string | null
          amount: number | null
          booking_id: string | null
          created_at: string
          created_by: string | null
          credits: number
          currency: string
          id: string
          idempotency_key: string | null
          kind: string
          metadata: Json
          mmk_amount: number | null
          note: string | null
          npr_amount: number | null
          package_id: string | null
          payment_method: string | null
          payment_type: string | null
          plan_id: string | null
          proof_url: string | null
          quantity: number
          ref_id: string | null
          ref_type: string | null
          reference_id: string | null
          request_type: string | null
          revenue_classification: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sender_reference: string | null
          source_id: string | null
          source_table: string | null
          status: string
          third_party_payout: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          addon_id?: string | null
          admin_note?: string | null
          amount?: number | null
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          credits: number
          currency?: string
          id?: string
          idempotency_key?: string | null
          kind: string
          metadata?: Json
          mmk_amount?: number | null
          note?: string | null
          npr_amount?: number | null
          package_id?: string | null
          payment_method?: string | null
          payment_type?: string | null
          plan_id?: string | null
          proof_url?: string | null
          quantity?: number
          ref_id?: string | null
          ref_type?: string | null
          reference_id?: string | null
          request_type?: string | null
          revenue_classification?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_reference?: string | null
          source_id?: string | null
          source_table?: string | null
          status?: string
          third_party_payout?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          addon_id?: string | null
          admin_note?: string | null
          amount?: number | null
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          credits?: number
          currency?: string
          id?: string
          idempotency_key?: string | null
          kind?: string
          metadata?: Json
          mmk_amount?: number | null
          note?: string | null
          npr_amount?: number | null
          package_id?: string | null
          payment_method?: string | null
          payment_type?: string | null
          plan_id?: string | null
          proof_url?: string | null
          quantity?: number
          ref_id?: string | null
          ref_type?: string | null
          reference_id?: string | null
          request_type?: string | null
          revenue_classification?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_reference?: string | null
          source_id?: string | null
          source_table?: string | null
          status?: string
          third_party_payout?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance_credits: number
          created_at: string
          lifetime_spent_credits: number
          lifetime_topup_mmk: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_credits?: number
          created_at?: string
          lifetime_spent_credits?: number
          lifetime_topup_mmk?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_credits?: number
          created_at?: string
          lifetime_spent_credits?: number
          lifetime_topup_mmk?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          deletion_requested_at: string | null
          deletion_scheduled_at: string | null
          display_name: string | null
          embedding: string | null
          embedding_input_hash: string | null
          embedding_updated_at: string | null
          experience: string | null
          has_laptop: boolean | null
          has_payoneer: boolean | null
          has_upwork: boolean | null
          has_wise: boolean | null
          headline: string | null
          id: string | null
          internet_stable: boolean | null
          is_suspended: boolean | null
          job_search_status: string | null
          languages: string[] | null
          last_seen_at: string | null
          location: string | null
          preferred_work_types: string[] | null
          referral_code: string | null
          referred_by: string | null
          remote_ready: boolean | null
          role_title: string | null
          skills: string[] | null
          updated_at: string | null
          visibility: string | null
          website: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _mentor_session_release_internal: {
        Args: { _booking_id: string }
        Returns: undefined
      }
      _wallet_apply: {
        Args: { _delta: number; _topup_mmk?: number; _user: string }
        Returns: undefined
      }
      accept_counter_proposal: {
        Args: { _booking_id: string }
        Returns: {
          booked_by: string | null
          created_at: string | null
          credits_charged: number | null
          decline_reason: string | null
          duration_minutes: number
          goals: string | null
          id: string
          mentee_completed_at: string | null
          mentee_id: string
          mentor_completed_at: string | null
          mentor_id: string
          message: string | null
          payment_status: string
          proposed_date: string | null
          proposed_time: string | null
          scheduled_date: string
          scheduled_time: string
          status: string | null
          topic: string | null
          topic_my: string | null
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "mentor_bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_confirm_user_email: {
        Args: { _user_id: string }
        Returns: undefined
      }
      admin_create_partner: {
        Args: {
          _code: string
          _contact_email?: string
          _contract_start_date?: string
          _name: string
          _user_id?: string
        }
        Returns: string
      }
      admin_delete_employer: {
        Args: { _employer_id: string }
        Returns: undefined
      }
      admin_finalize_partner_statement: {
        Args: { _month: number; _partner_id: string; _year: number }
        Returns: Json
      }
      admin_link_partner_user: {
        Args: { _partner_id: string; _user_id: string }
        Returns: undefined
      }
      admin_mark_partner_statement_paid: {
        Args: {
          _month: number
          _partner_id: string
          _payout_reference: string
          _year: number
        }
        Returns: Json
      }
      admin_record_payment_reversal: {
        Args: {
          _amount: number
          _npr_amount?: number
          _payment_request_id: string
          _reason?: string
          _reversal_type: string
        }
        Returns: string
      }
      admin_set_payment_revenue_overrides: {
        Args: {
          _npr_amount: number
          _payment_id: string
          _revenue_classification: string
          _third_party_payout: number
        }
        Returns: undefined
      }
      admin_set_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: Json
      }
      admin_unlink_partner_user: {
        Args: { _partner_id: string }
        Returns: undefined
      }
      admin_verify_employer: {
        Args: { _employer_id: string; _reason?: string; _status: string }
        Returns: Json
      }
      ai_rate_limit_check_and_increment: {
        Args: { _action: string; _daily_cap: number; _user_id: string }
        Returns: {
          allowed: boolean
          current_count: number
        }[]
      }
      approve_job: { Args: { _job_id: string }; Returns: Json }
      approve_subscription_payment: {
        Args: { p_admin_note?: string; p_request_id: string }
        Returns: undefined
      }
      assign_my_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: Json
      }
      become_mentor: { Args: never; Returns: Json }
      can_notify: { Args: { _target_user_id: string }; Returns: boolean }
      compute_subscription_price: {
        Args: { p_cycle: string; p_plan_id: string }
        Returns: {
          launch_applied: boolean
          launch_ends_at: string
          mmk: number
        }[]
      }
      create_subscription_payment_request: {
        Args: {
          _addon_id: string
          _mmk_amount: number
          _payment_method: string
          _plan_id: string
          _proof_url: string
          _quantity: number
          _request_type: string
          _sender_reference: string
        }
        Returns: string
      }
      current_partner_id: { Args: never; Returns: string }
      delete_job: { Args: { _job_id: string }; Returns: Json }
      delete_user_cascade: {
        Args: { _target_user_id: string }
        Returns: undefined
      }
      enroll_career_track: { Args: { _track_id: string }; Returns: Json }
      feature_job_with_quota: { Args: { _job_id: string }; Returns: Json }
      get_applicant_contact: {
        Args: { _applicant_id: string }
        Returns: {
          email: string
          phone: string
          unlocked: boolean
        }[]
      }
      get_boosted_profile_ids: {
        Args: never
        Returns: {
          expires_at: string
          user_id: string
        }[]
      }
      get_my_contact_info: {
        Args: never
        Returns: {
          email: string
          phone: string
        }[]
      }
      get_user_contacts_admin: {
        Args: { _ids: string[] }
        Returns: {
          email: string
          id: string
          phone: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_partner: { Args: { _user_id: string }; Returns: boolean }
      is_employer_or_agent: { Args: { _user_id: string }; Returns: boolean }
      is_partner: { Args: { _user_id: string }; Returns: boolean }
      is_partner_period_finalized: {
        Args: { _partner_id: string; _ts: string }
        Returns: boolean
      }
      is_profile_complete: { Args: { _user_id: string }; Returns: boolean }
      is_user_onboarded: { Args: { _user_id: string }; Returns: string }
      lookup_employer_verification_status: {
        Args: { _email: string }
        Returns: string
      }
      lookup_partner_referral_code: { Args: { _code: string }; Returns: string }
      lookup_referrer_by_code: { Args: { _code: string }; Returns: string }
      mark_session_complete: {
        Args: { _booking_id: string; _role: string }
        Returns: Json
      }
      match_candidates_for_job: {
        Args: { _job_id: string; _limit: number }
        Returns: {
          id: string
          similarity: number
        }[]
      }
      match_jobs_for_user: {
        Args: { _limit: number; _user_id: string }
        Returns: {
          id: string
          similarity: number
        }[]
      }
      mentor_book_with_credits: {
        Args: { _booking_id: string; _credits: number }
        Returns: Json
      }
      mentor_create_booking_and_hold: {
        Args: {
          _booked_by?: string
          _credits: number
          _duration_minutes: number
          _goals: string
          _mentor_id: string
          _message: string
          _scheduled_date: string
          _scheduled_time: string
          _topic: string
        }
        Returns: Json
      }
      mentor_payout_mark_paid: {
        Args: { _earning_id: string; _note?: string }
        Returns: Json
      }
      mentor_session_refund: {
        Args: { _booking_id: string; _reason?: string }
        Returns: Json
      }
      mentor_session_release: { Args: { _booking_id: string }; Returns: Json }
      mint_partner_referral_codes: {
        Args: { _count?: number }
        Returns: {
          code: string
          created_at: string
          id: string
          partner_id: string
          status: string
          used_at: string | null
          used_by: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "partner_referral_codes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      mint_referral_codes: {
        Args: { _count?: number; _owner_id: string }
        Returns: number
      }
      partner_age_bucket: { Args: { _months: number }; Returns: string }
      partner_months_between: {
        Args: { _from: string; _to: string }
        Returns: number
      }
      partner_payment_npr: {
        Args: {
          _amount: number
          _npr_amount: number
          _payment_type: string
          _third_party_payout: number
        }
        Returns: number
      }
      partner_period_bounds_yangon: {
        Args: { _month: number; _year: number }
        Returns: {
          end_at: string
          start_at: string
        }[]
      }
      post_job_with_credits: {
        Args: { _featured?: boolean; _payload: Json }
        Returns: Json
      }
      post_job_with_quota: {
        Args: { _featured?: boolean; _payload: Json }
        Returns: Json
      }
      process_referral_reward: {
        Args: { _referrer_id: string }
        Returns: undefined
      }
      redeem_partner_referral_code: {
        Args: { _code: string; _user_id: string }
        Returns: string
      }
      redeem_referral_code: {
        Args: { _code: string; _new_user_id: string }
        Returns: Json
      }
      refresh_job_featured: { Args: { _job_id: string }; Returns: undefined }
      reject_job: { Args: { _job_id: string; _reason?: string }; Returns: Json }
      reject_subscription_payment: {
        Args: { p_admin_note?: string; p_request_id: string }
        Returns: undefined
      }
      review_payment_request: {
        Args: { _admin_note?: string; _new_status: string; _payment_id: string }
        Returns: Json
      }
      set_user_suspended: {
        Args: { _suspended: boolean; _user_id: string }
        Returns: Json
      }
      tick_expire_profile_boosts: { Args: never; Returns: undefined }
      tick_expire_subscriptions: { Args: never; Returns: undefined }
      touch_my_presence: { Args: never; Returns: undefined }
      try_grant_signup_bonus: { Args: { _user_id: string }; Returns: boolean }
      unlock_contact_with_quota: {
        Args: { _target_id: string; _target_type: string }
        Returns: Json
      }
      update_my_profile: { Args: { p_updates: Json }; Returns: undefined }
      user_conversation_ids: { Args: { _user_id: string }; Returns: string[] }
      wallet_adjust: {
        Args: { _delta: number; _note: string; _user_id: string }
        Returns: Json
      }
      wallet_refund_transaction: {
        Args: { _reason?: string; _tx_id: string }
        Returns: Json
      }
      wallet_spend: {
        Args: {
          _action_key: string
          _idempotency_key: string
          _metadata?: Json
          _target_id: string
          _target_type: string
        }
        Returns: Json
      }
      wallet_topup_approve: {
        Args: { _admin_note?: string; _topup_id: string }
        Returns: Json
      }
      wallet_topup_reject: {
        Args: { _admin_note?: string; _topup_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "job_seeker"
        | "agent"
        | "employer"
        | "partner"
        | "mentor"
        | "admin"
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
        "job_seeker",
        "agent",
        "employer",
        "partner",
        "mentor",
        "admin",
      ],
    },
  },
} as const
