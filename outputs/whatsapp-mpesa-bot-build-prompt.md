# WhatsApp M-Pesa + Cash Reconciliation Bot — MVP Build Prompt

## Problem Statement
Small retail shop owners in Nairobi shopping malls lose 30-60 minutes daily reconciling M-Pesa payments with cash sales. They receive M-Pesa confirmation SMSs throughout the day but have no easy way to tally them against cash transactions. This leads to:
- 5-30% revenue leakage from untracked transactions
- End-of-day reconciliation headaches
- Lack of trust/transparency when reporting to shop owners
- No audit trail for resolving discrepancies

## MVP Solution
Build a WhatsApp bot that:
1. Auto-parses M-Pesa confirmation SMS messages forwarded to it
2. Accepts manual cash transaction entries via simple WhatsApp messages
3. Generates daily reconciliation summaries on demand
4. Flags discrepancies and tracks running totals

## Target Users
- Small shop owners/managers in Nairobi malls
- Parking lot attendants/supervisors
- Anyone handling M-Pesa + cash simultaneously

## Technical Requirements

### Platform
- **Primary Interface:** WhatsApp Business API (use Twilio or Meta Cloud API)
- **Backend:** Node.js + Express (or Python + FastAPI)
- **Database:** PostgreSQL (for transaction logs and user data)
- **Hosting:** Railway, Render, or Fly.io (free tier OK for MVP)
- **Auth:** Phone number-based (WhatsApp number = user ID)

### Core Features (MVP Scope)

#### 1. M-Pesa SMS Parsing
**User Flow:**
- User forwards M-Pesa confirmation SMS to bot's WhatsApp number
- Bot extracts: amount, transaction code, sender name, timestamp
- Bot responds: "✅ Recorded: KES 500 from JOHN DOE (Ref: ABC123XYZ)"

**M-Pesa SMS Format to Parse:**
```
ABC123XYZ Confirmed. Ksh500.00 received from JOHN DOE 254712345678 on 26/4/26 at 2:30 PM. M-PESA balance is Ksh12,450.00. Transaction cost, Ksh0.00.
```

**Extraction Logic:**
- Transaction code: First word (ABC123XYZ)
- Amount: Extract from "Ksh500.00 received"
- Sender: Name between "from" and phone number
- Phone: 254XXXXXXXXX format
- Timestamp: Date + time
- Store all fields in `transactions` table

#### 2. Manual Cash Entry
**User Flow:**
- User types: `cash 300` or `300 cash` or just `300`
- Bot responds: "✅ Cash recorded: KES 300. Daily total: KES 1,200"

**Implementation:**
- Parse message for number (handle: "cash 300", "300", "KES 300", "300/=")
- Default to cash if no M-Pesa SMS structure detected
- Allow optional note: `cash 300 coffee sales`

#### 3. Daily Summary
**User Flow:**
- User types: `summary`, `total`, or `today`
- Bot responds:
```
📊 Daily Summary (26 Apr 2026)

M-Pesa: KES 12,500 (25 transactions)
Cash: KES 3,200 (12 transactions)
━━━━━━━━━━━━━━━━━━━━━━
TOTAL: KES 15,700 (37 transactions)

Last updated: 4:45 PM
Type 'details' for transaction list
```

