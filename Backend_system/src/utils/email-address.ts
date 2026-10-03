import { z } from "zod";

const knownTypoSuggestions: Record<string, string> = {
  "gmail.con": "gmail.com",
  "gmail.come": "gmail.com",
  "gmail.comm": "gmail.com",
  "gmail.cmo": "gmail.com",
  "gmai.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gmal.com": "gmail.com",
  "yahoo.con": "yahoo.com",
  "yahoo.come": "yahoo.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "hotmail.con": "hotmail.com",
  "hotmail.come": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmial.com": "hotmail.com",
  "outlook.con": "outlook.com",
  "outlook.come": "outlook.com",
  "outlok.com": "outlook.com",
  "icloud.con": "icloud.com",
  "icloud.come": "icloud.com",
  "icoud.com": "icloud.com",
  "protonmail.con": "protonmail.com",
  "protonmail.come": "protonmail.com",
  "protonmal.com": "protonmail.com",
};

export const emailAddressSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.")
  .max(255, "Email addresses must be 255 characters or fewer.")
  .superRefine((email, context) => {
    const domain = email.slice(email.lastIndexOf("@") + 1);
    const suggestion = knownTypoSuggestions[domain] ??
      (domain.endsWith(".come") ? `${domain.slice(0, -1)}` : undefined);

    if (suggestion) {
      context.addIssue({
        code: "custom",
        message: `This email domain may be misspelled. Check it or use ${suggestion}.`,
      });
    }
  });