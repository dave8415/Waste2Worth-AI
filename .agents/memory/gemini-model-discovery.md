---
name: Gemini model discovery
description: Why successful model discovery is insufficient to diagnose generation availability.
---

Google's model-list and model-detail endpoints can advertise a model that is unavailable for generation to new users.

**Why:** A real image request returned NOT_FOUND with an explicit "no longer available to new users" message, despite successful discovery with the same key. The original generic key/quota warning hid this distinction.

**How to apply:** Treat the safely redacted generateContent error as authoritative when investigating generation failures. Do not conclude that model-list success proves generation access, or enable billing or repeatedly send photos to work around an availability error.
