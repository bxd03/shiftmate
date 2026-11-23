declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    SHIFTMATE_OWNER_ID?: string;
    SHIFTMATE_OWNER_EMAIL?: string;
  }
}
