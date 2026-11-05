# 07 · Open Items

Everything still undecided or not yet done before and during the build. Each item says who owns it and which phase of the [development plan](13-development-plan.md) closes it.

## Legal and business
| Item | Why it matters | Owner | Closes in |
|---|---|---|---|
| Privacy policy and terms of use | Required by both stores and India's DPDP Act 2023 (consent, purpose, data export and deletion, grievance contact) | Claude drafts, owner reviews (ideally with a lawyer) | Draft Phase 1, final Phase 8 |
| App Store privacy labels, Play Data safety form | Store submission blocks without them | Claude prepares answers, owner submits | Phase 8 |
| Company registration (Pvt Ltd or LLP) | Needed for: DLT SMS sender registration (phone OTP), GST invoices, affiliate payouts at scale, organisation store accounts (skips Play's 12-tester rule, shows a company name on Apple) | Owner | Before Phase 6 |
| GST registration | Required once turnover crosses the threshold; foreign platforms (Apple/Google) handle GST on in-app sales they collect | Owner + accountant | When revenue starts |
| Geoapify before launch (Plan 29) | Dev use on the free plan is allowed. Before GA: (1) email info@geoapify.com to confirm production use on the free plan, and that we may keep lookup results permanently in our `places` table, or move to a paid plan; (2) show "Powered by Geoapify" next to "© OpenStreetMap contributors" under place results and in Profile → Place data, required on the free plan. The provider may change before then, so neither is done yet | Owner (email), Claude (credit) | Before GA (Phase 8) |
| AI document reading (paid, after Plan 31) | Plan 31 reads digital PDFs on the phone with pattern rules. A paid AI option would read scans, photos and screenshots of tickets, and any layout the rules miss. It needs the AI service (Phase 7), a price, and the documents leaving the phone only with consent | Owner (pricing), Claude | With Phase 7 (AI) |
| Name and trademark check for "TravelOG" | Avoid a rename after launch | Owner | Phase 0 |
| Domain | Invite links, universal links, email sender, website | Owner | Phase 0 |

## Product
| Item | Decision needed | Closes in |
|---|---|---|
| Moderation | Tooling and process defined in [16](16-admin-and-ops.md); rules for what gets removed still to write | Phase 5 |
| Support channel | In-app "Help" → email first; WhatsApp support later | Phase 8 |
| Analytics event list | Funnel defined in [15](15-go-to-market.md) §7; event names and properties to write | Phase 1, extended each phase |
| Languages | English at launch; Hindi after launch (strings externalised from day one) | Phase 1 (setup), post-launch |
| App icon and store screenshots | Final brand assets | Phase 8 |

## Quality and operations
| Item | Plan | Closes in |
|---|---|---|
| Test strategy | Unit (Jest), component (React Native Testing Library), database permission tests (pgTAP), end-to-end (Maestro) on CI | Phase 0 setup, grows each phase |
| AI quality checks | A fixed set of trip requests with expected properties, run before any AI change | Phase 7 |
| Accessibility pass | Screen reader labels, dynamic type, contrast | Each phase; full pass Phase 8 |
| Backups and restore drill | Supabase daily backups (Pro); one practice restore to staging | Phase 8 |
| Monitoring and alerts | Alert list defined in [16](16-admin-and-ops.md) §3 | Phase 1, Phase 7 |
| Kill switch | `app_config.min_supported_version` forces an update; feature flags to turn features off | Phase 1 |
| Incident checklist | Steps defined in [16](16-admin-and-ops.md) §4 | Done (planning) |
