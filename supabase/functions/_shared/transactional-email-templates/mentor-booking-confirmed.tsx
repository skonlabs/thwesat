/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { Brand, SITE_URL, styles } from './_brand.ts'

interface Props {
  mentorName?: string
  menteeName?: string
  scheduledDate?: string
  scheduledTime?: string
  isMentor?: boolean
}

const MentorBookingConfirmed = ({ mentorName, menteeName, scheduledDate, scheduledTime, isMentor }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Mentor session confirmed{scheduledDate ? ` for ${scheduledDate}` : ''}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Brand />
        <div style={styles.card}>
          <Heading style={styles.h1}>Session confirmed 🗓️</Heading>
          <Text style={styles.text}>
            {isMentor
              ? <>Your session with <strong>{menteeName || 'a mentee'}</strong> is confirmed.</>
              : <>Your session with <strong>{mentorName || 'your mentor'}</strong> is confirmed.</>}
          </Text>
          {(scheduledDate || scheduledTime) && (
            <div style={styles.highlight}>
              <strong>When:</strong> {scheduledDate}{scheduledTime ? ` at ${scheduledTime}` : ''}
            </div>
          )}
          <Button style={styles.button} href={`${SITE_URL}${isMentor ? '/mentors/dashboard' : '/mentors/bookings'}`}>View booking</Button>
          <hr style={styles.divider} />
          <Text style={styles.footer}>You'll get a reminder before the session starts.</Text>
        </div>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: MentorBookingConfirmed,
  subject: 'Mentor session confirmed',
  displayName: 'Mentor booking confirmed',
  previewData: { mentorName: 'Daw Aye', menteeName: 'Ko Min', scheduledDate: '2026-05-10', scheduledTime: '15:00', isMentor: false },
} satisfies TemplateEntry
