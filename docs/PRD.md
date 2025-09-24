---
description: Sales Dashboard for HubSpot CRM Analytics
globs:
alwaysApply: false
---

# Sales Metrics Dashboard

Simple internal dashboard for displaying key sales metrics from HubSpot CRM data with minimal complexity and maximum value.

---

## Users & Value

- **Primary user / persona:** Business owner and sales team (up to 10 people)
- **Jobs-to-be-done (JTBD):**
  - When I need to see current sales performance, I want to view all key metrics in one place, so I can make quick business decisions.
  - When I want to track team efficiency, I want to see pickup rates and call metrics, so I can optimize sales processes.

---

## Success Metrics

- **Primary Goal:** Display 22 key sales metrics from existing HubSpot data
- **Success Criteria:** All requested metrics visible and updating automatically (target: 100% metric coverage)

---

## Scope

| Must‑have (MVP) | Nice‑to‑have (Later) | Explicitly Out (Not now) |
| --------------- | -------------------- | ------------------------ |
| Display 22 key sales metrics | Mobile responsiveness | Real-time updates |
| Daily data sync from HubSpot | Additional languages (AR/HE) | Push notifications |
| Multi-currency (ILS/USD) | Export functionality | User roles/authorization |
| Clean, simple interface | Custom metric configurations | Advanced analytics |
| Historical data view | Dark mode theme | External integrations |

- **Definition of Done (MVP):**
  - [ ] All 22 metrics displayed correctly from HubSpot data
  - [ ] Data syncs automatically 1-2 times per day
  - [ ] Interface works in English with USD/ILS support
  - [ ] No authentication required (internal use only)
  - [ ] Responsive design for desktop and tablet

---

## Tech Stack

### Frontend:

- **Next.js 14** with **TypeScript**
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **No authentication** for internal use

### Backend:

- **Next.js API Routes** for data processing
- **HubSpot API** for CRM data extraction
- **Supabase PostgreSQL** for data storage and caching
- **Daily cron jobs** for data synchronization

### Database:

- **PostgreSQL (Supabase)** for cached metrics and historical data
- **Local JSON files** for configuration and static data

---

## Data Architecture

### Current Data Volume:
- **29,000 contacts** (accumulated over 3 years)
- **~11,600 new contacts** (40% in last year)
- **1,000 deals** (total transactions)
- **100+ calls** with full Kavkom integration

### Key Metrics to Display:

#### 💰 Sales Metrics (Ready - 5 metrics)
1. **Total sales this month** - Monthly revenue
2. **Average deal size** - Average transaction value
3. **Total deals sizes** - All deal amounts
4. **Upfront cash collected** - Immediate payments
5. **Cancellation rate** - Deal closure failure rate

#### 📞 Call Metrics (Ready - 4 metrics)
6. **Pickup rate** - Successful call connections (currently 63%)
7. **5min-reached-rate** - Calls lasting 5+ minutes (currently 11%)
8. **Daily calls made** - Daily call volume
9. **Average call duration** - Average call length (currently 3 min)

#### 📈 Conversion Metrics (Ready - 3 metrics)
10. **Lead to qualified conversion** - Lead quality rate
11. **Offer to close rate** - Sales closure efficiency
12. **Monthly lead volume** - New leads per month

#### 👥 Team Metrics (Ready - 2 metrics)
13. **Calls per manager** - Individual performance
14. **Sales per manager** - Individual revenue contribution

#### 🎯 New Metrics (Requires new fields - 8 metrics)
15. **Trial rate** - Trial conversion tracking
16. **Qualified rate** - Lead qualification efficiency
17. **Offers given & rate** - Offer effectiveness
18. **VSL effectiveness** - Video sales letter impact
19. **VWO A/B testing impact** - Conversion optimization results
20. **Time to contact influence** - Response time effectiveness
21. **Sales script performance** - Script version comparison
22. **Call outcome breakdown** - Detailed call result analysis

---

## Technical Implementation

