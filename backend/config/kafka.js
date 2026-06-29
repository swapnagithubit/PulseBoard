const { Kafka } = require("kafkajs");

let producer = null;
let isConnected = false;

const initKafkaProducer = async () => {
  try {
    const kafka = new Kafka({
      clientId: "pulseboard-backend-producer",
      brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
      connectionTimeout: 3000,
      initialRetry: { retries: 1 }
    });
    producer = kafka.producer();
    await producer.connect();
    isConnected = true;
    console.log("✅ Backend Kafka Producer Connected successfully");
  } catch (err) {
    console.warn("⚠️ Backend Kafka Connection failed, running in direct DB fallback mode:", err.message);
    isConnected = false;
  }
};

const getProducer = () => {
  return isConnected ? producer : null;
};

module.exports = { initKafkaProducer, getProducer };
