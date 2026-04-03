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
      applications: {
        Row: {
          applicant_id: string
          cover_letter: string | null
          created_at: string | null
          cv_document_id: string | null
          forwarded_to_email: string | null
          id: string
          interview_date: string | null
          job_id: string
          placement_fee: number | null
          placement_salary: number | null
          rejection_reason: string | null
          rejection_reason_my: string | null
          status: string | null
          updated_at: string | null
          withdrawn_at: string | null
        }
        Insert: {
          applicant_id: string
          cover_letter?: string | null
          created_at?: string | null
          cv_document_id?: string | null
          forwarded_to_email?: string | null
          id?: string
          interview_date?: string | null
          job_id: string
          placement_fee?: number | null
          placement_salary?: number | null
          rejection_reason?: string | null
          rejection_reason_my?: string | null
          status?: string | null
          updated_at?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          applicant_id?: string
          cover_letter?: string | null
          created_at?: string | null
          cv_document_id?: string | null
          forwarded_to_email?: string | null
          id?: string
          interview_date?: string | null
          job_id?: string
          placement_fee?: number | null
          placement_salary?: number | null
          rejection_reason?: string | null
          rejection_reason_my?: string | null
          status?: string | null
          updated_at?: string | null
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
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
      cv_documents: {
        Row: {
          created_at: string | null
          file_name: string
          file_size_bytes: number | null
          file_type: string
          file_url: string
          id: string
          is_primary: boolean | null
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
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      delegate_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          is_revoked: boolean | null
          owner_id: string
          permissions: string[] | null
          token: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          is_revoked?: boolean | null
          owner_id: string
          permissions?: string[] | null
          token: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          is_revoked?: boolean | null
          owner_id?: string
          permissions?: string[] | null
          token?: string
        }
        Relationships: []
      }
      employer_profiles: {
        Row: {
          company_description: string | null
          company_linkedin: string | null
          company_name: string | null
          company_size: string | null
          company_website: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          hq_country: string | null
          id: string
          industry: string | null
          is_verified: boolean | null
          payment_methods: string[] | null
          updated_at: string | null
          verification_status: string | null
        }
        Insert: {
          company_description?: string | null
          company_linkedin?: string | null
          company_name?: string | null
          company_size?: string | null
          company_website?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          hq_country?: string | null
          id: string
          industry?: string | null
          is_verified?: boolean | null
          payment_methods?: string[] | null
          updated_at?: string | null
          verification_status?: string | null
        }
        Update: {
          company_description?: string | null
          company_linkedin?: string | null
          company_name?: string | null
          company_size?: string | null
          company_website?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          hq_country?: string | null
          id?: string
          industry?: string | null
          is_verified?: boolean | null
          payment_methods?: string[] | null
          updated_at?: string | null
          verification_status?: string | null
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
      jobs: {
        Row: {
          applicant_count: number | null
          application_method: string | null
          category: string | null
          company: string
          created_at: string | null
          currency: string | null
          description: string | null
          description_my: string | null
          employer_id: string
          external_url: string | null
          id: string
          is_diaspora_safe: boolean | null
          is_featured: boolean
          is_verified: boolean | null
          job_type: string | null
          location: string | null
          payment_methods: string[] | null
          requirements: string | null
          requirements_my: string | null
          requires_embassy: boolean | null
          requires_work_permit: boolean | null
          role_type: string | null
          salary_max: number | null
          salary_min: number | null
          skills: string[] | null
          status: string | null
          title: string
          title_my: string | null
          updated_at: string | null
          visa_sponsorship: boolean | null
        }
        Insert: {
          applicant_count?: number | null
          application_method?: string | null
          category?: string | null
          company?: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          description_my?: string | null
          employer_id: string
          external_url?: string | null
          id?: string
          is_diaspora_safe?: boolean | null
          is_featured?: boolean
          is_verified?: boolean | null
          job_type?: string | null
          location?: string | null
          payment_methods?: string[] | null
          requirements?: string | null
          requirements_my?: string | null
          requires_embassy?: boolean | null
          requires_work_permit?: boolean | null
          role_type?: string | null
          salary_max?: number | null
          salary_min?: number | null
          skills?: string[] | null
          status?: string | null
          title: string
          title_my?: string | null
          updated_at?: string | null
          visa_sponsorship?: boolean | null
        }
        Update: {
          applicant_count?: number | null
          application_method?: string | null
          category?: string | null
          company?: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          description_my?: string | null
          employer_id?: string
          external_url?: string | null
          id?: string
          is_diaspora_safe?: boolean | null
          is_featured?: boolean
          is_verified?: boolean | null
          job_type?: string | null
          location?: string | null
          payment_methods?: string[] | null
          requirements?: string | null
          requirements_my?: string | null
          requires_embassy?: boolean | null
          requires_work_permit?: boolean | null
          role_type?: string | null
          salary_max?: number | null
          salary_min?: number | null
          skills?: string[] | null
          status?: string | null
          title?: string
          title_my?: string | null
          updated_at?: string | null
          visa_sponsorship?: boolean | null
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
          goals: string | null
          id: string
          mentee_completed_at: string | null
          mentee_id: string
          mentor_completed_at: string | null
          mentor_id: string
          message: string | null
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
          goals?: string | null
          id?: string
          mentee_completed_at?: string | null
          mentee_id: string
          mentor_completed_at?: string | null
          mentor_id: string
          message?: string | null
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
          goals?: string | null
          id?: string
          mentee_completed_at?: string | null
          mentee_id?: string
          mentor_completed_at?: string | null
          mentor_id?: string
          message?: string | null
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
          bio: string | null
          bio_my: string | null
          company: string | null
          created_at: string | null
          currency: string | null
          expertise: string[] | null
          hourly_rate: number | null
          id: string
          is_available: boolean | null
          location: string | null
          mentoring_since: string | null
          rating_avg: number | null
          timezone: string
          title: string | null
          total_mentees: number | null
          total_sessions: number | null
          updated_at: string | null
        }
        Insert: {
          available_days?: string[] | null
          bio?: string | null
          bio_my?: string | null
          company?: string | null
          created_at?: string | null
          currency?: string | null
          expertise?: string[] | null
          hourly_rate?: number | null
          id: string
          is_available?: boolean | null
          location?: string | null
          mentoring_since?: string | null
          rating_avg?: number | null
          timezone?: string
          title?: string | null
          total_mentees?: number | null
          total_sessions?: number | null
          updated_at?: string | null
        }
        Update: {
          available_days?: string[] | null
          bio?: string | null
          bio_my?: string | null
          company?: string | null
          created_at?: string | null
          currency?: string | null
          expertise?: string[] | null
          hourly_rate?: number | null
          id?: string
          is_available?: boolean | null
          location?: string | null
          mentoring_since?: string | null
          rating_avg?: number | null
          timezone?: string
          title?: string | null
          total_mentees?: number | null
          total_sessions?: number | null
          updated_at?: string | null
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
      payment_requests: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          currency: string
          id: string
          payment_method: string
          payment_type: string
          proof_url: string | null
          reference_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string
          payment_type?: string
          proof_url?: string | null
          reference_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string
          payment_type?: string
          proof_url?: string | null
          reference_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
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
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string
          email: string | null
          experience: string | null
          has_laptop: boolean | null
          has_payoneer: boolean | null
          has_upwork: boolean | null
          has_wise: boolean | null
          headline: string | null
          id: string
          internet_stable: boolean | null
          is_premium: boolean | null
          languages: string[] | null
          location: string | null
          phone: string | null
          preferred_work_types: string[] | null
          primary_role: string
          referral_code: string | null
          referred_by: string | null
          remote_ready: boolean | null
          role_title: string | null
          skills: string[] | null
          updated_at: string | null
          visibility: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string
          email?: string | null
          experience?: string | null
          has_laptop?: boolean | null
          has_payoneer?: boolean | null
          has_upwork?: boolean | null
          has_wise?: boolean | null
          headline?: string | null
          id: string
          internet_stable?: boolean | null
          is_premium?: boolean | null
          languages?: string[] | null
          location?: string | null
          phone?: string | null
          preferred_work_types?: string[] | null
          primary_role?: string
          referral_code?: string | null
          referred_by?: string | null
          remote_ready?: boolean | null
          role_title?: string | null
          skills?: string[] | null
          updated_at?: string | null
          visibility?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string
          email?: string | null
          experience?: string | null
          has_laptop?: boolean | null
          has_payoneer?: boolean | null
          has_upwork?: boolean | null
          has_wise?: boolean | null
          headline?: string | null
          id?: string
          internet_stable?: boolean | null
          is_premium?: boolean | null
          languages?: string[] | null
          location?: string | null
          phone?: string | null
          preferred_work_types?: string[] | null
          primary_role?: string
          referral_code?: string | null
          referred_by?: string | null
          remote_ready?: boolean | null
          role_title?: string | null
          skills?: string[] | null
          updated_at?: string | null
          visibility?: string | null
          website?: string | null
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
      scam_reports: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          reason: string | null
          reported_entity_id: string
          reported_entity_type: string
          reporter_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          reason?: string | null
          reported_entity_id: string
          reported_entity_type: string
          reporter_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          reason?: string | null
          reported_entity_id?: string
          reported_entity_type?: string
          reporter_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          badge_en: string | null
          badge_my: string | null
          country: string
          created_at: string | null
          currency: string
          duration_months: number | null
          id: string
          is_active: boolean
          name_en: string
          name_my: string
          plan_id: string
          price: number
          save_label_en: string | null
          save_label_my: string | null
          sort_order: number
          updated_at: string | null
        }
        Insert: {
          badge_en?: string | null
          badge_my?: string | null
          country?: string
          created_at?: string | null
          currency?: string
          duration_months?: number | null
          id?: string
          is_active?: boolean
          name_en?: string
          name_my?: string
          plan_id: string
          price?: number
          save_label_en?: string | null
          save_label_my?: string | null
          sort_order?: number
          updated_at?: string | null
        }
        Update: {
          badge_en?: string | null
          badge_my?: string | null
          country?: string
          created_at?: string | null
          currency?: string
          duration_months?: number | null
          id?: string
          is_active?: boolean
          name_en?: string
          name_my?: string
          plan_id?: string
          price?: number
          save_label_en?: string | null
          save_label_my?: string | null
          sort_order?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_cycle: string | null
          created_at: string | null
          currency: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_type: string
          price_cents: number | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          billing_cycle?: string | null
          created_at?: string | null
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_type: string
          price_cents?: number | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          billing_cycle?: string | null
          created_at?: string | null
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_type?: string
          price_cents?: number | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
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
          font_encoding: string
          id: string
          language: string
          profile_visibility: string
          push_notifications: boolean
          remember_device: boolean
          session_expiry: string
          telegram_chat_id: string | null
          telegram_linked: boolean
          telegram_linked_at: string | null
          telegram_username: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          font_encoding?: string
          id?: string
          language?: string
          profile_visibility?: string
          push_notifications?: boolean
          remember_device?: boolean
          session_expiry?: string
          telegram_chat_id?: string | null
          telegram_linked?: boolean
          telegram_linked_at?: string | null
          telegram_username?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          font_encoding?: string
          id?: string
          language?: string
          profile_visibility?: string
          push_notifications?: boolean
          remember_device?: boolean
          session_expiry?: string
          telegram_chat_id?: string | null
          telegram_linked?: boolean
          telegram_linked_at?: string | null
          telegram_username?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      set_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
