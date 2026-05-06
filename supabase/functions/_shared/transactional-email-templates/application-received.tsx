/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { Brand, SITE_URL, styles } from './_brand.ts'

interface Props {
  applicantName?: string
  jobTitle?: string
  company?: string
}

const ApplicationReceived = ({ applicantName, jobTitle, company }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New application{jobTitle ? ` for ${jobTitle}` : ''}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Brand />
        <div style={styles.card}>
          <Heading style={styles.h1}>New application received</Heading>
          <Text style={styles.text}>
            <strong>{applicantName || 'A candidate'}</strong> just applied
            {jobTitle ? <> for <strong>{jobTitle}</strong></> : null}
            {company ? <> at {company}</> : null}.
          </Text>
          <Text style={styles.text}>Open your dashboard to review their profile and CV.</Text>
          <Button style={styles.button} href={`${SITE_URL}/employer/applications`}>Review application</Button>
          <hr style={styles.divider} />
          <Text style={styles.footer}>You're receiving this because you posted a job on ThweSone.</Text>
        </div>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ApplicationReceived,
  subject: (d: Props) => d?.jobTitle ? `New application for ${d.jobTitle}` : 'New application received',
  displayName: 'Application received (employer)',
  previewData: { applicantName: 'Aung Aung', jobTitle: 'Frontend Developer', company: 'Acme' },
} satisfies TemplateEntry
