/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as applicationReceived } from './application-received.tsx'
import { template as applicationStatus } from './application-status.tsx'
import { template as paymentApproved } from './payment-approved.tsx'
import { template as paymentRejected } from './payment-rejected.tsx'
import { template as topupApproved } from './topup-approved.tsx'
import { template as mentorBookingConfirmed } from './mentor-booking-confirmed.tsx'
import { template as welcomeBonus } from './welcome-bonus.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'application-received': applicationReceived,
  'application-status': applicationStatus,
  'payment-approved': paymentApproved,
  'payment-rejected': paymentRejected,
  'topup-approved': topupApproved,
  'mentor-booking-confirmed': mentorBookingConfirmed,
  'welcome-bonus': welcomeBonus,
}
