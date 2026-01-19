
# KeySight Security Platform

![Version](https://img.shields.io/badge/version-1.4.0--COMPLIANT-blue)
![Security](https://img.shields.io/badge/security-DETERMINISTIC-green)
![Compliance](https://img.shields.io/badge/compliance-SOC2%2FGDPR-purple)
![AI](https://img.shields.io/badge/AI-NONE-red)

**KeySight** is a security-first, browser-based surveillance system designed for zero-trust environments. It focuses on local ownership, deterministic behavior (No-AI), and verifiable data integrity using client-side cryptography.

## Core Philosophy

1.  **Local-Only:** No data is ever transmitted to cloud servers. All footage and logs remain in your browser's secure storage.
2.  **Deterministic:** Motion detection and alerts use strict pixel-difference algorithms, not probabilistic machine learning.
3.  **Verifiable:** Every action and storage block is cryptographically hashed and chained (Blockchain-lite architecture).
4.  **Fail-Closed:** Any security validation failure (input, auth, integrity) blocks execution immediately.

## Features

### Compliance & Governance (New)
*   **Audit Readiness:** Generate cryptographically verifiable audit packages (JSON) for legal review.
*   **Regulatory Frameworks:** Built-in alignment modes for **SOC 2 Type I**, **ISO 27001**, and **GDPR/CCPA**.
*   **Consent Management:** Explicit jurisdiction settings for One-Party vs. All-Party consent logic.
*   **Proof of Erasure:** Secure deletion generates a "tombstone" log entry proving data destruction.
*   **Trust Dashboard:** Real-time visualization of system integrity, compliance status, and audit history.

### Universal Injection Defense
*   **Zero-Trust Input Model:** Every external input (User, Network, IPC) is treated as hostile until validated against strict schemas.
*   **Attack Vector Detection:** Deterministic scanning for SQL Injection, Command Injection, XSS, Path Traversal, and Protocol Smuggling patterns.
*   **Input Canonicalization:** Automatic normalization of Unicode and control characters.
*   **Security Audit Logging:** All blocked injection attempts are logged to the immutable ledger with critical severity.

### Secure Surveillance Dashboard
*   **Real-time Feeds:** Low-latency video streaming with HUD overlays.
*   **HD Video Recording:** Captures high-definition footage directly to encrypted storage (MP4/WebM).
*   **Custom Evidence Labeling:** Immediately title and tag recordings upon completion for easier retrieval.
*   **Audio Surveillance:** Optional, wiretap-compliant audio recording. Requires explicit legal consent.
*   **Motion Detection:** Configurable pixel-threshold algorithms with visual bounding boxes.
*   **Privacy Masking:** Client-side blurring of sensitive regions.

### Network Reconnaissance (Active Scan)
*   **Subnet Scanner:** Scans local IP ranges (e.g., `192.168.1.x`) for active devices.
*   **Port Probing:** Detects open HTTP/HTTPS ports using opaque fetch requests.
*   **Device Verification:** Challenge-response mechanism to verify ownership of discovered assets.
*   **SSRF Protection:** Strict validation of target IPs.

### Encrypted Local Storage & Evidence Vault
*   **AES-GCM-256:** All video clips, snapshots, and logs are encrypted at rest using a key derived from your Master Password.
*   **Chain of Custody:** Every storage block is hashed and linked to the previous block. Modifying one bit invalidates the entire chain.
*   **Split-View Vault:** Dedicated "Evidence Vault" column for high-value clips.
*   **Strict Access Control:** Accessing the storage browser requires Master Key re-authentication.
*   **Smart ZIP Export:** Generate signed ZIP packages containing footage and a cryptographic manifest.

### Audit & Compliance
*   **Immutable Logs:** Every system event (Auth, Motion, Config Change, Audio Toggle, Security Violation) is logged permanently.
*   **Hardware Binding:** The Master Key is cryptographically bound to the specific browser/device fingerprint.
*   **Resource Monitor:** Real-time tracking of CPU, RAM, and Storage I/O.

## Technical Stack

*   **Frontend:** React 18, TypeScript, Tailwind CSS
*   **Cryptography:** Web Crypto API (SubtleCrypto) for SHA-256 hashing and AES-GCM encryption.
*   **Input Security:** Custom `InputValidator` with ReDoS-safe regex patterns.
*   **Storage:** Custom `SecureStorage` wrapper around IndexedDB/LocalStorage.
*   **Compression:** JSZip for client-side archive generation.

## Quick Start

1.  **Initialize:** On first load, generate a **Master Access Key**.
2.  **Bind Device:** Confirm the hardware fingerprint binding.
3.  **Governance Setup:** Go to **Governance** tab to select your Compliance Framework (e.g., GDPR) and accept legal responsibilities.
4.  **Configure:** Enable Audio (if legally compliant) and adjust retention policies.
5.  **Add Cameras:** Manually add RTSP streams or use **NET_RECON**.

## Security Notice

*   **Evidence Access:** To view locked evidence, you **MUST** possess the Master Access Key. The system cannot recover blurred footage if the key is lost.
*   **Ephemeral Nature:** Clearing your browser cache/data **WILL** delete all encrypted footage and logs.
*   **HTTPS Required:** For full functionality (camera/microphone access, crypto), the application must run over HTTPS or localhost.

---

*KeySight Security © 2026 - Deterministic Surveillance Systems*