### MVP Architecture:
```
Next.js App
├── pages/
│   ├── index.js              # Main dashboard
│   ├── api/
│   │   ├── sync-hubspot.js   # Daily sync endpoint
│   │   └── metrics.js        # Metrics API
├── components/
│   ├── MetricCard.js         # Individual metric display
│   ├── MetricsGrid.js        # Main metrics layout
│   └── SyncStatus.js         # Last update indicator
├── lib/
│   ├── hubspot.js            # HubSpot API client
│   ├── supabase.js           # Database client
│   └── calculations.js       # Metric calculations
└── styles/
    └── globals.css           # Tailwind styles
```

### Data Flow:
1. **Daily Sync**: Cron job pulls HubSpot data → Supabase
2. **Calculations**: Process raw data → calculated metrics
3. **Display**: Dashboard reads cached metrics → UI
4. **Updates**: Manual refresh button for immediate updates

---

## UI Design Specifications

### Layout:
- **Grid Layout**: 4 columns on desktop, 2 on tablet, 1 on mobile
- **Metric Cards**: Clean cards with value, trend, and small chart
- **Color Coding**: Green (positive), Red (negative), Blue (neutral)
- **Currency**: Toggle between ILS/USD with live conversion

### Key Features:
- **No Login Required**: Direct access to dashboard
- **Simple Navigation**: Single page with all metrics
- **Responsive Design**: Works on all screen sizes
- **Fast Loading**: Cached data for instant display

---

## Budget Constraints

**Total Budget**: $800
**Development Approach**: Minimal viable solution

### Cost Optimization:
- Use existing HubSpot integration (already built)
- Leverage existing Supabase setup (already configured)
- No complex features (auth, real-time, notifications)
- Single developer implementation
- Minimal external libraries

---

## Success Criteria

### Primary Goals:
- ✅ Display all 22 requested metrics
- ✅ Automatic daily data synchronization
- ✅ Clean, professional interface
- ✅ Multi-currency support (ILS/USD)

### Performance Targets:
- **Page Load**: < 3 seconds
- **Data Freshness**: Updated 1-2x daily
- **Uptime**: 99%+ (Vercel hosting)
- **Mobile Support**: Basic responsiveness

### Business Impact:
- **Time Saved**: 10+ hours/week on manual reporting
- **Visibility**: 100% transparency into sales metrics
- **Decision Speed**: Instant access to key performance data

---

## Timeline & Delivery

### Week 1: Core Development
- [ ] Setup Next.js project with existing Supabase connection
- [ ] Implement 14 ready metrics (existing data)
- [ ] Create basic dashboard layout
- [ ] Add currency conversion (ILS/USD)

### Week 2: Completion & Polish
- [ ] Add remaining 8 metrics (may require new HubSpot fields)
- [ ] Implement daily sync automation
- [ ] Polish UI/UX for professional appearance
- [ ] Test with real data and fix any issues

### Week 3: Deployment & Handover
- [ ] Deploy to Vercel with environment configuration
- [ ] Setup automated sync schedule
- [ ] Basic documentation and handover
- [ ] Final testing and bug fixes

---

## Out of Scope (Future Considerations)

- ❌ Real-time updates (daily sync sufficient)
- ❌ User authentication (internal tool)
- ❌ Push notifications
- ❌ Data export functionality
- ❌ Advanced filtering/customization
- ❌ Mobile app
- ❌ Additional integrations beyond HubSpot
- ❌ Forecasting or predictive analytics
- ❌ Team management features

---

## Risk Mitigation

### Technical Risks:
- **HubSpot API limits**: Use caching and batch processing
- **Data volume**: Efficient queries and pagination
- **Metric complexity**: Start with simple calculations

### Business Risks:
- **Budget overrun**: Stick to MVP scope strictly
- **Timeline delays**: Focus on working solution over perfection
- **Feature creep**: Document future requests separately

---

## Acceptance Criteria

### Functional Requirements:
1. Dashboard displays all 22 metrics accurately
2. Data updates automatically via daily sync
3. Interface supports both ILS and USD currencies
4. Page loads quickly (< 3 seconds)
5. Works on desktop, tablet, and mobile devices

### Technical Requirements:
1. Built with Next.js and deployed on Vercel
2. Uses existing Supabase database
3. Integrates with existing HubSpot API setup
4. No authentication required
5. Error handling for sync failures

