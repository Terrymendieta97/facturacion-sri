import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  corsOrigin: process.env.CORS_ORIGIN || "*",
  
  // Database
  databaseUrl: process.env.DATABASE_URL || "",
  directUrl: process.env.DIRECT_URL || "",

  // Email SMTP
  smtpHost: process.env.SMTP_HOST || "smtp.gmail.com",
  smtpPort: parseInt(process.env.SMTP_PORT || "465", 10),
  smtpSecure: process.env.SMTP_SECURE === "true",
  smtpUser: process.env.SMTP_USER || "lojafacec@gmail.com",
  smtpPass: process.env.SMTP_PASS || "aboexutuolxlxnmb",
  smtpFromName: process.env.SMTP_FROM_NAME || "LojaFac Facturación SRI",

  // Google OAuth REST API Fallback
  googleUserEmail: process.env.GOOGLE_USER_EMAIL || "lojafacec@gmail.com",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "136860143059-h5hihc8ra61p2ldcol6qhammkunjatjc.apps.googleusercontent.com",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "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",
  googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN || "1//04-Z9wm4KZwO1CgYIARAAGAQSNwF-L9Irouz3WxyRghM_X1BboPYGSl4Xl-GFItx6pFgg4FEe1u6nImudkqdgZKvmYe7XZ_xcHBw",
};
