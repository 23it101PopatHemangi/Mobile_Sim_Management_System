const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/simDashboard';

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '../frontend')));

// Connect to MongoDB
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`)
});
const upload = multer({ storage });
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Schemas
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: String
});
const User = mongoose.model('User', userSchema);

const simRequestSchema = new mongoose.Schema({
  employeeName: String,
  employeeId: String,
  mobile: String,
  designation: String,
  department: String,
  email: String,
  currentProvider: String,
  requestType: String,
  justification: String,
  duration: String,
  priority: String,
  document: String,
  status: { type: String, default: 'HOD Pending' },
  hod: {
    name: String,
    email: String,
    approvalDate: String,
    status: { type: String, default: 'Pending' }
  },
  assignedSim: String,
  createdAt: { type: Date, default: Date.now }
});
const SimRequest = mongoose.model('SimRequest', simRequestSchema);

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Unauthorized - No token' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error("❌ Token verification failed:", err.message);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    next();
  });
}


function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role.toLowerCase() !== role.toLowerCase()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
}


// Auth routes
app.post('/api/signup', async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashed, role });
    await user.save();
    res.status(201).json({ message: 'Signup successful' });
  } catch {
    res.status(400).json({ error: 'Email already exists or invalid data' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  res.json({ message: 'Login successful', token, role: user.role.toLocaleLowerCase() });
});

// SIM request submission
app.post('/api/requests', verifyToken, upload.single('document'), async (req, res) => {
  try {
    const reqBody = req.body;
    const simReq = new SimRequest({
      ...reqBody,
      document: req.file ? `/uploads/${req.file.filename}` : ''
    });
    await simReq.save();
    res.status(201).json({ message: 'Request submitted', request: simReq });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit request' });
  }
});

// Get requests by role
app.get('/api/requests', verifyToken, async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'Employee') {
      filter.email = req.user.email;
    } else if (req.user.role === 'HOD') {
      filter.status = 'HOD Pending';
    } else if (req.user.role === 'HR') {
      filter.status = 'HR Pending';
    }

    const requests = await SimRequest.find(filter).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch requests' });
  }
});

// HOD approve/reject
app.put('/api/requests/:id/hod-approve', verifyToken, requireRole('HOD'), async (req, res) => {
  try {
    const { name, email, approvalDate } = req.body;
    const updated = await SimRequest.findByIdAndUpdate(
      req.params.id,
      {
        status: 'HR Pending',
        hod: { name, email, approvalDate, status: 'Approved' }
      },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Request not found' });
    res.json({ message: 'HOD approved', request: updated });
  } catch (err) {
    res.status(500).json({ error: 'HOD approval failed' });
  }
});

app.put('/api/requests/:id/hod-reject', verifyToken, requireRole('HOD'), async (req, res) => {
  try {
    const { name, email, approvalDate } = req.body;
    const updated = await SimRequest.findByIdAndUpdate(
      req.params.id,
      {
        status: 'Rejected by HOD',
        hod: { name, email, approvalDate, status: 'Rejected' }
      },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Request not found' });
    res.json({ message: 'HOD rejected', request: updated });
  } catch (err) {
    res.status(500).json({ error: 'HOD rejection failed' });
  }
});
app.get('/api/requests/:id', verifyToken, async (req, res) => {
  try {
    const request = await SimRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    res.json({ request });
  } catch (err) {
    console.error('❌ Error fetching request by ID:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/inventory/assign', verifyToken, requireRole('Admin'), async (req, res) => {
  try {
    const { simId, requestId } = req.body;

    const sim = await SimInventory.findById(simId);
    if (!sim || sim.status === 'Assigned') {
      return res.status(400).json({ error: 'SIM not available' });
    }

    const request = await SimRequest.findById(requestId);
    if (!request || request.status !== 'Approved by Admin') {
      return res.status(400).json({ error: 'Invalid or unapproved request' });
    }

    // Assign SIM
    sim.status = 'Assigned';
    sim.assignedTo = request.employeeName;
    await sim.save();

    // Update SIM request with assigned SIM number
    request.assignedSim = sim.simNumber;
    await request.save();

    res.json({ message: 'SIM assigned successfully!' });
  } catch (err) {
    console.error("❌ Assignment error:", err);
    res.status(500).json({ error: 'Assignment failed' });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
// Approve request (for HR or Admin)
app.put('/api/requests/:id/approve', verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    const request = await SimRequest.findById(id);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    // You can add role-based logic if needed
    let newStatus = 'Approved by HR';
    if (req.user.role.toLowerCase() === 'admin') {
      newStatus = 'Approved by Admin';
    }

    request.status = newStatus;
    await request.save();

    res.json({ message: `${newStatus}`, request });
  } catch (err) {
    console.error("❌ Approve error:", err);
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

// HR Forward to Admin
app.put('/api/requests/:id/forward', verifyToken, requireRole('HR'), upload.single('document'), async (req, res) => {
  try {
    console.log("🔐 Authenticated as:", req.user); // Add this
    console.log("📨 Forwarding ID:", req.params.id);

    const id = req.params.id;
    const updateData = { status: 'Admin Pending' };

    if (req.file) {
      updateData.document = `/uploads/${req.file.filename}`;
    }

    const updated = await SimRequest.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) return res.status(404).json({ error: 'Request not found to forward' });

    res.json({ message: 'Request forwarded to Admin', request: updated });
  } catch (err) {
    console.error('❌ Forward error:', err);
    res.status(500).json({ error: 'Failed to forward to Admin' });
  }
});
// SIM Inventory Schema (ADD THIS if not already included)
const simInventorySchema = new mongoose.Schema({
  simNumber: { type: String, required: true },
  provider: { type: String, required: true },
  status: { type: String, default: 'Available' },
  assignedTo: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});
const SimInventory = mongoose.model('SimInventory', simInventorySchema);

app.post('/api/inventory', verifyToken, requireRole('Admin'), async (req, res) => {
  try {
    console.log("📥 Inventory Payload:", req.body);  // ✅ log payload
    const sim = new SimInventory(req.body);
    await sim.save();
    res.status(201).json({ message: 'SIM added to inventory successfully' });
  } catch (err) {
    console.error("❌ Inventory save error:", err);   // ✅ log real error
    res.status(500).json({ error: 'Failed to save SIM inventory' });
  }
});

app.get('/api/inventory', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.provider) filter.provider = req.query.provider;

    const sims = await SimInventory.find(filter);
    res.json(sims);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch SIM inventory' });
  }
});
app.get('/api/inventory/available', async (req, res) => {
  try {
    const available = await SimInventory.find({ status: 'Available' });
    res.json(available);
  } catch (err) {
    res.status(500).json({ error: 'Could not get available SIMs' });
  }
});
