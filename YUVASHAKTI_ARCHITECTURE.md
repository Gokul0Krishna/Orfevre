# YuvaShakti — Full Architecture & Feature Flow Document
# Feed this entire file to your AI IDE agent (Cursor, Windsurf, Copilot, etc.)
# Last updated: April 2026

---

## 0. WHAT THIS FILE IS

This is the single source of truth for the YuvaShakti platform architecture.
It defines: role-based access, every screen's feature set, data flows, API contracts,
and UI/UX rules. Reference this before writing any component, route, or backend function.

Project stack: React + Vite frontend · FastAPI backend · Firebase Firestore · Google Gemini AI
Renamed: GramSphere → YuvaShakti (update all file names and imports accordingly)

---

## 1. THE THREE ROLES — WHO SEES WHAT

### Hard Rule
A user's role is set at registration and stored in Firestore under `users/{uid}.role`.
The Dashboard reads `user.role` from auth context and renders ONLY that role's views.
There are no shared screens except Notifications and Profile (each role has its own profile variant).
Never expose another role's nav items, routes, or API endpoints to a user who does not have that role.

```
ROLE           FIRESTORE VALUE    LANDING VIEW AFTER LOGIN
─────────────────────────────────────────────────────────
Youth          "youth"            JobConnect (skill match feed)
Merchant       "merchant"         MerchantHome (shop dashboard)
Official       "official"         GramLens (network map)
```

---

## 2. AUTHENTICATION & ROLE ASSIGNMENT FLOW

```
[Landing Page]
      │
      ▼
[Google OAuth popup]  ←── @react-oauth/google
      │
      ▼
POST /api/auth/google
  { access_token }
      │
      ▼
[Backend: verify with Google UserInfo API]
      │
      ├── User exists in Firestore?
      │       YES → return existing role + JWT
      │       NO  → go to Role Selection screen
      │
      ▼ (new user only)
[Role Selection Screen — 3 large cards]
  "I'm looking for work"     → role = "youth"
  "I run a shop/business"    → role = "merchant"
  "I'm a district official"  → role = "official"
      │
      ▼
POST /api/auth/set-role
  { uid, role }
  → Firestore: users/{uid}.role = selected_role
  → Returns JWT with role claim embedded
      │
      ▼
[Dashboard renders role-specific views]
```

### JWT Shape
```json
{
  "uid": "firebase_uid",
  "email": "user@gmail.com",
  "name": "Raju Kumar",
  "role": "youth",
  "exp": 1234567890
}
```

### Frontend Auth Context
```js
// src/context/AuthContext.jsx
// Stores: { user, role, token, isLoading }
// Used by Dashboard.jsx to decide which views to render
// Never read role from URL params — always from AuthContext
```

---

## 3. SIDEBAR NAVIGATION — WHAT EACH ROLE SEES

### Youth Sidebar
```
🏠  Home (JobConnect feed)
👤  My Profile
🔔  Notifications [badge count]
────────────────────────────
     [User Avatar + Name]
     [Trust Score chip]
     [Logout]
```

### Merchant Sidebar  
```
🏬  My Shop (dashboard)
📋  Recruitment (open roles)
👥  Hired People
📦  Inventory / BazaarPulse
🔔  Notifications [badge count]
────────────────────────────
     [Shop Name + Location]
     [Logout]
```

### Official Sidebar
```
🗺️  GramLens (network map)
📊  District Summary
🔔  Notifications
────────────────────────────
     [District Name]
     [Logout]
```

### Mobile Bottom Nav (all roles)
- Youth:    Home | Profile | Notifications | My Gigs
- Merchant: Shop | Recruit | Hired | Alerts
- Official: Map | Summary | Alerts | Reports

---

## 4. YOUTH / GIG SEEKER — COMPLETE FEATURE SPEC

### 4A. HOME SCREEN (JobConnect Feed) — first screen after login

**Purpose:** Show matched gigs based on youth's skills, PLUS a "market demand" section
showing what skills are currently in demand that they may NOT have yet.

