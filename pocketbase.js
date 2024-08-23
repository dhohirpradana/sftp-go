import PocketBase from "pocketbase";
import dotenv from "dotenv";
import { userCreate, userDelete } from "./sftpgo.js";
import { v4 } from "uuid";

dotenv.config();

const pbUrl = process.env.PB_URL;
const pb = new PocketBase(pbUrl);

async function checkToken(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    return token;
  } catch (error) {
    console.error("Error fetching current user:", error);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

async function test(req, res) {
  const token = await checkToken(req, res);
  const username = "lady1";
  req.auth = { id: "ada" };
  try {
    const userData = await pb
      .collection("users")
      .getFirstListItem(`username="${username}"`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    console.log(userData.id);
  } catch (error) {
    const errorResponse = error.response ?? null;
    const statusCode = error.status ?? 400;

    return res.status(statusCode).json(errorResponse);
  }
}

async function userByUsername(username, token, res) {
  try {
    const userData = await pb
      .collection("users")
      .getFirstListItem(`username="${username}"`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    // console.log(userData);
    return userData;
  } catch (error) {
    console.log(error);
    const errorResponse = error.response ?? null;
    const statusCode = error.status ?? 500;

    return res.status(statusCode).json(errorResponse);
  }
}

async function deletePbFtpPass(userId, token) {
  console.log("Deleting PB ftpPass...");
  await pb.collection("users").update(
    userId,
    {
      ftpPass: "",
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

async function updateUser(req, res) {
  const ftpPass = v4();
  console.log(ftpPass);

  const token = await checkToken(req, res);
  const data = req.body;

  const { username } = data;

  if (!username) {
    return res.status(402).json({ error: "username is required!" });
  }

  const user = await userByUsername(username, token, res);
  const userId = user.id;

  try {
    const data = {
      ftpPass: ftpPass,
    };

    await pb.collection("users").update(userId, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    try {
      const client = await userCreate(username, ftpPass);
      const statusCode = client.statusCode ?? 500;
      const state = client.state;

      if (!state) await deletePbFtpPass(userId, token);

      delete client.statusCode;
      delete client.state;

      return res.status(statusCode).json(client);
    } catch (error) {
      await deletePbFtpPass(userId, token);
      console.log(error);
      const errorResponse = error.response ? error.response.data : null;
      const statusCode = error.response ? error.response.status : null;

      return res.status(statusCode).json(errorResponse);
    }
  } catch (error) {
    console.log(error);
    const errorResponse = error.response ? error.response.data : null;
    const statusCode = error.response ? error.response.status : null;

    return res.status(statusCode).json(errorResponse);
  }
}

export { updateUser, test, deletePbFtpPass, userByUsername };
