import express from "express";
import { liquidityVisionHandler } from "./liquidityVision";
import { poolsVisionHandler } from "./poolsVision";

const port = process.env.PORT || 3000;

const app = express();

app.get("/poolsVision", poolsVisionHandler);
app.get("/liquidityVision", liquidityVisionHandler);

app.listen(port, () =>
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`)
);