**Layout:**
```
┌──────────────────────────────────┐
│ 🔍 Search gigs by trade/skill    │  ← search bar
├──────────────────────────────────┤
│ 🎤 [Speak your skills]           │  ← voice input shortcut
├──────────────────────────────────┤
│ MATCHED FOR YOU                  │  ← based on profile skills
│  [GigCard] [GigCard] [GigCard]   │
│                                  │
│ IN DEMAND NEAR YOU               │  ← skills they don't have
│  [SkillDemandCard] ...           │  ← "Weavers needed — 12 openings"
│                                  │
│ EXPLORE BY TRADE                 │  ← all categories
│  [TradeCard] [TradeCard] ...     │
└──────────────────────────────────┘
```

**GigCard component:**
```
[Merchant shop emoji/icon]  [Title bold]         [Pay: ₹800]
                            [Merchant name]       [Distance: 1.2km]
                            [Skills needed: tags] [Status chip]
                            [Posted: 2h ago]
                            [Apply →] button (48px min height)
```

**SkillDemandCard component** (market intelligence — read only):
```
[Skill icon]  Weaver
              12 openings near Hubli
              Avg pay: ₹650/day
              [Learn this skill →]  ← links to StartSmart or external
```

**GigCard states:**
- Default: "Apply" button visible
- Applied: "Applied ✓" chip, "Undo" link (small, below chip)
- Accepted: "🎉 Accepted" green chip — other pending applications auto-cancelled
- Rejected: "Not selected" gray chip

**Apply flow:**
```
Youth taps [Apply]
  → POST /api/gigs/{gig_id}/apply  { youth_uid }
  → Firestore: applications/{app_id} = { gig_id, youth_uid, status: "pending", appliedAt }
  → Show: "Applied ✓" chip + "Undo" link
  → Notification sent to Merchant

If Merchant accepts this application:
  → Firestore: applications/{app_id}.status = "accepted"
  → All OTHER applications by same youth that are "pending" → status = "auto_cancelled"
  → Youth gets notification: "🎉 [Merchant Name] accepted your application for [Job Title]"
  → Other merchants' applications show: "Position filled — auto cancelled"
```

**Important UX rule:** Youth should NEVER see the Merchant's inventory,
BazaarPulse features, or GramLens map. These routes must return 403 if called by a youth token.

---

### 4B. MY PROFILE SCREEN (Youth)

**Layout — two sections:**

```
┌──────────────────────────────────┐
│ [PROFILE HEADER]                 │  ← see Section 3C below
│  Cover banner (gradient)         │
│  Initials avatar + Trust Score   │
│  Name · Title · Location         │
│  Stats: Gigs Done | Tokens | Net │
│  [Edit Profile] [Share]          │
├──────────────────────────────────┤
│ [Gigs] [Tokens] [Activity] tabs  │
└──────────────────────────────────┘
```

**Tab: Gigs**
- "My Applied Gigs" section: lists all applications with status chips
- "My Active Gigs" section: currently accepted, in-progress gigs
- "Post Work" button → opens camera for proof-of-work photo upload

**Tab: Tokens**
- Skill Token badges (Gold / Silver / Bronze) based on verification count
- Upload proof button → triggers AI verification flow (see 4C)

**Tab: Activity**
- Chronological feed of all events: applied, accepted, token earned, profile viewed

---

### 4C. WORK PHOTO POSTING & AI SKILL TAGGING FLOW

**This is a core feature — implement exactly as described.**

```
Youth taps [Post Work Photo]
      │
      ▼
Browser camera opens (getUserMedia API)
Youth takes photo of their work
      │
      ▼
Frontend sends to backend:
POST /api/verification/analyze-work
{
  "image_base64": "...",
  "youth_uid": "...",
  "caption": "optional voice/text caption",
  "location": { "lat": ..., "lng": ... },  ← from browser Geolocation API
  "timestamp": "ISO8601"
}
      │
      ▼
Backend (verification.py / router):
  1. Pass image to Gemini Vision API
  2. Gemini prompt:
     "Analyze this work photo from a rural Indian craftsperson or technician.
      Identify: (1) what skill/trade is being demonstrated,
      (2) quality level (beginner/intermediate/expert),
      (3) a one-line caption describing the work.
      Respond ONLY as JSON:
      { skill: string, quality: 'beginner'|'intermediate'|'expert', caption: string, confidence: 0-1 }"
  3. Store in Firestore:
     workPosts/{post_id} = {
       youth_uid,
       image_url,       ← uploaded to Firebase Storage
       gemini_skill,    ← AI-detected skill
       gemini_quality,
       gemini_caption,
       manual_caption,  ← what youth typed/spoke
       location: { lat, lng, area_name },
       timestamp,
       verified: false,  ← true after peer/merchant verification
       likes: 0
     }
  4. If skill not yet in youth's profile → add to profile.skills[]
  5. If this is 1st/5th/10th post of this skill → issue SkillToken
      │
      ▼
Frontend shows:
  Post card with:
  - Photo
  - AI-generated caption (+ youth's own caption below)
  - Skill tag chip: "🔧 Hardware Repair · AI Verified"
  - Location + Date
  - Trust Score bump animation: "+2 pts"
```

