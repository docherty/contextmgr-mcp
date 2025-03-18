# Contextmgr MCP Server

A Model Context Protocol (MCP) server implementation for managing development context and workflow, designed to store all state and data within the host project's directory structure.

## Overview

Contextmgr MCP Server is designed to manage development workflow state and context within a project's own directory structure. It maintains state in a `contextmgr` directory within your project, enabling seamless workflow management and state persistence.

## Installation

```bash
npm install contextmgr-mcp
```

## Usage

### Basic Setup

```typescript
import { ContextmgrServer } from 'contextmgr-mcp';

const server = new ContextmgrServer({
  projectRoot: process.cwd(),  // Your project's root directory
  contextDir: 'contextmgr'     // Optional, defaults to 'contextmgr'
});

await server.initialize();
await server.start();
```

### Project Structure

When initialized, the server creates the following structure in your project:

```
your-project/
├── contextmgr/              # All MCP state and data
│   ├── state.json          # Current state
│   ├── checkpoints/        # State checkpoints
│   └── temp/               # Temporary files
└── ... rest of your project
```

## Features

### Project Management
- Create and manage projects
- Track project status and roles
- Create project checkpoints
- Restore from checkpoints

### Work Packages
- Create work packages within projects
- Track work package progress
- Manage work package status
- Group related tasks

### Task Management
- Create tasks within work packages
- Track file changes
- Record task progress
- Create task checkpoints

### QA Workflow
- Start QA reviews
- Record QA feedback
- Request fixes
- Accept completed work

## MCP Tools

### Project Tools
- `create_project`: Create a new project
- `get_project`: Get project details
- `create_project_checkpoint`: Create project checkpoint
- `restore_project_checkpoint`: Restore from checkpoint

### Work Package Tools
- `create_workpackage`: Create work package
- `get_workpackage`: Get work package details
- `update_workpackage_progress`: Update progress
- `update_workpackage_status`: Update status

### Task Tools
- `create_task`: Create new task
- `update_task_status`: Update task status
- `record_file_change`: Record file changes
- `create_task_checkpoint`: Create task checkpoint
- `restore_task_checkpoint`: Restore task checkpoint

### QA Tools
- `start_qa_review`: Start QA review
- `complete_qa_review`: Complete QA review
- `request_fixes`: Request task fixes
- `accept_workpackage`: Accept completed work package

## Example Usage

### Create a Project

```typescript
const result = await server.executeTool('create_project', {
  name: 'My Project',
  description: 'A sample project'
});
```

### Create Work Package

```typescript
const result = await server.executeTool('create_workpackage', {
  projectId: 'project-id',
  name: 'Feature Implementation',
  description: 'Implement new feature'
});
```

### Create Task

```typescript
const result = await server.executeTool('create_task', {
  workPackageId: 'workpackage-id',
  name: 'Update Component',
  description: 'Update component implementation',
  filePath: 'src/components/MyComponent.ts'
});
```

### Record File Change

```typescript
const result = await server.executeTool('record_file_change', {
  taskId: 'task-id',
  filePath: 'src/components/MyComponent.ts',
  changeType: 'UPDATE'
});
```

### Complete QA Review

```typescript
const result = await server.executeTool('complete_qa_review', {
  taskId: 'task-id',
  passed: true,
  feedback: 'Implementation looks good'
});
```

## State Management

The server maintains all state in the project's `contextmgr` directory:

- State is persisted in JSON format
- Checkpoints are stored as separate files
- File changes are tracked with metadata

## Development

### Build

```bash
npm run build
```

### Run Tests

```bash
npm test
```

## License
GNU Affero General Public License v3.0


## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
