# Future live execution boundary

This directory is intentionally unreferenced by the P0 frontend.

It preserves the execution API client, idempotent retry storage, and wallet-send helper for a future organizer-approved experience. The active workflow reducer, workspace, wallet provider, and panels cannot import this directory and expose no signing, approval, broadcast, or submission transition.

The backend execute and submission routes remain unchanged and fail closed behind their existing capability checks.
