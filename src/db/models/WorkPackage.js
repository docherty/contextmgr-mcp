const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const Project = require('./Project');

const WorkPackage = sequelize.define('WorkPackage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  wpId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  status: {
    type: DataTypes.ENUM('PLANNED', 'IN_PROGRESS', 'READY_FOR_QA', 'QA_IN_PROGRESS', 'COMPLETED', 'FAILED'),
    defaultValue: 'PLANNED'
  },
  progress: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  successCriteria: {
    type: DataTypes.TEXT
  },
  projectId: {
    type: DataTypes.UUID,
    references: {
      model: Project,
      key: 'id'
    }
  },
  dependencies: {
    type: DataTypes.TEXT,
    defaultValue: '[]',
    get() {
      const value = this.getDataValue('dependencies');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('dependencies', JSON.stringify(value));
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

WorkPackage.belongsTo(Project);
Project.hasMany(WorkPackage);

module.exports = WorkPackage;