---

### 4D. MY GIGS (Applied & Active)

Accessible from Profile → Gigs tab AND from bottom nav "My Gigs" tab.

```
MY APPLIED GIGS
────────────────
[GigStatusCard]
  Job: WiFi Setup × 3 rooms
  Merchant: Kavya Store · 3.4km
  Applied: 3h ago
  Status: [🟡 Pending] [Undo Apply]

[GigStatusCard]
  Job: Laptop Repair
  Merchant: Suresh Electronics
  Applied: Yesterday
  Status: [🎉 Accepted] ← green, bold

[GigStatusCard]
  Job: CCTV Install
  Status: [⚫ Auto-cancelled]  ← greyed out, small text "Another gig accepted"

MY ACTIVE GIGS (accepted, in progress)
────────────────────────────────────────
[ActiveGigCard]
  Job title + merchant name
  [Mark Complete] button → opens camera for proof photo
  [Message Merchant] button → opens simple chat (future feature, show placeholder)
```

---

## 5. MERCHANT / VENDOR — COMPLETE FEATURE SPEC

### 5A. MERCHANT ONBOARDING FLOW (first time only)

When a new merchant logs in for the first time, they see an onboarding wizard
before reaching their dashboard. This CANNOT be skipped.

```
STEP 1: Shop Details
────────────────────
  Shop Name:     [text input]
  Trade/Type:    [dropdown: Tailor / Carpenter / Electronics / Potter / Weaver / Other]
  Description:   [text input, max 200 chars]
  [Next →]

STEP 2: Location
────────────────
  [Use my location] button → browser Geolocation API
    → Reverse geocode to get area name (Google Maps Geocoding or Nominatim)
    → Show: "📍 Hubli, Karnataka · confirmed"
  OR
  [Enter manually] → text field for area name

STEP 3: Shop Photo (optional)
─────────────────────────────
  [📷 Take shop photo] OR [Skip for now]
  If photo taken → upload to Firebase Storage → store URL

STEP 4: Done
─────────────
  "Your shop is live on YuvaShakti!"
  → Redirect to MerchantHome dashboard
```

**Firestore document created:**
```json
shops/{shop_id}: {
  "merchant_uid": "...",
  "name": "Kavya Electronics",
  "trade": "Electronics",
  "description": "Repair and sale of electronics in Hubli",
  "location": {
    "lat": 15.35,
    "lng": 75.13,
    "area": "Hubli",
    "district": "Dharwad",
    "state": "Karnataka"
  },
  "photo_url": "...",
  "created_at": "...",
  "is_active": true,
  "hired_count": 0,
  "open_roles": 0
}
```

---

### 5B. MERCHANT HOME DASHBOARD

```
┌──────────────────────────────────────────┐
│ [Shop Name] · [Location chip]            │
│ [Shop Photo or gradient banner]          │
├─────────────┬────────────────────────────┤
│ QUICK STATS │                            │
│ Open Roles  │  Hired People              │
│     3       │      12                    │
│ Applications│  Avg Trust Score           │
│    18       │      74                    │
├─────────────┴────────────────────────────┤
│ [+ Open a New Role] ← primary CTA button │
│ [📦 Manage Inventory (BazaarPulse)]      │
└──────────────────────────────────────────┘

RECENT APPLICATIONS
───────────────────
[ApplicantCard] Raju Kumar — Hardware · Trust: 85 · 1.2km
  [View Profile] [Accept ✓] [Reject ✗]

[ApplicantCard] ...
```

---

### 5C. RECRUITMENT / VOICE CHATBOT FLOW — KEY FEATURE

