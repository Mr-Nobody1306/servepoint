"use strict";
/* Safe configuration diagnostic tool.
   Reports ONLY whether GROQ_API_KEY is defined and whether it is non-empty.
   NEVER outputs the key or any part of it. */
const config = require("../src/config");

function checkConfig() {
  const rawKey = config.groqKey || "";
  const exists = typeof rawKey === "string" && rawKey.trim().length > 0;
  const isPlaceholder = rawKey.trim() === "PASTE_YOUR_KEY_HERE";
  const clientInitializable = exists && !isPlaceholder;

  return {
    keyExists: exists,
    keyNonEmpty: exists,
    isPlaceholder: isPlaceholder,
    aiClientInitializable: clientInitializable,
    model: config.groqModel,
    baseUrl: config.groqBaseUrl
  };
}

if (require.main === module) {
  console.log(JSON.stringify(checkConfig(), null, 2));
}

module.exports = { checkConfig };
