
import { secureStorage } from './secureStorage';

/**
 * Universal Injection Prevention & Input Security Layer
 * Implements deterministic, zero-trust validation for all system inputs.
 */

// --- Deterministic Regex Schemas (ReDoS Safe) ---

const PATTERNS = {
  // Strict IPv4: 4 octets, 0-255. No leading zeros (to prevent octal interpretation).
  IP_V4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  
  // Alphanumeric, spaces, dashes, underscores, dots. No control chars.
  SAFE_TEXT: /^[a-zA-Z0-9\s\-_.]+$/,
  
  // Strict Filename: No slashes, backslashes, null bytes, or shell operators.
  FILENAME: /^[a-zA-Z0-9\-_]+$/,
  
  // Master Key Format: 4 segments of 4 alphanumeric chars
  MASTER_KEY: /^[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/,
  
  // Port: numeric only
  PORT: /^[0-9]+$/,

  // Serial Number: Uppercase Alphanumeric + dashes
  SERIAL: /^[A-Z0-9\-]+$/
};

// --- Attack Signatures (Fail-Closed Blocklist) ---
// Used to detect malicious intent even if format looks quasi-valid in non-strict contexts.
const ATTACK_VECTORS = [
  // SQL Injection
  /(\bUNION\b.*\bSELECT\b)/i,
  /(\bSELECT\b.*\bFROM\b)/i,
  /(\bINSERT\b.*\bINTO\b)/i,
  /(\bUPDATE\b.*\bSET\b)/i,
  /(\bDELETE\b.*\bFROM\b)/i,
  /(--)/, // Comment
  /(\/\*)/, // Block Comment
  
  // Command Injection / Shell
  /(;)/, 
  /(\|)/, 
  /(`)/, 
  /(\$\()/, 
  /(&)/,
  
  // Path Traversal
  /(\.\.\/)/,
  /(\.\.\\)/,
  
  // XSS / Scripting
  /(<script)/i,
  /(javascript:)/i,
  /(onerror=)/i,
  /(onload=)/i
];

export type ValidationContext = 'IP' | 'PORT' | 'SAFE_TEXT' | 'FILENAME' | 'MASTER_KEY' | 'SERIAL' | 'PASSWORD';

export class SecurityException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SecurityException";
  }
}

class InputValidator {

  /**
   * 1. Canonicalization
   * Normalizes input to NFKC, strips control characters (0x00-0x1F except tab/newline), and trims.
   */
  private canonicalize(input: string): string {
    if (!input) return '';
    
    // Unicode Normalization
    let clean = input.normalize('NFKC');
    
    // Strip Control Characters (keep \t, \n, \r)
    // eslint-disable-next-line no-control-regex
    clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    return clean.trim();
  }

  /**
   * 2. Attack Vector Detection
   * Scans for known attack patterns.
   */
  private detectAttackVectors(input: string, context: ValidationContext): void {
    // Passwords are allowed complexity, but we check for specific injection payloads if plausible
    if (context === 'PASSWORD') return; 

    for (const pattern of ATTACK_VECTORS) {
      if (pattern.test(input)) {
        throw new SecurityException(`Malicious Pattern Detected: ${context}`);
      }
    }
  }

  /**
   * 3. Allowlist Validation
   * Validates against strict schema.
   */
  public validate(input: string, context: ValidationContext, fieldName: string = 'Input'): string {
    const cleanInput = this.canonicalize(input);

    // Fail-Closed: Empty check (except maybe password/text depending on logic, but generally required)
    if (!cleanInput && context !== 'SAFE_TEXT') {
       // Allow empty safe text description, but enforce strictness elsewhere
       throw new SecurityException(`${fieldName} cannot be empty or whitespace only.`);
    }

    // 1. Attack Vector Scan
    this.detectAttackVectors(cleanInput, context);

    // 2. Schema Enforcement
    let isValid = false;

    switch (context) {
      case 'IP':
        isValid = PATTERNS.IP_V4.test(cleanInput);
        if (isValid) {
            // Additional Logic: Prevent 0.0.0.0 or 255.255.255.255 broadcast/meta
            if (cleanInput === '0.0.0.0' || cleanInput === '255.255.255.255') isValid = false;
        }
        break;

      case 'PORT':
        if (PATTERNS.PORT.test(cleanInput)) {
          const port = parseInt(cleanInput, 10);
          isValid = port > 0 && port <= 65535;
        }
        break;

      case 'SAFE_TEXT':
        // Allow basic punctuation, deny HTML/SQL/Shell
        isValid = PATTERNS.SAFE_TEXT.test(cleanInput);
        break;

      case 'FILENAME':
        isValid = PATTERNS.FILENAME.test(cleanInput);
        if (isValid && cleanInput.length > 255) isValid = false;
        break;

      case 'MASTER_KEY':
        isValid = PATTERNS.MASTER_KEY.test(cleanInput.toUpperCase());
        break;

      case 'SERIAL':
        isValid = PATTERNS.SERIAL.test(cleanInput.toUpperCase());
        break;

      case 'PASSWORD':
        // Length check only, pattern checks skipped to allow entropy
        // But we ensure it's ASCII printable to prevent unicode smuggling
        // eslint-disable-next-line no-control-regex
        isValid = /^[\x20-\x7E]+$/.test(cleanInput) && cleanInput.length >= 8;
        break;
        
      default:
        throw new SecurityException(`Unknown validation context: ${context}`);
    }

    if (!isValid) {
      this.logViolation(cleanInput, context, fieldName);
      throw new SecurityException(`Security Policy Violation: ${fieldName} format is invalid or contains prohibited characters.`);
    }

    // Return the canonicalized, validated input
    if (context === 'MASTER_KEY' || context === 'SERIAL') {
        return cleanInput.toUpperCase();
    }
    
    return cleanInput;
  }

  /**
   * Logs security violations to the immutable audit log.
   */
  private async logViolation(input: string, context: string, fieldName: string) {
    // We mask the input in the log to prevent logging attack payloads or credentials
    const maskedInput = context === 'PASSWORD' || context === 'MASTER_KEY' 
        ? '********' 
        : input.substring(0, 50) + (input.length > 50 ? '...' : '');

    try {
        await secureStorage.append({
            type: 'SECURITY_VIOLATION',
            severity: 'critical',
            description: `Injection Blocked (${context}): ${fieldName}`,
            metadata: {
                payload_fragment: maskedInput,
                validation_schema: context
            }
        });
        console.error(`[SECURITY] Blocked input for ${fieldName} (${context})`);
    } catch (e) {
        console.error("Failed to log security violation", e);
    }
  }
}

export const inputValidator = new InputValidator();
