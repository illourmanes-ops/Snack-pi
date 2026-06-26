const express = require("express");
const path = require("path");
const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

app.get("/", (req, res) => {
  res.sendFile = res.sendFile.bind(res);
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log("RetroPi Games lancé sur le port " + PORT);
});
