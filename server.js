import jsonServer from "json-server";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import axios from "axios";
import cors from "cors";

const server = jsonServer.create();
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();

// Configuração do CORS
server.use(cors({
  origin: 'https://frontend-develfood.vercel.app', // Permite apenas requisições deste domínio
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Adicione 'OPTIONS' aqui
  allowedHeaders: ['Content-Type', 'Authorization'] // Headers permitidos
}));

// Middleware para lidar com requisições OPTIONS
server.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', 'https://frontend-develfood.vercel.app');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(204); // Resposta sem conteúdo para o preflight
});

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
    const response = await axios.get("http://localhost:3000/users");
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
    console.error(error);
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

server.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});