**Design decision:** Use VOICE as primary input (more user-friendly for merchants
who may not be comfortable typing). Text fallback always available.

**How it works:**

```
Merchant taps [+ Open a New Role]
      │
      ▼
[Recruitment Chatbot Screen opens]
  ┌────────────────────────────────────┐
  │  🤖 "नमस्ते! मुझे बताएं आप किस   │
  │  तरह के कामगार चाहते हैं।"        │
  │  (Hello! Tell me what kind of     │
  │  worker you are looking for.)     │
  │                                   │
  │  [Chat messages appear here]      │
  │                                   │
  │  ┌──────────────────────────┐     │
  │  │ Type a message...        │ 🎤  │
  │  └──────────────────────────┘     │
  └────────────────────────────────────┘
```

**Chatbot conversation script (Gemini-powered):**

The bot ALWAYS asks these questions in order, one at a time:

```
Q1: "What skill or trade do you need? (e.g., weaver, carpenter, electrician)"
Q2: "How many people do you need?"
Q3: "Is this a daily gig or a longer contract? How many days/weeks?"
Q4: "What will you pay? (per day or per project)"
Q5: "Do you need any specific experience level? (any / 1+ years / 3+ years)"
Q6: "Any other requirements? (e.g., must have own tools, nearby location only)"
```

After Q6, bot summarizes:
```
"Got it! Here's your job posting:
 ✅ Skill: Weaver
 ✅ Openings: 2
 ✅ Duration: 3 days
 ✅ Pay: ₹600/day
 ✅ Experience: Any
 ✅ Notes: Must work on-site

 Should I post this now? [Yes, Post It] [Edit]"
```

**Backend prompt for chatbot (gemini.py):**
```python
system_prompt = """
You are a friendly recruitment assistant for YuvaShakti, a rural employment platform in India.
You help shop owners and merchants post job openings by asking them questions one at a time.
Keep responses SHORT — one question at a time. 
Respond in the language the merchant is using (Hindi, Kannada, English, etc.).
Extract structured data from their answers.
When you have collected: skill, count, duration, pay, experience_level, notes
— return a JSON summary wrapped in <JOB_DATA> tags like:
<JOB_DATA>{"skill":"weaver","count":2,"duration":"3 days","pay":"600/day","experience":"any","notes":"on-site"}</JOB_DATA>
"""
```

**API route:**
```
POST /api/recruitment/chat
{
  "merchant_uid": "...",
  "shop_id": "...",
  "messages": [           ← full conversation history
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ],
  "language": "hindi"
}

Response:
{
  "reply": "Got it! How many people do you need?",
  "job_data": null,        ← null until all questions answered
  "is_complete": false
}

When complete:
{
  "reply": "Here's your posting...",
  "job_data": { skill, count, duration, pay, experience, notes },
  "is_complete": true
}
```

**On merchant confirming [Yes, Post It]:**
```
POST /api/recruitment/post-gig
{
  "shop_id": "...",
  "merchant_uid": "...",
  "job_data": { skill, count, duration, pay, experience, notes },
  "location": { lat, lng, area }    ← from shop's stored location
}

Creates in Firestore:
gigs/{gig_id}: {
  shop_id,
  merchant_uid,
  shop_name,          ← denormalized for fast reads
  skill,
  count,
  duration,
  pay,
  experience,
  notes,
  location: { lat, lng, area, district },
  status: "open",
  posted_at,
  applications: [],
  hired: []
}
```

**This gig IMMEDIATELY appears** in Youth's JobConnect feed if their skills match.

---

### 5D. HOW GIG SHOWS IN YOUTH'S FEED

```
Matching logic (backend, gig-matching route):
1. Get youth.skills[] from Firestore
2. Query gigs where:
   - gig.skill is in youth.skills[]
   - gig.status == "open"
   - gig.location is within 20km of youth.location (use Haversine formula)
3. Sort by distance ASC
4. Return top 10

Endpoint:
GET /api/gigs/matched?uid={youth_uid}&lat={}&lng={}

Response: [{ gig_id, shop_name, skill, pay, distance_km, posted_at, status }]
```

---

### 5E. MANAGING APPLICATIONS (Merchant side)

