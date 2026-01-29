### Project Planning Doc
[Link](https://docs.google.com/document/d/1PAPP2f9cWRFYKT0ZIvfGKHRqpM4EXlPoIG2qE6m9Zqk/edit?tab=t.0#heading=h.gv3ovndfbn6s
)

### AI Generated Code

1. Frontend UI and art assets
2. Initial infrastructure code
3. Documentation

# Splendor Board Game

A web-based implementation of the popular board game Splendor, featuring a Node.js backend and modern web frontend.

📖 **[View Architecture Documentation](./ARCHITECTURE.md)** - Comprehensive guide to the application's architecture, design patterns, and development workflows.

## Getting Started

This project uses a [dev container](https://containers.dev/) to ensure all developers have an identical development environment with the correct Node.js version, dependencies, and tools pre-configured.

### Setup

1. Open this project in [VS Code](https://code.visualstudio.com/)
2. Install the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
3. Click "Reopen in Container" when prompted

### Launch

To start the entire application:

```bash
npm run dev
```

This will bring up the frontend server on port 3000 and the backend server on port 3001.

To forcibly stop the application:

```bash
npm run kill
```

### Test

To run the entire test suite (server, client, and shared):

```bash
npm run test
```

