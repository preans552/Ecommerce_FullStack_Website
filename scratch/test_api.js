const { spawn } = require('child_process');
const assert = require('assert').strict;

console.log('--- STARTING AUTOMATED REST API TESTING ---');

// Spawn server process on port 3001 to avoid conflicts
const env = { ...process.env, PORT: '3001' };
const serverProcess = spawn('node', ['server.js'], { env });

let stdoutBuffer = '';
serverProcess.stdout.on('data', (data) => {
  stdoutBuffer += data.toString();
  console.log('[Server stdout]:', data.toString().trim());
});

serverProcess.stderr.on('data', (data) => {
  console.error('[Server stderr]:', data.toString());
});

// Give the server 2.0 seconds to start up, then run tests
setTimeout(async () => {
  try {
    console.log('\nRunning tests...');

    // Test 1: Fetch Products List
    console.log('\nTest 1: Fetching products...');
    const productsRes = await fetch('http://127.0.0.1:3001/api/products');
    assert.equal(productsRes.status, 200, 'Products retrieval status should be 200');
    const products = await productsRes.json();
    assert.ok(Array.isArray(products), 'Products response should be an array');
    assert.ok(products.length > 0, 'Products list should not be empty');
    console.log('✓ Products list retrieved successfully. Total count:', products.length);

    // Test 2: Calculate Cart (Subtotal < 2000, should be FREE delivery)
    console.log('\nTest 2: Cart Calculation under ₹2,000 threshold...');
    // Apex Pro Mechanical Keyboard is ₹1,499. One item.
    const cartLowBody = {
      items: [{ id: 'prod_01', quantity: 1 }]
    };
    const calcLowRes = await fetch('http://127.0.0.1:3001/api/cart/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cartLowBody)
    });
    assert.equal(calcLowRes.status, 200, 'Calc status should be 200');
    const calcLow = await calcLowRes.json();
    console.log(`Subtotal: ₹${calcLow.subtotal}, Shipping: ₹${calcLow.deliveryCharge}, Total: ₹${calcLow.total}`);
    assert.equal(calcLow.subtotal, 1499, 'Subtotal should be 1499');
    assert.equal(calcLow.deliveryCharge, 0, 'Shipping charge should be 0 for all orders');
    assert.equal(calcLow.total, 1499, 'Total should equal subtotal (1499)');
    console.log('✓ Cart under ₹2,000 correctly has FREE delivery.');

    // Test 3: Calculate Cart (Subtotal >= 2000, should be FREE delivery)
    console.log('\nTest 3: Cart Calculation over ₹2,000 threshold...');
    // Aether Pro Keyboard is ₹3,499. One item.
    const cartHighBody = {
      items: [{ id: 'prod_02', quantity: 1 }]
    };
    const calcHighRes = await fetch('http://127.0.0.1:3001/api/cart/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cartHighBody)
    });
    assert.equal(calcHighRes.status, 200, 'Calc status should be 200');
    const calcHigh = await calcHighRes.json();
    console.log(`Subtotal: ₹${calcHigh.subtotal}, Shipping: ₹${calcHigh.deliveryCharge}, Total: ₹${calcHigh.total}`);
    assert.equal(calcHigh.subtotal, 3499, 'Subtotal should be 3499');
    assert.equal(calcHigh.deliveryCharge, 0, 'Shipping charge should be 0 for all orders');
    assert.equal(calcHigh.total, 3499, 'Total should equal subtotal (3499)');
    console.log('✓ Cart equal or above ₹2,000 correctly has FREE shipping.');

    // Test 4: Place Order
    console.log('\nTest 4: Creating a customer order...');
    const orderPayload = {
      customer: {
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '9988776655',
        address: 'Sector 5, Salt Lake, Kolkata, West Bengal, 700091'
      },
      items: [
        { id: 'prod_01', quantity: 1 }, // ₹1,499
        { id: 'prod_03', quantity: 1 }  // ₹899 -> Total = 2398 (Free Delivery)
      ]
    };
    const orderRes = await fetch('http://127.0.0.1:3001/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });
    assert.equal(orderRes.status, 201, 'Order creation status should be 201');
    const order = await orderRes.json();
    console.log(`Order placed. ID: ${order.orderId}, Subtotal: ₹${order.subtotal}, Shipping: ₹${order.deliveryCharge}, Total: ₹${order.total}`);
    assert.ok(order.orderId.startsWith('ORD-'), 'OrderID must start with ORD-');
    assert.equal(order.subtotal, 2398, 'Subtotal should be 2398');
    assert.equal(order.deliveryCharge, 0, 'Shipping charge should be 0 for all orders');
    assert.equal(order.total, 2398, 'Total should be 2398');
    assert.equal(order.status, 'Processing', 'Initial order status should be Processing');
    console.log('✓ Order created successfully with backend-validated details.');

    // Test 5: Track Order
    console.log('\nTest 5: Tracking the placed order...');
    const trackRes = await fetch(`http://127.0.0.1:3001/api/orders/${order.orderId}`);
    assert.equal(trackRes.status, 200, 'Tracking request status should be 200');
    const trackData = await trackRes.json();
    assert.equal(trackData.orderId, order.orderId, 'Tracked order ID should match');
    assert.equal(trackData.customer.name, 'Jane Doe', 'Customer name should match');
    assert.equal(trackData.status, 'Processing', 'Status should match');
    console.log('✓ Tracked order details retrieved and verified successfully.');

    console.log('\n========================================');
    console.log('🎉 ALL AUTOMATED API TESTS PASSED SUCCESSFULLY!');
    console.log('========================================');

    shutdown(0);
  } catch (error) {
    console.error('\n❌ TEST ASSERTION FAILURE:', error.message);
    shutdown(1);
  }
}, 2000);

function shutdown(exitCode) {
  console.log('Shutting down test server...');
  try {
    serverProcess.kill('SIGINT');
  } catch (e) {
    // Ignore shutdown kill errors on Windows
  }
  setTimeout(() => {
    process.exit(exitCode);
  }, 100);
}