### Quality Requirements:
1. Clean, professional visual design
2. Intuitive navigation and layout
3. Consistent data formatting
4. Proper error messages when sync fails
5. Mobile-responsive interface

---

*This PRD focuses on delivering maximum value within the $800 budget constraint while maintaining simplicity and reliability.*

---

Tags: [CLIENT] = client requirement; [IMPL] = implementation detail.

## Charts & Visualizations [IMPL]

- Line charts: daily/weekly/monthly trends (Total sales, Total calls, 5min rate, Pickup rate, Average call time)
- Grouped bar charts: breakdowns by user/owner, source/campaign, payment method
- Stacked bar charts: installments distribution (1–9) by month/user
- Pie/Donut: call outcomes, sources share, payment method share
- Funnel chart: Optin LP → VSL LP → 5min call → Offer → Close → Price tier
- Tables: sortable lists for insight queries and drilldowns

## Breakdowns & Filters [IMPL]

- Date range with grouping: day / week / month
- User / owner (per manager)
- Source / campaign / ad (UTM)
- Payment method; number of installments (1–9)
- Dealstage and “No answer > 30 days” flag
- Currency toggle: USD ↔ ILS

## Compare Mode [IMPL]

- Side-by-side comparison for two dimensions (users, sources, periods)
- Ability to overlay multiple metrics on one graph where meaningful

## Metrics Coverage (detailed) [CLIENT requirements + IMPL visualization]

Improve tracking with breakdowns per user, per month/day, source, payment method, and the ability to mix/visualize together: [CLIENT]

- Total sales this month — KPI + line (daily/monthly); breakdown by user/source/payment method; compare by month [CLIENT]
- Average deal size — KPI + bar by user/source [CLIENT]
- Total deals sizes — KPI + line (monthly) [CLIENT]
- Upfront cash collected — KPI + bar by payment method/installments [CLIENT]
- Cancellation rate — KPI + line (monthly); breakdown by source/user [CLIENT]
- Conversion rate — funnel + bar by source/user [CLIENT]
- Followup rate — bar by user; line daily (attempts per lead) [CLIENT]
- Total calls made — line daily; bar by user (daily view emphasized) [CLIENT]
- 5min‑reached‑rate — line daily; bar by user/source (daily view emphasized) [CLIENT]
- Offers given & rate — bar by user; line monthly [CLIENT]
- Qualified rate — bar by user; line monthly [CLIENT]
- Rate to close for the three above — derived; bar by user/source [CLIENT]
- Number of installments (1–9) — stacked bar distribution by month/user [CLIENT]
- Average call time — line daily; bar by user [CLIENT]
- Total call time — line daily; bar by user [CLIENT]
- Pickup rate — line daily; bar by user/source [CLIENT]

Optional insight query [CLIENT]:
- “How many of the leads that were stage ‘no answer’ for more than a month we converted this month?” — predefined filter + table output [CLIENT]

Start tracking (no data currently; requires new fields/calculations) [CLIENT]:
- Trial rate — requires deal field `trial_status` [CLIENT] [IMPL]
- Time to sale — calculated from `createdate` → `closedate` [CLIENT] [IMPL]
- Time to contact impact — requires contact field `first_contact_within_30min`; correlate with close rate [CLIENT] [IMPL]
- Average followups per lead/sale — from call attempts after first contact [CLIENT] [IMPL]

Funnels [CLIENT]:
- Sources & breakdowns — funnel by source/user [CLIENT]
- Optin LP → VSL LP (4min, 18min) → 5min call → Offer → Close → Prices — funnel chart; requires contact field `vsl_watched` [CLIENT] [IMPL]
- Different sales scripts testing — breakdown by `sales_script_version` [CLIENT]

VWO visibility (lightweight) [CLIENT]:
- Add `vwo_experiment_id` and `vwo_variation` to contacts/deals; breakdown key metrics by variation [IMPL]

Call recordings (if feasible via Kavkom) [CLIENT]:
- Talk‑to‑listen ratio — KPI + distribution; implement if Kavkom exposes per‑speaker durations; otherwise backlog [CLIENT] [IMPL]

Acceptance additions [IMPL]:
- Charts implemented as specified above
- Breakdowns and compare mode available for listed metrics
