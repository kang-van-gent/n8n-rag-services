# 🔑 Omise API Keys Setup Instructions

## Problem: 401 Unauthorized Error
The current API keys in the code are placeholders and don't work with real Omise API.

## Solution: Use Your Real Omise API Keys

### Step 1: Get Keys from Omise Dashboard

1. **Login to Omise Dashboard**: https://dashboard.omise.co
2. **Navigate to**: Settings → API Keys
3. **Copy your Test Keys**:
   - Test Secret Key (starts with `skey_test_`)
   - Test Public Key (starts with `pkey_test_`)

### Step 2: Update Environment Files

#### Proxy Server (omise-proxy-server/.env):
```
OMISE_SECRET_KEY=skey_test_YOUR_REAL_SECRET_KEY
OMISE_PUBLIC_KEY=pkey_test_YOUR_REAL_PUBLIC_KEY
PORT=3001
```

#### React App (react-webapp/.env):
```
REACT_APP_SUPABASE_URL=https://nwqyhfblltmolctnqnrl.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53cXloZmJsbHRtb2xjdG5xbnJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MDk2MzAsImV4cCI6MjA3NjA4NTYzMH0.TnkzQ_HdHoX0ry15T1a3poGHOT78wFWM1fz5uGkiNUc
REACT_APP_OMISE_PUBLIC_KEY=pkey_test_YOUR_REAL_PUBLIC_KEY
REACT_APP_OMISE_PROXY_URL=http://localhost:3001
```

### Step 3: Test Authentication

After updating your keys, test if they work:

```bash
# Replace with your real secret key
curl -u skey_test_YOUR_REAL_SECRET_KEY: https://api.omise.co/account
```

You should get account information instead of authentication error.

### Step 4: Restart Servers

```bash
# Terminal 1: Proxy Server
cd omise-proxy-server && npm start

# Terminal 2: React App  
cd react-webapp && npm start
```

### Step 5: Test Complete Flow

1. Add items to cart
2. Create payment method (test card: 4242424242424242)
3. Complete checkout
4. Check Omise dashboard for real transaction!

## Test Cards (for your real Omise account):

- **Successful**: 4242424242424242
- **Declined**: 4000000000000002
- **Insufficient Funds**: 4000000000009995

## 🎉 Result

With your real API keys:
- ✅ No more 401 errors
- ✅ Real charges in Omise dashboard
- ✅ Complete payment integration working!