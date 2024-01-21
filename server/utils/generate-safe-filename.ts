import path from "path";
import * as crypto from "crypto";

export default function (uid: string, filename: string) {
  const fileExtension = path.extname(filename);
  const uuid = crypto.randomUUID();
  const timestamp = new Date().getTime();
  return `${uuid}_${timestamp}_${uid}${fileExtension}`;
}
