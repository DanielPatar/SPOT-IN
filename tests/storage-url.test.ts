import { describe, expect, it } from "vitest";
import { s3ObjectUrl } from "../src/adapters/storage";

describe("S3 object URL", () => {
  it("keeps the endpoint path (Supabase Storage)", () => {
    expect(s3ObjectUrl("https://abc.storage.supabase.co/storage/v1/s3", "spot-in", "proposal/ab/abcd").toString()).toBe(
      "https://abc.storage.supabase.co/storage/v1/s3/spot-in/proposal/ab/abcd",
    );
    expect(s3ObjectUrl("https://abc.storage.supabase.co/storage/v1/s3/", "spot-in", "a b/c").pathname).toBe("/storage/v1/s3/spot-in/a%20b/c");
  });
  it("works for endpoints without a path", () => {
    expect(s3ObjectUrl("https://s3.example.com", "bucket", "k/1").toString()).toBe("https://s3.example.com/bucket/k/1");
  });
});
