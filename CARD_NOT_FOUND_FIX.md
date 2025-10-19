# 🔧 Fix for "Card Not Found" Error

## Problem
The error `token card_test_65fhbko0icrpoa197i5 was not found` occurs because:

1. **Old card tokens** in database are expired/invalid
2. **Mismatched API keys** between when card was created vs when charging
3. **Card tokens belong to different Omise account**

## ✅ Solution: Clean Slate Approach

### Step 1: Clean Database
Run this SQL in your Supabase SQL editor:

```sql
DELETE FROM user_payment_methods 
WHERE omise_payment_method_id LIKE 'card_test_%' 
OR omise_payment_method_id LIKE 'tokn_test_%';
```

### Step 2: Verify API Keys Match
Ensure both files have matching keys from the SAME Omise account:

**omise-proxy-server/.env:**
```
OMISE_SECRET_KEY=skey_test_5nw5dlqahb02p9ottc4
OMISE_PUBLIC_KEY=pkey_test_5nw5dlqahb02p9ottc4
```

**react-webapp/.env:**
```
REACT_APP_OMISE_PUBLIC_KEY=pkey_test_5nw5dlqahb02p9ottc4
```

### Step 3: Restart Servers
```bash
# Terminal 1: Proxy Server
cd omise-proxy-server && npm start

# Terminal 2: React App (use different port if needed)
cd react-webapp && npm start
```

### Step 4: Test Fresh Flow
1. **Go to cart page**
2. **Add items** 
3. **Click "Secure Checkout"**
4. **Create NEW payment method** with test card `4242424242424242`
5. **This will create fresh, valid card tokens**
6. **Complete checkout** → Should work!

## Expected Result
- ✅ New payment method created successfully
- ✅ Valid card token stored in database
- ✅ Charge succeeds
- ✅ Transaction appears in Omise dashboard

## Debug Steps
If still getting errors:

1. **Check API keys match** in Omise dashboard
2. **Clear browser localStorage** (cart data)
3. **Check proxy server logs** for authentication
4. **Try different test card** numbers

The key is ensuring all components use the same, valid Omise account keys! 🔑