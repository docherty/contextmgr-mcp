const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const WorkPackage = require('./WorkPackage');

const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  taskId: {
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
  filePath: {
    type: DataTypes.STRING,
    allowNull: false
  },
  changes: {
    type: DataTypes.TEXT,
    defaultValue: '{}'
  },
  status: {
    type: DataTypes.ENUM('PLANNED', 'IN_PROGRESS', 'READY_FOR_QA', 'QA_IN_PROGRESS', 'COMPLETED', 'FAILED'),
    defaultValue: 'PLANNED'
  },
  successCriteria: {
    type: DataTypes.TEXT
  },
  qaResults: {
    type: DataTypes.TEXT,
    defaultValue: '{}'
  },
  workPackageId: {
    type: DataTypes.UUID,
    references: {
      model: WorkPackage,
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
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 0
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

Task.belongsTo(WorkPackage);
WorkPackage.hasMany(Task);

module.exports = Task;