import { createWriteStream } from "fs";
import dotenv from "dotenv";
import crypto from "crypto";
import { deletePbFtpPass, userByUsername } from "./pocketbase.js";

dotenv.config();

import {
  SFTPGoApiClient,
  createAxiosClient,
} from "sftpgo-api-client/dist/sftpgo-api-client/src/index.js";
import { resolve } from "path";

const serverUrl = process.env.SERVER_URL;
const adminUsername = process.env.ADMIN_USERNAME;
const adminPassword = process.env.ADMIN_PASSWORD;

// Constants
const ALGORITHM = "aes-256-cbc"; // AES encryption algorithm
const KEY_LENGTH = 32; // Key length for AES-256
const IV_LENGTH = 16; // Initialization vector length

// Generate a key from a text key
function generateKey(textKey) {
  // Create a hash of the text key and use it as the encryption key
  return crypto
    .createHash("sha256")
    .update(textKey)
    .digest()
    .slice(0, KEY_LENGTH);
}

// Encrypt function
// function encrypt(username, password, textKey) {
//   const key = generateKey(textKey);
//   const iv = crypto.randomBytes(IV_LENGTH); // Generate a random IV

//   const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
//   let encrypted = cipher.update(username + ":" + password, "utf8", "hex");
//   encrypted += cipher.final("hex");

//   // Return the IV and encrypted text together
//   return iv.toString("hex") + ":" + encrypted;
// }

// Decrypt function
function decrypt(encryptedText, textKey) {
  const key = generateKey(textKey); // Generate the key from the text key
  const parts = encryptedText.split(":");
  const iv = Buffer.from(parts.shift(), "hex");
  const encrypted = parts.join(":");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  // Return the decrypted result
  return decrypted;
}

// Extract username and password
function extractCredentials(decryptedText) {
  const [username, password] = decryptedText.split(":");
  return { username, password };
}

// Example usage
const textKey = "mySecretPassphraseBODHA1120";
// const username = "user";
// const password = "pass123";

// const encryptedText = encrypt(username, password, textKey);
// console.log("Encrypted:", encryptedText);

// const decryptedText = decrypt(encryptedText, textKey);
// console.log("Decrypted:", decryptedText);

// const credentials = extractCredentials(decryptedText);
// console.log("Extracted Username:", credentials.username);
// console.log("Extracted Password:", credentials.password);

async function clientInfo(encryptedText) {
  const axiosClient = await createAxiosClient({
    serverUrl: serverUrl,
  });

  try {
    const decryptedText = decrypt(encryptedText, textKey);
    console.log("Decrypted:", decryptedText);

    const credentials = extractCredentials(decryptedText);
    // console.log("Extracted Username:", credentials.username);
    // console.log("Extracted Password:", credentials.password);

    try {
      const response = await axiosClient.get_user_token(undefined, undefined, {
        auth: {
          username: credentials.username,
          password: credentials.password,
        },
      });

      const statusCode = response.status;

      return { ...response.data, statusCode };
    } catch (error) {
      // Extract error details
      const errorResponse = error.response ? error.response.data : null;
      const statusCode = error.response ? error.response.status : null;

      return {
        ...errorResponse,
        statusCode,
      };
    }
  } catch (error) {
    return {
      error: "invalid credentials!",
      message: "Unauthorized",
      statusCode: 401,
    };
  }
}

async function clientDownload(username, password, path) {
  const client = new SFTPGoApiClient({
    createApiClientOption: { serverUrl: serverUrl },
    auth: { username: username, password: password },
  });

  // Call this method before each request to ensure access token
  await client.ensureToken();

  // Not need auth header, the instance already set it
  const response = await client.axiosClient.download_user_file(
    {
      path: path,
    },
    undefined,
    {
      responseType: "stream",
    }
  );

  // Save result to local
  const destFile = createWriteStream(
    resolve(process.cwd(), "download", "test.zip")
  );
  response.data.pipe(destFile);
  destFile.on("close", () => {
    console.log("Test successfull!!!");
  });
}

async function AdminInfo(username, password) {
  const client = new SFTPGoApiClient({
    createApiClientOption: { serverUrl: serverUrl },
    auth: { username: username, password: password, role: "admin" },
  });

  // Call this method before each request to ensure access token
  await client.ensureToken();

  // Not need auth header, the instance already set it
  const response = await client.axiosClient.get_admin_profile();

  if (response.data != null) {
    console.log("Test successfull!!!");
    console.log({
      data: response.data,
    });
  }
  return response.data;
}

async function userCreate(username, ftpPass) {
  const client = new SFTPGoApiClient({
    createApiClientOption: { serverUrl: serverUrl },
    auth: { username: adminUsername, password: adminPassword, role: "admin" },
  });

  try {
    await client.ensureToken();

    const userData = {
      username: username,
      password: ftpPass,
      status: 1,
      permissions: {
        "/": ["list", "upload", "download"],
      },
      allow_api_key_auth: 1,
      allow_impersonation: true,
    };

    const response = await client.axiosClient.add_user(null, userData);

    const statusCode = response.status;

    return { ...response.data, statusCode, state: true };
  } catch (error) {
    // Extract error details
    const errorResponse = error.response ? error.response.data : null;
    const statusCode = error.response ? error.response.status : null;

    return {
      ...errorResponse,
      statusCode,
      state: false,
    };
  }
}

async function userDelete(username) {
  // const user = await userByUsername(username, token, res);
  // const userId = user.id;

  // await deletePbFtpPass(userId, token);

  const client = new SFTPGoApiClient({
    createApiClientOption: { serverUrl: serverUrl },
    auth: { username: adminUsername, password: adminPassword, role: "admin" },
  });

  try {
    await client.ensureToken();

    const response = await client.axiosClient.delete_user(username);

    const statusCode = response.status;

    return { ...response.data, statusCode };
  } catch (error) {
    // console.log(error.response);
    const errorResponse = error.response ? error.response.data : null;
    const statusCode = error.response ? error.response.status : null;

    return {
      ...errorResponse,
      statusCode,
    };
  }
}

async function createUserDir(username, password, path) {
  const client = new SFTPGoApiClient({
    createApiClientOption: { serverUrl: serverUrl },
    auth: { username: username, password: password },
  });

  // Ensure token is available
  await client.ensureToken();

  if (path == "" || !path) {
    path = "/";
  }

  const response = await client.axiosClient.get_user_dir_contents({
    path: path,
  });

  if (response.data != null) {
    console.log("Files and Directories:", response.data);
  }
}

async function listUserDirs(username, password, path) {
  const client = new SFTPGoApiClient({
    createApiClientOption: { serverUrl: serverUrl },
    auth: { username: username, password: password },
  });

  // Ensure token is available
  await client.ensureToken();

  if (path == "" || !path) {
    path = "/";
  }

  const response = await client.axiosClient.get_user_dir_contents({
    path: path,
  });

  if (response.data != null) {
    console.log("Files and Directories:", response.data);
  }
}

async function test() {
  await clientInfo("dev", "dev");
  // await listUserDirs();
}

export { userCreate, userDelete, clientInfo };
