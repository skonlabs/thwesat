/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { Brand, SITE_URL, styles } from './_brand.ts'

interface Props {
  jobTitle?: string
  company?: string
  status?: string
  reason?: string
}

const labels: Record<string, string> = {
  shortlisted: 'shortlisted',
  interview: 'invited to interview',
  offered: 'offered the role',
  placed: 'placed',
  rejected: 'not moving forward',
  withdrawn: 'withdrawn',
}

const ApplicationStatus = ({ jobTitle, company, status, reason }: Props) => {
  const human = status ? (labels[status] || status) : 'updated'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Update on your application{jobTitle ? ` for ${jobTitle}` : ''}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Brand />
          <div style={styles.card}>
            <Heading style={styles.h1}>Your application was {human}</Heading>
            <Text style={styles.text}>
              {jobTitle ? <>Your application for <strong>{jobTitle}</strong>{company ? <> at {company}</> : null} has been <strong>{human}</strong>.</> : <>Your application status changed to <strong>{human}</strong>.</>}
            </Text>
            {reason ? <div style={styles.highlight}>{reason}</div> : null}
            <Button style={styles.button} href={`${SITE_URL}/applications`}>View applications</Button>
            <hr style={styles.divider} />
            <Text style={styles.footer}>You're receiving this because you applied to a job on ThweSone.</Text>
          </div>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ApplicationStatus,
  subject: (d: Props) => d?.jobTitle ? `Update on your application for ${d.jobTitle}` : 'Update on your application',
  displayName: 'Application status (job seeker)',
  previewData: { jobTitle: 'Frontend Developer', company: 'Acme', status: 'shortlisted' },
} satisfies TemplateEntry
