// Runs only when the MongoDB data volume is first initialized.
// The application never receives the MongoDB root account.
const applicationDb = db.getSiblingDB(process.env.MONGO_APP_DB);
applicationDb.createUser({
  user: process.env.MONGO_APP_USER,
  pwd: process.env.MONGO_APP_PASSWORD,
  roles: [{ role: 'readWrite', db: process.env.MONGO_APP_DB }],
});
