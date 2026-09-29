## Description

Briefly describe the purpose of this change and the rationale behind it.

## Type of Change

- [ ] 🐛 Bug fix (non-breaking change fixing an issue)
- [ ] ✨ New feature (non-breaking change adding functionality)
- [ ] 🎨 UI/UX enhancement (design or interaction improvement)
- [ ] ⚡ Performance optimization
- [ ] 📝 Documentation update
- [ ] 🧪 Testing & CI update

## Verification Checklist

Before submitting this PR, please check off the following items:

- [ ] Ran `pnpm lint` and fixed all warnings/errors.
- [ ] Ran `pnpm build` with zero TypeScript or Vite build errors.
- [ ] Verified live interaction with `aef serve` backend (Viewport monitor, WebSocket stream, Approval gate).
- [ ] Kept viewport coordinate isolation contract intact (relative coordinates `0, 0, width, height`).
- [ ] Maintained repository cleanliness with zero temporary files or test images.
