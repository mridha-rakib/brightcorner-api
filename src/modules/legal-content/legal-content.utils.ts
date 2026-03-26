import type { LegalContentType } from "@/modules/legal-content/legal-content.type.js";

export const LEGAL_CONTENT_DEFAULTS: Record<LegalContentType, { title: string; content: string }> = {
  privacy: {
    title: "Privacy Policy",
    content: "We believe privacy is a fundamental human right. This policy explains how Bright Corner collects, uses, and protects account and service data.",
  },
  terms: {
    title: "Terms of Service",
    content: "By using Bright Corner, you agree to the service rules, security expectations, and account responsibilities described in these terms.",
  },
  about: {
    title: "About Bright Corner",
    content: "Bright Corner is a privacy-first messaging platform built for secure professional communication, protected collaboration, and controlled access.",
  },
};