**Implementation:**
- Query transactions for current date (user's timezone = EAT)
- Group by payment method
- Calculate totals and counts

#### 4. Transaction Details
**User Flow:**
- User types: `details` or `list`
- Bot responds with last 10 transactions:
```
Recent Transactions:

4:30 PM - M-Pesa KES 500 (John Doe)
4:15 PM - Cash KES 200
3:50 PM - M-Pesa KES 1,200 (Jane Smith)
3:30 PM - Cash KES 150
...

Type 'summary' for daily totals
```

#### 5. Simple Commands
- `help` — Show available commands
- `reset` — Clear today's transactions (with confirmation)
- `yesterday` — Show previous day summary
- `week` — Show 7-day totals

## Data Model

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  business_name VARCHAR(100),
  timezone VARCHAR(50) DEFAULT 'Africa/Nairobi',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Transactions Table
```sql
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  transaction_type VARCHAR(10) NOT NULL, -- 'mpesa' or 'cash'
  amount DECIMAL(10,2) NOT NULL,
  mpesa_code VARCHAR(20),
  sender_name VARCHAR(100),
  sender_phone VARCHAR(20),
  note TEXT,
  transaction_time TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_date ON transactions(user_id, transaction_time);
CREATE INDEX idx_mpesa_code ON transactions(mpesa_code);
```

## Implementation Steps

### Phase 1: WhatsApp Integration
1. Set up Twilio WhatsApp Sandbox OR Meta Cloud API
2. Create webhook endpoint to receive incoming messages
3. Implement message sending functionality
4. Test basic echo bot (reply "You said: [message]")

### Phase 2: M-Pesa SMS Parser
1. Write regex to extract M-Pesa SMS fields
2. Handle variations in SMS format (M-Pesa changes format occasionally)
3. Store parsed transactions in database
4. Send confirmation reply

### Phase 3: Cash Entry
1. Parse simple number inputs
2. Store cash transactions
3. Send confirmation with running total

### Phase 4: Summaries & Reporting
1. Implement `summary` command
2. Implement `details` command
3. Add date range queries (yesterday, week)

### Phase 5: Error Handling & UX
1. Handle duplicate M-Pesa codes (don't double-count)
2. Handle timezone correctly (EAT = UTC+3)
3. Add help command and friendly error messages
4. Add `reset` with confirmation ("Are you sure? Reply YES to confirm")

## Parsing Examples

### M-Pesa SMS Variations to Handle
```
# Format 1 (most common):
ABC123XYZ Confirmed. Ksh500.00 received from JOHN DOE 254712345678 on 26/4/26 at 2:30 PM.

# Format 2 (older):
ABC123XYZ confirmed. You have received Ksh500.00 from JOHN DOE 254712345678 on 26/4/26 at 2:30 PM

# Format 3 (business till):
ABC123XYZ Confirmed. Ksh500.00 received from JOHN DOE on 26/4/26 at 2:30 PM. Till Number: 123456
```

### Cash Entry Variations to Handle
```
cash 300
300 cash
300
KES 300
300/=
cash 300 for groceries
```

## Success Criteria
- Bot successfully parses 95%+ of M-Pesa SMS formats
- Cash entry works with any reasonable format
- Daily summary is accurate (no double-counting)
- Response time < 3 seconds
- Works reliably for 10 transactions/hour

## Non-Goals (Out of Scope for MVP)
- Multi-user/staff tracking
- Inventory management
- Expense tracking
- Loan-ready reports
- WhatsApp message templates (use simple text replies)
- Payment collection (this is tracking only)
- Integration with external POS systems

## Tech Stack Recommendation

**Option A: Node.js**
```
- Express.js for API
- node-postgres for database
- Twilio SDK for WhatsApp
- dotenv for config
```

**Option B: Python**
```
- FastAPI for API
- psycopg2 for database
- Twilio SDK for WhatsApp
- python-dotenv for config
```

Choose Node.js if familiar with JS ecosystem, Python if you prefer type hints and simpler async.

## Environment Variables Needed
```
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=
DATABASE_URL=
PORT=3000
TZ=Africa/Nairobi
```

## Deployment Checklist
1. Set up PostgreSQL database (use Railway or Neon free tier)
2. Deploy backend to Railway/Render/Fly.io
3. Configure Twilio webhook URL to point to deployed API
4. Test with your own WhatsApp number
5. Invite 2-3 beta testers from target market

## Testing Plan
1. Forward 10 real M-Pesa SMS to bot, verify parsing
2. Enter 10 cash transactions, verify storage
3. Request summary, verify totals match
4. Test edge cases: duplicate SMS, malformed input, empty day
5. Test commands: help, reset, yesterday, week

## Pricing Model (Future)
- Free: 50 transactions/month
- Paid: KES 500/month for unlimited (target from research brief)
- Payment via M-Pesa Paybill (implement after MVP validation)

## Build Instructions
Build a working MVP with the features above. Prioritize:
1. Reliable M-Pesa SMS parsing (this is the core value)
2. Simple, fast WhatsApp UX (shopkeepers are busy)
3. Accurate daily summaries (trust is everything)

Use clear variable names, add comments for M-Pesa parsing logic, and structure code for easy addition of features (staff tracking, expenses, inventory) after MVP validation.

Deploy to a free hosting platform and provide:
- GitHub repo URL
- Live WhatsApp number to test
- Sample test SMS messages
- Basic README with setup instructions
