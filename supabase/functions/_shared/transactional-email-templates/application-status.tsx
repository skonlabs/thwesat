/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { Brand, SITE_URL, styles, pickLang, type Lang } from './_brand.ts'

interface Props { jobTitle?: string; company?: string; status?: string; reason?: string; lang?: Lang }

const labels = {
  en: { shortlisted: 'shortlisted', interview: 'invited to interview', offered: 'offered the role', placed: 'placed', rejected: 'not moving forward', withdrawn: 'withdrawn', updated: 'updated' },
  my: { shortlisted: 'ရွေးချယ်ခံရ', interview: 'အင်တာဗျူးခေါ်ခံရ', offered: 'အလုပ်ကမ်းလှမ်းခံရ', placed: 'အလုပ်ရရှိ', rejected: 'ဆက်လက်မလုပ်ဆောင်တော့', withdrawn: 'ပြန်ရုပ်သိမ်းပြီး', updated: 'ပြောင်းလဲ' },
} as const

const copy = {
  en: {
    preview: (j?: string) => `Update on your application${j ? ` for ${j}` : ''}`,
    h1: (h: string) => `Your application was ${h}`,
    body: (h: string, j?: string, c?: string) => j
      ? <>Your application for <strong>{j}</strong>{c ? <> at {c}</> : null} has been <strong>{h}</strong>.</>
      : <>Your application status changed to <strong>{h}</strong>.</>,
    btn: 'View applications',
    footer: "You're receiving this because you applied to a job on ThweSone.",
    subject: (j?: string) => j ? `Update on your application for ${j}` : 'Update on your application',
  },
  my: {
    preview: (j?: string) => `သင့်လျှောက်လွှာ${j ? ` (${j})` : ''} အပ်ဒိတ်`,
    h1: (h: string) => `သင့်လျှောက်လွှာသည် ${h}ပါသည်`,
    body: (h: string, j?: string, c?: string) => j
      ? <><strong>{j}</strong>{c ? <> ({c})</> : null} အတွက် သင့်လျှောက်လွှာသည် <strong>{h}</strong>ပါသည်။</>
      : <>သင့်လျှောက်လွှာအခြေအနေသည် <strong>{h}</strong>သို့ ပြောင်းလဲသွားပါသည်။</>,
    btn: 'လျှောက်လွှာများ ကြည့်မည်',
    footer: 'ThweSone တွင် အလုပ်လျှောက်ထားသဖြင့် ဤအီးမေးလ်ကို လက်ခံရရှိခြင်းဖြစ်ပါသည်။',
    subject: (j?: string) => j ? `${j} အတွက် လျှောက်လွှာ အပ်ဒိတ်` : 'သင့်လျှောက်လွှာ အပ်ဒိတ်',
  },
}

const ApplicationStatus = ({ jobTitle, company, status, reason, lang }: Props) => {
  const L = pickLang(lang)
  const c = copy[L]
  const human = (status && (labels[L] as any)[status]) || (status as string) || labels[L].updated
  return (
    <Html lang={L} dir="ltr">
      <Head />
      <Preview>{c.preview(jobTitle)}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Brand />
          <div style={styles.card}>
            <Heading style={styles.h1}>{c.h1(human)}</Heading>
            <Text style={styles.text}>{c.body(human, jobTitle, company)}</Text>
            {reason ? <div style={styles.highlight}>{reason}</div> : null}
            <Button style={styles.button} href={`${SITE_URL}/applications`}>{c.btn}</Button>
            <hr style={styles.divider} />
            <Text style={styles.footer}>{c.footer}</Text>
          </div>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ApplicationStatus,
  subject: (d: Props) => copy[pickLang(d?.lang)].subject(d?.jobTitle),
  displayName: 'Application status (job seeker)',
  previewData: { jobTitle: 'Frontend Developer', company: 'Acme', status: 'shortlisted', lang: 'en' },
} satisfies TemplateEntry
