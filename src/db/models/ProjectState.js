const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const Project = require('./Project');

const ProjectState = sequelize.define('ProjectState', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  state: {
    type: DataTypes.TEXT,
    defaultValue: '{}',
    get() {
      const value = this.getDataValue('state');
      return value ? JSON.parse(value) : {};
    },
    set(value) {
      this.setDataValue('state', JSON.stringify(value));
    }
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  projectId: {
    type: DataTypes.UUID,
    references: {
      model: Project,
      key: 'id'
    }
  },
  checkpoint: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

ProjectState.belongsTo(Project);
Project.hasMany(ProjectState);

module.exports = ProjectState;