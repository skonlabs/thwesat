/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { Brand, SITE_URL, styles } from './_brand.ts'

interface Props {
  credits?: number | string
  mmkAmount?: number | string
}

const TopupApproved = ({ credits, mmkAmount }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your wallet top-up was approved</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Brand />
        <div style={styles.card}>
          <Heading style={styles.h1}>Top-up approved 💰</Heading>
          <Text style={styles.text}>
            <strong>{credits || ''} credits</strong> have been added to your ThweSone wallet
            {mmkAmount ? <> for {mmkAmount} MMK</> : null}.
          </Text>
          <Button style={styles.buttonGold} href={`${SITE_URL}/wallet`}>Open wallet</Button>
          <hr style={styles.divider} />
          <Text style={styles.footer}>Use credits to unlock contacts, post jobs, and book mentor sessions.</Text>
        </div>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TopupApproved,
  subject: 'Your wallet top-up was approved',
  displayName: 'Top-up approved',
  previewData: { credits: '5,000', mmkAmount: '5,000' },
} satisfies TemplateEntry
