/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { Brand, SITE_URL, styles, pickLang, type Lang } from './_brand.ts'

interface Props { applicantName?: string; jobTitle?: string; company?: string; lang?: Lang }

const copy = {
  en: {
    preview: (j?: string) => `New application${j ? ` for ${j}` : ''}`,
    h1: 'New application received',
    body: (n?: string, j?: string, c?: string) => (
      <>
        <strong>{n || 'A candidate'}</strong> just applied
        {j ? <> for <strong>{j}</strong></> : null}
        {c ? <> at {c}</> : null}.
      </>
    ),
    cta: 'Open your dashboard to review their profile and CV.',
    btn: 'Review application',
    footer: "You're receiving this because you posted a job on ThweSone.",
    subject: (j?: string) => j ? `New application for ${j}` : 'New application received',
  },
  my: {
    preview: (j?: string) => `လျှောက်လွှာအသစ်${j ? ` (${j})` : ''}`,
    h1: 'လျှောက်လွှာအသစ် ရရှိပါသည်',
    body: (n?: string, j?: string, c?: string) => (
      <>
        <strong>{n || 'လျှောက်ထားသူ တစ်ဦး'}</strong> သည်
        {j ? <> <strong>{j}</strong> ရာထူးအတွက်</> : null}
        {c ? <> ({c})</> : null} လျှောက်ထားလိုက်ပါသည်။
      </>
    ),
    cta: 'Dashboard မှာ profile နှင့် CV ကို စစ်ဆေးပါ။',
    btn: 'လျှောက်လွှာ ကြည့်မည်',
    footer: 'ThweSone တွင် အလုပ်တင်ထားသဖြင့် ဤအီးမေးလ်ကို လက်ခံရရှိခြင်းဖြစ်ပါသည်။',
    subject: (j?: string) => j ? `${j} အတွက် လျှောက်လွှာအသစ်` : 'လျှောက်လွှာအသစ် ရရှိပါသည်',
  },
}

const ApplicationReceived = ({ applicantName, jobTitle, company, lang }: Props) => {
  const c = copy[pickLang(lang)]
  return (
    <Html lang={pickLang(lang)} dir="ltr">
      <Head />
      <Preview>{c.preview(jobTitle)}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Brand />
          <div style={styles.card}>
            <Heading style={styles.h1}>{c.h1}</Heading>
            <Text style={styles.text}>{c.body(applicantName, jobTitle, company)}</Text>
            <Text style={styles.text}>{c.cta}</Text>
            <Button style={styles.button} href={`${SITE_URL}/employer/applications`}>{c.btn}</Button>
            <hr style={styles.divider} />
            <Text style={styles.footer}>{c.footer}</Text>
          </div>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ApplicationReceived,
  subject: (d: Props) => copy[pickLang(d?.lang)].subject(d?.jobTitle),
  displayName: 'Application received (employer)',
  previewData: { applicantName: 'Aung Aung', jobTitle: 'Frontend Developer', company: 'Acme', lang: 'en' },
} satisfies TemplateEntry
