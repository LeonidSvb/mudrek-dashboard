# 🔄 Make Automation Guide - Setup for New Fields

*Instructions for setting up Make scenarios to populate created fields*
*Created: 2025-01-24*

---

## ✅ **CREATED FIELDS IN HUBSPOT**

### 💼 **Deal Fields:**
1. **`trial_status`** - Trial period status
   - Options: `no_trial`, `trial_given`, `trial_converted`, `trial_expired`
2. **`qualified_status`** - Lead qualification status
   - Options: `not_qualified`, `qualified`, `highly_qualified`

### 👤 **Contact Fields:**
3. **`vsl_watched`** - VSL viewing status
   - Options: `not_watched`, `started`, `4min`, `18min`, `completed`
4. **`vwo_experiment_id`** - VWO experiment ID
   - Type: text field
5. **`first_contact_within_30min`** - First contact within 30 minutes
   - Type: boolean field
6. **`sales_script_version`** - Sales script version for A/B testing
   - Options: `v1_0`, `v1_1`, `v2_0`, `v2_1`, `custom`
7. **`vwo_variation`** - VWO experiment variation (A/B/C)
   - Type: text field

---

## 🎯 **MAKE SCENARIOS TO SETUP**

### 📞 **Scenario 1: Kavkom → HubSpot Qualified Status**

**Goal:** Automatically set qualification status based on calls

#### Trigger:
```
Kavkom Webhook → Call completed
```

#### Logic:
```javascript
1. Get call data (duration, status)
2. IF call lasted > 5 minutes AND status = "connected"
   THEN qualified_status = "qualified"
3. IF call lasted > 10 minutes AND status = "connected"
   THEN qualified_status = "highly_qualified"
4. ELSE qualified_status = "not_qualified"
```

#### Make Modules:
```
[Kavkom Webhook] → [Router] → [HubSpot: Update Deal]
                            ↓
                   [Condition: Call Duration > 5min]
```

#### HubSpot Module Settings:
- **Object Type:** Deal
- **Field:** `qualified_status`
- **Value:** `{{qualified_status_value}}` (from previous module)

---

### 🎮 **Scenario 2: VWO → HubSpot Experiment Tracking**

**Goal:** Automatically populate VWO experiment IDs

#### Trigger:
```
Periodic: Each hour (to check new tests)
```

#### Logic:
```javascript
1. Get VWO experiments list
2. Get HubSpot contacts created in last hour
3. Match contacts by UTM source/campaign
4. Update contacts with vwo_experiment_id
```

#### Make Modules:
```
[Schedule] → [VWO: List Experiments] → [HubSpot: List Contacts]
           → [Iterator] → [Filter: UTM Match] → [HubSpot: Update Contact]
```

#### Settings:
- **VWO API:** Your VWO API key
- **Filter condition:** `contains(contact.source, experiment.campaign_name)`
- **HubSpot field:** `vwo_experiment_id = {{experiment.id}}`

---

### 🎬 **Scenario 3: VSL Tracking**

**Goal:** Track VSL video viewing progress

#### If you have video tracking:

#### Trigger:
```
Webhook from video player (YouTube/Vimeo/Custom)
```

#### Logic:
```javascript
1. Get event from video player
2. IF watched_time >= 240 seconds (4min)
   THEN vsl_watched = "4min"
3. IF watched_time >= 1080 seconds (18min)
   THEN vsl_watched = "18min"
4. IF watched_percentage >= 90%
   THEN vsl_watched = "completed"
```

#### If NO video tracking (simple variant):

#### Trigger:
```
HubSpot Contact Created/Updated
```

#### Logic:
```javascript
1. IF source contains "vsl" OR campaign contains "video"
   THEN vsl_watched = "started"
2. IF time_on_page > 4 minutes (from UTM/analytics)
   THEN vsl_watched = "4min"
```

---

### 🧪 **Scenario 4: Trial Status Automation**

**Goal:** Manage trial period status

#### Trigger:
```
HubSpot Deal Created/Updated
```

#### Logic:
```javascript
1. IF deal.source contains "trial" OR campaign contains "trial"
   THEN trial_status = "trial_given"
   AND set reminder in 24 hours

2. [After 24 hours] Check if deal is closed:
   IF dealstage = "closedwon"
   THEN trial_status = "trial_converted"
   ELSE trial_status = "trial_expired"
```

#### Modules:
```
[HubSpot Trigger] → [Filter: Trial Keywords] → [Update Deal: trial_given]
                                           → [Set Delay: 24 hours]
                                           → [Check Deal Status]
                                           → [Update Final Status]
```

---

## 🔧 **CONNECTION SETUP**

### 1. **HubSpot Connection in Make:**
- Use your HubSpot API token with full permissions
- Verify token has write permissions (`crm.objects.*.write`)

### 2. **Kavkom Connection:**
- Set Kavkom Webhook URL to Make scenario
- Ensure these fields are passed: `call_duration`, `call_status`, `contact_id`

### 3. **VWO Connection:**
- VWO API key (if available)
- Or use UTM parameters for matching

---

## 📊 **SCENARIO TESTING**

### For each scenario:

1. **Create test data:**
   - 1 test contact with UTM tags
   - 1 test deal with "trial" source

2. **Run scenario manually**

3. **Check results in HubSpot:**
   ```
   Contact → Properties → vsl_watched should be populated
   Deal → Properties → trial_status should be populated
   ```

---

## 🚨 **IMPORTANT NOTES**

### ⚠️ **Don't overwrite data:**
```javascript
// Add this check to each scenario:
IF field_is_empty(qualified_status)
THEN update qualified_status
ELSE skip update
```

### 🔄 **Rate Limits:**
- HubSpot: maximum 100 requests per 10 seconds
- Add delays between updates
- Use batch updates where possible

### 📝 **Logging:**
- Log all field updates
- Save old and new values
- Set up error notifications

---

## 🎯 **EXPECTED RESULTS**

After setting up all scenarios:

### ✅ **Automatic population:**
- `qualified_status` - based on call duration
- `trial_status` - based on deal type and status
- `vsl_watched` - based on traffic source
- `vwo_experiment_id` - based on UTM parameters

### 📈 **Ready metrics:**
- **Trial Rate:** `trial_converted` / `trial_given` * 100%
- **Qualified Rate:** `qualified` / `total_leads` * 100%
- **VSL Effectiveness:** VSL vs non-VSL traffic conversion
- **VWO Impact:** performance by experiments

---

## 🔧 **ADDITIONAL SCENARIOS (optional)**

### 5. **Time to Contact Tracking:**
```
Trigger: Contact Created
Logic:
- Set timer for 30 minutes
- Check if first_outreach_date is set
- Update first_contact_within_30min = true/false
```

### 6. **Manager Performance:**
```
Trigger: Daily at 9 AM
Logic:
- Calculate pickup_rate for each manager
- Calculate 5min_rate for each manager
- Send daily report to managers
```

### 7. **Real-time Notifications:**
```
Trigger: Deal Closed Won
Logic:
- Send Slack notification
- Update team targets
- Trigger celebration automation
```

---

## 📋 **SETUP CHECKLIST**

### Before launch:
- [ ] All API keys configured
- [ ] Kavkom webhooks working
- [ ] Test data created
- [ ] Error handling configured

### After launch:
- [ ] Error monitoring configured
- [ ] Data populating correctly
- [ ] Rate limits not exceeded
- [ ] Team trained on new fields

---

**🎉 After setting up all scenarios you'll have complete automation for populating new fields to accurately track all requested metrics!**

---

*If you need help setting up a specific scenario - let me know, I'll create a detailed schema with exact Make module settings.*