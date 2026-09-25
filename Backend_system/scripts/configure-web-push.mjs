import { readFile, writeFile } from "node:fs/promises";
import webpush from "web-push";

const envPath = new URL("../.env", import.meta.url);
const envText = await readFile(envPath, "utf8");
const lines = envText.split(/\r?\n/);
const variables = new Map();

for (const line of lines) {
  const match = line.match(/^\s*(VAPID_PUBLIC_KEY|VAPID_PRIVATE_KEY|VAPID_SUBJECT)\s*=\s*(.*)\s*$/);
  if (match) variables.set(match[1], match[2]);
}

const hasPublicKey = Boolean(variables.get("VAPID_PUBLIC_KEY"));
const hasPrivateKey = Boolean(variables.get("VAPID_PRIVATE_KEY"));

if (hasPublicKey && hasPrivateKey) {
  console.log("VAPID keys are already configured in the local backend environment; no changes made.");
  process.exit(0);
}

if (hasPublicKey || hasPrivateKey) {
  console.error("Only one VAPID key is configured. Resolve the partial pair manually; no changes made.");
  process.exitCode = 1;
} else {
  const keys = webpush.generateVAPIDKeys();
  const additions = [
    "",
    "# Web Push VAPID credentials. Keep the private key secret.",
    `VAPID_PUBLIC_KEY=${keys.publicKey}`,
    `VAPID_PRIVATE_KEY=${keys.privateKey}`,
    `VAPID_SUBJECT=${variables.get("VAPID_SUBJECT") || "mailto:support@squadlink.app"}`,
  ];

  await writeFile(envPath, `${envText.replace(/\s*$/, "")}${additions.join("\n")}\n`, "utf8");
  console.log("Generated VAPID credentials and saved them to the git-ignored Backend_system/.env. Key values were not printed.");
}