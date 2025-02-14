#!/usr/bin/env node
/*
* Copyright 2025 Mirza
*
* All Rights Reserved.
*
* This code is proprietary and confidential. No part of this code may be used, copied, modified, or distributed without the express written permission of Mirza.
*
* For inquiries, please contact: t.me/mirzyave
*/

import crypto from 'crypto';
import { Buffer } from 'buffer';
import Gun from 'gun';

const gun = Gun({
  peers: ['https://relay-server-db7s.onrender.com/gun']
});

const generateUUID = () => {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0,
        v = c == "x" ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
}

function printUsage() {
  console.error(`Usage:
For generating a paste:
  node cipher.js -c "<content>" [-p <true|false>] [-s "<password>"] [-e "<expiration>"] [-h "<host>"]

For decrypting a paste:
  node cipher.js -d <encodedPaste> [-x "<password>"]

Options:
  -c   Content (required for generation). For multi-line content, use \\n in the string.
  -p   isPublic flag (true or false, default is true). (Only for generation)
  -s   Password (required if -p is false, for generation).
  -e   Expiration date (optional, e.g. 2025-02-12T11:22:33Z; default is "9999-12-31T23:59:59Z").
  -h   Host URL (optional, default is "https://cipher.ix.tc/").
  -d   Encoded paste string for decryption.
  -x   Decryption password (required if paste is private).
`);
  process.exit(1);
}

const args = process.argv.slice(2);
let mode = "gen";
let isPublic = true;
let password = "";
let content = "";
let expiresAt = "9999-12-31T23:59:59Z";
let host = "https://cipher.ix.tc/";
let decryptData = "";

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  switch (arg) {
    case "-d":
      mode = "dec";
      if (i + 1 >= args.length) {
        console.error("Error: Missing value for -d");
        printUsage();
      }
      decryptData = args[++i];
      break;
    case "-p":
      if (i + 1 >= args.length) {
        console.error("Error: Missing value for -p");
        printUsage();
      }
      isPublic = args[++i].toLowerCase() === "true";
      break;
    case "-s":
      if (i + 1 >= args.length) {
        console.error("Error: Missing value for -s");
        printUsage();
      }
      password = args[++i];
      break;
    case "-x":
      if (i + 1 >= args.length) {
        console.error("Error: Missing value for -x");
        printUsage();
      }
      password = args[++i];
      break;
    case "-c":
      if (i + 1 >= args.length) {
        console.error("Error: Missing value for -c");
        printUsage();
      }
      content = args[++i];
      break;
    case "-e":
      if (i + 1 >= args.length) {
        console.error("Error: Missing value for -e");
        printUsage();
      }
      expiresAt = args[++i];
      break;
    case "-h":
      if (i + 1 >= args.length) {
        console.error("Error: Missing value for -h");
        printUsage();
      }
      host = args[++i];
      break;
    default:
      console.error(`Error: Unknown argument ${arg}`);
      printUsage();
  }
}

class Paste {
  constructor(content, expiresAt, isPublic, password, syntax) {
    this.createdAt = new Date().toISOString();
    this.expiresAt = expiresAt;
    this.isPublic = isPublic;
    this.syntax = syntax;

    if (!isPublic && !password) {
      throw new Error("Password is required for private pastes.");
    }

    if (isPublic) {
      this.content = Buffer.from(content, "utf8").toString("base64");
      this._hmacKey = Buffer.from("public-secret", "utf8");
    } else {
      this.content = this.encryptContent(content, password);
      this._hmacKey = crypto.createHash("sha256").update(password).digest();
    }

    this.pasteObject = {
      content: this.content,
      createdAt: this.createdAt,
      expiresAt: this.expiresAt,
      isPublic: this.isPublic,
      syntax: this.syntax,
    };

    this.signature = this.computeSignature(this.pasteObject, this._hmacKey);
    this.pasteObject.signature = this.signature;
  }

  encryptContent(plainText, password) {
    const key = crypto.createHash("sha256").update(password).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update(plainText, "utf8");
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return Buffer.concat([iv, encrypted]).toString("base64");
  }

  computeSignature(object, key) {
    const jsonStr = JSON.stringify(object);
    const hmac = crypto.createHmac("sha256", key);
    hmac.update(jsonStr);
    return hmac.digest("base64");
  }

  getObject() {
    return this.pasteObject;
  }

  decryptContent(password) {
    if (this.isPublic) {
      return Buffer.from(this.content, "base64").toString("utf8");
    } else {
      if (!password) {
        throw new Error("Password is required to decrypt this paste.");
      }
      const key = crypto.createHash("sha256").update(password).digest();
      const encryptedData = Buffer.from(this.content, "base64");
      const iv = encryptedData.slice(0, 16);
      const ciphertext = encryptedData.slice(16);
      const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return decrypted.toString("utf8");
    }
  }

  static encodeObject(pasteObj) {
    return Buffer.from(JSON.stringify(pasteObj), "utf8").toString("base64");
  }

  static decodeObject(encodedStr) {
    return JSON.parse(Buffer.from(encodedStr, "base64").toString("utf8"));
  }

  static decryptPaste(pasteObj, password) {
    if (pasteObj.isPublic) {
      return Buffer.from(pasteObj.content, "base64").toString("utf8");
    } else {
      const key = crypto.createHash("sha256").update(password).digest();
      const encryptedData = Buffer.from(pasteObj.content, "base64");
      const iv = encryptedData.slice(0, 16);
      const ciphertext = encryptedData.slice(16);
      const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return decrypted.toString("utf8");
    }
  }
}

if (mode === "dec") {
  try {
    const obj = Paste.decodeObject(decryptData);
    let plain;
    if (obj.isPublic) {
      plain = Buffer.from(obj.content, "base64").toString("utf8");
    } else {
      if (!password) {
        console.error("Error: Password is required for decrypting private paste.");
        process.exit(1);
      }
      plain = Paste.decryptPaste(obj, password);
    }
    console.log("\x1b[36mPaste:\x1b[0m", plain);
    console.log("\x1b[32mCreated at:\x1b[0m", obj.createdAt);
    if (obj.expiresAt !== "9999-12-31T23:59:59Z") {
      console.log("\x1b[33mExpires at:\x1b[0m", obj.expiresAt);
    }
    console.log("\x1b[35mSyntax:\x1b[0m", obj.syntax);
    console.log("\x1b[37mPublic:\x1b[0m", obj.isPublic);
    process.exit(1)
  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
} else {
  if (!content) {
    console.error("Error: Content (-c) is required for paste generation.");
    printUsage();
  }
  if (!isPublic && !password) {
    console.error("Error: Password (-s) is required for private pastes.");
    printUsage();
  }
  if (isPublic && password) {
    console.error("Warning: Paste is public (-p true) but a password (-s) was provided. Ignoring password.");
  }

  try {
    const expiration = expiresAt ? new Date(expiresAt).toISOString() : "9999-12-31T23:59:59Z";
    const newPaste = new Paste(content, expiration, isPublic, isPublic ? null : password, "plaintext");
    const encoded = Paste.encodeObject(newPaste.getObject());
    const uuid = generateUUID();
    gun
      .get("pastes")
      .get(uuid)
      .put({ encoded }, (ack) => {
        if (ack.err) {
          console.log(ack.err)
        }
      })
    console.log("Here’s Your Paste:", host + "pst/" + uuid);
    process.exit(1)
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}
