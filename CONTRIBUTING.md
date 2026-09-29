# Contributing to AgentEverywhereFlow-WebUI

Thank you for your interest in contributing to the **AgentEverywhereFlow Web Console**!

---

## 🛠️ Development Setup

1. **Prerequisites**:
   - Node.js >= 20 (Node 22 recommended)
   - `pnpm` >= 10 (`corepack enable pnpm`)
   - Running `aef serve` backend daemon on `http://127.0.0.1:8000`

2. **Install & Run**:
   ```bash
   pnpm install
   pnpm dev
   ```

3. **Code Quality Checks**:
   Before submitting a Pull Request, run the local verification suite:
   ```bash
   # Linting with Oxlint
   pnpm lint

   # Production TypeScript & Vite build
   pnpm build
   ```

---

## 📐 Architecture & Principles

- **Viewport Isolation Invariant**: All coordinates rendered on the canvas/viewport monitor must adhere strictly to the target window's local coordinate system `(0, 0, width, height)`.
- **Zero Heavy GUI Baggage in Backend**: All UI logic belongs here in `AgentEverywhereFlow-WebUI`, keeping the core Python backend completely headless.
- **Graceful WebSocket Degradation**: Always handle disconnection and auto-reconnect backoff gracefully. Fallback to REST APIs where appropriate.
