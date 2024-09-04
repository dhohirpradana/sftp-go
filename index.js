import express from "express";
import PocketBase from "pocketbase";

import { userDelete, clientInfo } from "./sftpgo.js";
import { updateUser, adminToken, checkToken } from "./pocketbase.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = 3000;

const pbUrl = process.env.PB_URL;

app.use(express.json());

app.use(async (req, res, next) => {
  const pb = new PocketBase(pbUrl);
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    pb.authStore.save(token, null);

    console.log(pb.authStore.isValid);
    // console.log(pb.authStore.token);
    // console.log(pb.authStore);

    await checkToken(token);

    next();
  } catch (error) {
    console.error("Error fetching current user:", error);
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

app.get("/", (req, res) => {
  res.send("It's work!");
});

app.get("/test", async (req, res) => {
  await adminToken();
  return res.send("It's Test!");
});

app.post("/user", async (req, res) => {
  return await updateUser(req, res);
});

app.delete("/user/:username", async (req, res) => {
  const username = req.params.username;
  // console.log("Username:", username);
  if (!username) {
    return res.status(402).json({ error: "username is required!" });
  }

  const client = await userDelete(username);
  const statusCode = client.statusCode;

  delete client.statusCode;

  res.status(statusCode).json(client);
});

app.post("/token", async (req, res) => {
  const data = req.body;

  const { key } = data;

  if (!key) {
    return res.status(402).json({ error: "key is required!" });
  }

  const client = await clientInfo(key);
  const statusCode = client.statusCode ?? 200;

  delete client.statusCode;

  res.status(statusCode).json(client);
});

app.listen(port, () => {
  console.log(`API is running at http://localhost:${port}`);
});
