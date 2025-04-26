import express from "express";
import { connectDB } from "./config/database";
import dotenv from "dotenv";
import "./bot";


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Barber Booking App is running...");
});

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
