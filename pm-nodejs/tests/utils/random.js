const uniqueSuffix = () => `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

const randomName = () => `Test User ${uniqueSuffix()}`;

const randomEmail = () => `user-${uniqueSuffix()}@example.com`;

module.exports = {
  randomEmail,
  randomName,
};