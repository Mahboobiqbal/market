import { localProvider } from "./local";
import type { StorageProvider } from "./types";

export * from "./types";

export function getStorageProvider(): StorageProvider {
  const driver = process.env.STORAGE_DRIVER ?? "local";

  switch (driver) {
    case "local":
      return localProvider;
    case "s3":
      throw new Error(
        'The "s3" storage driver is planned for a later phase. Set STORAGE_DRIVER=local.',
      );
    default:
      throw new Error(`Unknown STORAGE_DRIVER "${driver}". Expected "local".`);
  }
}