**Applications screen:**
```
GET /api/gigs/{gig_id}/applications
→ Returns: [{ app_id, youth_uid, youth_name, youth_trust_score, skills, distance, applied_at, status }]
```

**Merchant accepts:**
```
POST /api/gigs/{gig_id}/applications/{app_id}/accept
Backend does atomically:
  1. applications/{app_id}.status = "accepted"
  2. gigs/{gig_id}.hired[] += youth_uid
  3. shops/{shop_id}.hired_count += 1
  4. Find ALL other "pending" applications by same youth_uid → set to "auto_cancelled"
  5. Notification to youth: "✅ Accepted"
  6. Notification to other merchants whose pending applications were auto-cancelled:
     "[Youth name] has taken another job"
```

---

### 5F. HIRED PEOPLE (Merchant side)

Accessible from sidebar "Hired People".
Shows all youth ever hired by this merchant.

```
CURRENTLY WORKING (3)
─────────────────────
[WorkerCard]
  [Initials avatar]  Raju Kumar · Trust: 85
                     Skill: Hardware Repair
                     Hired: Apr 20 · WiFi Setup gig
                     [Mark Complete] [Message]

PAST HIRES (9)
──────────────
[WorkerCard compact] + completion date
```

**This data feeds GramLens map** — hired workers appear as connections in the
district network graph. Merchant location + worker location = an edge in the graph.

---

## 6. GOVERNMENT OFFICIAL — FEATURE SPEC

**DO NOT redesign or change the existing GramLens UI.**
Keep the existing dark-theme network map, district tabs, metric cards, and legend.

Only additions allowed:
1. Wire notifications bell (top-right) to receive system alerts
2. When youth accepts a gig in an area → GramLens map updates the connection (edge) between merchant node and worker node
3. "Sync Network" button should fetch fresh data from `/api/gramlens/sync`

**Access rule:** Officials can ONLY access GramLens. They cannot see gig listings,
youth profiles, or merchant inventory. Any attempt → 403.

---

## 7. NOTIFICATIONS SYSTEM

### Bell Icon (all roles, top-right of sidebar/topbar)

```
[🔔 3]  ← badge count

Clicking opens notification drawer (slides in from right):
┌─────────────────────────────┐
│ Notifications               │
│ ───────────────────────────│
│ 🎉 Kavya Store accepted your│
│    WiFi Setup application   │
│    2 hours ago              │
│                             │
│ ❌ Auto-cancelled: CCTV gig │
│    (You took another job)   │
│    2 hours ago              │
│                             │
│ 🔧 New gig match: Laptop    │
│    Repair · 1.2km · ₹800    │
│    5 hours ago              │
└─────────────────────────────┘
```

### Firestore Structure
```
notifications/{notif_id}: {
  "to_uid": "...",
  "type": "gig_accepted" | "gig_auto_cancelled" | "new_match" | "application_received",
  "title": "Kavya Store accepted your application",
  "body": "WiFi Setup gig · ₹1,200 · Starts Monday",
  "gig_id": "...",
  "read": false,
  "created_at": "..."
}
```

### When to create notifications:

| Event | Who gets notified | Type |
|---|---|---|
| Youth applies | Merchant | `application_received` |
| Merchant accepts | Youth | `gig_accepted` |
| Youth auto-cancelled | Youth | `gig_auto_cancelled` |
| New gig matches youth skills | Youth | `new_match` |
| Youth posts work photo | System log only | — |
| Token issued | Youth | `token_earned` |

### Future: WhatsApp Alert
On gig_accepted event, also call WhatsApp Business API (or Twilio):
```
"✅ YuvaShakti: Kavya Store has accepted your application for WiFi Setup.
 Pay: ₹1,200. Contact: [merchant phone]. Reply CONFIRM to accept."
```
Do NOT build this now. Add a comment `// TODO: WhatsApp integration` at the notification creation point.

---

## 8. FIRESTORE COLLECTIONS — COMPLETE SCHEMA

