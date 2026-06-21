export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10) || 3000,
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10) || 5432,
    username: process.env.DB_USERNAME || 'identity_user',
    password: process.env.DB_PASSWORD || 'identity_pass',
    database: process.env.DB_DATABASE || 'identity_db',
  },
  aes: {
    secretKey: process.env.AES_SECRET_KEY || 'fallback_key_32_chars_minimum!!!',
  },
  aiService: {
    url: process.env.AI_SERVICE_URL || 'http://localhost:8000',
    apiKey: process.env.AI_SERVICE_API_KEY || '',
  },
  blockchain: {
    rpcUrl: process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545',
    chainId: parseInt(process.env.CHAIN_ID ?? '31337', 10) || 31337,
    identityContract: process.env.IDENTITY_CONTRACT_ADDRESS || '',
    operatorPrivateKey: process.env.OPERATOR_PRIVATE_KEY || '',
  },
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB ?? '10', 10) || 10,
  },
});
