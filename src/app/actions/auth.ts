"use server";

export async function verifyPassphrase(passphrase: string): Promise<boolean> {
  const correctPassphrase = process.env.AUTH_PASSPHRASE;

  if (!correctPassphrase) {
    console.warn("AUTH_PASSPHRASE not set in environment variables");
    return false;
  }

  return passphrase === correctPassphrase;
}
