const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'], // Allow your React app
    credentials: true
}));
app.use(express.json());

// Omise configuration
const OMISE_SECRET_KEY = process.env.OMISE_SECRET_KEY || 'skey_test_5nw5dlqajzq9gdwvtxc';

console.log('🔑 Using Omise Secret Key:', OMISE_SECRET_KEY ? `${OMISE_SECRET_KEY.substring(0, 10)}...` : 'NOT FOUND');

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Omise Proxy Server is running',
        hasSecretKey: !!OMISE_SECRET_KEY,
        secretKeyPrefix: OMISE_SECRET_KEY ? OMISE_SECRET_KEY.substring(0, 10) : null
    });
});

// Debug endpoint to check account info
app.get('/debug/account', async (req, res) => {
    try {
        const authString = Buffer.from(OMISE_SECRET_KEY + ':').toString('base64');
        const response = await fetch('https://api.omise.co/account', {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${authString}`,
            },
        });

        const result = await response.json();

        if (response.ok) {
            res.json({
                account_id: result.id,
                email: result.email,
                object: result.object,
                country: result.country,
                currency: result.currency
            });
        } else {
            res.status(response.status).json(result);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create charge endpoint
app.post('/api/charges', async (req, res) => {
    try {
        console.log('📝 Received charge request:', req.body);

        const { amount, currency, card, description, metadata } = req.body;

        // Validate required fields
        if (!amount || !currency || !card) {
            return res.status(400).json({
                error: 'Missing required fields: amount, currency, or card'
            });
        }

        console.log('🎫 Card token details:', {
            card: card,
            type: typeof card,
            length: card?.length,
            startsWithTokn: card?.startsWith?.('tokn_'),
            startsWithCard: card?.startsWith?.('card_')
        });

        // Setup authentication for API calls
        const authString = Buffer.from(OMISE_SECRET_KEY + ':').toString('base64');

        // Prepare charge data for Omise API
        let chargeData;

        if (card.startsWith('cust_test_')) {
            // This is a customer ID, charge the customer's default card
            console.log('🏦 Charging customer with ID:', card);
            chargeData = {
                amount: parseInt(amount),
                currency: currency.toLowerCase(),
                customer: card, // Use customer ID
                description: description || 'Payment from React App',
                metadata: metadata || {}
            };
        } else if (card.startsWith('card_test_')) {
            // This is a card ID - we need the customer ID that owns this card
            return res.status(400).json({
                error: 'Card ID provided instead of customer ID. Please use customer ID for charging.'
            });
        } else {
            // This is a token, charge directly
            console.log('💳 Charging with token:', card);
            chargeData = {
                amount: parseInt(amount),
                currency: currency.toLowerCase(),
                card: card,
                description: description || 'Payment from React App',
                metadata: metadata || {}
            };
        }

        console.log('🚀 Sending to Omise API:', chargeData);
        console.log('🔐 Auth string (first 20 chars):', authString.substring(0, 20) + '...');
        console.log('🔑 Secret key format check:', {
            hasSecretKey: !!OMISE_SECRET_KEY,
            startsWithSkey: OMISE_SECRET_KEY.startsWith('skey_'),
            length: OMISE_SECRET_KEY.length
        });

        // Call Omise API
        const response = await fetch('https://api.omise.co/charges', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authString}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(chargeData),
        });

        const result = await response.json();

        console.log('📨 Omise API response:', {
            status: response.status,
            ok: response.ok,
            id: result.id,
            object: result.object,
            status: result.status
        });

        if (response.ok) {
            console.log('✅ Charge created successfully:', result.id);
            res.json(result);
        } else {
            console.error('❌ Charge failed:', result);
            res.status(response.status).json(result);
        }

    } catch (error) {
        console.error('💥 Server error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Create customer endpoint
app.post('/api/customers', async (req, res) => {
    try {
        console.log('👤 Received customer creation request:', req.body);

        const { email, description, card } = req.body;

        // Validate required fields
        if (!email || !card) {
            return res.status(400).json({
                error: 'Missing required fields: email or card token'
            });
        }

        // Prepare customer data for Omise API
        const customerData = {
            email: email,
            description: description || 'Customer created from React App',
            card: card // Token to attach to customer
        };

        console.log('🚀 Creating Omise customer:', customerData);

        // Call Omise API to create customer
        const authString = Buffer.from(OMISE_SECRET_KEY + ':').toString('base64');
        const response = await fetch('https://api.omise.co/customers', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authString}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(customerData),
        });

        const result = await response.json();

        console.log('📨 Omise customer API response:', {
            status: response.status,
            ok: response.ok,
            id: result.id,
            object: result.object
        });

        if (response.ok) {
            console.log('✅ Customer created successfully:', result.id);
            res.json(result);
        } else {
            console.error('❌ Customer creation failed:', result);
            res.status(response.status).json(result);
        }

    } catch (error) {
        console.error('💥 Server error creating customer:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// In-memory store for tracking charges (in production, use Redis or database)
const chargeTracker = new Map();

// Create internet banking charge endpoint (source + charge in one)
app.post('/api/internet-banking-charge', async (req, res) => {
    try {
        console.log('🏦 Received internet banking charge request:', req.body);

        const { source, amount, currency, description, return_uri, failure_uri, metadata } = req.body;

        // Validate required fields
        if (!source || !amount || !currency) {
            return res.status(400).json({
                error: 'Missing required fields: source, amount, or currency'
            });
        }

        // Setup authentication for API calls
        const authString = Buffer.from(OMISE_SECRET_KEY + ':').toString('base64');

        console.log('🚀 Step 1: Creating source for internet banking...', source);

        // Step 1: Create source
        const sourceResponse = await fetch('https://api.omise.co/sources', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authString}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(source),
        });

        const sourceResult = await sourceResponse.json();

        console.log('📨 Source API response:', {
            status: sourceResponse.status,
            ok: sourceResponse.ok,
            id: sourceResult.id,
            object: sourceResult.object,
            type: sourceResult.type
        });

        if (!sourceResponse.ok) {
            console.error('❌ Source creation failed:', sourceResult);
            return res.status(sourceResponse.status).json(sourceResult);
        }

        console.log('✅ Source created successfully:', sourceResult.id);

        // Step 2: Create charge with source
        // Modify return URIs to include tracking info (append correctly whether or not there are existing query params)
        const trackingId = `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const appendTracking = (uri) => {
            try {
                const u = new URL(uri);
                u.searchParams.set('tracking_id', trackingId);
                return u.toString();
            } catch (e) {
                // Fallback for unexpected formats
                const sep = uri.includes('?') ? '&' : '?';
                return `${uri}${sep}tracking_id=${trackingId}`;
            }
        };

        const chargeData = {
            amount: parseInt(amount),
            currency: currency.toLowerCase(),
            source: sourceResult.id,
            description: description || 'Internet Banking Payment',
            return_uri: appendTracking(return_uri),
            failure_uri: appendTracking(failure_uri),
            metadata: {
                ...metadata,
                tracking_id: trackingId
            }
        };

        console.log('🚀 Step 2: Creating charge with source...', chargeData);

        const chargeResponse = await fetch('https://api.omise.co/charges', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authString}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(chargeData),
        });

        const chargeResult = await chargeResponse.json();

        console.log('📨 Charge API response:', {
            status: chargeResponse.status,
            ok: chargeResponse.ok,
            id: chargeResult.id,
            object: chargeResult.object,
            status: chargeResult.status,
            authorize_uri: chargeResult.authorize_uri
        });

        if (chargeResponse.ok) {
            // Store charge info for later retrieval
            chargeTracker.set(trackingId, {
                chargeId: chargeResult.id,
                userId: metadata?.user_id,
                amount: amount,
                currency: currency,
                status: chargeResult.status,
                created: new Date().toISOString()
            });

            console.log('✅ Internet banking charge created successfully:', chargeResult.id);
            console.log('📌 Tracking ID created:', trackingId);

            res.json({
                success: true,
                charge: chargeResult,
                source: sourceResult,
                tracking_id: trackingId
            });
        } else {
            console.error('❌ Charge creation failed:', chargeResult);
            res.status(chargeResponse.status).json(chargeResult);
        }

    } catch (error) {
        console.error('💥 Server error creating internet banking charge:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Handle Omise return URLs (success/failure)
app.get('/api/payment-return', async (req, res) => {
    console.log('🔄 Payment return URL hit:', req.query);
    console.log('Full URL:', req.url);

    // Extract all query parameters
    const params = req.query;
    let paymentStatus = 'failed'; // Default to failed for safety
    let chargeId = null;

    // Check if we have tracking ID to get charge info
    if (params.tracking_id) {
        const trackingData = chargeTracker.get(params.tracking_id);
        console.log('📋 Found tracking data:', trackingData);

        if (trackingData) {
            chargeId = trackingData.chargeId;
        }
    }

    // Also check for charge ID directly in URL
    if (!chargeId && (params.charge_id || params.id)) {
        chargeId = params.charge_id || params.id;
    }

    // If we have a charge ID, check its actual status
    if (chargeId) {
        console.log('🔍 Checking charge status for:', chargeId);

        try {
            // Query Omise API to get actual charge status
            const authString = Buffer.from(OMISE_SECRET_KEY + ':').toString('base64');
            const response = await fetch(`https://api.omise.co/charges/${chargeId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${authString}`,
                },
            });

            if (response.ok) {
                const chargeData = await response.json();

                console.log('📋 Charge details from API:', {
                    id: chargeData.id,
                    status: chargeData.status,
                    paid: chargeData.paid,
                    failure_code: chargeData.failure_code,
                    failure_message: chargeData.failure_message
                });

                // Update tracking data with latest status
                if (params.tracking_id && chargeTracker.has(params.tracking_id)) {
                    const trackingData = chargeTracker.get(params.tracking_id);
                    trackingData.status = chargeData.status;
                    trackingData.paid = chargeData.paid;
                    chargeTracker.set(params.tracking_id, trackingData);
                }

                // Determine status based on actual charge data
                if (chargeData.paid === true && chargeData.status === 'successful') {
                    paymentStatus = 'success';
                } else if (chargeData.status === 'failed') {
                    paymentStatus = 'failed';
                } else if (chargeData.status === 'pending') {
                    // For pending status, treat as failed since user likely cancelled/closed
                    paymentStatus = 'failed';
                    console.log('⏳ Charge is still pending, treating as failed');
                } else {
                    paymentStatus = 'failed';
                    console.log('❌ Unknown charge status, treating as failed');
                }
            } else {
                console.error('❌ Failed to fetch charge details:', response.status);
                paymentStatus = 'failed';
            }

        } catch (error) {
            console.error('💥 Error checking charge status:', error);
            paymentStatus = 'failed';
        }
    } else {
        // No charge ID provided, check URL parameters as fallback
        console.log('❓ No charge ID available, checking URL parameters...');

        // Check for failure indicators
        if (params.failure || params.error || params.cancelled || params.status === 'failed') {
            paymentStatus = 'failed';
        }

        // Check for cancellation indicators
        if (params.cancelled === 'true' || params.cancel === 'true' || params.status === 'cancelled') {
            paymentStatus = 'cancelled';
        }

        // Check for success indicators
        if (params.success === 'true' || params.status === 'success' || params.status === 'successful') {
            paymentStatus = 'success';
        }

        console.log('⚠️ No charge ID found, relying on URL parameters - this may be inaccurate');
    }

    console.log('📊 Final determined payment status:', paymentStatus);

    // Determine base redirect target (default to Users page if not provided)
    const baseRedirect = req.query.redirect || 'http://localhost:3000/users';

    // Safely append query params to the base redirect URL
    const appendParams = (urlStr, params) => {
        try {
            const u = new URL(urlStr);
            Object.entries(params).forEach(([k, v]) => {
                if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
            });
            return u.toString();
        } catch (e) {
            const sep = urlStr.includes('?') ? '&' : '?';
            const query = Object.entries(params)
                .filter(([, v]) => v !== undefined && v !== null)
                .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
                .join('&');
            return `${urlStr}${sep}${query}`;
        }
    };

    const redirectUrl = appendParams(baseRedirect, {
        payment: paymentStatus,
        ...(chargeId ? { charge_id: chargeId } : {})
    });

    console.log('🔀 Redirecting to:', redirectUrl);
    res.redirect(redirectUrl);
});// Handle Omise failure URLs
app.get('/api/payment-failure', (req, res) => {
    console.log('❌ Payment failure URL hit:', req.query);
    console.log('Full URL:', req.url);

    // Determine base redirect target (default to Users page if not provided)
    const baseRedirect = req.query.redirect || 'http://localhost:3000/users';

    const appendParams = (urlStr, params) => {
        try {
            const u = new URL(urlStr);
            Object.entries(params).forEach(([k, v]) => {
                if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
            });
            return u.toString();
        } catch (e) {
            const sep = urlStr.includes('?') ? '&' : '?';
            const query = Object.entries(params)
                .filter(([, v]) => v !== undefined && v !== null)
                .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
                .join('&');
            return `${urlStr}${sep}${query}`;
        }
    };

    // Always redirect with failed status for failure endpoint
    const redirectUrl = appendParams(baseRedirect, { payment: 'failed' });

    console.log('🔀 Redirecting to:', redirectUrl);
    res.redirect(redirectUrl);
});

// Webhook endpoint for Omise events
app.post('/api/webhooks/omise', (req, res) => {
    console.log('🎣 Omise webhook received:', req.body);

    const event = req.body;

    if (event && event.data) {
        console.log('📝 Webhook event details:', {
            key: event.key,
            object: event.data.object,
            id: event.data.id,
            status: event.data.status,
            paid: event.data.paid
        });

        // Update tracking data if we have the charge
        const chargeId = event.data.id;
        if (chargeId) {
            // Find tracking entry by charge ID
            for (const [trackingId, trackingData] of chargeTracker.entries()) {
                if (trackingData.chargeId === chargeId) {
                    console.log('🔄 Updating tracking data for:', trackingId);
                    trackingData.status = event.data.status;
                    trackingData.paid = event.data.paid;
                    trackingData.updated = new Date().toISOString();
                    chargeTracker.set(trackingId, trackingData);
                    break;
                }
            }
        }

        // Handle different event types
        switch (event.key) {
            case 'charge.complete':
                console.log('✅ Charge completed:', event.data.id, 'Paid:', event.data.paid);
                break;
            case 'charge.create':
                console.log('🆕 Charge created:', event.data.id);
                break;
            case 'charge.payment':
                console.log('💳 Charge payment:', event.data.id, event.data.status);
                break;
            case 'charge.update':
                console.log('🔄 Charge updated:', event.data.id, event.data.status);
                break;
            default:
                console.log('📋 Other event:', event.key);
        }
    }

    // Always respond with 200 to acknowledge receipt
    res.status(200).json({ received: true });
});// Start server
app.listen(PORT, () => {
    console.log(`🚀 Omise Proxy Server running on http://localhost:${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`💳 Charges endpoint: http://localhost:${PORT}/api/charges`);
    console.log(`🏦 Internet Banking endpoint: http://localhost:${PORT}/api/internet-banking-charge`);
});