```
users/{uid}
  name, email, photo_url, role ("youth"|"merchant"|"official"),
  language ("hi"|"kn"|"ta"|"te"|"mr"|"en"),
  location: { lat, lng, area, district },
  created_at, last_login

youth_profiles/{uid}
  skills: ["Hardware Repair", "Networking", "CCTV"],
  trust_score: 85,
  gigs_completed: 34,
  bio, bio_regional,
  work_posts: [post_id, ...]  ← references to workPosts

shops/{shop_id}
  merchant_uid, name, trade, description,
  location: { lat, lng, area, district },
  photo_url, is_active, hired_count, open_roles, created_at

gigs/{gig_id}
  shop_id, merchant_uid, shop_name,
  skill, count, duration, pay, experience, notes,
  location: { lat, lng, area, district },
  status: "open"|"closed"|"cancelled",
  posted_at, applications: [], hired: []

applications/{app_id}
  gig_id, shop_id, youth_uid, merchant_uid,
  status: "pending"|"accepted"|"rejected"|"auto_cancelled",
  applied_at, updated_at

workPosts/{post_id}
  youth_uid, image_url,
  gemini_skill, gemini_quality, gemini_caption, gemini_confidence,
  manual_caption,
  location: { lat, lng, area },
  timestamp, verified, skill_token_issued

skillTokens/{token_id}
  youth_uid, skill, tier ("gold"|"silver"|"bronze"),
  verification_count, issued_at, last_updated

notifications/{notif_id}
  to_uid, type, title, body, gig_id, read, created_at

interactions/{edge_id}
  from_uid, to_uid, type ("gig_completed"|"application"|"hire"),
  gig_id, shop_id, location, timestamp
  ← These are the graph edges that feed GramLens

inventory/{item_id}
  merchant_uid, shop_id, item_name, stock, price, status, updated_at
```

---

## 9. API ROUTES — COMPLETE LIST

### Auth
```
POST   /api/auth/google              Verify Google token, create/fetch user
POST   /api/auth/set-role            Set role for new user
GET    /api/auth/me                  Get current user profile
```

### Youth
```
GET    /api/gigs/matched             Get gigs matching youth's skills + location
GET    /api/gigs/all                 All open gigs (explore by trade)
POST   /api/gigs/{id}/apply          Apply to a gig
DELETE /api/gigs/{id}/apply          Undo application
GET    /api/applications/mine        All applications by this youth
GET    /api/profile/youth/{uid}      Get youth profile
PUT    /api/profile/youth/{uid}      Update youth profile
POST   /api/verification/analyze-work  Upload work photo → Gemini analysis
GET    /api/work-posts/{uid}         Get all work posts by youth
```

### Merchant
```
POST   /api/shops                    Create shop (onboarding)
GET    /api/shops/{shop_id}          Get shop details
PUT    /api/shops/{shop_id}          Update shop
POST   /api/recruitment/chat         Chatbot turn (send message, get reply)
POST   /api/recruitment/post-gig     Confirm and post gig from chatbot
GET    /api/gigs/mine                All gigs posted by this merchant
GET    /api/gigs/{id}/applications   Applications for a gig
POST   /api/gigs/{id}/applications/{app_id}/accept
POST   /api/gigs/{id}/applications/{app_id}/reject
GET    /api/shops/{shop_id}/hired    All hired workers
POST   /api/inventory                Add inventory item
GET    /api/inventory/{shop_id}      Get inventory
PUT    /api/inventory/{item_id}      Update item
```

### Official / GramLens
```
GET    /api/gramlens/graph           Network nodes + edges for district map
GET    /api/gramlens/sync            Refresh graph data
GET    /api/gramlens/stats           Summary metrics (nodes, links, density)
GET    /api/gramlens/clusters        Cluster list with velocity scores
```

### Notifications
```
GET    /api/notifications            All notifications for current user
PATCH  /api/notifications/{id}/read  Mark as read
PATCH  /api/notifications/read-all   Mark all as read
```

### Shared
```
GET    /api/skills/demand            What skills are in demand near a location
GET    /api/skills/list              All known skill categories
```

---

## 10. FRONTEND FILE STRUCTURE (target state)

