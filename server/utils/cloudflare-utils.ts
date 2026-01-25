export async function streamSignedUrl(videoUID: string): Promise<string> {
  const runtimeConfig = useRuntimeConfig();
  const encoder = new TextEncoder();
  const expiresIn = Math.floor(Date.now() / 1000) + 2 * 60 * 60;
  const headers = {
    alg: "RS256",
    kid: runtimeConfig.cloudflareStreamKeyId,
  };
  const data = {
    sub: videoUID,
    kid: runtimeConfig.cloudflareStreamKeyId,
    exp: expiresIn,
  };

  const token = `${objectToBase64url(headers)}.${objectToBase64url(data)}`;

  const jwk = JSON.parse(atob(runtimeConfig.cloudflareStreamKeyJwt));

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    key,
    encoder.encode(token),
  );

  return `${token}.${arrayBufferToBase64Url(signature)}`;
}

export function arrayBufferToBase64Url(buffer: any) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function objectToBase64url(payload: object) {
  return arrayBufferToBase64Url(
    new TextEncoder().encode(JSON.stringify(payload)),
  );
}
