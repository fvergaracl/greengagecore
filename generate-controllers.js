const fs = require("fs")
const path = require("path")

// Paths
const schemaPath = path.join(__dirname, "prisma/schema.prisma")
const controllersDir = path.join(__dirname, "src/controllers")
const apiDir = path.join(__dirname, "src/pages/api")
const prismaClientPath = path.join(__dirname, "src/prismaClient.ts")

// Read schema.prisma
const schema = fs.readFileSync(schemaPath, "utf8")

// Extract model names
const models = Array.from(schema.matchAll(/model (\w+) {/g)).map(
  match => match[1]
)

// Ensure directories exist
if (!fs.existsSync(controllersDir)) {
  fs.mkdirSync(controllersDir, { recursive: true })
}

if (!fs.existsSync(apiDir)) {
  fs.mkdirSync(apiDir, { recursive: true })
}

// Create Prisma Client if not exists
if (!fs.existsSync(prismaClientPath)) {
  const prismaClientContent = `
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default prisma;
  `
  fs.writeFileSync(prismaClientPath, prismaClientContent.trim(), "utf8")
  console.log("Created Prisma Client at src/prismaClient.ts")
}

// Generate controllers and API routes
models.forEach(model => {
  const modelLower = model.toLowerCase()
  const controllerPath = path.join(controllersDir, `${model}Controller.ts`)

  // Controller content
  const controllerContent = `
import prisma from "../prismaClient";

export const getAll${model} = async () => {
  return await prisma.${modelLower}.findMany();
};

export const get${model}ById = async (id: string) => {
  return await prisma.${modelLower}.findUnique({ where: { id } });
};

export const create${model} = async (data: any) => {
  return await prisma.${modelLower}.create({ data });
};

export const update${model} = async (id: string, data: any) => {
  return await prisma.${modelLower}.update({ where: { id }, data });
};

export const delete${model} = async (id: string) => {
  return await prisma.${modelLower}.delete({ where: { id } });
};
  `

  // Create controller file if it doesn't exist
  if (!fs.existsSync(controllerPath)) {
    fs.writeFileSync(controllerPath, controllerContent.trim(), "utf8")
    console.log(`Created controller: ${controllerPath}`)
  }

  // Create API route
  const apiRouteDir = path.join(apiDir, modelLower)
  if (!fs.existsSync(apiRouteDir)) {
    fs.mkdirSync(apiRouteDir)
  }

  const indexApiRoute = path.join(apiRouteDir, "index.ts")
  if (!fs.existsSync(indexApiRoute)) {
    const indexContent = `
import { NextApiRequest, NextApiResponse } from "next";
import { getAll${model}, create${model} } from "../../../controllers/${model}Controller";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case "GET":
      try {
        const data = await getAll${model}();
        res.status(200).json(data);
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
      break;
    case "POST":
      try {
        const data = await create${model}(req.body);
        res.status(201).json(data);
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
      break;
    default:
      res.setHeader("Allow", ["GET", "POST"]);
      res.status(405).end(\`Method \${req.method} Not Allowed\`);
  }
}
    `
    fs.writeFileSync(indexApiRoute, indexContent.trim(), "utf8")
    console.log(`Created API route: ${indexApiRoute}`)
  }

  const idApiRoute = path.join(apiRouteDir, "[id].ts")
  if (!fs.existsSync(idApiRoute)) {
    const idContent = `
import { NextApiRequest, NextApiResponse } from "next";
import { get${model}ById, update${model}, delete${model} } from "../../../controllers/${model}Controller";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case "GET":
      try {
        const { id } = req.query;
        const data = await get${model}ById(String(id));
        if (!data) {
          res.status(404).json({ error: "${model} not found" });
        } else {
          res.status(200).json(data);
        }
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
      break;
    case "PUT":
      try {
        const { id } = req.query;
        const data = await update${model}(String(id), req.body);
        res.status(200).json(data);
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
      break;
    case "DELETE":
      try {
        const { id } = req.query;
        await delete${model}(String(id));
        res.status(204).send();
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
      break;
    default:
      res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
      res.status(405).end(\`Method \${req.method} Not Allowed\`);
  }
}
    `
    fs.writeFileSync(idApiRoute, idContent.trim(), "utf8")
    console.log(`Created API route: ${idApiRoute}`)
  }
})
