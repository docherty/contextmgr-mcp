# MCP Server Tools and Functionality Documentation

This document outlines the core tools and functionalities provided by the MCP Server for managing complex development workflows.

## 1. Project Management Tools

### Project Creation and Initialization
- **API Endpoint**: `POST /api/projects`
- **Functionality**: Creates a new project and initializes the workflow in the triage phase
- **Usage**: Send project metadata including name, description, and objectives

### Project State Management
- **API Endpoint**: `GET /api/projects/:id`
- **Functionality**: Retrieves current project status and metadata
- **Usage**: Use to get an overview of project progress and current state

### Project Resumption
- **API Endpoint**: `POST /api/projects/:id/resume`
- **Functionality**: Resumes a project from its last checkpoint
- **Usage**: Call when restarting development sessions to restore context

## 2. Work Package Management Tools

### Work Package Creation
- **API Endpoint**: `POST /api/workpackages/project/:projectId`
- **Functionality**: Creates a new work package with automated ID generation
- **Usage**: Use during planning phase to organize work into logical groupings

### Work Package Status Tracking
- **API Endpoint**: `GET /api/workpackages/:id/progress`
- **Functionality**: Calculates and returns work package completion percentage
- **Usage**: Monitor progress of specific work packages during development

### Work Package Review
- **API Endpoint**: `POST /api/workpackages/:id/review`
- **Functionality**: Validates completion of all tasks in a work package
- **Usage**: Call when all tasks in a work package appear to be complete

## 3. Task Management Tools

### Task Creation
- **API Endpoint**: `POST /api/tasks/workpackage/:workPackageId`
- **Functionality**: Creates a new task with automated ID generation
- **Usage**: Define specific, file-level changes required for work packages

### Task Dependencies
- **API Endpoint**: `PATCH /api/tasks/:id`
- **Functionality**: Updates task properties including dependencies
- **Usage**: Establish relationships between tasks to enforce completion order

### Task Lifecycle Management
- **API Endpoints**: 
  - `POST /api/tasks/:id/start`
  - `POST /api/tasks/:id/complete`
  - `POST /api/tasks/:id/qa/start`
  - `POST /api/tasks/:id/qa/complete`
- **Functionality**: Manages task state transitions through the development lifecycle
- **Usage**: Progress tasks from planned to in-progress to QA to completion

### Task Checkpointing
- **API Endpoint**: `POST /api/tasks/:id/checkpoint`
- **Functionality**: Creates a checkpoint of task implementation state
- **Usage**: Save progress before interruptions to enable seamless resumption

### Task Resumption
- **API Endpoint**: `GET /api/tasks/:id/resume`
- **Functionality**: Restores task context from latest checkpoint
- **Usage**: Return to a task with full context after interruption

### Next Task Selection
- **API Endpoint**: `GET /api/tasks/next/project/:projectId`
- **Functionality**: Identifies the next task to work on based on dependencies
- **Usage**: Automatically determine what work should be done next

## 4. QA Tools

### QA Task Selection
- **API Endpoint**: `GET /api/tasks/qa/project/:projectId`
- **Functionality**: Lists tasks ready for QA review
- **Usage**: Find tasks that have been completed and need quality review

### Fix Task Creation
- **API Endpoint**: `POST /api/tasks/:id/fix`
- **Functionality**: Creates a new task to address QA failures
- **Usage**: When QA fails, automatically create follow-up tasks

## 5. State Management Tools

### Current State Retrieval
- **API Endpoint**: `GET /api/state/project/:projectId/current`
- **Functionality**: Gets the current active state for a project
- **Usage**: Understand current context and next steps

### State History
- **API Endpoint**: `GET /api/state/project/:projectId/history`
- **Functionality**: Retrieves historical state snapshots
- **Usage**: View previous project states to understand progression

### Checkpoint Management
- **API Endpoint**: `GET /api/state/project/:projectId/checkpoints`
- **Functionality**: Lists all available checkpoints for resumption
- **Usage**: Find specific checkpoints to resume from

## 6. Triage Tools

### Assessment Recording
- **API Endpoint**: `POST /api/projects/:id/triage`
- **Functionality**: Stores initial project assessment
- **Usage**: Record project scope, complexity, and requirements

### Information Gathering
- **API Endpoint**: 
  - `POST /api/projects/:id/triage/request`
  - `POST /api/projects/:id/triage/response`
- **Functionality**: Facilitates information exchange during triage
- **Usage**: Ask questions and record responses during requirements gathering

## 7. Role Transition Tools

### Role Management
- **API Endpoint**: `POST /api/projects/:id/transition`
- **Functionality**: Transitions project between workflow roles
- **Usage**: Move from triage to planning to development to QA as needed

## 8. File Management Tools

The MCP server internally tracks files modified during tasks:

- **File Registry**: Maintains record of all files modified during development
- **Modification History**: Tracks which tasks modified each file
- **Current State**: Stores the current content state of each file
- **Resumption Context**: Provides file context when resuming interrupted work

## Integration Points for Cline IDE

The Cline IDE should integrate with these endpoints to provide:

1. **Workflow Guidance**: Help users follow the correct process steps
2. **State Visualization**: Show current project, work package, and task status
3. **Task Focus**: Direct users to specific files that need changing for current task
4. **Progress Tracking**: Display completion percentages and next steps
5. **Interruption Handling**: Create checkpoints before sessions end
6. **Resumption Support**: Restore context when restarting sessions

By leveraging these tools through the MCP Server API, the Cline IDE can provide a structured, consistent development experience that maintains context across sessions and ensures proper workflow adherence.