```
src/
├── App.jsx                     root, GoogleOAuthProvider, AuthContext
├── context/
│   ├── AuthContext.jsx          user, role, token, isLoading
│   └── NotificationContext.jsx  notif count, list, markRead
├── pages/
│   ├── LandingPage.jsx         login button, hero
│   ├── RoleSelection.jsx       3-card role picker (new users only)
│   └── Dashboard.jsx           layout shell, sidebar, renders views
├── views/
│   ├── youth/
│   │   ├── JobConnect.jsx      home feed: matched gigs + demand + explore
│   │   ├── YouthProfile.jsx    profile header + tabs (gigs/tokens/activity)
│   │   ├── MyGigs.jsx          applied + active gigs with status
│   │   └── WorkPostModal.jsx   camera + upload + AI tag display
│   ├── merchant/
│   │   ├── MerchantOnboarding.jsx  3-step shop setup wizard
│   │   ├── MerchantHome.jsx        shop dashboard + stats
│   │   ├── RecruitmentChat.jsx     voice+text chatbot for posting gigs
│   │   ├── ApplicationsView.jsx    review applicants, accept/reject
│   │   └── HiredPeople.jsx         list of all hired workers
│   └── official/
│       └── GramLens.jsx        EXISTING — do not change
├── components/
│   ├── GigCard.jsx             used in JobConnect and MyGigs
│   ├── ApplicantCard.jsx       used in ApplicationsView
│   ├── WorkPostCard.jsx        work photo card with AI skill tag
│   ├── VoiceInput.jsx          mic button + 4 states
│   ├── NotificationDrawer.jsx  slides in from right
│   ├── NotificationBell.jsx    icon + badge count
│   ├── ProfileHeader.jsx       LinkedIn-style cover + avatar + stats
│   ├── SkillTokenBadge.jsx     gold/silver/bronze chips
│   ├── ResultCard.jsx          generic card (existing, keep as-is)
│   └── ProtectedRoute.jsx      checks role, redirects if unauthorized
├── api/
│   ├── index.js                axios instance with JWT interceptor
│   ├── auth.js                 auth API calls
│   ├── gigs.js                 gig-related calls
│   ├── merchant.js             merchant/shop calls
│   ├── verification.js         work photo analysis
│   └── notifications.js        notification calls
└── utils/
    ├── geolocation.js          getBrowserLocation(), haversine()
    ├── language.js             language labels, regional strings
    └── roleGuard.js            canAccess(role, feature) → bool
```

---

## 11. ROLE GUARD RULES (enforce on every route and API call)

```js
// utils/roleGuard.js
const ACCESS_MAP = {
  youth: [
    "jobconnect", "youth_profile", "my_gigs", "work_posts",
    "notifications", "skill_tokens", "skill_demand"
  ],
  merchant: [
    "merchant_home", "recruitment_chat", "post_gig", "applications",
    "hired_people", "inventory", "bazaarpulse", "notifications"
  ],
  official: [
    "gramlens", "district_summary", "notifications"
  ]
};

export const canAccess = (role, feature) => ACCESS_MAP[role]?.includes(feature) ?? false;

// Usage in components:
// if (!canAccess(user.role, "gramlens")) return <Navigate to="/unauthorized" />;

// Usage in backend (FastAPI middleware):
// Every route has a role_required dependency:
// @router.get("/gramlens/graph", dependencies=[Depends(require_role("official"))])
```

---

## 12. UI/UX RULES (apply across all screens)

```
Typography:   Plus Jakarta Sans · Body 16px min · Heading 22px · Sub-label 12px
Colors:       Primary #F4A935 (saffron) · Secondary #2D6A4F (forest green)
              Background #FAFAF7 · Sidebar #1A1A2E · Danger #DC2626
Cards:        border-radius 16px · box-shadow 0 2px 12px rgba(0,0,0,.08)
              No hard borders — use shadow only
Tap targets:  min 48px height on all interactive elements
Language:     Every UI label has regional language below it (12px, muted)
              Default = selected language from onboarding
No forms:     Voice or photo input everywhere possible
              Text input ONLY as fallback
Errors:       Every API call wrapped in try/catch
              Show toast/snackbar — never a blank screen
              Offline: show cached data + "Showing offline data" chip
Loading:      Skeleton loaders (not spinners) for card lists
              Spinner OK for single actions (button loading state)
Images:       All photos go to Firebase Storage first
              Never store base64 in Firestore
Geolocation:  Request on first use, cache in localStorage for session
              Always show "📍 [Area name]" confirmation chip after getting location
              If denied: show manual input field
```

---

## 13. BACKEND SECURITY RULES

