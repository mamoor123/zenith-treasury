const { Client } = require("pg");
const { DsqlSigner } = require("@aws-sdk/dsql-signer");
require("dotenv").config();

async function run() {
  console.log("Generating admin token to clean DSQL database...");
  
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const hostname = "rbt3zrhipgfnrz3kdhq4ux5bu4.dsql.us-east-1.on.aws";

  if (!accessKeyId || !secretAccessKey) {
    console.error("AWS credentials not found in environment.");
    process.exit(1);
  }

  const signer = new DsqlSigner({
    region: "us-east-1",
    hostname: hostname,
    credentials: {
      accessKeyId: accessKeyId.trim(),
      secretAccessKey: secretAccessKey.trim(),
    }
  });

  try {
    const token = await signer.getDbConnectAdminAuthToken();
    console.log("Admin token generated.");

    const client = new Client({
      host: hostname,
      port: 5432,
      database: "postgres",
      user: "admin",
      password: token,
      ssl: {
        rejectUnauthorized: false
      }
    });

    await client.connect();
    console.log("Connected to Aurora DSQL. Dropping existing tables to allow clean schema creation...");
    
    // Dropping tables cascade
    await client.query('DROP TABLE IF EXISTS "LedgerEntry" CASCADE;');
    await client.query('DROP TABLE IF EXISTS "Invoice" CASCADE;');
    await client.query('DROP TABLE IF EXISTS "BankTransaction" CASCADE;');
    await client.query('DROP TABLE IF EXISTS "AgentLog" CASCADE;');
    await client.query('DROP TABLE IF EXISTS "_prisma_migrations" CASCADE;');
    
    console.log("🎉 All tables dropped successfully! Database is clean.");
    await client.end();
  } catch (err) {
    console.error("Failed to clean DSQL database:", err);
    process.exit(1);
  }
}

run();
