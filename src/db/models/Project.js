const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Project = sequelize.define('Project', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  objectives: {
    type: DataTypes.TEXT
  },
  status: {
    type: DataTypes.ENUM('PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'),
    defaultValue: 'PLANNING'
  },
  currentRole: {
    type: DataTypes.ENUM('TRIAGE', 'PLANNING', 'DEVELOPMENT', 'QA', 'ORCHESTRATOR'),
    defaultValue: 'TRIAGE'
  },
  knowledgeBase: {
    type: DataTypes.TEXT,
    defaultValue: '{}',
    get() {
      const value = this.getDataValue('knowledgeBase');
      return value ? JSON.parse(value) : {};
    },
    set(value) {
      this.setDataValue('knowledgeBase', JSON.stringify(value));
    }
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

module.exports = Project;