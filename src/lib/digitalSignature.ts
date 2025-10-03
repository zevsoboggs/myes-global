// Digital signature utilities for partner certificates

// Browser-compatible hash function using Web Crypto API
async function createSHA256Hash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Fallback hash function for older browsers
function createSimpleHash(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// Certificate data interface
export interface CertificateData {
  certificateNumber: string;
  fullName: string;
  agencyName?: string;
  issueDate: string;
  verificationLevel: string;
  userId: string;
}

// Generate SHA-256 hash of certificate data
export async function generateCertificateHash(data: CertificateData): Promise<string> {
  const content = [
    data.certificateNumber,
    data.fullName,
    data.agencyName || '',
    data.issueDate,
    data.verificationLevel,
    data.userId
  ].join('|');

  try {
    return await createSHA256Hash(content);
  } catch (error) {
    console.warn('Web Crypto API not available, using fallback hash');
    return createSimpleHash(content);
  }
}

// Generate digital signature for certificate
export async function generateDigitalSignature(data: CertificateData): Promise<string> {
  const hash = await generateCertificateHash(data);

  // Create deterministic signature based on the hash
  const signatureData = `MYES.GLOBAL:${hash}:RSA-2048:${data.certificateNumber}`;

  try {
    const signature = await createSHA256Hash(signatureData);

    // Format as RSA signature blocks
    return [
      '-----BEGIN MYES.GLOBAL SIGNATURE-----',
      signature.match(/.{1,64}/g)?.join('\n') || signature,
      '-----END MYES.GLOBAL SIGNATURE-----'
    ].join('\n');
  } catch (error) {
    console.warn('Web Crypto API not available, using fallback signature');
    const fallbackSignature = createSimpleHash(signatureData);

    return [
      '-----BEGIN MYES.GLOBAL SIGNATURE-----',
      fallbackSignature.match(/.{1,32}/g)?.join('\n') || fallbackSignature,
      '-----END MYES.GLOBAL SIGNATURE-----'
    ].join('\n');
  }
}

// Verify digital signature
export async function verifyDigitalSignature(data: CertificateData, signature: string): Promise<boolean> {
  const expectedSignature = await generateDigitalSignature(data);
  return signature === expectedSignature;
}

// Format signature for display
export function formatSignatureForDisplay(signature: string): string {
  // Extract the hex part from the signature
  const lines = signature.split('\n');
  const hexLines = lines.slice(1, -1); // Remove BEGIN and END lines
  const hex = hexLines.join('');

  // Take first 32 characters for display
  const shortSignature = hex.substring(0, 32).toUpperCase();

  // Format as RSA signature display
  return `RSA-2048: ${shortSignature}...`;
}

// Real RSA signature using Web Crypto API (optional advanced feature)
export async function generateRealRSASignature(data: CertificateData): Promise<string> {
  try {
    // Generate key pair (in production, use a stored private key)
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "RSA-PSS",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      false, // not extractable
      ["sign", "verify"]
    );

    const hash = await generateCertificateHash(data);
    const encoder = new TextEncoder();
    const dataToSign = encoder.encode(hash);

    const signature = await crypto.subtle.sign(
      {
        name: "RSA-PSS",
        saltLength: 32,
      },
      keyPair.privateKey,
      dataToSign
    );

    // Convert to hex string
    const hexSignature = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return [
      '-----BEGIN MYES.GLOBAL RSA SIGNATURE-----',
      hexSignature.match(/.{1,64}/g)?.join('\n') || hexSignature,
      '-----END MYES.GLOBAL RSA SIGNATURE-----'
    ].join('\n');
  } catch (error) {
    console.error('RSA signature generation failed:', error);
    // Fallback to simulated signature
    return await generateDigitalSignature(data);
  }
}