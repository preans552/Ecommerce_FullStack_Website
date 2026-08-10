const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
// Serve static frontend files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Paths to database files
const PRODUCTS_FILE = path.join(__dirname, 'data', 'products.json');
const ORDERS_FILE = path.join(__dirname, 'data', 'orders.json');

// Ensure orders database file exists
if (!fs.existsSync(path.dirname(ORDERS_FILE))) {
  fs.mkdirSync(path.dirname(ORDERS_FILE), { recursive: true });
}
if (!fs.existsSync(ORDERS_FILE)) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2));
}

// Utility: Read products from file
function readProducts() {
  try {
    const data = fs.readFileSync(PRODUCTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading products:', error);
    return [];
  }
}

// Utility: Read orders from file
function readOrders() {
  try {
    const data = fs.readFileSync(ORDERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading orders:', error);
    return [];
  }
}

// Utility: Save orders to file
function saveOrders(orders) {
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving orders:', error);
    return false;
  }
}

// --- API ROUTES ---

// 1. Get all products
app.get('/api/products', (req, res) => {
  const products = readProducts();
  res.json(products);
});

// 2. Calculate cart costs (validating prices backend-side)
app.post('/api/cart/calculate', (req, res) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Invalid items layout. Must be an array of { id, quantity }' });
  }

  const products = readProducts();
  let subtotal = 0;
  const validatedItems = [];

  for (const item of items) {
    const product = products.find(p => p.id === item.id);
    if (product) {
      const quantity = Math.max(1, parseInt(item.quantity) || 1);
      const itemCost = product.price * quantity;
      subtotal += itemCost;
      
      validatedItems.push({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: quantity,
        itemTotal: itemCost,
        image: product.image
      });
    }
  }

  // Delivery is always free
  const deliveryThreshold = 0;
  const deliveryCharge = 0;
  const total = subtotal;
  const neededForFreeShipping = 0;

  res.json({
    items: validatedItems,
    subtotal,
    deliveryCharge,
    total,
    deliveryThreshold,
    neededForFreeShipping,
    isFreeDelivery: subtotal >= deliveryThreshold
  });
});

// 3. Place order (saving details & validating price server-side)
app.post('/api/orders', (req, res) => {
  const { customer, items } = req.body;

  // Basic validation
  if (!customer || !customer.name || !customer.email || !customer.address || !customer.phone) {
    return res.status(400).json({ error: 'Customer details (name, email, address, phone) are required.' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty or invalid.' });
  }

  const products = readProducts();
  let subtotal = 0;
  const orderItems = [];

  for (const item of items) {
    const product = products.find(p => p.id === item.id);
    if (product) {
      const quantity = Math.max(1, parseInt(item.quantity) || 1);
      const itemCost = product.price * quantity;
      subtotal += itemCost;
      
      orderItems.push({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: quantity,
        itemTotal: itemCost
      });
    }
  }

  if (orderItems.length === 0) {
    return res.status(400).json({ error: 'No valid products in cart.' });
  }

  const deliveryCharge = 0;
  const total = subtotal;

  // Generate unique Order ID
  const orderId = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const newOrder = {
    orderId,
    customer,
    items: orderItems,
    subtotal,
    deliveryCharge,
    total,
    status: 'Processing',
    createdAt: new Date().toISOString()
  };

  const orders = readOrders();
  orders.push(newOrder);
  
  if (saveOrders(orders)) {
    res.status(201).json(newOrder);
  } else {
    res.status(500).json({ error: 'Could not save the order. Internal server error.' });
  }
});

// 4. Track Order status
app.get('/api/orders/:id', (req, res) => {
  const orderId = req.params.id;
  const orders = readOrders();
  const order = orders.find(o => o.orderId === orderId);

  if (!order) {
    return res.status(404).json({ error: `Order with ID ${orderId} not found.` });
  }

  res.json(order);
});

// Serve frontend SPA index for any non-API routes (fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
