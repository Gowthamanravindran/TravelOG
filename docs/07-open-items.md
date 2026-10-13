# 07 · Open Items

Everything still undecided or not yet done before and during the build. Each item says who owns it and which phase of the [development plan](13-development-plan.md) closes it.

## Legal and business
| Item | Why it matters | Owner | Closes in |
|---|---|---|---|
| Privacy policy and terms of use | Required by both stores and India's DPDP Act 2023 (consent, purpose, data export and deletion, grievance contact) | Claude drafts, owner reviews (ideally with a lawyer) | Draft Phase 1, final Phase 8 |
| App Store privacy labels, Play Data safety form | Store submission blocks without them | Claude prepares answers, owner submits | Phase 8 |
| Company registration (Pvt Ltd or LLP) | Needed for: DLT SMS sender registration (phone OTP), GST invoices, affiliate payouts at scale, organisation store accounts (skips Play's 12-tester rule, shows a company name on Apple) | Owner | Before Phase 6 |
| GST registration | Required once turnover crosses the threshold; foreign platforms (Apple/Google) handle GST on in-app sales they collect | Owner + accountant | When revenue starts |
| Name and trademark check for "TravelOG" | Avoid a rename after launch | Owner | Phase 0 |
| Domain | Invite links, universal links, email sender, website | Owner | Phase 0 |

## Product
| Item | Decision needed | Closes in |
|---|---|---|
| Moderation | Who reviews reports on Feed and Verified trips, response time, what gets removed | Phase 5 |
| Support channel | In-app "Help" → email first; WhatsApp support later | Phase 8 |
| Analytics event list | Events + properties for the funnel in [05](05-profit-plan.md) §8 (invites per trip, conversion, bookings) | Phase 1, extended each phase |
| Languages | English at launch; Hindi after launch (strings externalised from day one) | Phase 1 (setup), post-launch |
| App icon and store screenshots | Final brand assets | Phase 8 |

## Quality and operations
| Item | Plan | Closes in |
|---|---|---|
| Test strategy | Unit (Jest), component (React Native Testing Library), database permission tests (pgTAP), end-to-end (Maestro) on CI | Phase 0 setup, grows each phase |
| AI quality checks | A fixed set of trip requests with expected properties, run before any AI change | Phase 7 |
| Accessibility pass | Screen reader labels, dynamic type, contrast | Each phase; full pass Phase 8 |
| Backups and restore drill | Supabase daily backups (Pro); one practice restore to staging | Phase 8 |
| Monitoring and alerts | Sentry crash alerts, Supabase usage alerts, AI spend alert | Phase 1, Phase 7 |
| Kill switch | `app_config.min_supported_version` forces an update; feature flags to turn features off | Phase 1 |
| Incident checklist | What to do if login, sync or payments break | Phase 8 |
