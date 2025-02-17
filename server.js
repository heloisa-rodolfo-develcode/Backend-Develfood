import jsonServer from "json-server";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import axios from "axios";

const server = jsonServer.create();
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();

server.use(bodyParser.json());
server.use(middlewares);

const SECRET_KEY = "auth_token";
const expiresIn = "1h";

function createToken(payload) {
  return jwt.sign(payload, SECRET_KEY, { expiresIn });
}

server.get("/users", (req, res) => {
  const db = router.db;
  const users = db.get("users").value();
  res.json(users);
});

server.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const baseUrl = process.env.API_URL || "http://localhost:3000";
    console.log(`Tentando acessar ${baseUrl}/users`); 

    const response = await axios.get(`${baseUrl}/users`);
    const users = response.data;

    const user = users.find(
      (u) => u.email === email && u.password === password
    );

    if (!user) {
      return res.status(401).json({ error: "Usuário ou senha incorretos!" });
    }

    const token = createToken({ email: user.email, id: user.id });
    res.json({ token });
  } catch (error) {
    console.error("Erro no login:", error); // Log detalhado do erro
    res.status(500).json({ error: "Erro ao acessar os usuários!" });
  }
});

server.post("/restaurants", (req, res) => {
  const {
    cnpj,
    name,
    phone,
    email,
    password,
    foodTypes,
    nickname,
    zipcode,
    street,
    neighborhood,
    city,
    state,
    number,
  } = req.body;

  if (
    !cnpj ||
    !name ||
    !phone ||
    !email ||
    !password ||
    !foodTypes ||
    !nickname ||
    !zipcode ||
    !street ||
    !neighborhood ||
    !city ||
    !state ||
    !number
  ) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios!" });
  }

  try {
    const db = router.db;
    const restaurants = db.get("restaurants").value();

    const existingRestaurant = restaurants.find((r) => r.cnpj === cnpj);
    if (existingRestaurant) {
      return res.status(401).json({ error: "CNPJ já cadastrado!" });
    }

    const newRestaurant = {
      id: restaurants.length + 1,
      cnpj,
      name,
      phone,
      email,
      password,
      foodTypes,
      nickname,
      zipcode,
      street,
      neighborhood,
      city,
      state,
      number,
    };

    console.log("Novo restaurante a ser salvo:", newRestaurant);
    db.get("restaurants").push(newRestaurant).write();
    console.log("Restaurante salvo com sucesso!");

    res.status(200).json({ message: "Restaurante criado com sucesso!" });
  } catch (error) {
    console.error("Erro ao criar restaurante:", error);
    res.status(500).json({ error: "Erro ao criar restaurante!" });
  }
});

server.get("/restaurants", (req, res) => {
  const db = router.db;
  const restaurants = db.get("restaurants").value();
  res.json(restaurants);
});

server.use((req, res, next) => {
  if (req.method === "GET") {
    return next();
  }

  if (req.path === "/restaurants" && req.method === "POST") {
    return next();
  }

  if (!req.headers.authorization) {
    return res.status(403).json({ error: "Token não fornecido" });
  }

  const token = req.headers.authorization.split(" ")[1];

  try {
    jwt.verify(token, SECRET_KEY);
    next();
  } catch (err) {
    res.status(401).json({ error: "Token inválido ou expirado" });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

module.exports = server;
