/**
 * KiranaWala — Fast Zero-Config Memory DB & Server Runner
 *
 * Uses lightweight MongoMemoryServer binary version for instant download & startup.
 * Properly seeds 20 stores with 200+ products before starting the Express server.
 */

const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const path = require("path");

(async () => {
  console.log("🚀 Starting KiranaWala Fast MongoMemoryServer...");
  
  try {
    const mongod = await MongoMemoryServer.create({
      binary: {
        version: "6.0.6",
      },
      instance: {
        dbName: "kiranawala",
      },
    });

    const uri = mongod.getUri();
    console.log(`✅ MongoMemoryServer running at: ${uri}`);
    process.env.MONGO_URI = uri;

    // Establish mongoose connection before seeding
    await mongoose.connect(uri);
    console.log("📦 Mongoose connected to in-memory DB.");

    // Seed demo data into memory DB — properly await the exported function
    console.log("🌱 Seeding demo dataset (20 stores, 200+ products)...");
    try {
      const seedScriptPath = path.join(__dirname, "scripts/seedDemoData.js");
      // Clear any cached version
      delete require.cache[require.resolve(seedScriptPath)];
      const { seedData } = require(seedScriptPath);
      await seedData({ closeConnection: false });
      console.log("✅ Seeding complete!");
    } catch (err) {
      console.error("Seeding error:", err.message);
    }

    // Start the Express server after seeding — connection stays open for server.js to reuse
    console.log("⚡ Starting KiranaWala Express Server...");
    require("./server.js");
  } catch (err) {
    console.error("Memory DB startup failed:", err.message);
    console.log("Fallback: Starting Express server directly...");
    require("./server.js");
  }
})();

