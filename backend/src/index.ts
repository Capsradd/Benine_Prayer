import { Elysia, t } from "elysia";
import cors from "@elysiajs/cors";
import { getPrayerTimes } from "./services/islamicApi";
import { geocodeCity } from "./services/geocoding";

const app = new Elysia()
  .use(cors())
  .get("/", () => "HEY ANTEK ANTEK ASYNC")
  .get("/api/geocode", async ({query, set}) => {
    try {
      return await geocodeCity(query.city);
    } catch (error) {
      set.status = 500;
      return { error: error instanceof Error ? error.message : "Failed to geocode city" };
    }
  }, {
    query: t.Object({
      city: t.String()
    })
  })
  .get("/api/prayer-times", async ({query, set}) => {
    try {
      return await getPrayerTimes(
        query.lat,
        query.lon,
        query.method,
        query.school
      );
    } catch (error) {
      set.status = 500;
      return { error: error instanceof Error ? error.message : "Failed to fetch prayer times" };
    }
  }, {
    query: t.Object({
      lat: t.Number(),
      lon: t.Number(),
      method: t.Optional(t.Number()),
      school: t.Optional(t.Number())
    })
  })
  .listen(3000);
console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
