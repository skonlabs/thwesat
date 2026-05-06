import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { Webhook } from 'npm:standardwebhooks@1.0.0'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature',
}

type Lang = 'en' | 'my'

const SUBJECTS: Record<string, { en: string; my: string }> = {
  signup: { en: 'Confirm your email', my: 'သင့်အီးမေးလ် အတည်ပြုပါ' },
  invite: { en: "You've been invited", my: 'ဖိတ်ခေါ်ခံရပါသည်' },
  magiclink: { en: 'Your login link', my: 'သင့် login link' },
  recovery: { en: 'Reset your password', my: 'စကားဝှက် ပြန်လည်သတ်မှတ်ပါ' },
  email_change: { en: 'Confirm your new email', my: 'အီးမေးလ်အသစ် အတည်ပြုပါ' },
  email_change_new: { en: 'Confirm your new email', my: 'အီးမေးလ်အသစ် အတည်ပြုပါ' },
  reauthentication: { en: 'Your verification code', my: 'သင့်အတည်ပြုကုဒ်' },
}

const TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  email_change_new: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
}

// Auth events sent BEFORE the user has saved a language preference.
// These always go bilingual (English + Burmese stacked).
const ALWAYS_BILINGUAL = new Set(['signup', 'invite'])

const SITE_NAME = 'thwesat'
const SENDER_DOMAIN = 'notify.thwesat.com'
const ROOT_DOMAIN = 'thwesat.com'
const FROM_DOMAIN = 'notify.thwesat.com'

function pickSubject(emailType: string, lang: Lang | 'both'): string {
  const s = SUBJECTS[emailType] || { en: 'Notification', my: 'အကြောင်းကြားချက်' }
  if (lang === 'both') return `${s.en} / ${s.my}`
  return s[lang]
}

async function lookupUserLanguage(
  supabase: ReturnType<typeof createClient>,
  email: string,
): Promise<Lang | null> {
  if (!email) return null
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    if (!profile?.id) return null
    const { data: settings } = await supabase
      .from('user_settings')
      .select('language')
      .eq('user_id', profile.id)
      .maybeSingle()
    const l = (settings as any)?.language
    return l === 'my' ? 'my' : l === 'en' ? 'en' : null
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const hookSecretRaw = Deno.env.get('AUTH_HOOK_SECRET')
  if (!hookSecretRaw) {
    return new Response(JSON.stringify({ error: 'AUTH_HOOK_SECRET not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Supabase webhook secret format: "v1,whsec_<base64>". The standardwebhooks
  // library expects just the base64 portion (with or without whsec_ prefix).
  const hookSecret = hookSecretRaw.replace(/^v1,/, '')

  const rawBody = await req.text()
  const headers: Record<string, string> = {}
  req.headers.forEach((v, k) => { headers[k.toLowerCase()] = v })

  let payload: any
  try {
    const wh = new Webhook(hookSecret)
    payload = wh.verify(rawBody, headers) as any
  } catch (err) {
    console.error('Webhook signature verification failed', err)
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Supabase Send Email Hook payload shape:
  // { user: { id, email, ... }, email_data: { token, token_hash, redirect_to,
  //   email_action_type, site_url, token_new, token_hash_new } }
  const user = payload.user || {}
  const ed = payload.email_data || {}
  const emailType: string = ed.email_action_type || 'signup'
  const recipient: string = user.email || ed.email || ''

  const Template = TEMPLATES[emailType]
  if (!Template) {
    console.error('Unknown email action type', { emailType })
    return new Response(JSON.stringify({ error: `Unknown email type: ${emailType}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Decide language: bilingual for signup/invite (no preference exists yet),
  // user-preferred otherwise; fall back to bilingual if none stored.
  let lang: Lang | 'both' = 'both'
  if (!ALWAYS_BILINGUAL.has(emailType)) {
    const userLang = await lookupUserLanguage(supabase, recipient)
    lang = userLang ?? 'both'
  }

  // Build confirmation URL using Supabase's verify endpoint
  const siteUrl = ed.site_url || `https://${ROOT_DOMAIN}`
  const confirmationUrl = ed.token_hash
    ? `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify?token=${ed.token_hash}&type=${emailType}&redirect_to=${encodeURIComponent(ed.redirect_to || siteUrl)}`
    : siteUrl

  const templateProps = {
    siteName: SITE_NAME,
    siteUrl,
    recipient,
    confirmationUrl,
    token: ed.token,
    email: recipient,
    oldEmail: user.email,
    newEmail: ed.new_email || user.new_email,
    lang, // templates can read this; if absent they fall back to bilingual
  }

  const html = await renderAsync(React.createElement(Template, templateProps))
  const text = await renderAsync(React.createElement(Template, templateProps), { plainText: true })

  const subject = pickSubject(emailType, lang)
  const messageId = crypto.randomUUID()

  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: emailType,
    recipient_email: recipient,
    status: 'pending',
  })

  const { error: enqueueError } = await supabase.rpc('enqueue_email', {
    queue_name: 'auth_emails',
    payload: {
      message_id: messageId,
      to: recipient,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text,
      purpose: 'transactional',
      label: emailType,
      queued_at: new Date().toISOString(),
    },
  })

  if (enqueueError) {
    console.error('Failed to enqueue auth email', enqueueError)
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: emailType,
      recipient_email: recipient,
      status: 'failed',
      error_message: enqueueError.message || 'enqueue failed',
    })
    return new Response(JSON.stringify({ error: 'Failed to enqueue email' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  console.log('Auth email enqueued', { emailType, recipient, lang })

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
