import { createWriteStream } from "fs";
import dotenv from "dotenv";
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

async function clientInfo(username, password) {
  const axiosClient = await createAxiosClient({
    serverUrl: serverUrl,
  });

  try {
    const response = await axiosClient.get_user_token(undefined, undefined, {
      auth: { username: username, password: password },
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
