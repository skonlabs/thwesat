import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { EmailAPIError, sendLovableEmail } from 'npm:@lovable.dev/email-js'
import { Webhook, WebhookVerificationError } from 'https://esm.sh/standardwebhooks@1.0.0'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, webhook-id, webhook-signature, webhook-timestamp, x-lovable-signature, x-lovable-timestamp, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const EMAIL_SUBJECTS: Record<string, string> = {
  signup: 'Confirm your email',
  invite: "You've been invited",
  magiclink: 'Your login link',
  recovery: 'Reset your password',
  email_change: 'Confirm your new email',
  reauthentication: 'Your verification code',
}

const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
}

const SITE_NAME = 'thwesat'
const SENDER_DOMAIN = 'notify.thwesat.com'
const ROOT_DOMAIN = 'thwesat.com'
const FROM_DOMAIN = 'notify.thwesat.com'
const SAMPLE_PROJECT_URL = 'https://thwesat.lovable.app'
const SAMPLE_EMAIL = 'user@example.test'
const SAMPLE_DATA: Record<string, object> = {
  signup: {
    siteName: SITE_NAME,
    siteUrl: SAMPLE_PROJECT_URL,
    recipient: SAMPLE_EMAIL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  magiclink: {
    siteName: SITE_NAME,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  recovery: {
    siteName: SITE_NAME,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  invite: {
    siteName: SITE_NAME,
    siteUrl: SAMPLE_PROJECT_URL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  email_change: {
    siteName: SITE_NAME,
    oldEmail: SAMPLE_EMAIL,
    email: SAMPLE_EMAIL,
    newEmail: SAMPLE_EMAIL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  reauthentication: {
    token: '123456',
  },
}

type SupabaseEmailPayload = {
  user?: {
    email?: string
  }
  email_data?: {
    token?: string
    token_hash?: string
    redirect_to?: string
    email_action_type?: string
    site_url?: string
    token_new?: string
    token_hash_new?: string
    email?: string
    new_email?: string
    new_token?: string
  }
}

function normalizeEmailType(type?: string) {
  if (type === 'email_change_current' || type === 'email_change_new') return 'email_change'
  return type || ''
}

function buildConfirmationUrl(payload: SupabaseEmailPayload) {
  const emailData = payload.email_data || {}
  const siteUrl = emailData.site_url || `https://${ROOT_DOMAIN}`
  const redirectTo = emailData.redirect_to || siteUrl
  const tokenHash = emailData.token_hash || emailData.token || ''
  const type = emailData.email_action_type || 'magiclink'

  if (!tokenHash) return redirectTo

  const verifyUrl = new URL('/auth/v1/verify', Deno.env.get('SUPABASE_URL'))
  verifyUrl.searchParams.set('token', tokenHash)
  verifyUrl.searchParams.set('type', type)
  verifyUrl.searchParams.set('redirect_to', redirectTo)
  return verifyUrl.toString()
}

async function handlePreview(req: Request): Promise<Response> {
  const previewCorsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: previewCorsHeaders })
  }

  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  const authHeader = req.headers.get('Authorization')

  if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let type: string
  try {
    const body = await req.json()
    type = body.type
  } catch (_error) {
    return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
      status: 400,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const EmailTemplate = EMAIL_TEMPLATES[type]

  if (!EmailTemplate) {
    return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }), {
      status: 400,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const sampleData = SAMPLE_DATA[type] || {}
  const html = await renderAsync(React.createElement(EmailTemplate, sampleData))

  return new Response(html, {
    status: 200,
    headers: { ...previewCorsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  })
}

async function verifyAndParseSupabaseHook(req: Request): Promise<SupabaseEmailPayload> {
  const hookSecret = Deno.env.get('AUTH_HOOK_SECRET')

  if (!hookSecret) {
    console.error('AUTH_HOOK_SECRET not configured')
    throw new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const rawBody = await req.text()
  const headers = Object.fromEntries(req.headers)
  const base64Secret = hookSecret.replace(/^v1,whsec_/, '')
  const webhook = new Webhook(base64Secret)

  try {
    return webhook.verify(rawBody, headers) as SupabaseEmailPayload
  } catch (error) {
    const hasAuthHeader = req.headers.has('authorization')
    const hasSignatureHeaders =
      req.headers.has('webhook-signature') && req.headers.has('webhook-timestamp')

    console.error('Supabase auth hook signature verification failed', {
      hasAuthHeader,
      hasSignatureHeaders,
      error: error instanceof Error ? error.message : String(error),
    })

    if (error instanceof WebhookVerificationError || error instanceof Error) {
      throw new Response(
        JSON.stringify({
          error: {
            http_code: 401,
            message: hasAuthHeader || hasSignatureHeaders
              ? 'Invalid hook signature'
              : 'Hook requires authorization token',
          },
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw error
  }
}

async function handleWebhook(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const apiKey = Deno.env.get('LOVABLE_API_KEY')

  if (!apiKey) {
    console.error('LOVABLE_API_KEY not configured')
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let payload: SupabaseEmailPayload
  try {
    payload = await verifyAndParseSupabaseHook(req)
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Webhook verification failed', { error })
    return new Response(JSON.stringify({ error: 'Invalid webhook payload' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const emailData = payload.email_data || {}
  const emailType = normalizeEmailType(emailData.email_action_type)
  const recipient = payload.user?.email || emailData.email

  if (!recipient) {
    console.error('Supabase auth hook payload missing recipient', { emailType })
    return new Response(JSON.stringify({ error: 'Invalid webhook payload' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const EmailTemplate = EMAIL_TEMPLATES[emailType]
  if (!EmailTemplate) {
    console.error('Unknown email type', { emailType, recipient })
    return new Response(JSON.stringify({ error: `Unknown email type: ${emailType}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const confirmationUrl = buildConfirmationUrl(payload)
  const templateProps = {
    siteName: SITE_NAME,
    siteUrl: `https://${ROOT_DOMAIN}`,
    recipient,
    confirmationUrl,
    token: emailData.token,
    email: recipient,
    oldEmail: recipient,
    newEmail: emailData.new_email,
  }

  const html = await renderAsync(React.createElement(EmailTemplate, templateProps))
  const text = await renderAsync(React.createElement(EmailTemplate, templateProps), {
    plainText: true,
  })
  const idempotencyKey = `supabase-auth-${emailType}-${recipient}-${emailData.token_hash || emailData.token || crypto.randomUUID()}`

  try {
    await sendLovableEmail(
      {
        to: recipient,
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject: EMAIL_SUBJECTS[emailType] || 'Notification',
        html,
        text,
        purpose: 'transactional',
        label: emailType,
        idempotency_key: idempotencyKey,
        unsubscribe_token: `auth-${crypto.randomUUID()}`,
      },
      { apiKey }
    )
  } catch (error) {
    if (error instanceof EmailAPIError) {
      console.error('Lovable email API rejected auth email', {
        status: error.status,
        message: error.message,
        emailType,
        recipient,
      })
    } else {
      console.error('Failed to send auth email', { error, emailType, recipient })
    }

    return new Response(
      JSON.stringify({
        error: {
          http_code: 500,
          message: 'Failed to send auth email',
        },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log('Auth email sent from custom domain', {
    emailType,
    recipient,
    senderDomain: SENDER_DOMAIN,
  })

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  const url = new URL(req.url)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (url.pathname.endsWith('/preview')) {
    return handlePreview(req)
  }

  try {
    return await handleWebhook(req)
  } catch (error) {
    console.error('Webhook handler error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