```
- Every API route (except /api/auth/google) requires Authorization: Bearer {JWT}
- JWT verified on every request via FastAPI dependency
- Role extracted from JWT — never trust client-sent role
- Firestore security rules mirror role-based access:
    match /gigs/{gig_id} {
      allow read: if request.auth.token.role in ["youth", "merchant"];
      allow write: if request.auth.token.role == "merchant";
    }
- Rate limit AI endpoints (Gemini calls): 10 req/min per user
- All image uploads go through backend → Firebase Storage (never direct from browser)
- CORS: only allow frontend origin in production
```

---

## 14. DEMO SEED DATA (run before hackathon pitch)

```
node backend/seed.js  OR  python backend/seed.py

Creates:
- 5 youth users with different skill sets and locations in Dharwad/Hubli
- 4 merchant shops with open gigs covering: weaving, carpentry, electronics, tailoring
- 3 existing applications (1 accepted, 1 pending, 1 auto-cancelled) — shows the full flow
- 10 work posts with AI skill tags already set (mock Gemini response)
- 7 skill tokens distributed
- 12 interactions (graph edges for GramLens)
- 15 notifications (mix of read and unread)

Demo narrative:
  1. Log in as youth → see matched gigs on home
  2. Apply to a gig → status changes to "pending"
  3. Switch to merchant → see application arrive
  4. Merchant accepts → switch back to youth → see "🎉 Accepted" + auto-cancel
  5. Open Profile → see trust score bump + token
  6. Log in as official → see network map update with new edge
```

---

## 15. WHAT IS DONE vs WHAT IS NOT DONE YET

### ✅ Done (from backend_integration.md + screenshots)
- Google OAuth wired end-to-end
- Landing page UI
- Basic Dashboard with sidebar nav
- JobConnect UI (job cards, trade categories, filters)
- BazaarPulse UI (inventory table, AI listing generator form)
- GramLens UI (dark theme, district tabs, network map placeholder, legend)
- Profile UI (photo upload, trust score display)
- FastAPI backend foundation (routers, Firestore integration, requirements.txt)
- Project renamed: GramSphere → YuvaShakti

### ❌ Not Done Yet (implement in this order)
1. **Role-based routing** — ProtectedRoute, role guard on every nav item
2. **Role Selection screen** — appears for new users after first login
3. **Youth home feed** — matched gigs + demand section (real Firestore data)
4. **Apply/Undo flow** + auto-cancel logic
5. **Merchant onboarding wizard** — shop creation with location
6. **Recruitment chatbot** — voice + text, Gemini extraction, gig posting
7. **Applications management** — merchant accept/reject UI
8. **Work photo + AI tagging** — camera → Gemini Vision → skill tag
9. **Notifications system** — Firestore listeners, bell + drawer UI
10. **Skill tokens** — issuing logic, badge UI
11. **GramLens data wiring** — connect D3 to real gramlens.py API
12. **WhatsApp card export** (BazaarPulse) — static image download
13. **Trust Score animation** — live gauge on profile
14. **Seed script** — populate demo data

---

## 16. AI AGENT INSTRUCTIONS (for IDE agents like Cursor/Windsurf)

When generating code from this document:

1. **Always check the role** before rendering any component.
   Use `ProtectedRoute` or inline `canAccess()` check.

2. **Never hardcode strings in English only.**
   Use the language from `AuthContext.language` and look up from a strings map.

3. **All Gemini calls go through backend.**
   Never import or call the Gemini SDK from any frontend file.

4. **Every async function must have try/catch.**
   On catch, set an error state and render a user-friendly message in their language.

5. **Location is always optional with a fallback.**
   Never block a user because they denied location. Show manual input instead.

6. **Notifications use Firestore realtime listeners** (`onSnapshot`), not polling.
   Set up listener in `NotificationContext` on mount, clean up on unmount.

7. **The chatbot conversation history** must be kept in local state and sent
   in full on every API call. Backend is stateless.

8. **Work photo upload flow:**
   camera → local preview → user confirms → POST to backend → backend uploads
   to Storage → backend calls Gemini → backend stores result → frontend shows tag.
   Never skip the user confirmation step.

9. **When in doubt about GramLens,** do NOT change it. Comment a TODO instead.

10. **Demo must work offline-ish:**
    Seed data must be in Firestore before demo. All loading states must show
    skeleton loaders, never blank white screens.
```
