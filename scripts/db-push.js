const { execSync } = require("child_process");
const { DsqlSigner } = require("@aws-sdk/dsql-signer");
require("dotenv").config();

async function run() {
  console.log("Generating temporary IAM authentication token for AWS Aurora DSQL...");
  
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const hostname = "rbt3zrhipgfnrz3kdhq4ux5bu4.dsql.us-east-1.on.aws";

  if (!accessKeyId || !secretAccessKey) {
    console.error("AWS credentials not found in environment. Make sure .env is populated.");
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
    console.log("Token successfully generated.");

    // Form connection URL using the signed token as password
    const dsqlConnectionUrl = `postgresql://admin:${encodeURIComponent(token)}@${hostname}/postgres?sslmode=require`;
    
    // Inject the temporary URL for Prisma migration run
    process.env.DATABASE_URL = dsqlConnectionUrl;

    console.log("Running Prisma schema push (npx prisma db push) against live Aurora DSQL...");
    execSync("npx prisma db push", { stdio: "inherit", env: process.env });
    console.log("\n🎉 Database sync completed successfully on AWS Aurora DSQL!");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

run();
