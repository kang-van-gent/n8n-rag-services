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
        const chargeData = {
            amount: parseInt(amount),
            currency: currency.toLowerCase(),
            source: sourceResult.id,
            description: description || 'Internet Banking Payment',
            return_uri: return_uri,
            failure_uri: failure_uri,
            metadata: metadata || {}
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
            console.log('✅ Internet banking charge created successfully:', chargeResult.id);
            res.json({
                success: true,
                charge: chargeResult,
                source: sourceResult
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

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Omise Proxy Server running on http://localhost:${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`💳 Charges endpoint: http://localhost:${PORT}/api/charges`);
    console.log(`🏦 Internet Banking endpoint: http://localhost:${PORT}/api/internet-banking-charge`);
});