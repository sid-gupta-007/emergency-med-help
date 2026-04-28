# SERA 112: System Architecture

## 1. Fast Response Pipeline (< 100ms)

To meet the strict emergency latency requirement (< 2 seconds), SERA 112 uses an asynchronous, dual-track pipeline. AI is used to *enhance* the experience asynchronously, not block the core dispatch.

### Step-by-Step Flow

1. **Input Capture:** (Voice or Guided Tap) -> Extracted as a single text string.
2. **Immediate Heuristic Parsing (Sync):** 
   * Node.js intercepts the string.
   * Runs extreme fast local RegEx heuristics (English & Hinglish) to detect severity (e.g., `(heart|chest|stroke|dil|saans)` -> `critical`, requires ICU).
3. **Local Spatial Query (Sync):**
   * Calculates Haversine distance against an in-memory (or Redis cached) Ghaziabad resource dataset.
   * Binds the closest available Ambulance and Hospital matching the severity criteria.
4. **Instant Response (Sync):**
   * HTTP Response is fired back to the client instantly.
   * UI simulates a 500ms "Connecting..." state for psychological safety, then immediately reveals dispatched resources.
5. **AI Semantic Enhancement (Async):**
   * A separate background `/api/explain` request is fired.
   * Gemini analyzes the emergency and the dispatch decision to generate a calm, human-readable audio explanation.
   * The UI updates dynamically to narrate this explanation back to the user without blocking the ambulance dispatch.

## 2. Voice-First Architecture

* **Web Speech API:** Utilizes continuous listening with `interimResults`.
* **Auto-Resolution:** Employs a 2.5-second silence timeout using `setTimeout`. If the user stops speaking, the system automatically submits the request, eliminating the need for a "Submit" button.
* **Text-To-Speech (TTS):** Uses native SpeechSynthesis to narrate navigation, questions, and deployment success.
* **Bilingual Support:** Configured dynamically for Hinglish/English (`en-IN` base dialect) for optimal recognition in Ghaziabad.

## 3. UI/UX Accessibility Strategy

* **Zero-Literacy Support:** Replaced text-heavy views with iconography (Activity, Droplets, Navigation). 
* **Thumb-Zone Navigation:** Primary actions (SOS, Guided "Yes/No" options) are massive, full-screen-width buttons placed in the lower-middle screen.
* **High Contrast:** Uses deep red `#b71c1c` mapped against absolute `#ffffff` or `#000000` text for maximum visibility.
* **Screen Reader Safety:** High deployment of `aria-live="assertive"` regions for instant audio priority during updates.
