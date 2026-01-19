import { Kafka } from "kafkajs"; //Imports the Kafka client from kafkajs.

// Initializes a Kafka client.
// clientId: Identifier for this Kafka client (useful for logging and debugging).
// brokers: List of Kafka broker addresses. Here, it's assuming Kafka is running locally on port 9094.
const kafka = new Kafka({
  clientId: "kafka-service",
  brokers: ["localhost:9094"],
});


const admin = kafka.admin();
//Gets an Admin client instance, which is used for managing topics, brokers, partitions, etc.
//Unlike producers and consumers, admin clients are typically used once to setup Kafka.

const run = async () => {     
await admin.connect();     //Opens a connection to Kafka using the Admin client.
  await admin.createTopics({ //Creates three Kafka topics (if they don’t already exist).
    topics: [                //Each topic in the list is defined by its name.
      { topic: "payment-successful" },
      { topic: "order-successful" },
      { topic: "email-successful" },
    ],
  });
};

run();  //Runs the asynchronous run() function when the file is executed.
