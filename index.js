const express = require("express");
const app = express();
const port = 3000;
require("dotenv").config();

const adminUsername = process.env.ADMIN_USERNAME;
const adminPassword = process.env.ADMIN_PASSWORD;

const { clientInfo, UserCreate } = require("./sftpgo");
const { validateUser } = require("./validation");

// Middleware to parse JSON bodies
app.use(express.json());

app.get("/", (req, res) => {
  res.send("It's work!");
});

app.post("/client-info", async (req, res) => {
  const data = req.body;

  const validation = validateUser(data);

  if (!validation.isValid) {
    return res.status(400).json({ error: validation.message });
  }

  const { username, password } = data;

  const client = await clientInfo(username, password);
  const statusCode = client.statusCode ?? 200;

  delete client.statusCode;

  res.status(statusCode).json(client);
});

app.post("/user-create", async (req, res) => {
  const data = req.body;

  const validation = validateUser(data);

  if (!validation.isValid) {
    return res.status(400).json({ error: validation.message });
  }

  const { username, password } = data;

  const client = await UserCreate(
    username,
    password,
    adminUsername,
    adminPassword
  );
  const statusCode = client.statusCode ?? 200;

  delete client.statusCode;

  res.status(statusCode).json(client);
});

app.listen(port, () => {
  console.log(`API is running at http://localhost:${port}`);
});
