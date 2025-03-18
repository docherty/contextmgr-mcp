const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const { sequelize } = require('./config/database');

// Import routes
const projectRoutes = require('./api/routes/projectRoutes');
const workPackageRoutes = require('./api/routes/workPackageRoutes');
const taskRoutes = require('./api/routes/taskRoutes');
const stateRoutes = require('./api/routes/stateRoutes');

// Initialize the app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(morgan('dev'));

// Routes
app.use('/api/projects', projectRoutes);
app.use('/api/workpackages', workPackageRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/state', stateRoutes);

// Base route
app.get('/', (req, res) => {
  res.send('MCP Server is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: true,
    message: 'Internal Server Error',
    details: err.message
  });
});

// Start the server
async function startServer() {
  try {
    // Sync database models
    await sequelize.sync();
    console.log('Database synchronized successfully');
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`MCP Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
}

startServer();