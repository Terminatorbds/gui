const dotenv = require('dotenv');
const path = require('path');
const Joi = require('joi');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const getBackendUrl = (backendUrl, port) => backendUrl || `http://localhost:${port}`;

const getEmailSmtpConfig = (host, port, username, password) => ({
  host,
  port,
  ...(username && password
    ? {
        auth: {
          user: username,
          pass: password,
        },
      }
    : {}),
});

const getMongoUrl = (mongodbUrl, nodeEnv) => {
  if (nodeEnv !== 'test') {
    return mongodbUrl;
  }

  const [connectionString, queryString] = mongodbUrl.split('?');
  const lastSlashIndex = connectionString.lastIndexOf('/');
  const connectionPrefix = connectionString.slice(0, lastSlashIndex + 1);
  const databaseName = connectionString.slice(lastSlashIndex + 1) || 'pm-nodejs';

  return `${connectionPrefix}${databaseName}-test${queryString ? `?${queryString}` : ''}`;
};

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('production', 'development', 'test').required(),
    PORT: Joi.number().default(3000),
    MONGODB_URL: Joi.string().required().description('Mongo DB url'),
    BACKEND_URL: Joi.string().uri().description('public backend base url'),
    JWT_SECRET: Joi.string().required().description('JWT secret key'),
    JWT_ACCESS_EXPIRATION_MINUTES: Joi.number().default(30).description('minutes after which access tokens expire'),
    JWT_REFRESH_EXPIRATION_DAYS: Joi.number().default(30).description('days after which refresh tokens expire'),
    JWT_RESET_PASSWORD_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description('minutes after which reset password token expires'),
    JWT_VERIFY_EMAIL_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description('minutes after which verify email token expires'),
    FRONTEND_URL: Joi.string().uri().default('http://localhost:5173').description('frontend base url'),
    FRONTEND_PROFILE_PATH: Joi.string().default('/profile').description('frontend profile path'),
    FRONTEND_RESET_PASSWORD_PATH: Joi.string().default('/reset-password').description('frontend reset password path'),
    FRONTEND_VERIFY_EMAIL_PATH: Joi.string().default('/verify-email').description('frontend verify email path'),
    SMTP_HOST: Joi.string().description('server that will send the emails'),
    SMTP_PORT: Joi.number().description('port to connect to the email server'),
    SMTP_USERNAME: Joi.string().allow('').description('username for email server'),
    SMTP_PASSWORD: Joi.string().allow('').description('password for email server'),
    EMAIL_FROM: Joi.string().description('the from field in the emails sent by the app'),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  backend: {
    url: getBackendUrl(envVars.BACKEND_URL, envVars.PORT),
  },
  mongoose: {
    url: getMongoUrl(envVars.MONGODB_URL, envVars.NODE_ENV),
    options: {
      serverSelectionTimeoutMS: 5000,
    },
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
    resetPasswordExpirationMinutes: envVars.JWT_RESET_PASSWORD_EXPIRATION_MINUTES,
    verifyEmailExpirationMinutes: envVars.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES,
  },
  frontend: {
    url: envVars.FRONTEND_URL,
    profilePath: envVars.FRONTEND_PROFILE_PATH,
    resetPasswordPath: envVars.FRONTEND_RESET_PASSWORD_PATH,
    verifyEmailPath: envVars.FRONTEND_VERIFY_EMAIL_PATH,
  },
  email: {
    smtp: getEmailSmtpConfig(envVars.SMTP_HOST, envVars.SMTP_PORT, envVars.SMTP_USERNAME, envVars.SMTP_PASSWORD),
    from: envVars.EMAIL_FROM,
  },
};
