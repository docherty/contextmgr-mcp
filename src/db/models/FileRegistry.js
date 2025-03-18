const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const Project = require('./Project');
const Task = require('./Task');

const FileRegistry = sequelize.define('FileRegistry', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  filePath: {
    type: DataTypes.STRING,
    allowNull: false
  },
  currentState: {
    type: DataTypes.TEXT,
    defaultValue: '{}'
  },
  modificationHistory: {
    type: DataTypes.TEXT,
    defaultValue: '[]',
    get() {
      const value = this.getDataValue('modificationHistory');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('modificationHistory', JSON.stringify(value));
    }
  },
  projectId: {
    type: DataTypes.UUID,
    references: {
      model: Project,
      key: 'id'
    }
  },
  lastModifiedBy: {
    type: DataTypes.UUID,
    references: {
      model: Task,
      key: 'id'
    },
    allowNull: true
  }
});

FileRegistry.belongsTo(Project);
Project.hasMany(FileRegistry);

module.exports = FileRegistry;