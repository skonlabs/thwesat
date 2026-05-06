/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { Brand, SITE_URL, styles, pickLang, type Lang } from './_brand.ts'

interface Props { mentorName?: string; menteeName?: string; scheduledDate?: string; scheduledTime?: string; isMentor?: boolean; lang?: Lang }

const copy = {
  en: {
    preview: (d?: string) => `Mentor session confirmed${d ? ` for ${d}` : ''}`,
    h1: 'Session confirmed 🗓️',
    forMentor: (n?: string) => <>Your session with <strong>{n || 'a mentee'}</strong> is confirmed.</>,
    forMentee: (n?: string) => <>Your session with <strong>{n || 'your mentor'}</strong> is confirmed.</>,
    when: 'When',
    btn: 'View booking',
    footer: "You'll get a reminder before the session starts.",
    subject: 'Mentor session confirmed',
  },
  my: {
    preview: (d?: string) => `Mentor session အတည်ပြုပြီး${d ? ` (${d})` : ''}`,
    h1: 'Session အတည်ပြုပြီး 🗓️',
    forMentor: (n?: string) => <><strong>{n || 'mentee'}</strong> နှင့် သင့် session ကို အတည်ပြုပြီးပါပြီ။</>,
    forMentee: (n?: string) => <><strong>{n || 'mentor'}</strong> နှင့် သင့် session ကို အတည်ပြုပြီးပါပြီ။</>,
    when: 'အချိန်',
    btn: 'Booking ကြည့်မည်',
    footer: 'Session မစခင် သတိပေးချက် ပို့ပေးပါမည်။',
    subject: 'Mentor session အတည်ပြုပြီး',
  },
}

const MentorBookingConfirmed = ({ mentorName, menteeName, scheduledDate, scheduledTime, isMentor, lang }: Props) => {
  const L = pickLang(lang)
  const c = copy[L]
  return (
    <Html lang={L} dir="ltr">
      <Head />
      <Preview>{c.preview(scheduledDate)}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Brand />
          <div style={styles.card}>
            <Heading style={styles.h1}>{c.h1}</Heading>
            <Text style={styles.text}>{isMentor ? c.forMentor(menteeName) : c.forMentee(mentorName)}</Text>
            {(scheduledDate || scheduledTime) && (
              <div style={styles.highlight}>
                <strong>{c.when}:</strong> {scheduledDate}{scheduledTime ? ` ${L === 'my' ? 'အချိန်' : 'at'} ${scheduledTime}` : ''}
              </div>
            )}
            <Button style={styles.button} href={`${SITE_URL}${isMentor ? '/mentors/dashboard' : '/mentors/bookings'}`}>{c.btn}</Button>
            <hr style={styles.divider} />
            <Text style={styles.footer}>{c.footer}</Text>
          </div>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: MentorBookingConfirmed,
  subject: (d: Props) => copy[pickLang(d?.lang)].subject,
  displayName: 'Mentor booking confirmed',
  previewData: { mentorName: 'Daw Aye', menteeName: 'Ko Min', scheduledDate: '2026-05-10', scheduledTime: '15:00', isMentor: false, lang: 'en' },
} satisfies TemplateEntry
