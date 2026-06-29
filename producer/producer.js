const { Kafka } = require("kafkajs");
const { faker } = require("@faker-js/faker");

const kafka = new Kafka({
  clientId: "pulseboard-producer",
  brokers: ["localhost:9092"],
});

const producer = kafka.producer();

const eventTypes = [
  "click",
  "signup",
  "purchase",
  "add_to_cart",
];

const pages = [
  "/",
  "/products",
  "/cart",
  "/checkout",
  "/profile",
];

async function runProducer() {
  console.log("Connecting to Kafka...");

  await producer.connect();

  console.log("Connected to Kafka!");

  setInterval(async () => {
    const event = {
      userId: faker.string.uuid(),
      eventType:
        eventTypes[Math.floor(Math.random() * eventTypes.length)],
      page: pages[Math.floor(Math.random() * pages.length)],
      device: Math.random() > 0.5 ? "mobile" : "desktop",
      country: faker.location.country(),
      amount: Math.floor(Math.random() * 5000) + 100,
      timestamp: new Date().toISOString(),
    };

    await producer.send({
      topic: "website-events",
      messages: [{ value: JSON.stringify(event) }],
    });

    console.log("Event Sent:", event);
  }, 1000);
}

runProducer().catch(console.error);