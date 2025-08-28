import express from "express";
import { prismaClient } from "db";
import { authMiddleware } from "./middleware";
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

app.post("/project",authMiddleware, async (req, res) => {
  const { prompt } = req.body;
  const privyUserId = req.privyUserId!;

  const description = prompt.split("\n")[0];
  const user = await prismaClient.user.findUnique({
    where: { privyUserId }
  });

  if (!user) {
      return res.status(404).json({ error: "User not found" });
  }

  const project = await prismaClient.project.create({
    data: { description, userId: user.id },
  });

  res.json({project : project.id});
});


app.get("/projects",authMiddleware, async (req, res) => {
    const privyUserId = req.privyUserId;
    
    const user = await prismaClient.user.findUnique({
        where: { privyUserId }
    });

    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }

    const projects = await prismaClient.project.findMany({
        where: {
            userId: user.id 
        }
    });
    res.json(projects);
})

app.listen(3001, () => {
    console.log("Server started on port 3001");
})
