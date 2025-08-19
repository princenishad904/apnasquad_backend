import ImageKit from "imagekit";
import { config } from "../config/index.js";

const imageKit = new ImageKit({
  publicKey: config.IMAGEKIT_PUBLIC_KEY,
  privateKey: config.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: config.IMAGEKIT_URL_ENDPOINT,
});

// upload on imagekit
export const uploadToImageKit = async (file, folder) => {
  if (!file) return null;

  return await imageKit.upload({
    file: file.buffer,
    fileName: file.originalname,
    folder: folder,
  });
};

export const deleteFromImageKit = async (fileId) => {
  if (!fileId) return null;
  return await imageKit.deleteFile(fileId);
};
