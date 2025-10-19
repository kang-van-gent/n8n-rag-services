#!/bin/bash

# Start both servers for Omise integration testing

echo "🚀 Starting Omise Integration Servers..."

# Start proxy server in background
echo "📡 Starting Omise Proxy Server on port 3001..."
cd omise-proxy-server && npm start &
PROXY_PID=$!

# Wait a moment for proxy to start
sleep 3

# Start React app
echo "⚛️  Starting React App on port 3000..."
cd ../react-webapp && npm start &
REACT_PID=$!

echo "🎉 Both servers started!"
echo "🔗 Proxy Server: http://localhost:3001"
echo "🔗 React App: http://localhost:3000"
echo ""
echo "🧪 Test the complete flow:"
echo "1. Add items to cart"
echo "2. Create payment method (test card: 4242424242424242)"
echo "3. Complete checkout → Real Omise transaction!"
echo ""
echo "Press Ctrl+C to stop both servers..."

# Wait for user to stop
wait