/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { Brand, SITE_URL, styles } from './_brand.ts'

interface Props {
  reason?: string
  paymentType?: string
  linkPath?: string
}

const PaymentRejected = ({ reason, paymentType, linkPath }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your payment was rejected</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Brand />
        <div style={styles.card}>
          <Heading style={styles.h1}>Payment rejected</Heading>
          <Text style={styles.text}>
            Your{paymentType ? <> {paymentType.replace('_', ' ')}</> : ''} payment was rejected.
          </Text>
          {reason ? <div style={styles.highlight}><strong>Reason:</strong> {reason}</div> : null}
          <Text style={styles.text}>Please review the details and re-submit, or contact support if you believe this was a mistake.</Text>
          <Button style={styles.button} href={`${SITE_URL}${linkPath || '/wallet'}`}>Review payment</Button>
          <hr style={styles.divider} />
          <Text style={styles.footer}>Need help? Reply to this email.</Text>
        </div>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PaymentRejected,
  subject: 'Your payment was rejected',
  displayName: 'Payment rejected',
  previewData: { reason: 'Payment proof unclear', paymentType: 'topup', linkPath: '/wallet' },
} satisfies TemplateEntry
