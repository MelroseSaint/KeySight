
# KeySight Security Platform

![Version](https://img.shields.io/badge/version-1.3.0--HARDENED-blue)
![Security](https://img.shields.io/badge/security-DETERMINISTIC-green)
![AI](https://img.shields.io/badge/AI-NONE-red)

**KeySight** is a security-first, browser-based surveillance system designed for zero-trust environments. It focuses on local ownership, deterministic behavior (No-AI), and verifiable data integrity using client-side cryptography.

## 🛡️ Core Philosophy

1.  **Local-Only:** No data is ever transmitted to cloud servers. All footage and logs remain in your browser's secure storage.
2.  **Deterministic:** Motion detection and alerts use strict pixel-difference algorithms, not probabilistic machine learning.
3.  **Verifiable:** Every action and storage block is cryptographically hashed and chained (Blockchain-lite architecture).
4.  **Fail-Closed:** Any security validation failure (input, auth, integrity) blocks execution immediately.

## 🚀 Features

### 🛡️ Universal Injection Defense (New)
*   **Zero-Trust Input Model:** Every external input (User, Network, IPC) is treated as hostile until validated against strict schemas.
*   **Attack Vector Detection:** Deterministic scanning for SQL Injection, Command Injection, XSS, Path Traversal, and Protocol Smuggling patterns.
*   **Input Canonicalization:** Automatic normalization of Unicode and control characters to prevent encoding bypass attacks.
*   **Context-Aware Sanitization:** strict allowlists for IPs, Ports, Filenames, and Credentials.
*   **Security Audit Logging:** All blocked injection attempts are logged to the immutable ledger with critical severity.

### 📹 Secure Surveillance Dashboard
*   **Real-time Feeds:** Low-latency video streaming with HUD overlays.
*   **HD Video Recording:** Captures high-definition footage directly to encrypted storage. Intelligently prefers **MP4 (H.264/AAC)** on supported browsers (Safari/Chrome) with a seamless fallback to **WebM (VP8/Opus)**.
*   **Custom Evidence Labeling:** Immediately title and tag recordings upon completion for easier retrieval.
*   **Audio Surveillance:** Optional, wiretap-compliant audio recording. Requires explicit legal consent and includes visual active-mic indicators.
*   **Motion Detection:** Configurable pixel-threshold algorithms with visual bounding boxes.
*   **Privacy Masking:** Client-side blurring of sensitive regions.
*   **PTZ Control:** Pan-Tilt-Zoom interface for supported hardware.

### 📡 Network Reconnaissance (Active Scan)
*   **Subnet Scanner:** Scans local IP ranges (e.g., `192.168.1.x`) for active devices.
*   **Port Probing:** Detects open HTTP/HTTPS ports using opaque fetch requests.
*   **Device Verification:** Challenge-response mechanism to verify ownership of discovered assets before adding them to the dashboard.
*   **Signal Analysis:** Real-time jitter and latency monitoring.
*   **SSRF Protection:** Strict validation of target IPs to prevent internal network scanning abuse.

### 🔐 Encrypted Local Storage & Evidence Vault
*   **AES-GCM-256:** All video clips, snapshots, and logs are encrypted at rest using a key derived from your Master Password.
*   **Format Preservation:** The storage engine preserves the original recording format (MP4 or WebM) and ensures exports use the correct file extensions.
*   **Split-View Vault:** Dedicated "Evidence Vault" column for high-value clips, separate from general looping storage.
*   **Strict Access Control:** Accessing the storage browser requires Master Key re-authentication.
*   **Visual Obfuscation:** Locked evidence is **blurred and inaccessible** until explicitly unlocked with the Master Key.
*   **Immutable Ledger:** Audit logs are stored as a hash chain; any tampering breaks the verification chain.
*   **Smart ZIP Export:** Generate signed ZIP packages containing footage (MP4/WebM/JPG) and a cryptographic manifest.

### 👮‍♂️ Audit & Compliance
*   **Immutable Logs:** Every system event (Auth, Motion, Config Change, Audio Toggle, Security Violation) is logged permanently.
*   **Hardware Binding:** The Master Key is cryptographically bound to the specific browser/device fingerprint.
*   **Resource Monitor:** Real-time tracking of CPU, RAM, and Storage I/O to ensure system stability.

## 🛠️ Technical Stack

*   **Frontend:** React 18, TypeScript, Tailwind CSS
*   **Cryptography:** Web Crypto API (SubtleCrypto) for SHA-256 hashing and AES-GCM encryption.
*   **Input Security:** Custom `InputValidator` with ReDoS-safe regex patterns.
*   **Visualization:** Recharts for signal data, Canvas API for motion processing.
*   **Storage:** Custom `SecureStorage` wrapper around IndexedDB/LocalStorage.
*   **Compression:** JSZip for client-side archive generation.

## ⚡ Quick Start

1.  **Initialize:** On first load, generate a **Master Access Key**.
    *   *Warning:* Save this key securely. There is no password reset mechanism.
2.  **Bind Device:** Confirm the hardware fingerprint binding.
3.  **Configure:**
    *   Go to **Settings** to enable Audio (requires legal consent check).
    *   Adjust Motion Sensitivity and Retention Policy.
4.  **Add Cameras:**
    *   Manually add RTSP/HTTP streams.
    *   Or use **NET_RECON** to scan your network for devices.

## ⚠️ Security Notice

*   **Evidence Access:** To view locked evidence, you **MUST** possess the Master Access Key. The system cannot recover blurred footage if the key is lost.
*   **Ephemeral Nature:** Clearing your browser cache/data **WILL** delete all encrypted footage and logs.
*   **HTTPS Required:** For full functionality (camera/microphone access, crypto), the application must run over HTTPS or localhost.

---

*KeySight Security © 2024 - Deterministic Surveillance Systems*
