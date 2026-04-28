# QA & Testing Framework: Smart Emergency Resource Allocator (Improved)

This document outlines the mandatory Quality Assurance and Testing procedures for the SERA-112 system, specifically focusing on extreme edge cases, high-panic scenarios, literacy differences, and offline stability.

## 1. Core Test Scenarios (Accessibility, Literacy & Setup)

| Scenario | User Persona | Action | Expected System Behavior | Pass/Fail Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **First-Time Setup** | Any new user | App launches | Asks for Mode (Voice/Touch), Language (Hinglish/English), and Sound (ON/OFF). | Pass if selections are remembered locally and correctly applied across the session. |
| **Zero-Literacy (Voice Mode)** | Illiterate user in panic | Chooses Voice mode. Taps SOS. | System announces "Emergency activated. Say Ambulance". Uses only large animated icons. | Pass if user can trigger and complete flow without reading any text. |
| **Touch Mode UX** | Literate but deaf user | Chooses Touch mode & Voice OFF. | System defaults to Guided Mode upon SOS tap. No TTS is played. | Pass if user can complete dispatch using visual layout only. |
| **Color UI Navigation** | Illiterate user | Enters Guided Mode | Sees massive Green (YES/Check) and Red (NO/X) boxes with icons. | Pass if user clicks colors correctly without reading. |

## 2. Advanced Voice Pipeline Testing (Hinglish / Command-Based)

| Scenario | Voice Input | Expected Behavior |
| :--- | :--- | :--- |
| **Fast Ambulance** | "Accident ho gaya, ambulance bhejo" | Keyword matches. Timeout fast tracks (1.5s). Immediate dispatch. |
| **Vague Mumble**| "Uh... hello, I am... uh..." | Does not match keywords. Timeout (2.5s). Prompts "Samajh nahi aaya, please fir se boliye". |
| **Cancellation**| "Ghalti se dab gaya, cancel" | Matches "cancel". Stops recording. Returns to home screen. |
| **Mic Denied**| (User blocks mic) | System handles error gracefully -> Shows "Mic access denied" with orange visual feedback. |

## 3. Strict Logic Validation Testing

| Edge Case | Failure Trigger | Recovery Strategy / Expected Fix |
| :--- | :--- | :--- |
| **All NO's Selected** | User selects "No" for Ambulance, Hospital, Blood | System aborts. Shows "No emergency action selected". Does **NOT** deploy. |
| **Mixed Answers** | User says YES to Hospital only | Evaluates positive for hospital, prompts "Confirm dispatch?", bypasses Ambulance requirements locally if needed. |
| **Rapid Inputs** | User mashes Green/Red | State logic protects against submitting multiple times; confirms once. |
| **Missed Confirmation** | User says yes, but closes app | Will NOT dispatch. Must click/speak confirmation. |

## 4. Advanced Edge Cases & Failure Recovery

| Edge Case | Failure Trigger | Recovery Strategy |
| :--- | :--- | :--- |
| **Total Offline Status** | Network failure before `/api/resources` | Fetch catch block sets `isOffline=true`. App falls back to `offlineAllocate` using bundled GHZ data. |
| **Gemini AI Outage** | External API timeout/failure | AI Explanation gracefully fails. Offline mode handles dispatch locally. UI shows "Fast allocation successful." |
| **Location Access Denied**| User blocks GPS | System falls back to Ghaziabad center (28.6650, 77.4300) without crashing. |

## 5. UI/UX Verification
* **Thumb-Zone Navigation:** Verify the "Go Back" button is affixed to the bottom navigation bar and is highly reachable with the thumb.
* **Volume Toggling:** Verify the volume icon toggles system-wide TTS suppression instantly.
* **Hands-Free Validation:** Ensure voice commands like "Haan/Yes" map cleanly to UI interactions without touch.
* **Mid-Session Safe Mode Switch:** Verifies that pressing Settings -> Changing Mode during an active emergency request triggers the warning context window.

## 6. Performance Metrics Target
* **Offline Allocation Time:** < 50ms locally.
* **Online API Latency:** < 100ms.
* **Voice Command Parse Time:** Instant upon timeout.

